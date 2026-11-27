import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const registration = read("../src/pages/onboarding/IndividualRegistration.tsx");
const service = read("../src/services/individualOnboardingService.ts");
const login = read("../src/pages/auth/LoginPage.tsx");
const dashboard = read("../src/pages/individual/IndividualDashboard.tsx");
const bootstrap = read("../supabase/migrations/20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix.sql");
const subordinate = read("../supabase/functions/actor-onboarding/subordinate-recovery.ts");
const actorEntry = read("../supabase/functions/actor-onboarding/index.ts");

describe("Individual onboarding authority and recovery contract", () => {
  it("supports freelancer and independent-student categories through the shared wizard", () => {
    expect(registration).toContain('value: "freelancer"');
    expect(registration).toContain('value: "independent_student"');
    expect(registration).toContain("view === 'individual'");
    expect(service).toContain('"freelancer"');
    expect(service).toContain('"independent_student"');
  });

  it("defers provisioning until a confirmed Auth session resumes the pending registration", () => {
    expect(registration).toContain("supabase.auth.getSession()");
    expect(registration).toContain("supabase.auth.onAuthStateChange");
    expect(registration).toContain("localStorage.setItem(PENDING_KEY");
    expect(registration).toContain("VERIFIED_EMAIL_REQUIRED");
    expect(registration).toContain("expectedEmail !== actualEmail");
    expect(registration).toContain("completePublicIndividualRegistration");
  });

  it("sends only the approved name and account type to the database authority", () => {
    expect(service).toContain('supabase.rpc("bootstrap_public_individual"');
    expect(service).toContain("p_full_name: fullName");
    expect(service).toContain("p_account_type: input.accountType");
    expect(service).not.toContain("p_auth_user_id");
    expect(service).not.toContain("p_workspace_id");
    expect(service).toContain("result.user_id !== input.authUserId");
    expect(service).toContain("result.workspace_id");
    expect(service).toContain("result.membership_id");
  });

  it("serializes concurrent confirmation callbacks and makes existing individual bootstrap idempotent", () => {
    expect(bootstrap).toContain("for update");
    expect(bootstrap).toContain("public.ensure_personal_workspace()");
    expect(bootstrap).toContain("on conflict (workspace_id) do nothing");
    expect(bootstrap).toContain("AUTH_IDENTITY_ALREADY_PROVISIONED");
    expect(bootstrap).toContain("and p.role = 'individual'");
    expect(bootstrap).toContain("and p.account_type = p_account_type");
  });

  it("rejects institution-linked or partially provisioned identities instead of reclassifying them", () => {
    expect(bootstrap).toContain("p.institution_id is null");
    expect(bootstrap).toContain("p.school_id is null");
    expect(bootstrap).toContain("ia.institution_id is null");
    expect(bootstrap).toContain("ia.school_id is null");
    expect(bootstrap).toContain("AUTH_IDENTITY_ALREADY_PROVISIONED");
    expect(bootstrap).toContain("'institution_id', null");
    expect(bootstrap).toContain("'school_id', null");
  });

  it("routes existing individual login to the individual dashboard without signup/bootstrap side effects", () => {
    expect(login).toContain("else if (role === 'individual') navigate('/portal/individual')");
    expect(dashboard).toContain('identity.role !== "individual"');
    expect(dashboard).toContain('navigate("/login", { replace: true })');
    expect(login).not.toContain("bootstrap_public_individual");
  });

  it("keeps subordinate actor retries on the idempotent recovery ledger", () => {
    expect(actorEntry).toContain("await provisionSubordinateActor(admin, {");
    expect(subordinate).toContain("getOrCreateJob(admin, input, payload)");
    expect(subordinate).toContain("idempotency_key: idempotencyKey");
    expect(subordinate).toContain("request_fingerprint: fingerprint");
    expect(subordinate).toContain('status: "recovery_required"');
    expect(subordinate).toContain("ACTOR_PROVISIONING_RETRYABLE_FAILURE");
    expect(subordinate).toContain("pin_not_reissued: true");
    expect(subordinate).toContain("pin: null");
  });
});
