import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const edge = readFileSync(
  new URL("../supabase/functions/actor-onboarding/index.ts", import.meta.url),
  "utf8",
);
const recovery = readFileSync(
  new URL("../supabase/functions/actor-onboarding/dean-recovery.ts", import.meta.url),
  "utf8",
);
const subordinate = readFileSync(
  new URL("../supabase/functions/actor-onboarding/subordinate-recovery.ts", import.meta.url),
  "utf8",
);
const ledger = readFileSync(
  new URL("../supabase/migrations/20261117165144_oir01_actor_provisioning_recovery_ledger.sql", import.meta.url),
  "utf8",
);

describe("DEAN-RECOVERY-01", () => {
  it("routes initial higher-institution Dean creation through the recovery engine", () => {
    const start = edge.indexOf('if (action === "bootstrap_higher_institution")');
    const end = edge.indexOf('if (action === "bootstrap_school_institution")', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const handler = edge.slice(start, end);
    expect(handler).toContain("provisionInitialDean(admin, callerData.user, body, safeOnboardingError)");
    expect(handler).not.toContain("deleteUser");
  });

  it("prevents the generic actor endpoint from bypassing the initial Dean recovery path", () => {
    expect(edge).toContain('actorType === "dean"');
    expect(edge).toContain("DEAN_PROVISIONING_REQUIRES_ROOT_BOOTSTRAP");
  });

  it("derives a stable request identity and deterministic Auth email from the recovery job", () => {
    expect(recovery).toContain("stableUuid(await sha256(rootUser.id + \":\" + fingerprint))");
    expect(recovery).toContain('"dean-" + job.id + "@accounts.sefaes.invalid"');
    expect(recovery).toContain("listUsers({ page, perPage: 1000 })");
  });

  it("reuses and verifies the same institution, VC/Rector, Auth UUID and Dean authority link", () => {
    expect(recovery).toContain("resolveRoot(admin, rootUser, request)");
    expect(recovery).toContain("profile.institution_id !== actor.institution_id");
    expect(recovery).toContain("profile.authority_user_id !== rootUser.id");
    expect(recovery).toContain("actor.authority_user_id !== rootUser.id");
    expect(recovery).toContain("target_auth_user_id: deanUser.id");
  });

  it("preserves Auth identity after a failed profile/actor RPC and marks the operation resumable", () => {
    expect(recovery).not.toContain("deleteUser");
    expect(recovery).toContain('status: "recovery_required"');
    expect(recovery).toContain('stage: "profile"');
    expect(recovery).toContain("DEAN_AUTH_IDENTITY_MISSING");
  });

  it("does not replay the Dean insert when the same Auth identity already has a verified Dean actor", () => {
    expect(recovery).toContain("readDean(admin, deanUser.id)");
    expect(recovery).toContain("assertDeanMatches(existing, job, request, rootUser)");
    expect(recovery).toContain("pin_not_reissued: true");
  });

  it("retains Auth and actor references and prevents a second initial Dean job per institution", () => {
    expect(ledger).toContain("target_auth_user_id uuid references auth.users(id) on delete restrict");
    expect(ledger).toContain("identity_actor_id uuid references public.identity_actors(id) on delete restrict");
    expect(ledger).toContain("actor_provisioning_jobs_one_initial_dean_per_institution_idx");
  });
});


describe("OIR-01 subordinate actor recovery", () => {
  it("routes HOD, Adviser, Lecturer and Student provisioning through one durable recovery engine", () => {
    for (const role of ["hod", "adviser", "lecturer", "student"]) {
      expect(edge).toContain('"hod", "adviser", "lecturer", "student"');
      expect(subordinate).toContain('actor_type: input.actorType');
    }
    expect(edge).toContain("provisionSubordinateActor(admin,");
  });

  it("persists the idempotency job before creating any Auth identity", () => {
    expect(subordinate.indexOf("getOrCreateJob(admin, input, payload)"))
      .toBeLessThan(subordinate.indexOf("admin.auth.admin.createUser"));
    expect(subordinate).toContain("idempotency_key: idempotencyKey");
    expect(subordinate).toContain("request_fingerprint: fingerprint");
    expect(subordinate).toContain("target_auth_user_id: authUser.id");
  });

  it("never deletes an Auth identity after an uncertain provisioning outcome", () => {
    expect(subordinate).not.toContain("deleteUser");
    expect(subordinate).toContain('status: "recovery_required"');
    expect(subordinate).toContain("ACTOR_PROVISIONING_RETRYABLE_FAILURE");
  });

  it("keeps PINs, passwords and tokens out of the durable recovery payload", () => {
    const payloadBuilder = subordinate.slice(
      subordinate.indexOf("const safePayload"),
      subordinate.indexOf("const getOrCreateJob"),
    );
    expect(payloadBuilder).not.toMatch(/\b(pin|password|token|secret|hash)\b/i);
    expect(subordinate).toContain("pin_not_reissued: true");
    expect(subordinate).toContain("pin: null");
  });

  it("verifies Auth UUID, profile, identity actor, institution, authority and actor record before completion", () => {
    expect(subordinate).toContain("profile.user_id !== job.target_auth_user_id");
    expect(subordinate).toContain("actor.auth_user_id !== job.target_auth_user_id");
    expect(subordinate).toContain("profile.authority_user_id !== input.rootAuthorityUserId");
    expect(subordinate).toContain("actor.authority_user_id !== input.rootAuthorityUserId");
    expect(subordinate).toContain("!actor.actor_record_id || !actor.login_identifier");
    expect(subordinate).toContain("finishJob(admin, job.id, after.actor.id)");
  });

  it("uses the canonical atomic onboarding RPC and does not change the Dean recovery engine", () => {
    expect(subordinate).toContain('"complete_actor_onboarding"');
    expect(subordinate).toContain("p_provisioned_by_user_id: input.callerUserId");
    expect(recovery).toContain("provisionInitialDean");
  });
});
