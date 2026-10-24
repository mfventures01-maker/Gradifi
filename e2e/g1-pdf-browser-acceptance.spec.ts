import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

test.describe('HOEOS G1 Real PDF Browser Runtime Acceptance Suite', () => {
  test('executes real PDF upload with quantum_federated_learning_paper.pdf and validates extraction, canonical convergence, and fail-closed boundary', async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log('BROWSER UNCAUGHT PAGE ERROR:', err.message);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // 1. Fixture Provenance & Integrity Verification
    const fixturePath = path.resolve('tests/fixtures/ingestion/quantum_federated_learning_paper.pdf');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const fileBytes = fs.readFileSync(fixturePath);
    expect(fileBytes.length).toBe(652);

    const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    expect(computedHash.toLowerCase()).toBe('0c5860b9d729860dcf3a7480d9ec26d7e5354ade7353b1d7e8fcd66895c9f4ff');

    // 2. Navigate to real commercial verification workbench
    console.log('Navigating to /verify...');
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // 3. Locate file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    const uploadStartTime = Date.now();
    console.log(`Selecting real PDF fixture: ${fixturePath}`);

    // 4. Select real PDF via browser file input
    await fileInput.setInputFiles(fixturePath);

    // 5. Observe UI transition to STATUS: EXTRACTED
    const statusBadge = page.locator('text=STATUS: EXTRACTED');
    await expect(statusBadge).toBeVisible({ timeout: 15000 });
    const extractionDurationMs = Date.now() - uploadStartTime;
    console.log(`Real PDF extraction completed in ${extractionDurationMs}ms`);

    // 6. Verify File Info Badge renders genuine filename and stream extractor method
    await expect(page.locator('text=quantum_federated_learning_paper.pdf')).toBeVisible();
    await expect(page.locator('text=Method: pdf_stream_extractor')).toBeVisible();

    // 7. Verify Canonical Text in document textarea contains verified text anchors
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const extractedText = await textarea.inputValue();
    console.log(`Extracted PDF text character count: ${extractedText.length}`);
    expect(extractedText.length).toBeGreaterThan(100);
    expect(extractedText).toContain('Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks');
    expect(extractedText).toContain('Federated learning across edge networks faces latency challenges');

    // 8. Verify Canonical Document Provenance and Metadata Card
    const canonicalSection = page.locator('text=2. Canonical Analysis Document');
    await expect(canonicalSection).toBeVisible();
    const provenanceBadge = page.locator('text=PROVENANCE: NORMALIZED');
    await expect(provenanceBadge).toBeVisible();

    // Capture screenshot of real PDF extraction
    const screenshotDir = path.resolve('tests/hoeos/four_gates/evidence/g1');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'g1_pdf_browser_extracted.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // 9. Fail-Closed Boundary Test: Upload invalid format
    const invalidFixturePath = path.resolve('tests/fixtures/ingestion/invalid.json');
    expect(fs.existsSync(invalidFixturePath)).toBe(true);

    console.log('Uploading invalid document format to test fail-closed boundary...');
    await fileInput.setInputFiles(invalidFixturePath);

    // Observe STATUS: FAILED
    const failedBadge = page.locator('text=STATUS: FAILED');
    await expect(failedBadge).toBeVisible({ timeout: 10000 });
    console.log('Fail-closed boundary successfully verified: invalid document rejected.');
  });
});
