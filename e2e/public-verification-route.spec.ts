/**
 * GRADIFI VERIFY - HOEOS G6.4 INDEPENDENT PUBLIC VERIFICATION E2E TEST
 * Verifies route /verify/:verificationId resolution in independent browser context.
 */

import { test, expect } from '@playwright/test';

test.describe('G6.4 Public Verification Route Resolution', () => {
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
