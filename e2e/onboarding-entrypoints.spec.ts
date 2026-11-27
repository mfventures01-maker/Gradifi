import { expect, test } from '@playwright/test';

test.describe('Primary branch onboarding entrypoints', () => {
  test.beforeEach(async ({ page }) => {
    // Keep the browser smoke isolated from every Supabase project. These routes
    // return deterministic unauthenticated/empty responses and cannot write data.
    await page.route('**/auth/v1/**', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'CI unauthenticated session' }),
    }));
    await page.route('**/rest/v1/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }));
    await page.route('**/functions/v1/**', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'CI function stub' }),
    }));
  });
  test('school onboarding wizard renders its actual three-step flow', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText('School Basics').first()).toBeVisible();
    await expect(page.getByText('Admin Account').first()).toBeVisible();
    await expect(page.getByText('Review & Create').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'School Basics' })).toBeVisible();
    await expect(page.locator('input[placeholder="Institution Name"]')).toBeVisible();
  });

  test('higher-education root registration renders its three-step authority flow', async ({ page }) => {
    await page.goto('/onboarding/higher-education/register');
    await expect(page.getByRole('heading', { name: 'Institution onboarding' })).toBeVisible();
    const progress = page.getByRole('navigation', { name: 'Onboarding progress' });
    await expect(progress).toBeVisible();
    await expect(progress.getByText('Institution')).toBeVisible();
    await expect(progress.getByText('Authority & Dean')).toBeVisible();
    await expect(progress.getByText('Review')).toBeVisible();
  });
});
