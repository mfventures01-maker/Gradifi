import { test, expect } from '@playwright/test';

/**
 * Compatibility suite for the old Phase 2 path.
 * The former demo receipts and sample IDs have been retired.
 * Runtime provisioning is covered by onboarding-deterministic.spec.ts
 * when isolated Supabase E2E credentials are supplied.
 */
test.describe('Phase 2: authenticated onboarding boundaries', () => {
  test('shows the current principal registration wizard', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText('School Basics').first()).toBeVisible();
    await expect(page.getByText('Principal Identity').first()).toBeVisible();
    await expect(page.getByText('First Class').first()).toBeVisible();
    await expect(page.getByText('Review').first()).toBeVisible();
  });

  for (const view of ['create-teacher','create-vp','create-bursar','create-student','bulk-import','create-parent']) {
    test(`requires a real principal membership before ${view}`, async ({ page }) => {
      await page.goto(`/onboarding?view=${view}`);
      await expect(page.getByRole('heading', { name: 'School identity required' })).toBeVisible();
    });
  }

  test('never renders a demo identifier or fabricated success receipt', async ({ page }) => {
    await page.goto('/onboarding?view=create-student');
    await expect(page.getByRole('heading', { name: 'School identity required' })).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/sch_demo_01|inst_demo_01|std_demo_01|std_bulk_/);
  });
});
