import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('HOEOS SIM-17 & SIM-18 Browser Certification Suite', () => {
  const EVIDENCE_PATH = path.resolve('evidence/similarity/browser.json');

  test('SIM-17 & SIM-18: Live Browser Certification of Multi-Metric Similarity Engine', async ({ page }) => {
    test.setTimeout(90000);

    const networkLogs: any[] = [];
    const consoleLogs: any[] = [];

    page.on('console', msg => {
      const text = msg.text().replace(/(key|token|auth)=[\w.-]+/gi, '$1=[REDACTED]');
      consoleLogs.push({ type: msg.type(), text });
      console.log(`[Page Console] ${msg.type()}: ${text}`);
    });

    page.on('pageerror', err => {
      console.error(`[Page Error] ${err.message}`);
    });

    page.on('response', resp => {
      const url = resp.url();
      if (url.includes('/api/verify') || url.includes('supabase') || url.includes('/verify') || url.includes('openalex')) {
        networkLogs.push({
          url: url.split('?')[0],
          status: resp.status(),
          method: resp.request().method()
        });
      }
    });

    console.log('[Browser Certification] Navigating to local server /verify...');
    await page.goto('/verify', { waitUntil: 'networkidle' });

    // 1. Verify main page heading
    await expect(page.locator('h1:has-text("GRADIFI VERIFY")')).toBeVisible({ timeout: 20000 });

    // 2. Pre-load demo document
    const preloadButton = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadButton).toBeVisible();
    await preloadButton.click();
    console.log('[Browser Certification] Clicked Pre-load Demo Document');
    await page.waitForTimeout(500);

    // 3. Ensure Run Academic Evidence Verification is enabled and click
    const runButton = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(runButton).toBeEnabled({ timeout: 5000 });
    await runButton.click();
    console.log('[Browser Certification] Clicked Run Academic Evidence Verification');

    // 4. Wait for verification result panel to be visible (Unique Matched Coverage)
    await expect(page.locator('text=Unique Matched Coverage')).toBeVisible({ timeout: 60000 });

    // 5. Verify the new multi-tier quantitative labels are visible
    await expect(page.locator('text=Highest Source Match')).toBeVisible();

    // 6. Inspect visible similarity elements
    const pageContent = await page.content();
    const hasSimilarityHeading = pageContent.includes('Similarity');
    const hasAuthorityIndicator = pageContent.includes('DETERMINISTIC SIM-V1');

    const browserReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      hasSimilarityHeading,
      hasAuthorityIndicator,
      multiMetricDisplay: {
        uniqueMatchedCoverageVisible: pageContent.includes('Unique Matched Coverage'),
        highestSourceMatchVisible: pageContent.includes('Highest Source Match'),
        paragraphsCountVisible: pageContent.includes('Paragraphs'),
        sentencesCountVisible: pageContent.includes('Sentences'),
        phrasesCountVisible: pageContent.includes('Phrases')
      },
      networkLogs: networkLogs.slice(0, 30),
      consoleLogs: consoleLogs.slice(0, 30),
      certifiedGates: ['SIM-17', 'SIM-18'],
      status: hasSimilarityHeading && hasAuthorityIndicator ? 'PASS' : 'FAIL'
    };

    fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(browserReport, null, 2));

    // Capture visual certification artifact
    const screenshotDir = 'certification/similarity';
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'browser_similarity_certified.png'), fullPage: true });

    console.log('[Browser Certification] Browser evidence saved to evidence/similarity/browser.json');
    expect(browserReport.status).toBe('PASS');
  });
});
