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
const ledger = readFileSync(
  new URL("../supabase/migrations/20261117130000_oir01_actor_provisioning_recovery_ledger.sql", import.meta.url),
  "utf8",
);

describe("DEAN-RECOVERY-01", () => {
  it("routes initial higher-institution Dean creation through the recovery engine", () => {
    const start = edge.indexOf('if (action === "bootstrap_higher_institution")');
    const end = edge.indexOf('if (action === "bootstrap_school_institution")', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const handler = edge.slice(start, end);
    expect(handler).toContain("provisionInitialDean(admin, callerData.user, body)");
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
    expect(recovery).toContain("credential_recovery_required: true");
  });

  it("retains Auth and actor references and prevents a second initial Dean job per institution", () => {
    expect(ledger).toContain("target_auth_user_id uuid references auth.users(id) on delete restrict");
    expect(ledger).toContain("identity_actor_id uuid references public.identity_actors(id) on delete restrict");
    expect(ledger).toContain("actor_provisioning_jobs_one_initial_dean_per_institution_idx");
  });
});
