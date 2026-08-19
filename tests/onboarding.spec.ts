import { test, expect } from '@playwright/test';

test.describe('SEFAES Onboarding Flow & Canonical RPC Sync', () => {
  test('should fill out CreateInstitution form and provision database state', async ({ page }) => {
    // 1. Navigate to Atomic Onboarding Page
    await page.goto('http://localhost:3000/?view=create-institution');
    await expect(page.locator('h1')).toContainText('Institution & Campus Registration');

    // 2. Fill out verified 14 fields
    await page.fill('#input-institution-name', "Priyaagwash Premier Academy");
    await page.selectOption('#select-institution-type', 'secondary');
    await page.fill('#input-reg-number', 'MOE/PRI/2026/001');
    await page.fill('#input-address', '10 Innovation Blvd, Lekki Phase 1');
    await page.selectOption('#select-state', 'Lagos');
    await page.fill('#input-lga', 'Eti-Osa');
    await page.fill('#input-email', 'info@priyaagwash.edu.ng');
    await page.fill('#input-phone', '+234 803 111 2233');
    await page.fill('#input-principal-name', 'Prof. Priya Agwash');
    await page.fill('#input-principal-phone', '+234 803 444 5566');
    await page.fill('#input-principal-email', 'principal@priyaagwash.edu.ng');

    // 3. Submit and invoke create_institution_account + initialize_secondary_classes
    await page.click('#btn-create-institution');

    // 4. Assert Success Modal & Provisioning
    await expect(page.locator('#btn-proceed-to-teachers')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Institution Provisioned Authoritatively!')).toBeVisible();

    // 5. Navigate to Teacher Registration
    await page.click('#btn-proceed-to-teachers');
    await expect(page.locator('h1')).toContainText('Teacher & Staff Registration');

    // 6. Fill Teacher Form
    await page.fill('#input-teacher-name', 'Dr. Ngozi Eze');
    await page.fill('#input-teacher-email', 'ngozi.eze@priyaagwash.edu.ng');
    await page.fill('#input-teacher-phone', '+234 802 333 4455');
    await page.click('#btn-submit-teacher');

    // 7. Verify Teacher Flashcard Receipt
    await expect(page.locator('text=Teacher Flashcard Receipt')).toBeVisible();
    await expect(page.locator('#btn-proceed-to-students')).toBeVisible();

    // 8. Navigate to Student Enrollment
    await page.click('#btn-proceed-to-students');
    await expect(page.locator('h1')).toContainText('Student Enrollment');

    // 9. Enroll Student
    await page.fill('#input-student-first-name', 'Chinedu');
    await page.fill('#input-student-last-name', 'Okafor');
    await page.click('#btn-submit-student');

    // 10. Verify Student Flashcard Receipt
    await expect(page.locator('text=Student Enrollment Flashcard')).toBeVisible();
    await expect(page.locator('#btn-proceed-to-portal')).toBeVisible();
  });
});
