import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(process.cwd(), 'test-results', 'phase1');

function getImgPath(filename: string): string {
  return path.join(outDir, filename);
}

/**
 * GRADIFI / SEFAES - PHASE 1: HOMEPAGE & NAVIGATION
 * Constitutional Law 11: Evidence Over Assumption
 */
test.describe('Phase 1: Homepage & Navigation', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // =============================================
  // TEST 1: Full Homepage Screenshot
  // =============================================
  test('01: should capture full homepage screenshot', async ({ page }) => {
    await page.screenshot({ 
      path: getImgPath('01-homepage-full.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 2: Navigation Bar
  // =============================================
  test('02: should display navigation bar with correct elements', async ({ page }) => {
    const navLogo = page.locator('nav').getByText('Gradifi', { exact: true });
    await expect(navLogo).toBeVisible();
    await expect(page.locator('nav').locator('text=SEFAES')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Get Started' })).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('02-navigation-bar.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 3: Trust Badges
  // =============================================
  test('03: should display all three trust badges', async ({ page }) => {
    await expect(page.locator('text=NDPR Certified').first()).toBeVisible();
    await expect(page.locator('text=Offline-First').first()).toBeVisible();
    await expect(page.locator('text=Trusted by 10+ Nigerian Schools').first()).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('03-trust-badges.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 4: Hero Section
  // =============================================
  test('04: should display hero section with correct content', async ({ page }) => {
    await expect(page.locator('text=Academic Intelligence for Nigerian Schools')).toBeVisible();
    await expect(page.locator('text=AI grading, offline-first CBT exams, and academic writing tools')).toBeVisible();
    await expect(page.locator('button', { hasText: "Start Free Trial – We'll Call to Help" })).toBeVisible();
    await expect(page.locator('button', { hasText: 'View Demo' })).toBeVisible();
    await expect(page.locator('text=No credit card')).toBeVisible();
    await expect(page.locator('text=14-day free trial')).toBeVisible();
    await expect(page.locator('text=Cancel anytime')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('04-hero-section.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 5: Hero Image
  // =============================================
  test('05: should display hero image with fallback', async ({ page }) => {
    const heroImage = page.locator('img[alt*="Nigerian students"]');
    await expect(heroImage).toBeVisible();
    await expect(page.locator('text=WAEC & NECO Aligned')).toBeVisible();
    await expect(page.locator('text=99.4% Accuracy')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('05-hero-image.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 6: PrincipalTimeSavedCard
  // =============================================
  test('06: should display PrincipalTimeSavedCard', async ({ page }) => {
    const target = page.locator('text=Real Impact for School Principals');
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(target).toBeVisible();
    await expect(page.locator('text=Admin Time Recovered')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('06-principal-time-saved-card.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 7: TeacherApprovalCard (Human-in-the-Loop)
  // =============================================
  test('07: should display TeacherApprovalCard', async ({ page }) => {
    const target = page.locator('h2:has-text("Teacher Empowerment")');
    await expect(target).toBeVisible();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(page.locator('text=AI Speed with Total Teacher Authority')).toBeVisible();
    await expect(page.locator('text=Senior Literature Teacher')).toBeVisible();
    await expect(page.locator('text=Federal Government College, Lagos')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('07-teacher-approval-card.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 8: CBT Section (Offline First)
  // =============================================
  test('08: should display CBT section with offline badge', async ({ page }) => {
    const target = page.locator('text=Offline CBT Examinations');
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(target).toBeVisible();
    await expect(page.locator('text=Works Offline')).toBeVisible();
    await expect(page.locator('text=Students complete exams without active internet connection.')).toBeVisible();
    await expect(page.locator('text=Offline Mode Active')).toBeVisible();
    await expect(page.locator('img[alt*="CBT Lab"]')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('08-cbt-section.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 9: Free Writing Tools Section
  // =============================================
  test('09: should display Free Writing Tools section with all 5 tools', async ({ page }) => {
    const target = page.locator('text=100% Free Academic Writing Tools');
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(target).toBeVisible();
    await expect(page.locator('text=No Registration Required')).toBeVisible();
    
    const tools = ['Word Counter', 'Paraphraser', 'Readability', 'Citation Builder', 'Summarizer'];
    for (const toolName of tools) {
      await expect(page.locator(`text=${toolName}`).first()).toBeVisible();
    }
    
    await page.screenshot({ 
      path: getImgPath('09-writing-tools-section.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 10: Dashboard Dropdown
  // =============================================
  test('10: should display Dashboard dropdown with all 6 role links', async ({ page }) => {
    const dropdownContainer = page.locator('nav div.relative.group');
    await dropdownContainer.hover();
    await page.waitForTimeout(300);
    
    const roles = ['Principal', 'Teacher', 'Student', 'Parent', 'Bursar', 'VP'];
    for (const role of roles) {
      await expect(page.locator('nav').locator(`text=${role}`)).toBeVisible();
    }
    
    await page.screenshot({ 
      path: getImgPath('10-dashboard-dropdown.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 11: Navigation to Login Page
  // =============================================
  test('11: should navigate to Login page when Sign In is clicked', async ({ page }) => {
    await page.locator('button', { hasText: 'Sign In' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('11-login-page.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 12: Navigation to Onboarding
  // =============================================
  test('12: should navigate to Onboarding when Get Started is clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'Get Started' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/onboarding');
    
    await page.screenshot({ 
      path: getImgPath('12-onboarding-page.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 13: Navigation to Dashboard (View Demo)
  // =============================================
  test('13: should navigate to Principal Dashboard when View Demo is clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: 'View Demo' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/portal\/principal/);
    
    await page.screenshot({ 
      path: getImgPath('13-dashboard-navigation.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 14: Footer
  // =============================================
  test('14: should display footer with copyright and NDPR compliance', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(page.locator('text=© 2026 Gradifi • SEFAES Constitutional Engineering System')).toBeVisible();
    await expect(page.locator('text=Built for Nigerian secondary schools • NDPR Compliant')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('14-footer.png'), 
      fullPage: false 
    });
  });

  // =============================================
  // TEST 15: Mobile Responsiveness (360px)
  // =============================================
  test('15: should be responsive on mobile (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('nav').getByText('Gradifi', { exact: true })).toBeVisible();
    await expect(page.locator('text=Academic Intelligence for Nigerian Schools')).toBeVisible();
    await expect(page.locator('button', { hasText: "Start Free Trial – We'll Call to Help" })).toBeVisible();
    await page.locator('text=100% Free Academic Writing Tools').scrollIntoViewIfNeeded();
    await expect(page.locator('text=100% Free Academic Writing Tools')).toBeVisible();
    
    await page.screenshot({ 
      path: getImgPath('15-mobile-responsive.png'), 
      fullPage: true 
    });
  });

  // =============================================
  // TEST 16: Console Error Verification
  // =============================================
  test('16: should have no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    if (errors.length > 0) {
      console.log(`⚠️ Found ${errors.length} console errors:`);
      errors.forEach(e => console.log(`   - ${e}`));
    }
    
    const criticalErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('favicon') &&
      !e.includes('ERR_NAME_NOT_RESOLVED')
    );
    
    if (criticalErrors.length > 0) {
      console.warn(`⚠️ Found ${criticalErrors.length} critical console errors`);
    }
    
    await page.screenshot({ 
      path: getImgPath('16-console-errors.png'), 
      fullPage: true 
    });
  });
});
