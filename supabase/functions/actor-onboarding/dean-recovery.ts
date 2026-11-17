import type { User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const text = (value: unknown) => String(value ?? "").trim();
const norm = (value: unknown) => text(value).toLowerCase();

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
};

const stableUuid = (hex: string) =>
  hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) +
  "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);

const findAuthUserByEmail = async (admin: any, email: string): Promise<User | null> => {
  for (let page = 1; page <= 1000; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("DEAN_AUTH_LOOKUP_FAILED");
    const users = data?.users || [];
    const match = users.find((user: User) => norm(user.email) === norm(email));
    if (match) return match;
    if (users.length < 1000) return null;
  }
  throw new Error("DEAN_AUTH_LOOKUP_LIMIT_REACHED");
};

const resolveRoot = async (admin: any, rootUser: User, request: any) => {
  const role = request.institution_type === "university" ? "vice_chancellor" : "rector";
  const [{ data: profile, error: pError }, { data: actor, error: aError }] = await Promise.all([
    admin.from("profiles").select("id,user_id,institution_id,school_id,role,full_name,email")
      .eq("user_id", rootUser.id).maybeSingle(),
    admin.from("identity_actors").select("id,auth_user_id,institution_id,school_id,actor_type,auth_method,status")
      .eq("auth_user_id", rootUser.id).maybeSingle(),
  ]);
  if (pError || aError) throw new Error("ROOT_IDENTITY_LOOKUP_FAILED");
  if (!profile && !actor) return null;
  if (!profile || !actor) throw new Error("ROOT_IDENTITY_PARTIAL_STATE");
  if (
    profile.user_id !== rootUser.id || actor.auth_user_id !== rootUser.id ||
    profile.institution_id !== actor.institution_id || profile.school_id !== actor.school_id ||
    profile.role !== role || actor.actor_type !== role || actor.auth_method !== "email" ||
    actor.status !== "active" || norm(profile.email) !== norm(rootUser.email) ||
    norm(profile.full_name) !== norm(request.authority_name)
  ) throw new Error("ROOT_AUTHORITY_IDENTITY_CONFLICT");

  const { data: institution, error: iError } = await admin.from("institutions")
    .select("id,name,type,registration_number,country,address,phone,website_url")
    .eq("id", profile.institution_id).single();
  if (iError || !institution) throw new Error("ROOT_INSTITUTION_NOT_FOUND");
  const sameRequest =
    norm(institution.name) === norm(request.institution_name) &&
    norm(institution.type) === norm(request.institution_type) &&
    norm(institution.registration_number) === norm(request.registration_number) &&
    norm(institution.country || "Nigeria") === norm(request.country || "Nigeria") &&
    norm(institution.address) === norm(request.address) &&
    norm(institution.phone) === norm(request.phone) &&
    norm(institution.website_url) === norm(request.website);
  if (!sameRequest) throw new Error("ROOT_INSTITUTION_REQUEST_MISMATCH");

  const { data: campus, error: cError } = await admin.from("schools")
    .select("id,url_slug,slug").eq("id", profile.school_id)
    .eq("institution_id", profile.institution_id).maybeSingle();
  if (cError || !campus) throw new Error("ROOT_INSTITUTION_CAMPUS_NOT_FOUND");
  return {
    institution_id: profile.institution_id,
    school_id: campus.id,
    institution_name: institution.name,
    url_slug: campus.url_slug || campus.slug || "",
    institution_path: campus.url_slug || campus.slug || "",
    authority_role: role,
    authority_title: role === "vice_chancellor" ? "Vice-Chancellor" : "Rector",
  };
};

const getOrCreateJob = async (
  admin: any, rootUser: User, institution: any, request: any, fingerprint: string, idempotencyKey: string,
) => {
  const { data: byKey, error: keyError } = await admin.from("actor_provisioning_jobs")
    .select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (keyError) throw new Error("DEAN_RECOVERY_LEDGER_READ_FAILED");
  if (byKey) {
    if (byKey.request_fingerprint !== fingerprint ||
      byKey.institution_id !== institution.institution_id ||
      byKey.requested_by_user_id !== rootUser.id ||
      byKey.root_authority_user_id !== rootUser.id ||
      byKey.actor_type !== "dean") throw new Error("DEAN_REQUEST_FINGERPRINT_CONFLICT");
    return byKey;
  }

  const { data: existing, error: existingError } = await admin.from("actor_provisioning_jobs")
    .select("*").eq("institution_id", institution.institution_id)
    .eq("actor_type", "dean").maybeSingle();
  if (existingError) throw new Error("DEAN_RECOVERY_LEDGER_READ_FAILED");
  if (existing) {
    if (existing.request_fingerprint !== fingerprint ||
      existing.requested_by_user_id !== rootUser.id ||
      existing.root_authority_user_id !== rootUser.id) throw new Error("DEAN_PROVISIONING_ALREADY_CLAIMED");
    return existing;
  }

  const { data: inserted, error: insertError } = await admin.from("actor_provisioning_jobs").insert({
    idempotency_key: idempotencyKey,
    request_fingerprint: fingerprint,
    institution_id: institution.institution_id,
    requested_by_user_id: rootUser.id,
    root_authority_user_id: rootUser.id,
    actor_type: "dean",
    status: "pending_auth",
    stage: "auth",
    attempt_count: 0,
    request_payload: request,
  }).select("*").single();
  if (!insertError && inserted) return inserted;

  // Another request may have claimed this institution's initial Dean operation.
  const { data: raced, error: raceError } = await admin.from("actor_provisioning_jobs")
    .select("*").eq("institution_id", institution.institution_id)
    .eq("actor_type", "dean").maybeSingle();
  if (raceError || !raced) throw new Error("DEAN_RECOVERY_LEDGER_CREATE_FAILED");
  if (raced.request_fingerprint !== fingerprint ||
    raced.requested_by_user_id !== rootUser.id ||
    raced.root_authority_user_id !== rootUser.id) throw new Error("DEAN_PROVISIONING_ALREADY_CLAIMED");
  return raced;
};

const readDean = async (admin: any, userId: string) => {
  const [{ data: profile, error: pError }, { data: actor, error: aError }] = await Promise.all([
    admin.from("profiles").select("id,user_id,institution_id,full_name,role,authority_user_id,phone")
      .eq("user_id", userId).maybeSingle(),
    admin.from("identity_actors")
      .select("id,auth_user_id,institution_id,actor_type,actor_record_id,login_identifier,status,authority_user_id")
      .eq("auth_user_id", userId).maybeSingle(),
  ]);
  if (pError || aError) throw new Error("DEAN_IDENTITY_LOOKUP_FAILED");
  return { profile, actor };
};

const assertDeanMatches = (identity: any, job: any, request: any, rootUser: User) => {
  const { profile, actor } = identity;
  if (!profile && !actor) return false;
  if (!profile || !actor) throw new Error("DEAN_IDENTITY_PARTIAL_STATE");
  if (
    profile.user_id !== job.target_auth_user_id || actor.auth_user_id !== job.target_auth_user_id ||
    profile.institution_id !== job.institution_id || actor.institution_id !== job.institution_id ||
    profile.role !== "dean" || actor.actor_type !== "dean" || actor.status !== "active" ||
    profile.authority_user_id !== rootUser.id || actor.authority_user_id !== rootUser.id ||
    norm(profile.full_name) !== norm(request.dean_name)
  ) throw new Error("DEAN_IDENTITY_CONFLICT");
  return true;
};

const finishJob = async (admin: any, jobId: string, actorId: string) => {
  const { error } = await admin.from("actor_provisioning_jobs").update({
    identity_actor_id: actorId,
    status: "active",
    stage: "complete",
    completed_at: new Date().toISOString(),
    last_error_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);
  if (error) throw new Error("DEAN_RECOVERY_COMPLETION_PERSIST_FAILED");
};

export async function provisionInitialDean(admin: any, rootUser: User, body: Record<string, unknown>) {
  if (!rootUser.email || !rootUser.email_confirmed_at) throw new Error("VERIFIED_ROOT_EMAIL_REQUIRED");
  const request = {
    institution_name: text(body.institution_name),
    institution_type: text(body.institution_type),
    registration_number: text(body.registration_number),
    country: text(body.country || "Nigeria"),
    address: text(body.address),
    phone: text(body.phone),
    website: text(body.website),
    authority_name: text(body.authority_name),
    authority_email: norm(rootUser.email),
    authority_phone: text(body.authority_phone),
    dean_name: text(body.dean_name),
    dean_phone: text(body.dean_phone),
  };
  if (!request.institution_name || !request.institution_type || !request.authority_name || !request.dean_name) {
    throw new Error("HIGHER_INSTITUTION_REQUIRED_FIELDS_MISSING");
  }
  if (request.authority_email !== norm(rootUser.email)) throw new Error("ROOT_EMAIL_MUST_MATCH_VERIFIED_AUTH_EMAIL");

  const fingerprint = await sha256(JSON.stringify(request));
  const idempotencyKey = stableUuid(await sha256(rootUser.id + ":" + fingerprint));
  const expectedRole = request.institution_type === "university" ? "vice_chancellor" : "rector";

  // Resume an institution transaction that committed even if its HTTP response was lost.
  let institution = await resolveRoot(admin, rootUser, request);
  if (!institution) {
    const { data: bootstrapped, error: bootstrapError } = await admin.rpc("bootstrap_higher_institution", {
      p_auth_user_id: rootUser.id,
      p_institution_name: request.institution_name,
      p_institution_type: request.institution_type,
      p_registration_number: request.registration_number || null,
      p_country: request.country || "Nigeria",
      p_address: request.address || null,
      p_phone: request.phone || null,
      p_website: request.website || null,
      p_authority_name: request.authority_name,
      p_authority_email: request.authority_email,
      p_authority_phone: request.authority_phone || null,
    });
    if (bootstrapError || !bootstrapped?.success) {
      institution = await resolveRoot(admin, rootUser, request);
      if (!institution) throw new Error("ROOT_INSTITUTION_BOOTSTRAP_FAILED");
    } else {
      institution = await resolveRoot(admin, rootUser, request);
      if (!institution || institution.institution_id !== bootstrapped.institution_id) {
        throw new Error("ROOT_INSTITUTION_BOOTSTRAP_RECEIPT_MISMATCH");
      }
    }
  }
  if (!institution) throw new Error("ROOT_INSTITUTION_NOT_FOUND");
  if (institution.authority_role !== expectedRole) throw new Error("ROOT_AUTHORITY_ROLE_MISMATCH");

  const job = await getOrCreateJob(admin, rootUser, institution, request, fingerprint, idempotencyKey);
  const { error: attemptError } = await admin.from("actor_provisioning_jobs").update({
    attempt_count: Number(job.attempt_count || 0) + 1,
    status: job.target_auth_user_id ? "pending_profile" : "pending_auth",
    stage: job.target_auth_user_id ? "profile" : "auth",
    last_error_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  if (attemptError) throw new Error("DEAN_RECOVERY_LEDGER_UPDATE_FAILED");

  const deterministicEmail = "dean-" + job.id + "@accounts.sefaes.invalid";
  let deanUser: User | null = null;
  if (job.target_auth_user_id) {
    const { data, error } = await admin.auth.admin.getUserById(job.target_auth_user_id);
    if (error || !data?.user || norm(data.user.email) !== norm(deterministicEmail)) {
      await admin.from("actor_provisioning_jobs").update({
        status: "recovery_required", stage: "auth", last_error_code: "DEAN_AUTH_IDENTITY_MISSING",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      throw new Error("DEAN_AUTH_IDENTITY_MISSING");
    }
    deanUser = data.user;
  } else {
    deanUser = await findAuthUserByEmail(admin, deterministicEmail);
    if (!deanUser) {
      const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(48)),
        byte => byte.toString(16).padStart(2, "0")).join("");
      const { data: created } = await admin.auth.admin.createUser({
        email: deterministicEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { actor_type: "dean", institution_id: institution.institution_id, provisioning_job_id: job.id },
      });
      deanUser = created?.user || await findAuthUserByEmail(admin, deterministicEmail);
      if (!deanUser) {
        await admin.from("actor_provisioning_jobs").update({
          status: "recovery_required", stage: "auth", last_error_code: "DEAN_AUTH_CREATE_FAILED",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        throw new Error("DEAN_AUTH_CREATE_FAILED");
      }
    }
    const { error: linkError } = await admin.from("actor_provisioning_jobs").update({
      target_auth_user_id: deanUser.id,
      status: "pending_profile",
      stage: "profile",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    if (linkError) throw new Error("DEAN_AUTH_LINK_PERSIST_FAILED");
    job.target_auth_user_id = deanUser.id;
  }

  const existing = await readDean(admin, deanUser.id);
  if (existing.profile || existing.actor) {
    if (!assertDeanMatches(existing, job, request, rootUser)) throw new Error("DEAN_IDENTITY_CONFLICT");
    await finishJob(admin, job.id, existing.actor.id);
    return {
      success: true,
      institution_id: institution.institution_id,
      school_id: institution.school_id,
      institution_name: institution.institution_name,
      url_slug: institution.url_slug,
      institution_path: institution.institution_path,
      authority_role: institution.authority_role,
      authority_title: institution.authority_title,
      initial_admin: {
        login_id: existing.actor.login_identifier,
        user_id: deanUser.id,
        profile_id: existing.profile.id,
        full_name: existing.profile.full_name,
        actor_type: "dean",
        pin: null,
      },
      provisioning: { job_id: job.id, status: "active", recovered: true },
      credential_recovery_required: true,
    };
  }
  if (job.status === "active") throw new Error("DEAN_ACTIVE_JOB_IDENTITY_MISSING");

  const pin = String((crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000);
  const { data: result, error: provisionError } = await admin.rpc("complete_actor_onboarding", {
    p_auth_user_id: deanUser.id,
    p_authority_user_id: rootUser.id,
    p_provisioned_by_user_id: rootUser.id,
    p_expected_authority_role: institution.authority_role,
    p_actor_type: "dean",
    p_school_id: null,
    p_institution_id: institution.institution_id,
    p_full_name: request.dean_name,
    p_pin: pin,
    p_email: null,
    p_phone: request.dean_phone || null,
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

  const after = await readDean(admin, deanUser.id);
  if (provisionError || !result?.success) {
    if (after.profile && after.actor && assertDeanMatches(after, job, request, rootUser)) {
      await finishJob(admin, job.id, after.actor.id);
      return {
        success: true,
        institution_id: institution.institution_id,
        school_id: institution.school_id,
        institution_name: institution.institution_name,
        url_slug: institution.url_slug,
        institution_path: institution.institution_path,
        authority_role: institution.authority_role,
        authority_title: institution.authority_title,
        initial_admin: {
          login_id: after.actor.login_identifier,
          user_id: deanUser.id,
          profile_id: after.profile.id,
          full_name: after.profile.full_name,
          actor_type: "dean",
          pin: null,
        },
        provisioning: { job_id: job.id, status: "active", recovered: true },
        credential_recovery_required: true,
      };
    }
    await admin.from("actor_provisioning_jobs").update({
      status: "recovery_required", stage: "profile",
      last_error_code: "INITIAL_DEAN_PROVISIONING_FAILED",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    throw new Error("INITIAL_DEAN_PROVISIONING_FAILED");
  }

  if (!after.profile || !after.actor || !assertDeanMatches(after, job, request, rootUser)) {
    await admin.from("actor_provisioning_jobs").update({
      status: "recovery_required", stage: "authority",
      last_error_code: "DEAN_POST_PROVISION_VERIFICATION_FAILED",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    throw new Error("DEAN_POST_PROVISION_VERIFICATION_FAILED");
  }
  await finishJob(admin, job.id, after.actor.id);
  return {
    success: true,
    institution_id: institution.institution_id,
    school_id: institution.school_id,
    institution_name: institution.institution_name,
    url_slug: institution.url_slug,
    institution_path: institution.institution_path,
    authority_role: institution.authority_role,
    authority_title: institution.authority_title,
    initial_admin: { ...result, pin },
    provisioning: { job_id: job.id, status: "active", recovered: false },
    credential_recovery_required: false,
  };
}
