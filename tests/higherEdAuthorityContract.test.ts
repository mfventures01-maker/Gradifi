import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../supabase/migrations/20261116120000_vc_rector_higher_ed_authority.sql");
const edge = read("../supabase/functions/actor-onboarding/index.ts");
const registration = read("../src/pages/onboarding/HigherInstitutionRegistration.tsx");
const higherEdAdmin = read("../src/pages/onboarding/HigherEducationOnboarding.tsx");
const higherEdStudentMigration = read("../supabase/migrations/20261116160000_higher_ed_student_class_optional.sql");
const deterministicDepartmentsMigration = read("../supabase/migrations/20261116170000_deterministic_hod_adviser_departments.sql");
const higherEdDashboard = read("../src/pages/higher-education/HigherEducationDashboard.tsx");
const authGuard = read("../src/components/AuthGuard.tsx");
const actorService = read("../src/services/actorOnboardingService.ts");
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
    expect(higherEdAdmin).toContain('role === "adviser" ? adviserDepartments : nucDepartments');
  });

  it("makes HOD and Adviser department choice deterministic through faculty selection", () => {
    expect(higherEdAdmin).toContain('db.from("nuc_faculties")');
    expect(higherEdAdmin).toContain('db.from("faculties")');
    expect(higherEdAdmin).toContain('select("id,name,code,faculty_id")');
    expect(higherEdAdmin).toContain('id="department-faculty"');
    expect(higherEdAdmin).toContain('item.faculty_id === facultyId');
    expect(higherEdAdmin).toContain('item.code ? `${item.code} · ` : ""');
    expect(higherEdAdmin).toContain('setFacultyId(event.target.value); setDepartmentId("");');
    expect(deterministicDepartmentsMigration).toContain("nd.faculty_id = p_faculty_id");
    expect(deterministicDepartmentsMigration).toContain("d.faculty_id = p_faculty_id");
    expect(deterministicDepartmentsMigration).toContain("nf.institution_id is null or nf.institution_id = p_institution_id");
    expect(deterministicDepartmentsMigration).toContain("f.institution_id = p_institution_id");
    expect(deterministicDepartmentsMigration).toContain("NUC_DEPARTMENT_NOT_IN_SELECTED_FACULTY");
    expect(deterministicDepartmentsMigration).toContain("DEPARTMENT_NOT_IN_SELECTED_FACULTY");
  });

  it("uses the institution bootstrap Main Campus for lecturer and student records", () => {
    expect(higherEdAdmin).toContain('school_type === "tertiary" && / main campus$/i');
    expect(higherEdAdmin).toContain('school_id: ["student", "lecturer"].includes(role) ? bootstrapCampus!.id : null');
    expect(higherEdAdmin).toContain("This is the campus record created by VC/Rector institution registration.");
  });

  it("keeps higher-ed student class assignment optional without relaxing school onboarding", () => {
    expect(higherEdStudentMigration).toContain("p_expected_authority_role = 'principal_admin'");
    expect(higherEdStudentMigration).toContain("elsif p_class_id is not null and not exists");
    expect(higherEdAdmin).toContain('Class / academic cohort');
    expect(higherEdAdmin).not.toContain('role === "student" && !classId');
  });

  it("surfaces structured Edge Function errors to the Dean form", () => {
    expect(actorService).toContain("response.clone().json()");
    expect(actorService).toContain("payload?.error");
    expect(actorService).toContain("body: { ...input }");
  });

  it("shows generated credentials and a session account summary after provisioning", () => {
    expect(higherEdAdmin).toContain("Generated Login ID");
    expect(higherEdAdmin).toContain("Temporary {latestAccount.actor_type === \"student\" ? \"4\" : \"6\"}-digit PIN");
    expect(higherEdAdmin).toContain("Accounts created this session");
    expect(higherEdAdmin).toContain("View credentials");
    expect(higherEdAdmin).toContain("account provisioned successfully.");
    expect(higherEdAdmin).toContain("navigator.clipboard.writeText(value)");
    expect(higherEdAdmin).toContain("must replace the temporary PIN at first sign-in.");
  });

  it("allows VC and Rector identities through the higher-education portal guard", () => {
    expect(authGuard).toContain("'/portal/higher-education': ['vice_chancellor', 'rector', 'dean', 'hod', 'adviser', 'lecturer']");
  });

  it("gives the Dean a direct route into academic account administration", () => {
    expect(higherEdDashboard).toContain('identity?.role === "dean"');
    expect(higherEdDashboard).toContain('to="/onboarding/higher-education"');
    expect(higherEdDashboard).toContain("Manage academic accounts");
  });

  it("routes VC and Rector email identities to the higher-education portal", () => {
    expect(login).toContain("vice_chancellor', 'rector'");
  });

  it("uses the authority email for verification and does not require a Dean email", () => {
    expect(registration).toContain("authority_email");
    expect(registration).not.toContain("dean_email");
  });
});
