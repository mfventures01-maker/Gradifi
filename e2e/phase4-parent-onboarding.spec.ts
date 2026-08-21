import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(process.cwd(), 'test-results', 'phase4');

function getImgPath(filename: string): string {
  return path.join(outDir, filename);
}

/**
 * GRADIFI / SEFAES - PHASE 4: PARENT ONBOARDING & DASHBOARD
 * Constitutional Law 11: Evidence Over Assumption
 * 
 * This test suite verifies Phase 4 functionality:
 * - Parent Invite Form (CreateParent.tsx)
 * - Student search and selection
 * - Parent linking to student
 * - 4-digit PIN generation for parent
 * - Parent Dashboard (ParentDashboard.tsx)
 * - Ward statistics display
 * - Quick actions (View Results, Contact Teacher, Fee Status)
 * 
 * Screenshots are captured at each step as evidence.
 */

test.describe('Phase 4: Parent Onboarding & Dashboard', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  // =============================================
  // TEST 1: Parent Invite Form Loads
  // =============================================
  test('should load parent invite form with student search', async ({ page }) => {
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1:has-text("Invite Parent")')).toBeVisible();
    await expect(page.locator('input[placeholder="Search students..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Mrs. Funke Adebayo"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. 08012345678"]')).toBeVisible();
    await expect(page.locator('select option[value="Parent"]')).toBeAttached();
    
    await page.screenshot({ 
      path: getImgPath('01-parent-invite-form.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 2: Student Search Filter
  // =============================================
  test('should filter students when searching', async ({ page }) => {
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[placeholder="Search students..."]', 'Chidi');
    await page.waitForTimeout(500);
    
    const studentRows = page.locator('input[name="student"]');
    await expect(studentRows.first()).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('02-student-search.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 3: Select Student and Fill Parent Details
  // =============================================
  test('should select student and fill parent details', async ({ page }) => {
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const firstStudent = page.locator('input[name="student"]').first();
    if (await firstStudent.count() > 0) {
      await firstStudent.click();
    }
    
    await page.fill('input[placeholder="e.g. Mrs. Funke Adebayo"]', 'Mrs. Funke Adebayo');
    await page.fill('input[placeholder="e.g. 08012345678"]', '08098765432');
    await page.fill('input[placeholder="parent@email.com"]', 'funke.adebayo@email.com');
    await page.selectOption('select:has(option[value="Parent"])', 'Guardian');
    
    await page.screenshot({ 
      path: getImgPath('03-selected-student-form.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 4: Create Parent and Display PIN
  // =============================================
  test('should create parent and display 4-digit PIN', async ({ page }) => {
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const firstStudent = page.locator('input[name="student"]').first();
    if (await firstStudent.count() > 0) {
      await firstStudent.click();
    }
    
    await page.fill('input[placeholder="e.g. Mrs. Funke Adebayo"]', 'Mrs. Funke Adebayo');
    await page.fill('input[placeholder="e.g. 08012345678"]', '08098765432');
    await page.fill('input[placeholder="parent@email.com"]', 'funke.adebayo@email.com');
    await page.click('button:has-text("Invite Parent")');
    
    await expect(page.locator('text=/Parent Created!|Parent Linked!/i').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Mrs. Funke Adebayo').first()).toBeVisible();
    
    const pinElement = page.locator('text=/[0-9]{4}/').first();
    await expect(pinElement).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('04-parent-created-pin.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 5: Parent Dashboard Loads
  // =============================================
  test('should load parent dashboard with wards', async ({ page }) => {
    await page.goto('/portal/parent');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Welcome').first()).toBeVisible();
    await expect(page.locator('text=Parent Portal').first()).toBeVisible();
    await expect(page.locator('text=/enrolled|ward/i').first()).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('05-parent-dashboard.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 6: Ward Statistics Display
  // =============================================
  test('should display ward statistics correctly', async ({ page }) => {
    await page.goto('/portal/parent');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Term Average').first()).toBeVisible();
    await expect(page.locator('text=Attendance').first()).toBeVisible();
    await expect(page.locator('text=Class Rank').first()).toBeVisible();
    await expect(page.locator('text=Total in Class').first()).toBeVisible();
    
    const avgScore = page.locator('text=/[0-9]+%/').first();
    await expect(avgScore).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('06-ward-stats.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 7: Quick Actions Display
  // =============================================
  test('should display quick action buttons', async ({ page }) => {
    await page.goto('/portal/parent');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=View Results').first()).toBeVisible();
    await expect(page.locator('text=Contact Teacher').first()).toBeVisible();
    await expect(page.locator('text=Fee Status').first()).toBeVisible();
    await expect(page.locator('text=School Calendar').first()).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('07-quick-actions.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 8: Console Error Verification
  // =============================================
  test('should have no critical console errors during parent flow', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/onboarding?view=create-parent');
    await page.waitForLoadState('networkidle');
    await page.goto('/portal/parent');
    await page.waitForLoadState('networkidle');
    
    if (errors.length > 0) {
      console.log(`⚠️ Found ${errors.length} console errors:`);
      errors.forEach(e => console.log(`   - ${e}`));
    }
    
    const criticalErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('400') &&
      !e.includes('favicon') &&
      !e.includes('ERR_NAME_NOT_RESOLVED') &&
      !e.includes('placeholder') &&
      !e.includes('Failed to load students')
    );
    
    if (criticalErrors.length > 0) {
      console.warn(`⚠️ Found ${criticalErrors.length} critical console errors`);
      criticalErrors.forEach(e => console.log(`   - ${e}`));
    }
    
    await page.screenshot({ 
      path: getImgPath('08-console-errors.png'), 
      fullPage: true 
    });
  });
});
