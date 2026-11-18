import { expect, test } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
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

  test('real browser uploads representative DOCX across 3 reload-separated upload cycles with deterministic canonical output', async ({ page }) => {
    // 0. Verify fixture existence and compute provenance hash
    expect(existsSync(FIXTURE_PATH)).toBe(true);
    const fixtureBytes = readFileSync(FIXTURE_PATH);
    const fixtureSha256 = createHash('sha256').update(fixtureBytes).digest('hex').toUpperCase();
    expect(fixtureSha256).toBe('6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C');

    // 1. Navigate to /tools/plagiarism (canonical public writing tools route)
    await page.goto('/tools/plagiarism');
    await page.waitForLoadState('networkidle');

    // Capture initial UI state screenshot
    await page.screenshot({ path: 'test-results/g1-browser-01-initial.png', fullPage: true });

    // Verify initial ready status
    const statusBadge = page.locator('text=/STATUS:\\s*READY/');
    await expect(statusBadge).toBeVisible();

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();

    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();

    const extractedBadge = page.locator('text=/STATUS:\\s*EXTRACTED/');
    const extractedMethodBadge = page.locator('text=/Method:\\s*docx_xml_extractor/');

    interface BrowserRunMetric {
      run: number;
      fixtureSha256: string;
      extractionStatus: string;
      extractionMethod: string;
      canonicalTextLength: number;
      canonicalDocumentId: string;
      canonicalTextHash: string;
      declaredLimitations: string[];
      runtimeDurationMs: number;
      text: string;
    }

    const runs: BrowserRunMetric[] = [];

    // Execute 3 upload cycles, reloading the browser page between cycles
    for (let runIdx = 1; runIdx <= 3; runIdx++) {
      // Reload page between runs for fresh clean state
      if (runIdx > 1) {
        await page.goto('/tools/plagiarism');
        await page.waitForLoadState('networkidle');
        await expect(statusBadge).toBeVisible();
      }

      const t0 = Date.now();
      await fileInput.setInputFiles(FIXTURE_PATH);
      await expect(extractedBadge).toBeVisible({ timeout: 15000 });
      await expect(extractedMethodBadge).toBeVisible();
      const durationMs = Date.now() - t0;

      const extractedText = await textarea.inputValue();

      // Compute in-browser normalized document ID and SHA-256
      const { docId, textSha256 } = await page.evaluate(async (rawText: string) => {
        const loadModule = (path: string) => import(/* @vite-ignore */ path);
        const { computeHash, normalizeText } = await loadModule('/src/services/verify/documentNormalizer.ts');
        const norm = normalizeText(rawText);
        const docId = computeHash(norm);

        // Compute web-crypto SHA-256 over normalized text
        const encoder = new TextEncoder();
        const data = encoder.encode(norm);
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        const textSha256 = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

        return { docId, textSha256 };
      }, extractedText);

      runs.push({
        run: runIdx,
        fixtureSha256,
        extractionStatus: 'EXTRACTED',
        extractionMethod: 'docx_xml_extractor',
        canonicalTextLength: extractedText.length,
        canonicalDocumentId: docId,
        canonicalTextHash: textSha256,
        declaredLimitations: ['Drawing/image extraction was not evaluated by this browser test.'],
        runtimeDurationMs: durationMs,
        text: extractedText,
      });

      // Save screenshot for Run 1
      if (runIdx === 1) {
        await page.screenshot({ path: 'test-results/g1-browser-02-extracted.png', fullPage: true });
      }
    }

    // Assertions across the 3 runs:
    expect(runs.length).toBe(3);

    // 1. Text byte-for-byte identical across all 3 runs
    expect(runs[0].text).toBe(runs[1].text);
    expect(runs[1].text).toBe(runs[2].text);

    // 2. Canonical document ID identical
    expect(runs[0].canonicalDocumentId).toBe(runs[1].canonicalDocumentId);
    expect(runs[1].canonicalDocumentId).toBe(runs[2].canonicalDocumentId);
    expect(runs[0].canonicalDocumentId).toBe('5fc71af349cfbf45');

    // 3. Normalized text SHA-256 hash identical
    expect(runs[0].canonicalTextHash).toBe(runs[1].canonicalTextHash);
    expect(runs[1].canonicalTextHash).toBe(runs[2].canonicalTextHash);
    expect(runs[0].canonicalTextHash).toBe('40db84b32fe2b4e61f9b3df0c695ed5d2eb9efcc1bcafa8e42919d1b747a76ca');

    // 4. Character length identical and above threshold
    expect(runs[0].canonicalTextLength).toBe(37136);
    expect(runs[0].canonicalTextLength).toBeGreaterThan(35000);

    // 5. Word boundary preservation
    const text = runs[0].text;
    expect(text).toContain('Thermometer');
    expect(text).toContain('digital thermometer');
    expect(text).toContain('19th century');
    expect(text).not.toContain('T\nhermometer');
    expect(text).not.toContain('thermo\nmeters');
    expect(text).not.toContain('19\nth');

    // 6. Write runtime proof JSON artifact
    const runSummary = runs.map(({ text, ...rest }) => rest);
    writeFileSync(
      resolve(process.cwd(), 'test-results/g1-browser-3runs.json'),
      JSON.stringify(runSummary, null, 2),
      'utf-8'
    );

    // Verify zero unhandled console errors
    const unhandledErrors = consoleErrors.filter(e => !e.includes('favicon'));
    expect(unhandledErrors).toEqual([]);
  });

  test('real browser rejects corrupted DOCX and propagates visible error without false success', async ({ page }) => {
    // 1. Navigate to /tools/plagiarism
    await page.goto('/tools/plagiarism');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
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
