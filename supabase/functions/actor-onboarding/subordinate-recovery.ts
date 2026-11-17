import type { User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ProvisionInput = {
  callerUserId: string;
  rootAuthorityUserId: string;
  expectedAuthorityRole: string;
  actorType: string;
  institutionId: string;
  schoolId: string | null;
  body: Record<string, unknown>;
};

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
    if (error) throw new Error("ACTOR_AUTH_LOOKUP_FAILED");
    const users = data?.users || [];
    const match = users.find((user: User) => norm(user.email) === norm(email));
    if (match) return match;
    if (users.length < 1000) return null;
  }
  throw new Error("ACTOR_AUTH_LOOKUP_FAILED");
};

const safePayload = (input: ProvisionInput) => {
  const b = input.body;
  return {
    actor_type: input.actorType,
    institution_id: input.institutionId,
    school_id: input.schoolId,
    full_name: text(b.full_name),
    email: text(b.email),
    phone: text(b.phone),
    student_id: text(b.student_id),
    class_id: text(b.class_id),
    class_subject_ids: Array.isArray(b.class_subject_ids) ? b.class_subject_ids :
      (b.class_subject_id ? [b.class_subject_id] : []),
    gender: text(b.gender),
    date_of_birth: text(b.date_of_birth),
    relationship: text(b.relationship || "Parent"),
    is_primary: b.is_primary !== false,
    faculty_id: text(b.faculty_id),
    department_id: text(b.department_id),
    title: text(b.title),
    rank: text(b.rank),
    specialization: text(b.specialization),
    is_graduate_student_supervisor: b.is_graduate_student_supervisor === true,
    max_students: Number.isInteger(b.max_students) ? b.max_students : null,
  };
};

const getOrCreateJob = async (admin: any, input: ProvisionInput, payload: any) => {
  const fingerprint = await sha256(JSON.stringify({
    caller_user_id: input.callerUserId,
    root_authority_user_id: input.rootAuthorityUserId,
    expected_authority_role: input.expectedAuthorityRole,
    ...payload,
  }));
  // A deterministic key makes a retry of the same provision request converge on one job.
  const idempotencyKey = stableUuid(await sha256(input.callerUserId + ":" + fingerprint));
  const { data: existing, error: readError } = await admin.from("actor_provisioning_jobs")
    .select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (readError) throw new Error("ACTOR_RECOVERY_LEDGER_READ_FAILED");
  if (existing) {
    if (existing.request_fingerprint !== fingerprint ||
      existing.institution_id !== input.institutionId ||
      existing.requested_by_user_id !== input.callerUserId ||
      existing.root_authority_user_id !== input.rootAuthorityUserId ||
      existing.actor_type !== input.actorType) {
      throw new Error("ACTOR_REQUEST_FINGERPRINT_CONFLICT");
    }
    return existing;
  }

  const { data: inserted, error: insertError } = await admin.from("actor_provisioning_jobs").insert({
    idempotency_key: idempotencyKey,
    request_fingerprint: fingerprint,
    institution_id: input.institutionId,
    requested_by_user_id: input.callerUserId,
    root_authority_user_id: input.rootAuthorityUserId,
    actor_type: input.actorType,
    status: "pending_auth",
    stage: "auth",
    attempt_count: 0,
    request_payload: payload,
  }).select("*").single();
  if (!insertError && inserted) return inserted;

  // Unique idempotency key resolves concurrent first attempts without creating a second job.
  const { data: raced, error: raceError } = await admin.from("actor_provisioning_jobs")
    .select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (raceError || !raced || raced.request_fingerprint !== fingerprint) {
    throw new Error("ACTOR_RECOVERY_LEDGER_CREATE_FAILED");
  }
  return raced;
};

const readIdentity = async (admin: any, userId: string) => {
  const [{ data: profile, error: profileError }, { data: actor, error: actorError }] = await Promise.all([
    admin.from("profiles").select("id,user_id,institution_id,school_id,full_name,role,authority_user_id")
      .eq("user_id", userId).maybeSingle(),
    admin.from("identity_actors")
      .select("id,auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,status,authority_user_id")
      .eq("auth_user_id", userId).maybeSingle(),
  ]);
  if (profileError || actorError) throw new Error("ACTOR_IDENTITY_LOOKUP_FAILED");
  return { profile, actor };
};

const assertIdentity = (identity: any, job: any, payload: any, input: ProvisionInput) => {
  const { profile, actor } = identity;
  if (!profile && !actor) return false;
  if (!profile || !actor) throw new Error("ACTOR_IDENTITY_PARTIAL_STATE");
  if (
    profile.user_id !== job.target_auth_user_id ||
    actor.auth_user_id !== job.target_auth_user_id ||
    profile.institution_id !== input.institutionId ||
    actor.institution_id !== input.institutionId ||
    profile.school_id !== (input.schoolId ?? null) ||
    actor.school_id !== (input.schoolId ?? null) ||
    profile.role !== input.actorType ||
    actor.actor_type !== input.actorType ||
    actor.status !== "active" ||
    profile.authority_user_id !== input.rootAuthorityUserId ||
    actor.authority_user_id !== input.rootAuthorityUserId ||
    norm(profile.full_name) !== norm(payload.full_name) ||
    !actor.actor_record_id || !actor.login_identifier
  ) throw new Error("ACTOR_IDENTITY_CONFLICT");
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
  if (error) throw new Error("ACTOR_RECOVERY_COMPLETION_PERSIST_FAILED");
};

const markRecoveryRequired = async (admin: any, jobId: string, errorCode: string) => {
  const { error } = await admin.from("actor_provisioning_jobs").update({
    status: "recovery_required",
    stage: "authority",
    last_error_code: errorCode,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);
  if (error) throw new Error("ACTOR_RECOVERY_LEDGER_UPDATE_FAILED");
};

const buildRpcArgs = (input: ProvisionInput, payload: any, authUserId: string, pin: string) => ({
  p_auth_user_id: authUserId,
  p_authority_user_id: input.rootAuthorityUserId,
  p_expected_authority_role: input.expectedAuthorityRole,
  p_actor_type: input.actorType,
  p_school_id: input.schoolId,
  p_institution_id: input.institutionId,
  p_full_name: payload.full_name,
  p_pin: pin,
  p_email: payload.email || null,
  p_phone: payload.phone || null,
  p_student_id: payload.student_id || null,
  p_class_id: payload.class_id || null,
  p_class_subject_ids: payload.class_subject_ids.length ? payload.class_subject_ids : null,
  p_gender: payload.gender || null,
  p_date_of_birth: payload.date_of_birth || null,
  p_relationship: payload.relationship,
  p_is_primary: payload.is_primary,
  p_faculty_id: payload.faculty_id || null,
  p_department_id: payload.department_id || null,
  p_title: payload.title || null,
  p_rank: payload.rank || null,
  p_specialization: payload.specialization || null,
  p_is_graduate_student_supervisor: payload.is_graduate_student_supervisor,
  p_max_students: payload.max_students,
  p_provisioned_by_user_id: input.callerUserId,
});

export async function provisionSubordinateActor(admin: any, input: ProvisionInput) {
  const payload = safePayload(input);
  if (!payload.full_name) throw new Error("FULL_NAME_REQUIRED");
  const job = await getOrCreateJob(admin, input, payload);
  const nextAttempt = Number(job.attempt_count || 0) + 1;
  const { error: attemptError } = await admin.from("actor_provisioning_jobs").update({
    attempt_count: nextAttempt,
    status: job.target_auth_user_id ? "pending_profile" : "pending_auth",
    stage: job.target_auth_user_id ? "profile" : "auth",
    completed_at: null,
    last_error_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  if (attemptError) throw new Error("ACTOR_RECOVERY_LEDGER_UPDATE_FAILED");

  const deterministicEmail = "actor-" + job.id + "@accounts.sefaes.invalid";
  let authUser: User | null = null;
  if (job.target_auth_user_id) {
    const { data, error } = await admin.auth.admin.getUserById(job.target_auth_user_id);
    if (error || !data?.user || norm(data.user.email) !== norm(deterministicEmail)) {
      await admin.from("actor_provisioning_jobs").update({
        status: "recovery_required", stage: "auth", last_error_code: "ACTOR_AUTH_IDENTITY_MISSING",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      throw new Error("ACTOR_AUTH_IDENTITY_MISSING");
    }
    authUser = data.user;
  } else {
    authUser = await findAuthUserByEmail(admin, deterministicEmail);
    if (!authUser) {
      const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(48)),
        byte => byte.toString(16).padStart(2, "0")).join("");
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: deterministicEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          actor_type: input.actorType,
          institution_id: input.institutionId,
          provisioning_job_id: job.id,
        },
      });
      if (createError && !created?.user) authUser = await findAuthUserByEmail(admin, deterministicEmail);
      else authUser = created?.user || await findAuthUserByEmail(admin, deterministicEmail);
      if (!authUser) {
        await admin.from("actor_provisioning_jobs").update({
          status: "recovery_required", stage: "auth", last_error_code: "ACTOR_AUTH_CREATE_FAILED",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        throw new Error("ACTOR_AUTH_CREATE_FAILED");
      }
    }
    const { error: linkError } = await admin.from("actor_provisioning_jobs").update({
      target_auth_user_id: authUser.id,
      status: "pending_profile",
      stage: "profile",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    if (linkError) throw new Error("ACTOR_AUTH_LINK_PERSIST_FAILED");
    job.target_auth_user_id = authUser.id;
  }

  const before = await readIdentity(admin, authUser.id);
  if (before.profile || before.actor) {
    try {
      if (!assertIdentity(before, job, payload, input)) throw new Error("ACTOR_IDENTITY_CONFLICT");
    } catch (error) {
      await markRecoveryRequired(admin, job.id, "ACTOR_IDENTITY_CONFLICT");
      throw error;
    }
    await finishJob(admin, job.id, before.actor.id);
    return {
      success: true,
      actor_type: input.actorType,
      user_id: authUser.id,
      profile_id: before.profile.id,
      login_id: before.actor.login_identifier,
      full_name: before.profile.full_name,
      authority_user_id: input.rootAuthorityUserId,
      provisioning: { job_id: job.id, status: "active", recovered: true },
      pin_not_reissued: true,
      pin: null,
    };
  }
  if (job.status === "active") {
    await admin.from("actor_provisioning_jobs").update({
      status: "recovery_required",
      stage: "authority",
      last_error_code: "ACTOR_ACTIVE_JOB_IDENTITY_MISSING",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    throw new Error("ACTOR_ACTIVE_JOB_IDENTITY_MISSING");
  }

  const pinLength = ["student", "parent"].includes(input.actorType) ? 4 : 6;
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  const pin = String((randomValue % (pinLength === 4 ? 9000 : 900000)) + (pinLength === 4 ? 1000 : 100000));
  const { data: result, error: provisionError } = await admin.rpc(
    "complete_actor_onboarding", buildRpcArgs(input, payload, authUser.id, pin),
  );

  const after = await readIdentity(admin, authUser.id);
  if (provisionError || !result?.success) {
    if (after.profile && after.actor) {
      try {
        assertIdentity(after, job, payload, input);
      } catch (identityError) {
        await markRecoveryRequired(admin, job.id, "ACTOR_IDENTITY_CONFLICT");
        throw identityError;
      }
      await finishJob(admin, job.id, after.actor.id);
      return {
        success: true,
        actor_type: input.actorType,
        user_id: authUser.id,
        profile_id: after.profile.id,
        login_id: after.actor.login_identifier,
        full_name: after.profile.full_name,
        authority_user_id: input.rootAuthorityUserId,
        provisioning: { job_id: job.id, status: "active", recovered: true },
        pin_not_reissued: true,
        pin: null,
      };
    }
    await admin.from("actor_provisioning_jobs").update({
      status: "recovery_required",
      stage: "profile",
      last_error_code: "ACTOR_PROVISIONING_RETRYABLE_FAILURE",
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    throw new Error(provisionError?.message || "ACTOR_PROVISIONING_FAILED");
  }

  if (!after.profile || !after.actor) {
    await markRecoveryRequired(admin, job.id, "ACTOR_POST_PROVISION_VERIFICATION_FAILED");
    throw new Error("ACTOR_POST_PROVISION_VERIFICATION_FAILED");
  }
  try {
    assertIdentity(after, job, payload, input);
  } catch (identityError) {
    await markRecoveryRequired(admin, job.id, "ACTOR_IDENTITY_CONFLICT");
    throw identityError;
  }

  await finishJob(admin, job.id, after.actor.id);
  return {
    ...result,
    pin,
    authority_user_id: input.rootAuthorityUserId,
    provisioning: { job_id: job.id, status: "active", recovered: false },
    pin_not_reissued: false,
  };
}
