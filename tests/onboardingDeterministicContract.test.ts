import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Gradifi deterministic onboarding contract', () => {
  const migration = read('supabase/migrations/20261105180000_gradifi_deterministic_onboarding_v1.sql');
  const service = read('src/services/onboardingService.ts');
  const wizard = read('src/pages/onboarding/OnboardingWizard.tsx');
  const student = read('src/pages/onboarding/CreateStudent.tsx');
  const staffForm = read('src/pages/onboarding/CreateStaffAccount.tsx');
  const teacherForm = read('src/pages/onboarding/CreateTeacher.tsx');
  const vpForm = read('src/pages/onboarding/CreateVP.tsx');
  const bursarForm = read('src/pages/onboarding/CreateBursar.tsx');
  const staffEdge = read('supabase/functions/gradifi-staff-provision/index.ts');
  const pinEdge = read('supabase/functions/pin-login/index.ts');

  it('binds principal provisioning to a confirmed authenticated Supabase identity', () => {
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('email_confirmed_at');
    expect(migration).toContain('PRINCIPAL_EMAIL_MUST_MATCH_AUTHENTICATED_USER');
    expect(migration).toContain("member_role='principal'");
    expect(migration).toContain("provisioning_status='active'");
    expect(migration).toContain('gradifi_school_memberships');
  });

  it('creates persisted class and subject relationships inside the provisioning transaction', () => {
    expect(migration).toContain('insert into public.classes');
    expect(migration).toContain('insert into public.subject_catalog');
    expect(migration).toContain('insert into public.class_subjects');
    expect(migration).toContain('add column if not exists state text');
    expect(migration).toContain('add column if not exists lga text');
    expect(migration).toContain('create policy schools_select_active_school_admin');
    expect(migration).toContain('create policy institutions_select_active_school_admin');
    expect(migration).toContain('create policy gradifi_school_memberships_select_scoped');
    expect(migration).toContain('select c.id into v_class_id');
  });

  it('exposes only authenticated tenant-scoped onboarding RPCs', () => {
    expect(migration).toContain('grant execute on function public.gradifi_bootstrap_institution(jsonb) to authenticated');
    expect(migration).toContain('grant execute on function public.gradifi_create_student(uuid,text,text,text,date) to authenticated');
    expect(migration).toContain('ACTIVE_PRINCIPAL_REQUIRED');
    expect(migration).toContain('SCHOOL_ACCESS_DENIED');
    expect(migration).toContain('revoke execute on function public.create_institution_account');
    expect(migration).toContain('revoke execute on function public.enroll_student');
  });

  it('fails closed when server provisioning returns errors or incomplete identifiers', () => {
    expect(service).toContain("supabase.rpc('gradifi_bootstrap_institution'");
    expect(service).toContain('requireUuid(result.institution_id');
    expect(service).toContain("supabase.rpc('gradifi_create_student'");
    expect(service).toContain("supabase.functions.invoke('gradifi-staff-provision'");
    expect(service).not.toMatch(/Date\.now\(\)|Math\.random\(\)|sch_demo_01|inst_demo_01/);
  });

  it('does not accept demo identifiers or fabricate class records in the wizard/student flow', () => {
    expect(wizard).not.toMatch(/sch_demo_01|inst_demo_01|sch_[a-z]+_demo|inst_[a-z]+_demo/);
    expect(wizard).toContain("JSON.stringify({...formData,password:''})");
    expect(wizard).not.toContain('JSON.stringify(formData)');
    expect(student).not.toMatch(/cls_jss1|sch_demo_01|DEFAULT_CLASSES|Math\.random\(\)/);
    expect(student).toContain('onboardingService.getSchoolClasses');
  });

  it('routes teacher, vice-principal and bursar forms through the shared server provisioning component', () => {
    for (const source of [teacherForm, vpForm, bursarForm]) {
      expect(source).toContain('CreateStaffAccount');
      expect(source).not.toMatch(/sch_demo_01|inst_demo_01|Math\\.random\\(\\)/);
    }
    expect(staffForm).toContain('onboardingService.createStaffAccount');
    expect(staffForm).toContain('An authenticated principal with an active school membership is required.');
  });

  it('creates staff Auth identities server-side and rolls back an orphaned Auth user on RPC failure', () => {
    expect(staffEdge).toContain('auth.admin.inviteUserByEmail');
    expect(staffEdge).toContain('gradifi_create_staff_profile');
    expect(staffEdge).toContain('auth.admin.deleteUser');
    expect(staffEdge).toContain('principalClient.auth.getUser');
  });

  it('exchanges a PIN for a real Supabase session, never a fabricated token', () => {
    expect(pinEdge).toContain('verifyOtp');
    expect(pinEdge).toContain('verified.session.access_token');
    expect(pinEdge).not.toMatch(/jwt_\$\{|ref_\$\{|action_link \|\| authData\.token/);
  });
});
