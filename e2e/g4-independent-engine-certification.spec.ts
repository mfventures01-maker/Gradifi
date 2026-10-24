/**
 * GRADIFI HOEOS GATE 4 - R5 INDEPENDENT REAL ENGINE CERTIFICATION SPECIFICATION
 * Executes against standard production preview with ZERO test seam injection.
 * Captures Trail A (actual engine snapshot), Trail B (actual DOM observations),
 * and computes Three-Way Comparison against the independent oracle.
 * Governance: HOEOS P4 Standard (Evidence Before Assumption)
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const R5_DIR = path.resolve(process.cwd(), 'evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z');

test.describe('HOEOS G4 R5: Independent Real Engine Certification', () => {
  test('executes real verification engine through standard production build and captures dual evidence trails', async ({ page }) => {
    test.setTimeout(120000);

    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // 1. Navigate to target route
    const targetRoute = process.env.TARGET_ROUTE || '/tools/plagiarism';
    await page.goto(targetRoute);
    await page.waitForLoadState('networkidle');

    // 2. Verify that test seam hook is strictly absent on window
    const isSeamPresent = await page.evaluate(() => {
      return typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__ === 'function';
    });
    expect(isSeamPresent).toBe(false);

    // 3. Pre-load Demo Document through actual UI interaction
    const preloadBtn = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadBtn).toBeVisible({ timeout: 15000 });
    await preloadBtn.click();

    // Verify textarea is populated with canonical demo text
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const documentText = await textarea.inputValue();
    expect(documentText.length).toBeGreaterThan(100);
    expect(documentText).toContain('Quantum Entanglement and Decoupled Neural Architecture');

    // 4. Trigger Real Engine Verification through actual UI click
    const verifyBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.click();

    // 5. Wait for the real engine to complete verification and persistence
    // The page sets currentStep to 'result' and displays Canonical Document Evidence Payload
    await page.waitForSelector('text=Canonical Document Evidence Payload', { timeout: 90000 });

    // Wait for window.__GRADIFI_VERIFY_RESULT__ to be populated by the application
    await page.waitForFunction(
      () => (window as any).__GRADIFI_VERIFY_RESULT__ !== null && (window as any).__GRADIFI_VERIFY_RESULT__ !== undefined,
      { timeout: 30000 }
    );

    // 6. TRAIL A: Capture Actual Engine Result Snapshot
    const rawEngineResult = await page.evaluate(() => {
      const res = (window as any).__GRADIFI_VERIFY_RESULT__;
      return JSON.parse(JSON.stringify(res));
    });

    const engineResultArtifact = {
      capturedAt: new Date().toISOString(),
      documentHash: rawEngineResult.documentHash,
      evidenceHash: rawEngineResult.evidenceHash,
      engineVersion: rawEngineResult.engineVersion,
      policyVersion: rawEngineResult.policyVersion,
      overallSimilarity: rawEngineResult.overallSimilarity,
      uniqueMatchedCoverage: rawEngineResult.uniqueMatchedCoverage,
      highestSourceMatch: rawEngineResult.highestSourceMatch,
      totalSourcesFound: rawEngineResult.totalSourcesFound,
      canonicalTextLength: rawEngineResult.canonicalDocument?.rawText?.length ?? 0,
      canonicalTextHash: rawEngineResult.canonicalDocument?.inputHash,
      similarityFindingsCount: rawEngineResult.similarityAnalysis?.findings?.length ?? 0,
      similarityFindings: rawEngineResult.similarityAnalysis?.findings ?? [],
      verifiedSourcesCount: rawEngineResult.verifiedSources?.length ?? 0,
      verifiedSources: rawEngineResult.verifiedSources ?? [],
      providerStatuses: rawEngineResult.providerStatuses ?? {},
      fineGrainedStatuses: rawEngineResult.fineGrainedStatuses ?? {},
      aiFindings: rawEngineResult.findings ?? []
    };

    const engineResultPath = path.join(R5_DIR, 'r5-engine-result.json');
    fs.writeFileSync(engineResultPath, JSON.stringify(engineResultArtifact, null, 2), 'utf-8');

    // 7. TRAIL B: Capture Actual DOM Observations Independently
    // Capture full-page screenshot
    const screenshotPath = path.join(R5_DIR, 'screenshots/r5_real_engine_dom_highlight.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Observe viewer state
    const viewerVisible = await page.locator('[data-testid="canonical-document-viewer"]').isVisible().catch(() => false);
    const unavailableVisible = await page.locator('[data-testid="canonical-document-viewer-unavailable"]').isVisible().catch(() => false);

    // Capture all DOM marks
    const markLocators = page.locator('[data-testid="canonical-document-viewer"] mark');
    const markCount = await markLocators.count();

    const domMarks: any[] = [];
    for (let i = 0; i < markCount; i++) {
      const mark = markLocators.nth(i);
      const findingId = await mark.getAttribute('data-finding-id');
      const sourceId = await mark.getAttribute('data-source-id');
      const startOffset = await mark.getAttribute('data-start-offset');
      const endOffset = await mark.getAttribute('data-end-offset');
      const method = await mark.getAttribute('data-method');
      const highlightSpan = mark.locator('span[data-highlight-text]');
      const highlightText = (await highlightSpan.count()) > 0 ? await highlightSpan.innerText() : await mark.innerText();
      const renderedText = await mark.innerText();

      domMarks.push({
        index: i,
        findingId,
        sourceId,
        startOffset: startOffset ? parseInt(startOffset, 10) : null,
        endOffset: endOffset ? parseInt(endOffset, 10) : null,
        method,
        highlightText,
        renderedText: renderedText.trim()
      });
    }

    const domObservationsArtifact = {
      capturedAt: new Date().toISOString(),
      viewerVisible,
      unavailableVisible,
      markCount,
      domMarks,
      screenshotArtifact: 'screenshots/r5_real_engine_dom_highlight.png'
    };

    const domObservationsPath = path.join(R5_DIR, 'r5-dom-observations.json');
    fs.writeFileSync(domObservationsPath, JSON.stringify(domObservationsArtifact, null, 2), 'utf-8');

    // 8. THREE-WAY COMPARISON: Engine vs Oracle, DOM vs Oracle, DOM vs Engine
    // Load independent oracle
    const oraclePath = path.join(R5_DIR, 'r5-independent-oracle.json');
    const oracleRaw = fs.readFileSync(oraclePath, 'utf-8').replace(/^\uFEFF/, '');
    const oracleData = JSON.parse(oracleRaw);
    const candidateFindings = oracleData.candidateFindings;

    const oracleFindingA = candidateFindings.find((f: any) => f.label === 'Finding A');
    const oracleFindingB = candidateFindings.find((f: any) => f.label === 'Finding B');

    // Evaluate Engine vs Oracle
    const engineFindings = rawEngineResult.similarityAnalysis?.findings ?? [];
    const engineFindingA = engineFindings.find((f: any) => f.findingId === oracleFindingA.candidateFindingId);
    const engineFindingB = engineFindings.find((f: any) => f.findingId === oracleFindingB.candidateFindingId);

    const engineVsOracle = {
      findingAPresent: !!engineFindingA,
      findingBPresent: !!engineFindingB,
      findingAMatchedDocumentId: engineFindingA?.matchedDocumentId ?? null,
      findingAExpectedDocumentId: oracleFindingA.expectedSourceId,
      findingADocumentIdMatch: engineFindingA?.matchedDocumentId === oracleFindingA.expectedSourceId,
      findingAStart: engineFindingA?.sourceStart ?? null,
      findingAExpectedStart: oracleFindingA.expectedStart,
      findingAStartMatch: engineFindingA?.sourceStart === oracleFindingA.expectedStart,
      findingAEnd: engineFindingA?.sourceEnd ?? null,
      findingAExpectedEnd: oracleFindingA.expectedEnd,
      findingAEndMatch: engineFindingA?.sourceEnd === oracleFindingA.expectedEnd,
      findingBMatchedDocumentId: engineFindingB?.matchedDocumentId ?? null,
      findingBExpectedDocumentId: oracleFindingB.expectedSourceId,
      findingBDocumentIdMatch: engineFindingB?.matchedDocumentId === oracleFindingB.expectedSourceId,
      findingBStart: engineFindingB?.sourceStart ?? null,
      findingBExpectedStart: oracleFindingB.expectedStart,
      findingBStartMatch: engineFindingB?.sourceStart === oracleFindingB.expectedStart,
      findingBEnd: engineFindingB?.sourceEnd ?? null,
      findingBExpectedEnd: oracleFindingB.expectedEnd,
      findingBEndMatch: engineFindingB?.sourceEnd === oracleFindingB.expectedEnd,
      verdict: (!!engineFindingA && !!engineFindingB && engineFindingA.sourceStart === oracleFindingA.expectedStart && engineFindingB.sourceStart === oracleFindingB.expectedStart) ? 'MATCH' : 'MISMATCH'
    };

    // Evaluate DOM vs Oracle
    const domFindingA = domMarks.find((m: any) => m.findingId === oracleFindingA.candidateFindingId || (m.startOffset === oracleFindingA.expectedStart && m.endOffset === oracleFindingA.expectedEnd));
    const domFindingB = domMarks.find((m: any) => m.findingId === oracleFindingB.candidateFindingId || (m.startOffset === oracleFindingB.expectedStart && m.endOffset === oracleFindingB.expectedEnd));

    const domVsOracle = {
      expectedMarkCount: 2,
      observedMarkCount: markCount,
      markCountMatch: markCount === 2,
      domFindingAPresent: !!domFindingA,
      domFindingBPresent: !!domFindingB,
      domFindingAStart: domFindingA?.startOffset ?? null,
      domFindingAExpectedStart: oracleFindingA.expectedStart,
      domFindingAEnd: domFindingA?.endOffset ?? null,
      domFindingAExpectedEnd: oracleFindingA.expectedEnd,
      domFindingATextMatch: domFindingA?.highlightText === oracleFindingA.expectedText,
      domFindingBStart: domFindingB?.startOffset ?? null,
      domFindingBExpectedStart: oracleFindingB.expectedStart,
      domFindingBEnd: domFindingB?.endOffset ?? null,
      domFindingBExpectedEnd: oracleFindingB.expectedEnd,
      domFindingBTextMatch: domFindingB?.highlightText === oracleFindingB.expectedText,
      verdict: (markCount === 2 && !!domFindingA && !!domFindingB && domFindingA.startOffset === oracleFindingA.expectedStart && domFindingB.startOffset === oracleFindingB.expectedStart) ? 'MATCH' : 'MISMATCH'
    };

    // Evaluate DOM vs Engine
    const domVsEngineMatches: any[] = [];
    for (const dm of domMarks) {
      const matchInEngine = engineFindings.find((ef: any) => ef.findingId === dm.findingId || (ef.sourceStart === dm.startOffset && ef.sourceEnd === dm.endOffset));
      domVsEngineMatches.push({
        domMarkIndex: dm.index,
        domFindingId: dm.findingId,
        domStartOffset: dm.startOffset,
        domEndOffset: dm.endOffset,
        matchedInEngine: !!matchInEngine,
        engineFindingId: matchInEngine?.findingId ?? null
      });
    }

    const domVsEngine = {
      domMarksEvaluated: domMarks.length,
      allDomMarksResolvedToEngine: domMarks.length > 0 && domVsEngineMatches.every((m: any) => m.matchedInEngine),
      mappings: domVsEngineMatches,
      verdict: (domMarks.length > 0 && domVsEngineMatches.every((m: any) => m.matchedInEngine)) ? 'MATCH' : 'MISMATCH'
    };

    const threeWayComparison = {
      evaluationTimestamp: new Date().toISOString(),
      engineVsOracle,
      domVsOracle,
      domVsEngine,
      overallCertificationMatch: (engineVsOracle.verdict === 'MATCH' && domVsOracle.verdict === 'MATCH' && domVsEngine.verdict === 'MATCH')
    };

    const threeWayPath = path.join(R5_DIR, 'r5-three-way-comparison.json');
    fs.writeFileSync(threeWayPath, JSON.stringify(threeWayComparison, null, 2), 'utf-8');

    console.log('--- R5 INDEPENDENT CERTIFICATION THREE-WAY EVALUATION ---');
    console.log('Engine vs Oracle Verdict:', engineVsOracle.verdict);
    console.log('DOM vs Oracle Verdict:', domVsOracle.verdict);
    console.log('DOM vs Engine Verdict:', domVsEngine.verdict);
    console.log('Overall Match:', threeWayComparison.overallCertificationMatch);

    // 9. PHASE R5.5 & R5.6 MANDATORY ASSERTIONS
    // As mandated by Section 1, 7, and 14:
    // If the engine returns a different offset, source ID, or finding ID, preserve actual result and fail the assertion.
    expect(engineVsOracle.findingAPresent, 'Expected Finding A (finding-g4-quantum-001) in real engine output').toBe(true);
    expect(engineVsOracle.findingBPresent, 'Expected Finding B (finding-g4-distrib-002) in real engine output').toBe(true);
    expect(engineVsOracle.findingADocumentIdMatch, 'Expected Finding A matchedDocumentId === src-crossref-10.1038-001').toBe(true);
    expect(engineVsOracle.findingAStartMatch, 'Expected Finding A sourceStart === 0').toBe(true);
    expect(engineVsOracle.findingAEndMatch, 'Expected Finding A sourceEnd === 85').toBe(true);
    expect(domVsOracle.markCountMatch, 'Expected exactly 2 DOM highlight marks').toBe(true);
    expect(domVsOracle.domFindingATextMatch, 'Expected DOM primary mark text to match canonical slice [0..85]').toBe(true);
  });
});
