import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const index = read("../supabase/functions/actor-onboarding/index.ts");
const dean = read("../supabase/functions/actor-onboarding/dean-recovery.ts");
const subordinate = read("../supabase/functions/actor-onboarding/subordinate-recovery.ts");

describe("actor-onboarding canonical source contract", () => {
  it("retains the deployed v10 institution lifecycle safeguard in root recovery", () => {
    expect(dean).toContain('.select("id,name,type,registration_number,country,address,phone,website_url,slug,status")');
    expect(dean).toContain('if (!["pending", "active"].includes(institution.status))');
    expect(dean).toContain('throw new Error("ROOT_INSTITUTION_STATUS_BLOCKED")');
    expect(dean).toContain('if (!institution.slug || campus.url_slug !== institution.slug || campus.slug !== institution.slug)');
    expect(dean).toContain('throw new Error("ROOT_INSTITUTION_SLUG_MISMATCH")');
    expect(dean).toContain('institution_path: "/institution/" + institution.slug');
    expect(index).toContain('"ROOT_INSTITUTION_STATUS_BLOCKED"');
    expect(index).toContain('"ROOT_INSTITUTION_SLUG_MISMATCH"');
  });

  it("routes subordinate actor creation through the canonical recovery module", () => {
    expect(index).toContain('import { provisionSubordinateActor } from "./subordinate-recovery.ts";');
    expect(index).toContain("await provisionSubordinateActor(admin,");
    expect(index).toContain('const higherEdRoles = ["dean", "hod", "adviser", "lecturer", "student"]');
    expect(index).toContain('permittedActorTypes = ["hod", "adviser", "lecturer", "student"]');
    expect(subordinate).toContain('"complete_actor_onboarding", buildRpcArgs(input, payload, authUser.id, pin)');
  });

  it("keeps subordinate recovery bound to the authenticated caller, root authority and institution", () => {
    expect(subordinate).toContain("requested_by_user_id: input.callerUserId");
    expect(subordinate).toContain("root_authority_user_id: input.rootAuthorityUserId");
    expect(subordinate).toContain("profile.authority_user_id !== input.rootAuthorityUserId");
    expect(subordinate).toContain("actor.authority_user_id !== input.rootAuthorityUserId");
    expect(subordinate).toContain("profile.institution_id !== input.institutionId");
    expect(subordinate).toContain("actor.institution_id !== input.institutionId");
    expect(subordinate).not.toContain("deleteUser");
  });
});
