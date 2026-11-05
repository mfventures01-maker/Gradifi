import { test, expect } from '@playwright/test';

test.describe('Deterministic onboarding access contract', () => {
  test('renders the canonical four-step registration wizard', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText('School Basics').first()).toBeVisible();
    await expect(page.getByText('Principal Identity').first()).toBeVisible();
    await expect(page.getByText('First Class').first()).toBeVisible();
    await expect(page.getByText('Review').first()).toBeVisible();
    await expect(page.getByLabel('Institution name')).toBeVisible();
    await expect(page.getByLabel('Address')).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in to continue/i })).toBeVisible();
  });

  for (const view of ['create-teacher','create-vp','create-bursar','create-student','bulk-import','create-parent']) {
    test(`blocks ${view} provisioning without an authenticated school identity`, async ({ page }) => {
      await page.goto(`/onboarding?view=${view}`);
      await expect(page.getByRole('heading', { name: 'School identity required' })).toBeVisible();
      await expect(page.getByText('Demo school identifiers are not accepted.')).toBeVisible();
    });
  }
});
