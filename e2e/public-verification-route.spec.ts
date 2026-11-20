/**
 * GRADIFI VERIFY - HOEOS G7 INDEPENDENT PUBLIC VERIFICATION E2E TEST
 * Verifies route /verify/:verificationId resolution in independent browser context.
 */

import { test, expect } from '@playwright/test';

test.describe('G7 Public Verification Route Resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Isolated browser contract test. No Supabase project or database is contacted.
    await page.route('**/auth/v1/**', route => route.fulfill({
      status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'CI unauthenticated session' }),
    }));
    await page.route('**/rest/v1/**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: 'null',
    }));
  });
  test('Independent browser navigation to /verify/VRF-8AFCFF6056B0 enters public resolution mode', async ({ page }) => {
    // Navigate directly to public verification route in clean browser context
    await page.goto('/verify/VRF-8AFCFF6056B0');

    // Wait for route to load
    await page.waitForLoadState('networkidle');

    // Confirm URL parameter VRF-8AFCFF6056B0 is retained in address bar
    expect(page.url()).toContain('/verify/VRF-8AFCFF6056B0');

    // Confirm main heading or verification card displays public verification state
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('GRADIFI VERIFY');

    // Confirm it does NOT render initial upload prompt step
    const hasUploadStep = await page.isVisible('text="1. Select Document File"');
    expect(hasUploadStep).toBe(false);
  });
});
