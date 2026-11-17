import { expect, test } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_PATH = resolve(__dirname, '../fixtures/g1/DIGITAL_THERMOMETER_real.docx');
const CORRUPTED_FIXTURE_PATH = resolve(__dirname, '../fixtures/ingestion/corrupted.docx');

test.describe('G1 DOCX Real Browser Ingestion Proof', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('real browser uploads representative DOCX, invokes real parser, and produces valid canonical output', async ({ page }) => {
    // 0. Verify fixture existence and compute provenance hash
    expect(existsSync(FIXTURE_PATH)).toBe(true);
    const fixtureBytes = readFileSync(FIXTURE_PATH);
    const fixtureSha256 = createHash('sha256').update(fixtureBytes).digest('hex').toUpperCase();
    expect(fixtureSha256).toBe('6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C');

    // 1. Navigate to /verify
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // Capture initial UI state screenshot
    await page.screenshot({ path: 'test-results/g1-browser-01-initial.png', fullPage: true });

    // Verify initial ready status
    const statusBadge = page.locator('text=/STATUS:\\s*READY/');
    await expect(statusBadge).toBeVisible();

    // 2. Locate the real file input and upload the real DOCX file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Perform actual user-facing file upload
    await fileInput.setInputFiles(FIXTURE_PATH);

    // 3. Verify status transitions to EXTRACTED (meaning real docx parser and extraction succeeded)
    const extractedBadge = page.locator('text=/STATUS:\\s*EXTRACTED/');
    await expect(extractedBadge).toBeVisible({ timeout: 15000 });

    // 4. Verify file info badge displays correct metadata and extraction method
    const extractedMethodBadge = page.locator('text=/Method:\\s*docx_xml_extractor/');
    await expect(extractedMethodBadge).toBeVisible();

    // 5. Verify the textarea payload contains the extracted text
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const extractedText = await textarea.inputValue();

    // Fidelity assertions on extracted text in real browser
    expect(extractedText.length).toBeGreaterThan(35000);
    expect(extractedText).toContain('Thermometer');
    expect(extractedText).toContain('digital thermometer');
    expect(extractedText).toContain('19th century');
    expect(extractedText).not.toContain('T\nhermometer');
    expect(extractedText).not.toContain('thermo\nmeters');
    expect(extractedText).not.toContain('19\nth');

    // 6. Capture screenshot of successful extracted state
    await page.screenshot({ path: 'test-results/g1-browser-02-extracted.png', fullPage: true });

    // 7. Verify repeated ingestion produces deterministic canonical text
    await fileInput.setInputFiles(FIXTURE_PATH);
    await expect(extractedBadge).toBeVisible({ timeout: 15000 });
    const repeatedText = await textarea.inputValue();
    expect(repeatedText).toBe(extractedText);

    // Verify no unhandled console errors during successful ingestion
    const unhandledErrors = consoleErrors.filter(e => !e.includes('favicon'));
    expect(unhandledErrors).toEqual([]);
  });

  test('real browser rejects corrupted DOCX and propagates visible error without false success', async ({ page }) => {
    // 1. Navigate to /verify
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // 2. Upload corrupted DOCX
    await fileInput.setInputFiles(CORRUPTED_FIXTURE_PATH);

    // 3. Verify status transitions to FAILED
    const failedBadge = page.locator('text=/STATUS:\\s*FAILED/');
    await expect(failedBadge).toBeVisible({ timeout: 10000 });

    // 4. Verify error message is visible in UI
    const errorAlert = page.locator('div.text-rose-400');
    await expect(errorAlert).toBeVisible();
    const errorText = await errorAlert.textContent();
    expect(errorText).toBeTruthy();

    // 5. Ensure UI NEVER shows EXTRACTED on failure
    const extractedBadge = page.locator('text=/STATUS:\\s*EXTRACTED/');
    await expect(extractedBadge).not.toBeVisible();

    // Capture screenshot of error state
    await page.screenshot({ path: 'test-results/g1-browser-03-error-propagated.png', fullPage: true });
  });
});
