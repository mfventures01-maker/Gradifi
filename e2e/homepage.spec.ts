import { test, expect } from '@playwright/test';

test.describe('HomePage - Sales Page with Trust Signals', () => {
  test('should load homepage with trust badges', async ({ page }) => {
    await page.goto('/');
    
    // Check trust badges
    await expect(page.locator('text=NDPR Certified')).toBeVisible();
    await expect(page.locator('text=Offline-First')).toBeVisible();
    await expect(page.locator('text=Trusted by 10+ Nigerian Schools')).toBeVisible();
  });

  test('should display hero section with CTA', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Academic Intelligence for Nigerian Schools')).toBeVisible();
    await expect(page.locator('text=Start Free Trial – We\'ll Call to Help')).toBeVisible();
  });

  test('should display PrincipalTimeSavedCard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Real Impact for School Principals')).toBeVisible();
  });

  test('should display TeacherEmpowerment section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Teacher Empowerment')).toBeVisible();
  });

  test('should display CBT section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Offline CBT Examinations')).toBeVisible();
  });

  test('should navigate to login when Sign In clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to onboarding when Get Started clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/onboarding');
  });
});
