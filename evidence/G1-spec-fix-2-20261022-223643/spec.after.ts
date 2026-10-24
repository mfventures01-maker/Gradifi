import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('HOEOS G1.1 Real DOCX Browser Runtime Acceptance', () => {
  test('executes real commercial upload with DIGITAL THERMOMETER real.docx and validates complete chain', async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];
    const startTime = Date.now();

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });

    page.on('pageerror', err => {
      console.log('BROWSER UNCAUGHT PAGE ERROR:', err.message, err.stack);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
      console.log(`NETWORK FAILED:`, req.method(), req.url(), req.failure()?.errorText);
    });

    // 1. Target Fixture verification
    const fixturePath = path.resolve('C:/Users/faith/Downloads/DIGITAL THERMOMETER real.docx');
    expect(fs.existsSync(fixturePath)).toBe(true);
    const fixtureStats = fs.statSync(fixturePath);
    expect(fixtureStats.size).toBeGreaterThan(100_000);

    // 2. Navigate to real commercial verification page
    console.log('Navigating to http://127.0.0.1:5173/verify...');
    await page.goto('http://127.0.0.1:5173/verify');
    await page.waitForLoadState('networkidle');

    // 3. Locate file input on commercial upload surface
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    const uploadStartTime = Date.now();
    console.log(`Selecting real DOCX fixture: ${fixturePath}`);

    // 4. Select the real golden DOCX via browser file picker
    await fileInput.setInputFiles(fixturePath);

    // 5. Observe UI status transition: EXTRACTED
    const statusBadge = page.locator('text=STATUS: EXTRACTED');
    await expect(statusBadge).toBeVisible({ timeout: 30000 });
    const extractionEndTime = Date.now();
    const extractionDurationMs = extractionEndTime - uploadStartTime;
    console.log(`Extraction completed in ${extractionDurationMs}ms`);

    // 6. Verify File Info Badge is populated
    await expect(page.locator('text=DIGITAL THERMOMETER real.docx')).toBeVisible();
    await expect(page.locator('text=Method: docx_xml_extractor')).toBeVisible();

    // 7. Verify Canonical Text in document textarea
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const extractedText = await textarea.inputValue();
    console.log(`Extracted text length: ${extractedText.length}`);
    expect(extractedText.length).toBeGreaterThan(150);
    expect(extractedText).toContain('GRADIFI DOCX GOLDEN TEST 001');
    expect(extractedText).toContain('word/document.xml');

    // 8. Verify Canonical Document provenance and metadata rendered
    const canonicalSection = page.locator('text=2. Canonical Analysis Document');
    await expect(canonicalSection).toBeVisible();
    const provenanceBadge = page.locator('text=PROVENANCE: NORMALIZED');
    await expect(provenanceBadge).toBeVisible();

    // 9. Execute verification handoff
    const verifyBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(verifyBtn).toBeEnabled();
    const handoffStartTime = Date.now();
    console.log('Clicking "Run Academic Evidence Verification" (verification handoff)...');
    await verifyBtn.click();

    // 10. Wait for verification completion / evidence viewer or results
    await page.waitForSelector('text=3. Google Books Evidence', { timeout: 30000 });
    await expect(page.locator('text=Canonical Document Evidence Payload')).toBeVisible();
    const verificationEndTime = Date.now();
    const totalElapsedMs = verificationEndTime - uploadStartTime;
    console.log(`Full verification completed in ${totalElapsedMs}ms`);

    // Verify no five-minute hang
    expect(totalElapsedMs).toBeLessThan(300000); // 5 minutes = 300,000ms

    // 11. Verify Evidence artifacts
    const screenshotDir = path.resolve('tests/hoeos/g2/evidence/g1_browser');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'g1_docx_browser_completion.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Output runtime forensic log
    const runtimeLog = {
      timestamp: new Date().toISOString(),
      fixturePath,
      fixtureSize: fixtureStats.size,
      extractionDurationMs,
      totalElapsedMs,
      status: 'PASS',
      extractedTextLength: extractedText.length,
      extractedSnippet: extractedText.slice(0, 100),
      consoleLogsCount: consoleLogs.length,
      networkFailuresCount: networkFailures.length,
      screenshotPath
    };

    fs.writeFileSync(
      path.join(screenshotDir, 'g1_browser_runtime_log.json'),
      JSON.stringify(runtimeLog, null, 2)
    );
  });
});
