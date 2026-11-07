import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "login") {
      const identifier = String(body.login_id || "").trim();
      const pin = String(body.pin || "");
      const { data: verified, error } = await admin.rpc("auth_pin_login", {
        p_identifier: identifier, p_pin: pin,
      });
      if (error || !verified?.success) return json({ error: "INVALID_CREDENTIALS" }, 401);

      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("user_id,pin_requires_change,role")
        .eq("user_id", verified.user_id).single();
      if (profileError || !profile) return json({ error: "PROFILE_NOT_FOUND" }, 409);

      const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
      if (userError || !authUser.user?.email) return json({ error: "IDENTITY_NOT_READY" }, 409);
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink", email: authUser.user.email,
      });
      if (linkError || !linkData?.properties?.hashed_token) return json({ error: "SESSION_EXCHANGE_FAILED" }, 500);
      return json({
        success: true, token_hash: linkData.properties.hashed_token, type: "magiclink",
        pin_requires_change: profile.pin_requires_change === true, role: profile.role,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "AUTH_REQUIRED" }, 401);
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerData, error: callerError } = await caller.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "AUTH_REQUIRED" }, 401);

    const { data: callerProfile, error: callerProfileError } = await admin.from("profiles")
      .select("user_id,institution_id,school_id,role")
      .eq("user_id", callerData.user.id).single();
    if (callerProfileError || !callerProfile) return json({ error: "CALLER_PROFILE_NOT_FOUND" }, 403);

    // Dean is created as an email/password Supabase Auth candidate, never as a PIN actor.
    if (action === "create_dean") {
      if (!["admin", "superadmin"].includes(callerProfile.role)) {
        return json({ error: "INSTITUTION_ADMIN_AUTHORITY_REQUIRED" }, 403);
      }
      const institutionId = String(body.institution_id || callerProfile.institution_id || "");
      if (!institutionId || (callerProfile.role === "admin" && !callerProfile.institution_id) || (callerProfile.institution_id && institutionId !== callerProfile.institution_id)) {
        return json({ error: "CROSS_INSTITUTION_DENIED" }, 403);
      }
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.full_name || "").trim();
      const facultyId = String(body.faculty_id || "");
      if (!email || !password || password.length < 10 || !fullName || !facultyId) {
        return json({ error: "DEAN_EMAIL_PASSWORD_NAME_AND_FACULTY_REQUIRED" }, 400);
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { actor_type: "dean", institution_id: institutionId },
      });
      if (createError || !created.user) return json({ error: createError?.message || "DEAN_AUTH_CREATE_FAILED" }, 400);

      const { data: result, error: provisionError } = await admin.rpc("complete_dean_onboarding", {
        p_auth_user_id: created.user.id,
        p_institution_id: institutionId,
        p_faculty_id: facultyId,
        p_full_name: fullName,
        p_email: email,
        p_phone: body.phone ? String(body.phone) : null,
      });
      if (provisionError || !result?.success) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: provisionError?.message || "DEAN_PROFILE_PROVISIONING_FAILED" }, 400);
      }
      return json({ ...result, email, full_name: fullName });
    }

    const actorType = String(body.actor_type || "");
    const schoolRoles = ["vice_principal", "bursar", "teacher", "student", "parent"];
    const higherEdRoles = ["hod", "adviser", "lecturer"];
    if (![...schoolRoles, ...higherEdRoles].includes(actorType)) {
      return json({ error: "INVALID_ACTOR_TYPE" }, 400);
    }

    const expectedAuthorityRole = callerProfile.role;
    const authorityAllowsActor = (expectedAuthorityRole === "principal_admin" && schoolRoles.includes(actorType))
      || (expectedAuthorityRole === "dean" && [...schoolRoles, ...higherEdRoles].includes(actorType));
    if (!authorityAllowsActor) return json({ error: "CORRECT_INSTITUTION_AUTHORITY_REQUIRED" }, 403);

    const institutionId = String(body.institution_id || callerProfile.institution_id || "");
    if (!institutionId || institutionId !== callerProfile.institution_id) {
      return json({ error: "CROSS_INSTITUTION_DENIED" }, 403);
    }
    const schoolRequired = ["vice_principal", "bursar", "teacher", "student", "lecturer"].includes(actorType);
    const schoolId = expectedAuthorityRole === "principal_admin"
      ? String(body.school_id || callerProfile.school_id || "")
      : (schoolRequired ? String(body.school_id || "") : null);
    if (expectedAuthorityRole === "principal_admin" && (!schoolId || schoolId !== callerProfile.school_id)) {
      return json({ error: "CROSS_SCHOOL_DENIED" }, 403);
    }
    if (schoolRequired) {
      if (!schoolId) return json({ error: "ACTOR_SCHOOL_REQUIRED" }, 400);
      const { data: campus } = await admin.from("schools").select("id")
        .eq("id", schoolId).eq("institution_id", institutionId).maybeSingle();
      if (!campus) return json({ error: "ACTOR_SCHOOL_OUTSIDE_INSTITUTION" }, 403);
    }

    const pinLength = ["student", "parent"].includes(actorType) ? 4 : 6;
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    const initialPin = String((randomValue % (pinLength === 4 ? 9000 : 900000)) + (pinLength === 4 ? 1000 : 100000));
    const internalEmail = `${crypto.randomUUID()}@accounts.sefaes.invalid`;
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(48)),
      b => b.toString(16).padStart(2, "0")).join("");

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail, password: randomPassword, email_confirm: true,
      user_metadata: { actor_type: actorType, institution_id: institutionId, school_id: schoolId },
    });
    if (createError || !created.user) return json({ error: createError?.message || "AUTH_USER_CREATE_FAILED" }, 400);

    const { data: result, error: provisionError } = await admin.rpc("complete_actor_onboarding", {
      p_auth_user_id: created.user.id,
      p_actor_type: actorType,
      p_school_id: schoolId,
      p_institution_id: institutionId,
      p_full_name: String(body.full_name || ""),
      p_pin: initialPin,
      p_email: body.email ? String(body.email) : null,
      p_phone: body.phone ? String(body.phone) : null,
      p_student_id: body.student_id || null,
      p_class_id: body.class_id || null,
      p_class_subject_ids: Array.isArray(body.class_subject_ids)
        ? body.class_subject_ids : (body.class_subject_id ? [body.class_subject_id] : null),
      p_gender: body.gender || null,
      p_date_of_birth: body.date_of_birth || null,
      p_relationship: body.relationship || "Parent",
      p_is_primary: body.is_primary !== false,
      p_faculty_id: body.faculty_id || null,
      p_department_id: body.department_id || null,
      p_title: body.title || null,
      p_rank: body.rank || null,
      p_specialization: body.specialization || null,
      p_is_graduate_student_supervisor: body.is_graduate_student_supervisor === true,
      p_max_students: Number.isInteger(body.max_students) ? body.max_students : null,
    });
    if (provisionError || !result?.success) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: provisionError?.message || "ACTOR_PROVISIONING_FAILED" }, 400);
    }

    const { data: binding, error: bindingError } = await admin.rpc("bind_actor_authority", {
      p_actor_user_id: created.user.id,
      p_authority_user_id: callerProfile.user_id,
      p_expected_authority_role: expectedAuthorityRole,
    });
    if (bindingError || !binding?.success) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: bindingError?.message || "ACTOR_AUTHORITY_BINDING_FAILED" }, 409);
    }

    return json({ ...result, pin: initialPin, authority_user_id: callerProfile.user_id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500);
  }
});
