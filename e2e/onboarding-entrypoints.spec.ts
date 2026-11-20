import { expect, test } from '@playwright/test';

test.describe('Primary branch onboarding entrypoints', () => {
  test('school onboarding wizard is reachable and renders its canonical steps', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText('School Basics').first()).toBeVisible();
    await expect(page.getByText('Admin Account').first()).toBeVisible();
    await expect(page.getByText('First Class').first()).toBeVisible();
    await expect(page.getByText('Review').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Institution Name"]')).toBeVisible();
  });

  test('higher-education root registration is reachable and renders its three-step flow', async ({ page }) => {
    await page.goto('/onboarding/higher-education/register');
    await expect(page.getByRole('heading', { name: 'Institution onboarding' })).toBeVisible();
    const progress = page.getByRole('navigation', { name: 'Onboarding progress' });
    await expect(progress).toBeVisible();
    await expect(progress.getByText('Institution')).toBeVisible();
    await expect(progress.getByText('Authority & Dean')).toBeVisible();
    await expect(progress.getByText('Review')).toBeVisible();
  });
});
