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

    // Root institution creation is completed by the authenticated Principal/Dean
    // after email verification. The browser never supplies an Auth UID.
    if (action === "bootstrap_school_institution" || action === "bootstrap_higher_institution") {
      const rootUser = callerData.user;
      if (!rootUser.email || !rootUser.email_confirmed_at) {
        return json({ error: "VERIFIED_ROOT_EMAIL_REQUIRED" }, 403);
      }
      const { data: existingProfile } = await admin.from("profiles")
        .select("user_id").eq("user_id", rootUser.id).maybeSingle();
      const { data: existingActor } = await admin.from("identity_actors")
        .select("auth_user_id").eq("auth_user_id", rootUser.id).maybeSingle();
      if (existingProfile || existingActor) return json({ error: "ROOT_AUTH_IDENTITY_ALREADY_PROVISIONED" }, 409);

      if (action === "bootstrap_higher_institution" && !String(body.dean_name || "").trim()) {
        return json({ error: "INITIAL_DEAN_NAME_REQUIRED" }, 400);
      }
      const suppliedEmail = String(action === "bootstrap_school_institution" ? body.principal_email || "" : body.authority_email || "")
        .trim().toLowerCase();
      if (suppliedEmail !== rootUser.email.toLowerCase()) {
        return json({ error: "ROOT_EMAIL_MUST_MATCH_VERIFIED_AUTH_EMAIL" }, 403);
      }

      const rpcName = action === "bootstrap_higher_institution" ? "bootstrap_higher_institution" : action;
      const rpcArgs = action === "bootstrap_school_institution" ? {
        p_auth_user_id: rootUser.id,
        p_institution_name: String(body.institution_name || ""),
        p_institution_type: String(body.institution_type || ""),
        p_registration_number: body.registration_number ? String(body.registration_number) : null,
        p_country: String(body.country || "Nigeria"),
        p_address: body.address ? String(body.address) : null,
        p_state: body.state ? String(body.state) : null,
        p_lga: body.lga ? String(body.lga) : null,
        p_phone: body.phone ? String(body.phone) : null,
        p_website: body.website ? String(body.website) : null,
        p_principal_name: String(body.principal_name || ""),
        p_principal_email: suppliedEmail,
        p_principal_phone: body.principal_phone ? String(body.principal_phone) : null,
      } : {
        p_auth_user_id: rootUser.id,
        p_institution_name: String(body.institution_name || ""),
        p_institution_type: String(body.institution_type || ""),
        p_registration_number: body.registration_number ? String(body.registration_number) : null,
        p_country: String(body.country || "Nigeria"),
        p_address: body.address ? String(body.address) : null,
        p_phone: body.phone ? String(body.phone) : null,
        p_website: body.website ? String(body.website) : null,
        p_authority_name: String(body.authority_name || ""),
        p_authority_email: suppliedEmail,
        p_authority_phone: body.authority_phone ? String(body.authority_phone) : null,
      };
      const { data: bootstrapResult, error: bootstrapError } = await admin.rpc(rpcName, rpcArgs);
      if (bootstrapError || !bootstrapResult?.success) {
        return json({ error: bootstrapError?.message || "ROOT_INSTITUTION_BOOTSTRAP_FAILED" }, 409);
      }
      if (action === "bootstrap_higher_institution") {
        const deanName = String(body.dean_name || "").trim();
        const pin = String((crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000);
        const internalEmail = `${crypto.randomUUID()}@accounts.sefaes.invalid`;
        const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(48)),
          b => b.toString(16).padStart(2, "0")).join("");
        const { data: deanAuth, error: deanAuthError } = await admin.auth.admin.createUser({
          email: internalEmail, password: randomPassword, email_confirm: true,
          user_metadata: { actor_type: "dean", institution_id: bootstrapResult.institution_id },
        });
        if (deanAuthError || !deanAuth.user) {
          return json({ error: deanAuthError?.message || "INITIAL_DEAN_AUTH_CREATE_FAILED", institution_created: true }, 409);
        }
        const { data: deanResult, error: deanError } = await admin.rpc("complete_actor_onboarding", {
          p_auth_user_id: deanAuth.user.id,
          p_authority_user_id: rootUser.id,
          p_expected_authority_role: bootstrapResult.authority_role,
          p_actor_type: "dean",
          p_school_id: null,
          p_institution_id: bootstrapResult.institution_id,
          p_full_name: deanName,
          p_pin: pin,
          p_email: null,
          p_phone: body.dean_phone ? String(body.dean_phone) : null,
          p_student_id: null,
          p_class_id: null,
          p_class_subject_ids: null,
          p_gender: null,
          p_date_of_birth: null,
          p_relationship: "Parent",
          p_is_primary: true,
          p_faculty_id: null,
          p_department_id: null,
          p_title: null,
          p_rank: null,
          p_specialization: null,
          p_is_graduate_student_supervisor: false,
          p_max_students: null,
        });
        if (deanError || !deanResult?.success) {
          await admin.auth.admin.deleteUser(deanAuth.user.id);
          return json({ error: deanError?.message || "INITIAL_DEAN_PROVISIONING_FAILED", institution_created: true }, 409);
        }
        return json({ ...bootstrapResult, initial_admin: { ...deanResult, pin } });
      }
      return json(bootstrapResult);
    }

    const { data: callerProfile, error: callerProfileError } = await admin.from("profiles")
      .select("user_id,institution_id,school_id,role,authority_user_id")
      .eq("user_id", callerData.user.id).single();
    if (callerProfileError || !callerProfile) return json({ error: "CALLER_PROFILE_NOT_FOUND" }, 403);

    const actorType = String(body.actor_type || "");
    const schoolRoles = ["vice_principal", "bursar", "teacher", "student", "parent"];
    const higherEdRoles = ["dean", "hod", "adviser", "lecturer", "student"];
    if (![...schoolRoles, ...higherEdRoles].includes(actorType)) {
      return json({ error: "INVALID_ACTOR_TYPE" }, 400);
    }

    let rootAuthorityUserId = callerProfile.user_id;
    let expectedAuthorityRole = callerProfile.role;
    let permittedActorTypes: string[] = [];
    if (callerProfile.role === "principal_admin") {
      permittedActorTypes = schoolRoles;
    } else if (["vice_chancellor", "rector"].includes(callerProfile.role)) {
      permittedActorTypes = ["dean"];
    } else if (callerProfile.role === "dean") {
      const { data: deanActor, error: deanActorError } = await admin.from("identity_actors")
        .select("authority_user_id,actor_type,status")
        .eq("auth_user_id", callerProfile.user_id).eq("actor_type", "dean")
        .eq("status", "active").single();
      if (deanActorError || !deanActor?.authority_user_id) return json({ error: "DEAN_ROOT_AUTHORITY_LINK_REQUIRED" }, 403);
      rootAuthorityUserId = deanActor.authority_user_id;
      const { data: rootProfile, error: rootProfileError } = await admin.from("profiles")
        .select("user_id,institution_id,role")
        .eq("user_id", rootAuthorityUserId).single();
      if (rootProfileError || !rootProfile || !["vice_chancellor", "rector"].includes(rootProfile.role)
        || rootProfile.institution_id !== callerProfile.institution_id) {
        return json({ error: "INVALID_INSTITUTION_ROOT_AUTHORITY" }, 403);
      }
      expectedAuthorityRole = rootProfile.role;
      permittedActorTypes = ["hod", "adviser", "lecturer", "student"];
    } else {
      return json({ error: "CORRECT_INSTITUTION_AUTHORITY_REQUIRED" }, 403);
    }
    if (!permittedActorTypes.includes(actorType)) return json({ error: "ACTOR_ROLE_NOT_ALLOWED_FOR_CALLER" }, 403);

    const institutionId = String(body.institution_id || callerProfile.institution_id || "");
    if (!institutionId || institutionId !== callerProfile.institution_id) {
      return json({ error: "CROSS_INSTITUTION_DENIED" }, 403);
    }
    const schoolRequired = ["vice_principal", "bursar", "teacher", "student", "lecturer"].includes(actorType);
    const schoolId = callerProfile.role === "principal_admin"
      ? String(body.school_id || callerProfile.school_id || "")
      : (schoolRequired ? String(body.school_id || "") : null);
    if (callerProfile.role === "principal_admin" && (!schoolId || schoolId !== callerProfile.school_id)) {
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
      p_authority_user_id: rootAuthorityUserId,
      p_expected_authority_role: expectedAuthorityRole,
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

    return json({ ...result, pin: initialPin, authority_user_id: rootAuthorityUserId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500);
  }
});
