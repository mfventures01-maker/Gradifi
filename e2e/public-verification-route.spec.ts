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

    // CI uses an isolated unauthenticated browser with no persisted receipt.
    // The correct public-resolution contract is an explicit fail-closed NOT_FOUND state.
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Public Verification Failed');
    expect(bodyText).toContain('NOT_FOUND');
    expect(bodyText).toContain('VRF-8AFCFF6056B0');

    // Confirm it does NOT render initial upload prompt step
    const hasUploadStep = await page.isVisible('text="1. Select Document File"');
    expect(hasUploadStep).toBe(false);
  });
});
