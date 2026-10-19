/**
 * HOEOS G4 - INDEPENDENT ENGINE CERTIFICATION SPEC (R6)
 *
 * Writes r6-trace.json and r6-engine-result.json BEFORE any assertion so
 * a failed run leaves the seven-row finding-to-DOM mapping on disk.
 *
 * Asserts coverage (finding range contained in a mark), not count equality,
 * because overlapping findings merge by contract (see buildRenderedSegments
 * and tests/g4-offset-invariants.test.ts Category 13).
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STUB_SOURCE_IDS = new Set([
  'doi:10.9999/gradifi-r6-a',
  'doi:10.9999/gradifi-r6-b',
]);

test.describe('HOEOS G4 Engine Certification (R6)', () => {
  test('real engine produces stub-attributed findings and DOM covers them faithfully', async ({ page }) => {
    test.setTimeout(90000);

    const evidenceDir = process.env.R6_EVIDENCE_DIR
      || path.join(process.cwd(), 'evidence', 'g4-r6-engine-certification');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.goto('/tools/plagiarism');
    await page.waitForLoadState('networkidle');
    const seamAtLoad = await page.evaluate(
      () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
    );

    await page.locator('button:has-text("Pre-load Demo Document")').click();
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    const loadedText = await textarea.inputValue();
    expect(loadedText.length).toBeGreaterThan(1000);

    await page.locator('button:has-text("Run Academic Evidence Verification")').click();
    await page.waitForSelector('text=Canonical Document Evidence Payload', { timeout: 60000 });

    const seamAfterRun = await page.evaluate(
      () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
    );

    const engineResult = await page.evaluate(
      () => (window as any).__GRADIFI_VERIFY_RESULT__
    );
    expect(engineResult).toBeTruthy();
    expect(engineResult.canonicalDocument).toBeTruthy();
    const canonicalText: string = engineResult.canonicalDocument.rawText;
    const findings: any[] = engineResult?.similarityAnalysis?.findings || [];

    const viewer = page.locator('[data-testid="canonical-document-viewer"]');
    const viewerVisible = await viewer.isVisible().catch(() => false);
    const marks = viewer.locator('mark[data-finding-id]');
    const markCount = await marks.count();

    const domMarks: Array<any> = [];
    for (let i = 0; i < markCount; i++) {
      const mark = marks.nth(i);
      const findingId = await mark.getAttribute('data-finding-id');
      const sourceId = await mark.getAttribute('data-source-id');
      const startAttr = await mark.getAttribute('data-start-offset');
      const endAttr = await mark.getAttribute('data-end-offset');
      const textSpan = mark.locator('[data-highlight-text]');
      const markText = ((await textSpan.textContent()) || '');
      domMarks.push({
        index: i,
        findingId,
        sourceId,
        startAttr,
        endAttr,
        start: startAttr ? parseInt(startAttr, 10) : null,
        end: endAttr ? parseInt(endAttr, 10) : null,
        markText,
      });
    }

    const mapping = findings.map((f, i) => {
      const covering = domMarks.filter(m =>
        m.start !== null && m.end !== null &&
        m.start <= f.sourceStart && m.end >= f.sourceEnd
      );
      const exact = domMarks.filter(m => m.findingId === f.findingId);
      return {
        rowIndex: i,
        findingId: f.findingId,
        sourceId: f.matchedDocumentId,
        sourceStart: f.sourceStart,
        sourceEnd: f.sourceEnd,
        spanLength: (f.sourceEnd ?? 0) - (f.sourceStart ?? 0),
        expectedCanonicalSlice: canonicalText.slice(f.sourceStart, f.sourceEnd),
        coveredByMarkIndices: covering.map(m => m.index),
        exactMarkIndices: exact.map(m => m.index),
        outcome: exact.length > 0
          ? 'EXACT_MATCH'
          : (covering.length > 0 ? 'COVERED_BY_LARGER_MARK' : 'NO_COVERING_MARK'),
      };
    });

    const trace = {
      timestamp: new Date().toISOString(),
      seamAbsentAtLoad: seamAtLoad === 'undefined',
      seamAbsentAfterRun: seamAfterRun === 'undefined',
      canonicalLength: canonicalText.length,
      loadedTextLength: loadedText.length,
      viewerVisible,
      findingCount: findings.length,
      markCount,
      stubSourceIds: Array.from(STUB_SOURCE_IDS),
      syntheticProvenance: true,
      syntheticProvenanceNote: 'Stub ProviderResult carries provenanceState=VERIFIED (required by filterVerifiedFindings) and syntheticStub=true. R6 certifies engine behavior against synthetic input only.',
      findings: findings.map((f, i) => ({
        rowIndex: i,
        findingId: f.findingId,
        sourceId: f.matchedDocumentId,
        sourceStart: f.sourceStart,
        sourceEnd: f.sourceEnd,
        similarityScore: f.similarityScore,
        matchMethod: f.matchMethod,
      })),
      domMarks,
      mapping,
      allFindingsHaveCoveringMark: mapping.every(r => r.coveredByMarkIndices.length > 0),
      allMarksAttributedToFinding: domMarks.every(m =>
        findings.some(f => f.findingId === m.findingId)
      ),
      allMarkTextMatchesSlice: domMarks.every(m =>
        m.start !== null && m.end !== null && m.markText === canonicalText.slice(m.start, m.end)
      ),
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'r6-trace.json'),
      JSON.stringify(trace, null, 2)
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'r6-engine-result.json'),
      JSON.stringify(trace, null, 2)
    );

    expect(seamAtLoad).toBe('undefined');
    expect(seamAfterRun).toBe('undefined');
    expect(viewerVisible).toBe(true);
    expect(findings.length).toBeGreaterThan(0);
    expect(markCount).toBeGreaterThan(0);

    for (const f of findings) {
      expect(
        STUB_SOURCE_IDS.has(f.matchedDocumentId),
        `finding ${f.findingId} attributed to non-stub source ${f.matchedDocumentId}`
      ).toBe(true);
    }

    expect(trace.allFindingsHaveCoveringMark, 'some findings not covered by any DOM mark').toBe(true);
    expect(trace.allMarksAttributedToFinding, 'some DOM marks reference unknown findings').toBe(true);
    expect(trace.allMarkTextMatchesSlice, 'some mark text does not equal canonical slice').toBe(true);
  });
});