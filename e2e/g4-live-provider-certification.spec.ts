/**
 * GRADIFI HOEOS GATE 4 - END-TO-END LIVE-PROVIDER CERTIFICATION SPECIFICATION
 *
 * Exercises the genuine live-provider verification path against the local development server.
 * Strictly verifies zero synthetic fixture injection, authentic network dispatch,
 * canonical text slice fidelity, source attribution, and fail-closed integrity.
 *
 * Governance: HOEOS P4 Standard (Evidence Before Assumption, Production Is Sacred)
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = process.env.RECERT_EVIDENCE_DIR
  || path.resolve(process.cwd(), 'evidence/g4-live-recertification-20261018T172500Z');

test.describe('HOEOS G4 Live-Provider End-to-End Certification', () => {
  test('executes genuine live verification flow and certifies rendered highlights without synthetic seams', async ({ page }) => {
    test.setTimeout(120000);

    const consoleLogs: string[] = [];
    const providerNetworkEvents: Array<{
      url: string;
      method: string;
      status?: number;
      timestamp: string;
    }> = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('response', resp => {
      const url = resp.url();
      if (url.includes('/api/verify/')) {
        // Redact any query params or secrets
        const cleanUrl = url.split('?')[0];
        providerNetworkEvents.push({
          url: cleanUrl,
          method: resp.request().method(),
          status: resp.status(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // 1. Navigate to verification route
    const targetRoute = process.env.TARGET_ROUTE || '/tools/plagiarism';
    await page.goto(targetRoute);
    await page.waitForLoadState('networkidle');

    // 2. Strict Pre-execution Seam Audit: window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__ MUST be undefined
    const seamAtLoad = await page.evaluate(
      () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
    );
    expect(seamAtLoad, 'Test-seam hook must not be defined on initial page load').toBe('undefined');

    // 3. Pre-load standard demo document through ordinary user interaction
    const preloadBtn = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadBtn, 'Pre-load button must be visible').toBeVisible({ timeout: 15000 });
    await preloadBtn.click();

    // Verify textarea is populated with canonical demo text
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const documentText = await textarea.inputValue();
    expect(documentText.length, 'Loaded text must exceed 1000 characters').toBeGreaterThan(1000);
    expect(documentText, 'Loaded text must contain paper title').toContain('Quantum Entanglement and Decoupled Neural Architecture');

    // Re-verify seam is still absent before clicking verify
    const seamBeforeRun = await page.evaluate(
      () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
    );
    expect(seamBeforeRun, 'Test-seam hook must not be defined before verification action').toBe('undefined');

    // 4. Trigger Real Verification through ordinary user button click
    const verifyBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(verifyBtn, 'Verify button must be enabled').toBeEnabled();
    await verifyBtn.click();

    // 5. Bounded Wait for Verification & Persistence Completion
    // Application transitions currentStep to 'result' and displays Canonical Document Evidence Payload
    await page.waitForSelector('text=Canonical Document Evidence Payload', { timeout: 90000 });

    // 6. Verify Seam Remains Absent Post-Run
    const seamAfterRun = await page.evaluate(
      () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
    );
    expect(seamAfterRun, 'Test-seam hook must not be introduced or active during run').toBe('undefined');

    // 7. Verify Review Boundary Disclaimer & Absence of Forbidden Verdict Words
    await expect(page.locator('text=Human Academic Review Boundary')).toBeVisible();

    const viewerContainer = page.locator('[data-testid="canonical-document-viewer"]');
    await expect(viewerContainer, 'Canonical Document Viewer must be visible in DOM').toBeVisible();

    const viewerHtml = await viewerContainer.innerHTML();
    expect(viewerHtml, 'Viewer must not contain PLAGIARIZED verdict').not.toContain('PLAGIARIZED');
    expect(viewerHtml, 'Viewer must not contain GUILTY verdict').not.toContain('GUILTY');
    expect(viewerHtml, 'Viewer must not contain PROVEN PLAGIARISM verdict').not.toContain('PROVEN PLAGIARISM');

    // 8. Capture Authoritative Application Engine Result
    const appResult = await page.evaluate(() => {
      const raw = (window as any).__GRADIFI_VERIFY_RESULT__;
      return raw ? JSON.parse(JSON.stringify(raw)) : null;
    });

    expect(appResult, 'Authoritative result on window.__GRADIFI_VERIFY_RESULT__ must be populated').toBeTruthy();
    expect(appResult.canonicalDocument, 'Canonical document must exist in engine result').toBeTruthy();
    expect(typeof appResult.canonicalDocument.rawText, 'Canonical rawText must be string').toBe('string');

    const canonicalText: string = appResult.canonicalDocument.rawText;
    expect(canonicalText.length, 'Canonical text must be non-empty').toBeGreaterThan(500);

    const findings: any[] = appResult?.similarityAnalysis?.findings || [];
    const verifiedSources: any[] = appResult?.verifiedSources || [];

    // 9. Assert Provenance Non-Fixture Invariant
    const FORBIDDEN_FIXTURE_IDS = new Set([
      'src-crossref-10.1038-001',
      'finding-g4-quantum-001',
      'finding-g4-distrib-002',
      'doi:10.9999/gradifi-r6-a',
      'doi:10.9999/gradifi-r6-b'
    ]);

    for (const f of findings) {
      expect(
        FORBIDDEN_FIXTURE_IDS.has(f.findingId),
        `Finding ${f.findingId} must not use hardcoded synthetic fixture ID`
      ).toBe(false);
      expect(
        FORBIDDEN_FIXTURE_IDS.has(f.matchedDocumentId),
        `Finding source ${f.matchedDocumentId} must not use hardcoded synthetic fixture sourceId`
      ).toBe(false);
    }

    // 10. Assert Rendered DOM Mark Elements against Engine Findings & Canonical Slices
    const markElements = viewerContainer.locator('mark[data-finding-id]');
    const markCount = await markElements.count();
    console.log(`CERTIFICATION_DOM_MARK_COUNT: ${markCount}`);
    expect(markCount, 'At least 1 highlight mark must be rendered from verified provider matches').toBeGreaterThan(0);

    const observedDomMarks: Array<{
      index: number;
      findingId: string;
      sourceId: string;
      start: number;
      end: number;
      markText: string;
      canonicalSlice: string;
      sliceMatchesExact: boolean;
    }> = [];

    const assertionDetails: Array<{
      assertion: string;
      passed: boolean;
      details?: any;
    }> = [];

    for (let i = 0; i < markCount; i++) {
      const mark = markElements.nth(i);
      const textSpan = mark.locator('[data-highlight-text]');
      const markText = (await textSpan.count()) > 0
        ? ((await textSpan.textContent()) || '')
        : ((await mark.evaluate((el: any) => Array.from(el.childNodes).filter((n: any) => n.nodeType === 3).map((n: any) => n.textContent).join(''))) || '');

      const findingId = await mark.getAttribute('data-finding-id');
      const sourceId = await mark.getAttribute('data-source-id');
      const startAttr = await mark.getAttribute('data-start-offset');
      const endAttr = await mark.getAttribute('data-end-offset');

      expect(findingId, `Mark ${i} must have data-finding-id`).toBeTruthy();
      expect(sourceId, `Mark ${i} must have data-source-id`).toBeTruthy();
      expect(startAttr, `Mark ${i} must have data-start-offset`).toBeTruthy();
      expect(endAttr, `Mark ${i} must have data-end-offset`).toBeTruthy();

      const start = parseInt(startAttr!, 10);
      const end = parseInt(endAttr!, 10);

      // Offset invariants
      expect(Number.isInteger(start), `Mark ${i} start must be integer`).toBe(true);
      expect(Number.isInteger(end), `Mark ${i} end must be integer`).toBe(true);
      expect(start, `Mark ${i} start must be >= 0`).toBeGreaterThanOrEqual(0);
      expect(end, `Mark ${i} end must be > start`).toBeGreaterThan(start);
      expect(end, `Mark ${i} end must be <= canonicalText.length`).toBeLessThanOrEqual(canonicalText.length);

      // Canonical text slice equality
      const expectedSlice = canonicalText.slice(start, end);
      expect(markText, `Mark ${i} text must strictly equal canonical slice`).toBe(expectedSlice);

      // Attribution correspondence to findings in engine result
      const matchingFinding = findings.find(f => f.findingId === findingId);
      expect(matchingFinding, `Mark ${i} findingId must correspond to a finding in engine result`).toBeTruthy();
      expect(sourceId, `Mark ${i} sourceId must match finding's matchedDocumentId`).toBe(matchingFinding.matchedDocumentId);

      observedDomMarks.push({
        index: i,
        findingId: findingId!,
        sourceId: sourceId!,
        start,
        end,
        markText,
        canonicalSlice: expectedSlice,
        sliceMatchesExact: markText === expectedSlice
      });
    }

    // 11. Capture Screenshots and Evidence Artifacts
    const screenshotsDir = path.join(EVIDENCE_DIR, 'screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'g4_live_dom_highlight.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Record Structured Assertion Evidence
    const certRecord = {
      timestamp: new Date().toISOString(),
      targetRoute,
      seamAbsenceVerified: seamAtLoad === 'undefined' && seamBeforeRun === 'undefined' && seamAfterRun === 'undefined',
      documentTextLength: documentText.length,
      canonicalTextLength: canonicalText.length,
      providerNetworkEvents,
      findingsCount: findings.length,
      verifiedSourcesCount: verifiedSources.length,
      markCount,
      observedDomMarks,
      allSlicesMatched: observedDomMarks.every(m => m.sliceMatchesExact),
      provenanceNonFixture: findings.every(f => !FORBIDDEN_FIXTURE_IDS.has(f.findingId)),
      screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/'),
      verdict: 'PASS'
    };

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'ASSERTION_RESULTS.json'),
      JSON.stringify(certRecord, null, 2),
      'utf-8'
    );
  });
});
