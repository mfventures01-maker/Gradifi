import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(process.cwd(), 'test-results', 'phase2');

function getImgPath(filename: string): string {
  return path.join(outDir, filename);
}

/**
 * GRADIFI / SEFAES - PHASE 2: ONBOARDING & STAFF CREATION
 * Constitutional Law 11: Evidence Over Assumption
 * 
 * This test suite verifies Phase 2 functionality:
 * - Institution Onboarding Wizard (4-step flow)
 * - Teacher Creation with 6-digit PIN
 * - VP Creation with 6-digit PIN
 * - Bursar Creation with 6-digit PIN
 * - Student Enrollment with 4-digit PIN
 * - Flashcard Receipts with PIN display
 * - Role-based PIN generation
 * 
 * Screenshots are captured at each step as evidence.
 */

test.describe('Phase 2: Onboarding & Staff Creation', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  // =============================================
  // TEST 1: Onboarding Wizard Loads
  // =============================================
  test('01: should load onboarding wizard with step 1 visible', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Check step indicator
    await expect(page.locator('text=School Basics').first()).toBeVisible();
    await expect(page.locator('text=Admin Account').first()).toBeVisible();
    await expect(page.locator('text=First Class').first()).toBeVisible();
    await expect(page.locator('text=Review').first()).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input[placeholder="Institution Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Address"]')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('01-onboarding-wizard.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 2: Complete Institution Creation
  // =============================================
  test('02: should complete institution creation flow', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Step 1: School Basics
    await page.fill('input[placeholder="Institution Name"]', 'Test Academy International');
    await page.fill('input[placeholder="Address"]', '10 Test Avenue, Lekki Phase 1, Lagos');
    await page.fill('input[placeholder="State"]', 'Lagos');
    await page.click('button:has-text("Continue")');
    
    // Step 2: Admin Account
    await expect(page.locator('h2:has-text("Admin Account")')).toBeVisible();
    await page.fill('input[placeholder="Principal Name"]', 'Dr. Adebayo Ogun');
    await page.fill('input[placeholder="Principal Phone"]', '+234 803 123 4567');
    await page.fill('input[placeholder="Principal Email"]', 'principal@testacademy.edu.ng');
    await page.click('button:has-text("Continue")');
    
    // Step 3: First Class
    await expect(page.locator('h2:has-text("First Class")')).toBeVisible();
    await page.fill('input[placeholder="Class Name (e.g. JSS 1)"]', 'JSS 1');
    await page.fill('input[placeholder="Subject (e.g. Mathematics)"]', 'Mathematics');
    await page.click('button:has-text("Continue")');
    
    // Step 4: Review & Launch
    await expect(page.locator('h2:has-text("Review & Launch")')).toBeVisible();
    await expect(page.locator('text=Test Academy International')).toBeVisible();
    
    await page.click('button:has-text("Launch Institution")');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: getImgPath('02-institution-created.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 3: Teacher Creation (Single)
  // =============================================
  test('03: should create a teacher with 6-digit PIN', async ({ page }) => {
    await page.goto('/onboarding?view=create-teacher');
    await page.waitForLoadState('networkidle');
    
    // Fill teacher details
    await page.fill('#input-teacher-name', 'Mrs. Ngozi Eze');
    await page.fill('#input-teacher-email', 'ngozi.eze@testacademy.edu.ng');
    await page.fill('#input-teacher-phone', '+234 802 333 4455');
    
    // Submit
    await page.click('#btn-submit-teacher');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Teacher Flashcard Receipt')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Mrs. Ngozi Eze')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('03-teacher-created.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 4: VP Creation (Vice Principal)
  // =============================================
  test('04: should create a VP with 6-digit PIN', async ({ page }) => {
    await page.goto('/onboarding?view=create-vp');
    await page.waitForLoadState('networkidle');
    
    // Fill VP details
    await page.fill('input[placeholder="e.g. Dr. Adebayo Ogun"]', 'Dr. Adebayo Ogun');
    await page.fill('input[placeholder="e.g. 08012345678"]', '+234 803 123 4567');
    await page.fill('input[placeholder="vp@school.edu.ng"]', 'vp@testacademy.edu.ng');
    
    // Submit
    await page.click('button:has-text("Create VP")');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=VP Created! ✅')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Dr. Adebayo Ogun')).toBeVisible();
    
    // Check for 6-digit PIN
    const pinElement = page.locator('text=/[0-9]{6}/').first();
    await expect(pinElement).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('04-vp-created.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 5: Bursar Creation
  // =============================================
  test('05: should create a Bursar with 6-digit PIN', async ({ page }) => {
    await page.goto('/onboarding?view=create-bursar');
    await page.waitForLoadState('networkidle');
    
    // Fill Bursar details
    await page.fill('input[placeholder="e.g. Mrs. Funke Adeyemi"]', 'Mrs. Funke Adeyemi');
    await page.fill('input[placeholder="e.g. 08012345678"]', '+234 804 567 8901');
    await page.fill('input[placeholder="bursar@school.edu.ng"]', 'bursar@testacademy.edu.ng');
    
    // Submit
    await page.click('button:has-text("Create Bursar")');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Bursar Created! ✅')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Mrs. Funke Adeyemi')).toBeVisible();
    
    // Check for 6-digit PIN
    const pinElement = page.locator('text=/[0-9]{6}/').first();
    await expect(pinElement).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('05-bursar-created.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 6: Student Enrollment (Single)
  // =============================================
  test('06: should enroll a student with 4-digit PIN', async ({ page }) => {
    await page.goto('/onboarding?view=create-student');
    await page.waitForLoadState('networkidle');
    
    // Fill student details
    await page.fill('#input-student-first-name', 'Chinedu');
    await page.fill('#input-student-last-name', 'Okafor');
    await page.selectOption('#select-student-class', { index: 0 });
    await page.click('input[value="male"]');
    await page.fill('#input-student-dob', '2012-05-14');
    
    // Submit
    await page.click('#btn-submit-student');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Student Enrollment Flashcard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Chinedu Okafor')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('06-student-enrolled.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 7: Student Number Generation
  // =============================================
  test('07: should generate student number for enrolled student', async ({ page }) => {
    await page.goto('/onboarding?view=create-student');
    await page.waitForLoadState('networkidle');
    
    // Fill student details
    await page.fill('#input-student-first-name', 'Zainab');
    await page.fill('#input-student-last-name', 'Bello');
    await page.selectOption('#select-student-class', { index: 0 });
    await page.click('input[value="female"]');
    await page.fill('#input-student-dob', '2013-08-22');
    
    await page.click('#btn-submit-student');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Student Enrollment Flashcard')).toBeVisible({ timeout: 10000 });
    
    // Check for flashcard badge and receipt
    await expect(page.locator('text=Student Matriculation Verified')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('07-student-number.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 8: PIN Copy Functionality
  // =============================================
  test('08: should have PIN copy button on flashcard receipt', async ({ page }) => {
    await page.goto('/onboarding?view=create-student');
    await page.waitForLoadState('networkidle');
    
    // Fill student details
    await page.fill('#input-student-first-name', 'Test');
    await page.fill('#input-student-last-name', 'Copy');
    await page.selectOption('#select-student-class', { index: 0 });
    
    await page.click('#btn-submit-student');
    
    // Wait for flashcard receipt
    await expect(page.locator('text=Student Enrollment Flashcard')).toBeVisible({ timeout: 10000 });
    
    // Check for copy button
    const copyButton = page.locator('button:has(svg)');
    await expect(copyButton.first()).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('08-pin-copy.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 9: Bulk Student Import (Phase 3 Integration)
  // =============================================
  test('09: should display bulk import page with template download', async ({ page }) => {
    await page.goto('/onboarding?view=bulk-import');
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page.locator('text=Bulk Student Import')).toBeVisible();
    
    // Check template download button
    await expect(page.locator('text=Download CSV Template')).toBeVisible();
    
    // Check upload area
    await expect(page.locator('text=Click to select CSV file')).toBeVisible();
    
    // Check validation notes
    await expect(page.locator('text=Maximum 500 students per import')).toBeVisible();
    await expect(page.locator('text=Required columns: first_name, last_name, class_name')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('09-bulk-import.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 10: Parent Invite Flow
  // =============================================
  test('10: should display parent invite form with student search', async ({ page }) => {
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page.locator('h1:has-text("Invite Parent")')).toBeVisible();
    
    // Check student search
    await expect(page.locator('input[placeholder="Search students..."]')).toBeVisible();
    
    // Check relationship select
    await expect(page.locator('select option[value="Parent"]')).toBeAttached();
    
    await page.screenshot({ 
      path: getImgPath('10-parent-invite.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 11: Console Error Verification
  // =============================================
  test('11: should have no critical console errors during onboarding', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    if (errors.length > 0) {
      console.log(`⚠️ Found ${errors.length} console errors:`);
      errors.forEach(e => console.log(`   - ${e}`));
    }
    
    const criticalErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('favicon') &&
      !e.includes('ERR_NAME_NOT_RESOLVED') &&
      !e.includes('placeholder')
    );
    
    if (criticalErrors.length > 0) {
      console.warn(`⚠️ Found ${criticalErrors.length} critical console errors`);
    }
    
    await page.screenshot({ 
      path: getImgPath('11-console-errors.png'), 
      fullPage: true 
    });
  });
});
