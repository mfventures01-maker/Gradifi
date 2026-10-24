import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('HOEOS G7 Public Verification Resolution End-to-End Suite', () => {
  const VALID_VERIFICATION_ID = 'VRF-ABCDEF121234';
  const NONEXISTENT_ID = 'VRF-999999999999';

  test('G7-1: Authoritative Supabase record (VRF-ABCDEF121234) renders VALID integrity state and receipt metadata', async ({ page }) => {
    console.log(`Navigating to authoritative public record: /verify/${VALID_VERIFICATION_ID}`);

    let publicRecordRequestSucceeded = false;
    page.on('response', response => {
      if (response.url().includes('public_verification_records') && response.status() === 200) {
        publicRecordRequestSucceeded = true;
      }
    });

    await page.goto(`/verify/${VALID_VERIFICATION_ID}`);
    await page.waitForLoadState('networkidle');

    // 1. Verify Public Verification Receipt heading
    await expect(page.locator('text=PUBLIC VERIFICATION RECEIPT')).toBeVisible({ timeout: 15000 });

    // 2. Verify INTEGRITY: VALID badge
    const validBadge = page.locator('text=INTEGRITY: VALID');
    await expect(validBadge).toBeVisible();

    // 3. Verify Verification ID is prominently displayed (using exact match)
    const idDisplay = page.getByText(VALID_VERIFICATION_ID, { exact: true });
    await expect(idDisplay).toBeVisible();

    // 4. Verify Document SHA-256 Hash and Evidence Snapshot Hash
    await expect(page.locator('text=Document SHA-256 Hash')).toBeVisible();
    await expect(page.locator('text=Evidence Snapshot Hash')).toBeVisible();
    await expect(page.locator('text=Overall Similarity')).toBeVisible();

    // 5. Verify Cryptographically Grounded Receipt and QR card
    await expect(page.locator('text=Cryptographically Grounded Receipt')).toBeVisible();
    await expect(page.locator('button:has-text("Print Certificate")')).toBeVisible();

    // Capture screenshot evidence
    const screenshotDir = 'certification/g7_public_verification';
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'g7_valid_receipt_verified.png'), fullPage: true });

    console.log('✅ G7-1: Authoritative record rendered VALID state successfully');
    console.log(`Supabase public record query returned 200: ${publicRecordRequestSucceeded}`);
  });

  test('G7-2: Non-existent record (VRF-999999999999) renders deterministic Public Verification Failed state', async ({ page }) => {
    console.log(`Navigating to non-existent record: /verify/${NONEXISTENT_ID}`);
    await page.goto(`/verify/${NONEXISTENT_ID}`);
    await page.waitForLoadState('networkidle');

    // 1. Wait for failure heading
    const failureHeading = page.locator('text=Public Verification Failed');
    await expect(failureHeading).toBeVisible({ timeout: 15000 });

    // 2. Verify target ID displayed (using exact match)
    await expect(page.getByText(NONEXISTENT_ID, { exact: true })).toBeVisible();

    // 3. Verify failure status badge
    await expect(page.locator('text=STATUS: NOT_FOUND')).toBeVisible();

    // 4. Verify navigation buttons
    await expect(page.locator('button:has-text("Retry Resolution")')).toBeVisible();
    await expect(page.locator('button:has-text("Go to Verification Hub")')).toBeVisible();

    // Capture screenshot evidence
    const screenshotDir = 'certification/g7_public_verification';
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'g7_failure_branch_verified.png'), fullPage: true });

    console.log('✅ G7-2: Non-existent record cleanly rendered failure branch');
  });
});
