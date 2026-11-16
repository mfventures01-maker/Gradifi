import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../supabase/migrations/20261116120000_vc_rector_higher_ed_authority.sql");
const edge = read("../supabase/functions/actor-onboarding/index.ts");
const registration = read("../src/pages/onboarding/HigherInstitutionRegistration.tsx");
const higherEdAdmin = read("../src/pages/onboarding/HigherEducationOnboarding.tsx");
const login = read("../src/pages/auth/LoginPage.tsx");

describe("higher-education VC/Rector authority contract", () => {
  it("maps universities to Vice-Chancellors and Rector-led institutions to Rectors", () => {
    expect(migration).toContain("case when p_institution_type = 'university' then 'vice_chancellor' else 'rector' end");
  });

  it("does not alter the existing school bootstrap contract", () => {
    expect(migration).not.toContain("bootstrap_school_institution");
    expect(edge).toContain('action === "bootstrap_school_institution"');
    expect(edge).toContain("p_principal_email: suppliedEmail");
  });

  it("creates the executive authority with email authentication and no PIN", () => {
    expect(migration).toContain("v_email,'email','active',null,now(),0,null");
    expect(migration).toContain("v_authority_role");
  });

  it("provisions the Dean as a generated-ID PIN administrator", () => {
    expect(edge).toContain('p_actor_type: "dean"');
    expect(edge).toContain("p_pin: pin");
    expect(migration).toContain("'dean','hod','adviser','lecturer'");
    expect(migration).toContain("PIN_AUTHENTICATION_NOT_ALLOWED_FOR_ROLE");
  });

  it("binds every higher-ed subordinate to the VC/Rector authority user", () => {
    expect(edge).toContain("rootAuthorityUserId = deanActor.authority_user_id");
    expect(edge).toContain("p_authority_user_id: rootAuthorityUserId");
    expect(migration).toContain("set authority_user_id = p_authority_user_id");
  });

  it("limits executive provisioning to the Dean and delegates operational provisioning to the Dean", () => {
    expect(edge).toContain('permittedActorTypes = ["dean"]');
    expect(edge).toContain('permittedActorTypes = ["hod", "adviser", "lecturer", "student"]');
    expect(higherEdAdmin).toContain("identity.role !== \"dean\"");
    expect(higherEdAdmin).not.toContain("setStudentId(");
    expect(higherEdAdmin).toContain('db.from("departments")');
    expect(higherEdAdmin).toContain('(role === "adviser" ? adviserDepartments : nucDepartments)');
  });

  it("routes VC and Rector email identities to the higher-education portal", () => {
    expect(login).toContain("vice_chancellor', 'rector'");
  });

  it("uses the authority email for verification and does not require a Dean email", () => {
    expect(registration).toContain("authority_email");
    expect(registration).not.toContain("dean_email");
  });
});
