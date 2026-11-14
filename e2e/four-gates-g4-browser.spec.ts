import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { G4_POSITIVE_FIXTURE, G4_EXPECTED_HIGHLIGHTS } from './g4-fixtures';

/**
 * G4 is a controlled browser/UI contract test.
 * The /api/verify/run response is intercepted with the deterministic G4 oracle.
 * This proves that the real React viewer renders trusted findings at exact
 * canonical offsets. It does NOT certify live provider retrieval or backend
 * finding generation; those are separate runtime gates.
 */
test.describe('HOEOS Gate 4 Controlled UI Highlight Contract', () => {
  test('renders deterministic G4 fixture findings with exact canonical offsets', async ({ page }) => {
    test.setTimeout(90000);

    const canonicalText = G4_POSITIVE_FIXTURE.canonicalText;
    const findings = G4_POSITIVE_FIXTURE.findings;
    const verifiedSources = G4_POSITIVE_FIXTURE.verifiedSources;
    const timestamp = '2026-11-14T00:00:00.000Z';
    const documentId = 'doc-student-canonical';
    const policyVersion = '2026.09-academic-evidence';
    const engineVersion = 'SIM-V1';
    const documentHash = createHash('sha256').update(canonicalText).digest('hex');
    const evidenceHash = createHash('sha256').update(JSON.stringify(findings)).digest('hex');

    const similarityAnalysis = {
      analysisType: 'DETERMINISTIC_SIMILARITY',
      sourceDocumentId: documentId,
      matchedDocumentId: verifiedSources[0].sourceId,
      overallSimilarity: G4_POSITIVE_FIXTURE.overallSimilarity,
      findings,
      engineVersion,
      policyVersion,
      deterministic: true,
      warnings: ['CONTROLLED_UI_FIXTURE_NOT_SERVER_RUNTIME']
    };

    const canonicalDocument = {
      documentId,
      source: {
        filename: 'G4_POSITIVE_FIXTURE.txt',
        fileSizeBytes: Buffer.byteLength(canonicalText, 'utf8'),
        mimeType: 'text/plain',
        extractionMethod: 'demo_fixture',
        isFixture: true,
        origin: 'FIXTURE',
        extractedAt: timestamp
      },
      rawText: canonicalText,
      normalizedText: canonicalText.replace(/\s+/g, ' ').trim().toLowerCase(),
      title: G4_POSITIVE_FIXTURE.metadata.title,
      authors: G4_POSITIVE_FIXTURE.metadata.authors,
      abstract: 'Controlled deterministic fixture for the G4 browser highlight contract.',
      publication: G4_POSITIVE_FIXTURE.metadata.publication,
      year: G4_POSITIVE_FIXTURE.metadata.year,
      doi: G4_POSITIVE_FIXTURE.metadata.doi,
      isbn: G4_POSITIVE_FIXTURE.metadata.isbn,
      identifiers: [G4_POSITIVE_FIXTURE.metadata.doi, G4_POSITIVE_FIXTURE.metadata.isbn],
      stats: {
        characterCount: canonicalText.length,
        wordCount: canonicalText.trim().split(/\s+/).length,
        sentenceCount: 8,
        tokenCount: canonicalText.trim().split(/\s+/).length,
        estimatedPageCount: 1
      },
      extractionStatus: 'SUCCESS',
      normalizationStatus: 'NORMALIZED',
      createdAt: timestamp
    };

    const result = {
      documentHash,
      evidenceHash,
      engineVersion,
      policyVersion,
      overallSimilarity: G4_POSITIVE_FIXTURE.overallSimilarity,
      totalSourcesFound: verifiedSources.length,
      verifiedSources,
      findings: [],
      providerStatuses: {},
      fineGrainedStatuses: {},
      matrix: [],
      localAiStatus: 'RUNTIME_UNAVAILABLE',
      nemotronStatus: 'RUNTIME_UNAVAILABLE',
      geminiStatus: 'RUNTIME_UNAVAILABLE',
      processingTimeMs: 1,
      timestamp,
      canonicalDocument,
      similarityAnalysis,
      plagiarismEvidence: {
        analysisType: 'PLAGIARISM_EVIDENCE',
        sourceDocumentId: documentId,
        matchedDocumentId: verifiedSources[0].sourceId,
        similarityResult: similarityAnalysis,
        riskLevel: 'HIGH',
        evidenceCount: findings.length,
        exactPhraseCount: findings.length,
        ngramFindingCount: 0,
        tokenOverlapFindingCount: 0,
        evidenceCoveragePercent: G4_POSITIVE_FIXTURE.overallSimilarity,
        findings: [],
        policyVersion,
        deterministic: true,
        requiresHumanReview: true,
        warnings: ['CONTROLLED_UI_FIXTURE_NOT_SERVER_RUNTIME']
      },
      constructedQuery: 'G4 controlled UI fixture',
      aggregation: {
        totalDocumentTokens: canonicalDocument.stats.tokenCount,
        totalUniqueMatchedTokens: 20,
        totalDocumentOverlap: G4_POSITIVE_FIXTURE.overallSimilarity,
        highestSourceMatch: 96,
        totalSourceMatches: verifiedSources.length,
        totalParagraphMatches: findings.length,
        totalSentenceMatches: findings.length,
        totalPhraseMatches: findings.length,
        sourceReports: [],
        paragraphFlags: [],
        sentenceFlags: [],
        phraseFlags: [],
        engineVersion,
        normalizationVersion: 'NORM-V1',
        evidenceHash,
        documentHash
      },
      uniqueMatchedCoverage: G4_POSITIVE_FIXTURE.overallSimilarity,
      highestSourceMatch: 96
    };

    let interceptedRun = false;
    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    await page.route('**/api/verify/run', async route => {
      const requestBody = route.request().postDataJSON() as { documentText?: string };
      expect(requestBody.documentText).toBe(canonicalText);
      interceptedRun = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result,
          persistence: { status: 'UNAVAILABLE', reason: 'STORAGE_UNAVAILABLE' }
        })
      });
    });

    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    await textarea.fill(canonicalText);
    expect(await textarea.inputValue()).toBe(canonicalText);

    const runButton = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    await expect(page.getByText('Canonical Document Evidence Payload')).toBeVisible();
    const viewer = page.getByTestId('canonical-document-viewer');
    await expect(viewer).toBeVisible();
    await expect(page.getByText('NO PUBLIC RECEIPT')).toBeVisible();
    await expect(page.getByText(/No public QR receipt was created/)).toBeVisible();
    expect(interceptedRun).toBe(true);

    const viewerHtml = await viewer.innerHTML();
    expect(viewerHtml).not.toContain('PLAGIARIZED');
    expect(viewerHtml).not.toContain('GUILTY');
    expect(viewerHtml).not.toContain('PROVEN PLAGIARISM');

    const marks = viewer.locator('mark[data-finding-id][data-source-id][data-start-offset][data-end-offset]');
    const markCount = await marks.count();
    expect(markCount).toBe(G4_EXPECTED_HIGHLIGHTS.length);

    const verifiedHighlights: Array<Record<string, unknown>> = [];
    for (const expected of G4_EXPECTED_HIGHLIGHTS) {
      const mark = viewer.locator(`mark[data-finding-id="${expected.findingId}"]`);
      await expect(mark).toHaveCount(1);

      const highlightedText = (await mark.locator('[data-highlight-text]').textContent() || '').trim();
      const sourceId = await mark.getAttribute('data-source-id');
      const findingId = await mark.getAttribute('data-finding-id');
      const startOffset = Number(await mark.getAttribute('data-start-offset'));
      const endOffset = Number(await mark.getAttribute('data-end-offset'));

      expect(sourceId).toBe(expected.sourceId);
      expect(findingId).toBe(expected.findingId);
      expect(startOffset).toBe(expected.startOffset);
      expect(endOffset).toBe(expected.endOffset);
      expect(highlightedText).toBe(expected.expectedText);
      expect(canonicalText.slice(startOffset, endOffset)).toBe(expected.expectedText);

      verifiedHighlights.push({
        findingId,
        sourceId,
        startOffset,
        endOffset,
        highlightedText,
        matchMethod: expected.matchMethod
      });
    }

    const screenshotDir = path.join(process.cwd(), 'tests', 'hoeos', 'four_gates', 'evidence', 'g4');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'g4_browser_highlight.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const evidenceDir = path.join(process.cwd(), 'tests', 'hoeos', 'four_gates', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, 'G4_MARK_ASSERTIONS.txt'),
      `EXECUTION_MODE: CONTROLLED_UI_FIXTURE_NOT_SERVER_RUNTIME\nMARK_COUNT: ${markCount}\nEXPECTED_COUNT: ${G4_EXPECTED_HIGHLIGHTS.length}\nHIGHLIGHTS:\n${verifiedHighlights.map(x => JSON.stringify(x)).join('\n')}\nEXACT_CANONICAL_OFFSETS: true\nVERDICT: PASS\n`
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'G4_CANONICAL_IDENTITY.txt'),
      `CANONICAL_TEXT_LENGTH: ${canonicalText.length}\nDOCUMENT_HASH: ${documentHash}\nEVIDENCE_HASH: ${evidenceHash}\nFIXTURE_PROVENANCE: G4_POSITIVE_FIXTURE\nMATCH_EXACT: true\nSERVER_RUNTIME_CERTIFIED: false\n`
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'G4_NETWORK_CONSOLE.txt'),
      `API_ROUTE_INTERCEPTED: ${interceptedRun}\nCONSOLE_LOGS_COUNT: ${consoleLogs.length}\nNETWORK_FAILURES_COUNT: ${networkFailures.length}\n\nCONSOLE_LOGS:\n${consoleLogs.join('\n')}\n\nNETWORK_FAILURES:\n${networkFailures.join('\n')}\n`
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'G4_BROWSER_RUNTIME.txt'),
      `PLAYWRIGHT_UI_CONTRACT_STATUS: PASS\nEXECUTION_MODE: CONTROLLED_UI_FIXTURE_NOT_SERVER_RUNTIME\nMARK_COUNT: ${markCount}\nBACKEND_RUNTIME_CERTIFIED: false\nSCREENSHOT_PATH: tests/hoeos/four_gates/evidence/g4/g4_browser_highlight.png\n`
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'G4_RESULT.json'),
      JSON.stringify({
        status: 'PASS',
        executionMode: 'CONTROLLED_UI_FIXTURE_NOT_SERVER_RUNTIME',
        backendRuntimeCertified: false,
        productionRuntimeClaim: false,
        realBrowser: true,
        apiRouteIntercepted: interceptedRun,
        fixtureName: 'G4_POSITIVE_FIXTURE',
        markCount,
        expectedHighlightCount: G4_EXPECTED_HIGHLIGHTS.length,
        verifiedHighlights,
        authoritativeTextMatch: true,
        offsetInvariant: true,
        screenshotPath: 'tests/hoeos/four_gates/evidence/g4/g4_browser_highlight.png'
      }, null, 2)
    );
  });
});
