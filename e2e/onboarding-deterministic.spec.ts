import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const requiredEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'ONBOARDING_E2E_SERVICE_ROLE_KEY',
  'ONBOARDING_E2E_EMAIL',
];

test('principal onboarding and student enrollment persist authoritative database records', async ({ page }) => {
  test.skip(requiredEnv.some((key) => !process.env[key]), 'Dedicated Supabase onboarding E2E secrets are not configured.');

  const url = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.ONBOARDING_E2E_SERVICE_ROLE_KEY!;
  const emailSeed = process.env.ONBOARDING_E2E_EMAIL!;
  const [localPart, domain] = emailSeed.split('@');
  if (!localPart || !domain) throw new Error('ONBOARDING_E2E_EMAIL must be a valid email address.');

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `${localPart}+onboarding-${Date.now()}@${domain}`;
  const password = `Gd!${randomUUID()}a9`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Onboarding E2E Principal' },
  });
  if (createError || !created.user) throw new Error(createError?.message || 'Could not create isolated E2E principal.');
  const userId = created.user.id;
  let institutionId: string | null = null;

  try {
    await page.goto('/login?next=%2Fonboarding');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/onboarding(?:\?|$)/);

    await page.getByLabel('Institution name').fill(`Onboarding E2E ${Date.now()}`);
    await page.getByLabel('Address').fill('1 E2E Verification Road');
    await page.getByLabel('State').fill('Delta');
    await page.getByLabel('LGA').fill('Sapele');
    await page.getByLabel('School phone').fill('+2348000000000');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Principal full name').fill('Onboarding E2E Principal');
    await page.getByLabel('Principal email').fill(email);
    await page.getByLabel('Principal phone').fill('+2348000000000');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('First class').fill('JSS 1');
    await page.getByLabel('First subject').fill('Mathematics');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Launch Institution' }).click();
    await expect(page).toHaveURL(/\/portal\/principal/);

    const { data: profile, error: profileError } = await admin
      .from('profiles').select('id,user_id,institution_id,school_id,email')
      .eq('user_id', userId).single();
    if (profileError || !profile) throw new Error(profileError?.message || 'Principal profile was not persisted.');
    institutionId = profile.institution_id;

    const [school, membership, classes, mapping, onboarding] = await Promise.all([
      admin.from('schools').select('id,provisioning_status,state,lga').eq('id', profile.school_id).single(),
      admin.from('gradifi_school_memberships').select('member_role,status').eq('school_id', profile.school_id).eq('user_id', userId).single(),
      admin.from('classes').select('id,name').eq('school_id', profile.school_id),
      admin.from('class_subjects').select('id,subject_id').eq('school_id', profile.school_id),
      admin.from('institution_onboarding').select('institution_created,school_created,classes_created,subjects_created,current_step').eq('institution_id', profile.institution_id).single(),
    ]);
    expect(school.error).toBeNull();
    expect(school.data?.provisioning_status).toBe('active');
    expect(school.data?.state).toBe('Delta');
    expect(school.data?.lga).toBe('Sapele');
    expect(membership.data).toMatchObject({ member_role: 'principal', status: 'active' });
    expect(classes.data?.length).toBeGreaterThanOrEqual(6);
    expect(mapping.data?.length).toBeGreaterThan(0);
    expect(onboarding.data).toMatchObject({
      institution_created: true, school_created: true, classes_created: true, subjects_created: true,
    });

    await page.goto('/onboarding?view=create-student');
    await page.getByLabel('First name').fill('E2E');
    await page.getByLabel('Last name').fill(`Student${Date.now()}`);
    await page.getByLabel('Class').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Enroll student' }).click();
    await expect(page.getByRole('heading', { name: 'Student Enrollment Confirmed' })).toBeVisible();

    const { data: students, error: studentsError } = await admin.from('students')
      .select('id,student_number,class_id').eq('school_id', profile.school_id).eq('first_name', 'E2E');
    expect(studentsError).toBeNull();
    expect(students?.length).toBe(1);
    expect(students?.[0].student_number).toBeTruthy();
  } finally {
    if (institutionId) await admin.from('institutions').delete().eq('id', institutionId);
    await admin.auth.admin.deleteUser(userId);
  }
});
