import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { provisionInitialDean } from "./dean-recovery.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SAFE_ONBOARDING_ERRORS = [
  "DEAN_AUTH_LOOKUP_FAILED",
  "DEAN_AUTH_LOOKUP_LIMIT_REACHED",
  "ROOT_IDENTITY_LOOKUP_FAILED",
  "ROOT_AUTHORITY_NAME_MISMATCH",
  "ROOT_IDENTITY_PARTIAL_STATE",
  "ROOT_AUTHORITY_IDENTITY_CONFLICT",
  "ROOT_INSTITUTION_NOT_FOUND",
  "ROOT_INSTITUTION_REQUEST_MISMATCH",
  "ROOT_INSTITUTION_CAMPUS_NOT_FOUND",
  "DEAN_RECOVERY_LEDGER_READ_FAILED",
  "DEAN_REQUEST_FINGERPRINT_CONFLICT",
  "DEAN_PROVISIONING_ALREADY_CLAIMED",
  "DEAN_RECOVERY_LEDGER_CREATE_FAILED",
  "DEAN_IDENTITY_LOOKUP_FAILED",
  "DEAN_IDENTITY_PARTIAL_STATE",
  "DEAN_IDENTITY_CONFLICT",
  "DEAN_RECOVERY_COMPLETION_PERSIST_FAILED",
  "DEAN_AUTH_IDENTITY_MISSING",
  "DEAN_AUTH_IDENTITY_CONFLICT",
  "DEAN_AUTH_CREATE_FAILED",
  "DEAN_AUTH_LINK_PERSIST_FAILED",
  "DEAN_ACTIVE_JOB_IDENTITY_MISSING",
  "DEAN_RECOVERY_LEDGER_UPDATE_FAILED",
  "DEAN_POST_PROVISION_VERIFICATION_FAILED",
  "HIGHER_INSTITUTION_REQUIRED_FIELDS_MISSING",
  "ROOT_INSTITUTION_BOOTSTRAP_RECEIPT_MISMATCH",
  "ROOT_AUTHORITY_ROLE_MISMATCH",
  "DEAN_PROVISIONING_REQUIRES_ROOT_BOOTSTRAP",
  "ROOT_AUTH_IDENTITY_ALREADY_PROVISIONED",
  "ROOT_EMAIL_MUST_MATCH_VERIFIED_AUTH_EMAIL",
  "INITIAL_DEAN_NAME_REQUIRED",
  "UNSUPPORTED_HIGHER_INSTITUTION_TYPE",
  "UNSUPPORTED_SCHOOL_INSTITUTION_TYPE",
  "INSTITUTION_REGISTRATION_NUMBER_EXISTS",
  "AUTHORITY_AUTH_EMAIL_MISMATCH_OR_UNVERIFIED",
  "ACTIVE_VC_RECTOR_AUTHORITY_REQUIRED",
  "ACTIVE_PRINCIPAL_ACTOR_REQUIRED",
  "PRINCIPAL_PROVISIONER_REQUIRED",
  "PRINCIPAL_SCHOOL_AUTHORITY_REQUIRED",
  "CROSS_INSTITUTION_AUTHORITY_DENIED",
  "CROSS_INSTITUTION_PROVISIONER_DENIED",
  "CROSS_SCHOOL_AUTHORITY_DENIED",
  "ROOT_PROVISIONER_ROLE_MISMATCH",
  "HIGHER_ED_DEAN_PROVISIONER_REQUIRED",
  "DEAN_ROOT_AUTHORITY_LINK_REQUIRED",
  "ACTIVE_DEAN_ROOT_LINK_REQUIRED",
  "NUC_DEPARTMENT_NOT_IN_SELECTED_FACULTY",
  "DEPARTMENT_NOT_IN_SELECTED_FACULTY",
  "NUC_DEPARTMENT_NOT_IN_INSTITUTION",
  "DEPARTMENT_NOT_IN_INSTITUTION",
  "LECTURER_EMAIL_REQUIRED",
  "CLASS_NOT_IN_SCHOOL",
  "STUDENT_LAST_NAME_REQUIRED",
  "LECTURER_LAST_NAME_REQUIRED",
  "ACTOR_SCHOOL_REQUIRED",
  "ACTOR_SCHOOL_OUTSIDE_INSTITUTION",
  "CROSS_INSTITUTION_DENIED",
  "CROSS_SCHOOL_DENIED",
  "ACTOR_ROLE_NOT_ALLOWED_FOR_CALLER",
  "CORRECT_INSTITUTION_AUTHORITY_REQUIRED",
  "INVALID_INSTITUTION_ROOT_AUTHORITY",
  "PROVISIONER_REQUIRED",
  "PROVISIONER_PROFILE_NOT_FOUND",
  "UNSUPPORTED_AUTHORITY_ROLE",
] as const;

const safeOnboardingError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return SAFE_ONBOARDING_ERRORS.find(code => message.includes(code)) || fallback;
};

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

    if (action === "bootstrap_higher_institution") {
      try {
        const result = await provisionInitialDean(admin, callerData.user, body, safeOnboardingError);
        return json(result);
      } catch (error) {
        return json({
          error: safeOnboardingError(error, "INITIAL_DEAN_PROVISIONING_FAILED"),
          recovery_available: true,
        }, 409);
      }
    }

    // Root institution creation is completed by the authenticated Principal/Dean
    // after email verification. The browser never supplies an Auth UID.
    if (action === "bootstrap_school_institution") {
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
        return json({ error: safeOnboardingError(bootstrapError, "ROOT_INSTITUTION_BOOTSTRAP_FAILED") }, 409);
      }
      return json(bootstrapResult);
    }

    const { data: callerProfile, error: callerProfileError } = await admin.from("profiles")
      .select("user_id,institution_id,school_id,role,authority_user_id")
      .eq("user_id", callerData.user.id).single();
    if (callerProfileError || !callerProfile) return json({ error: "CALLER_PROFILE_NOT_FOUND" }, 403);

    const actorType = String(body.actor_type || "");
    if (actorType === "dean") return json({ error: "DEAN_PROVISIONING_REQUIRES_ROOT_BOOTSTRAP" }, 409);
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
    if (createError || !created.user) return json({ error: "AUTH_USER_CREATE_FAILED" }, 400);

    const { data: result, error: provisionError } = await admin.rpc("complete_actor_onboarding", {
      p_auth_user_id: created.user.id,
      p_authority_user_id: rootAuthorityUserId,
      p_provisioned_by_user_id: callerData.user.id,
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
      return json({ error: safeOnboardingError(provisionError, "ACTOR_PROVISIONING_FAILED") }, 400);
    }

    return json({ ...result, pin: initialPin, authority_user_id: rootAuthorityUserId });
  } catch (error) {
    return json({ error: "ONBOARDING_OPERATION_FAILED" }, 500);
  }
});
