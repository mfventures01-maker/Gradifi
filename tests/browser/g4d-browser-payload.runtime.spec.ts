import { expect, test } from '@playwright/test';

test('real browser builds and POSTs the complete G4-D persistence payload', async ({ page }) => {
  let capturedRequest: Record<string, any> | undefined;

  await page.route('**/api/verify/persist', async route => {
    capturedRequest = route.request().postDataJSON() as Record<string, any>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'CREATED',
        record: { verification_id: 'VRF-BROWSERTEST01' }
      })
    });
  });

  await page.goto('/');

  const browserResult = await page.evaluate(async () => {
    const loadModule = (path: string) => import(/* @vite-ignore */ path);
    const [{ buildG4DPersistencePayload }, { verificationPersistenceService }, { computeHash }, { toCanonicalEvidenceText }] =
      await Promise.all([
        loadModule('/src/services/verify/g4dPersistencePayload.ts'),
        loadModule('/src/services/verify/verificationPersistenceService.ts'),
        loadModule('/src/services/verify/documentNormalizer.ts'),
        loadModule('/src/services/verify/deterministicEngine.ts')
      ]);

    const rawText = [
      'Introductory material.',
      'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
      'Closing material.'
    ].join('\\r\\n\\r\\n');
    const canonicalText = toCanonicalEvidenceText(rawText);
    const sourceSegment = 'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.';
    const sourceStart = canonicalText.indexOf(sourceSegment);
    const sourceEnd = sourceStart + sourceSegment.length;
    const documentHash = computeHash(rawText);

    const verification = {
      documentHash,
      evidenceHash: 'a1b2c3d4e5f60718293a',
      engineVersion: 'G5-DETERMINISTIC-v1',
      policyVersion: 'G3-POLICY-v1',
      overallSimilarity: 33.3,
      totalSourcesFound: 1,
      timestamp: '2026-11-12T00:00:00.000Z',
      processingTimeMs: 1,
      fineGrainedStatuses: { openalex: 'VERIFIED' },
      canonicalDocument: { documentId: documentHash, rawText },
      similarityAnalysis: {
        findings: [{
          findingId: 'finding-browser-runtime-001',
          sourceDocumentId: documentHash,
          matchedDocumentId: 'provider-record-17',
          sourceSegment,
          matchedSegment: sourceSegment,
          similarityScore: 100,
          matchMethod: 'EXACT_PHRASE',
          sourceStart,
          sourceEnd,
          offsetBasis: 'CANONICAL_EVIDENCE_TEXT_UTF16',
          provenance: 'DETERMINISTIC'
        }],
        warnings: []
      }
    } as any;

    const payload = buildG4DPersistencePayload(verification);
    const response = await verificationPersistenceService.persistVerificationRecord(
      payload.result,
      payload.envelope
    );

    return {
      response,
      expectedDocumentHash: documentHash,
      expectedRawText: rawText,
      expectedFinding: verification.similarityAnalysis.findings[0]
    };
  });

  expect(browserResult.response.status).toBe('CREATED');
  expect(browserResult.response.record.verification_id).toBe('VRF-BROWSERTEST01');
  expect(capturedRequest).toBeDefined();
  expect(Object.keys(capturedRequest!).sort()).toEqual(['envelope', 'result']);

  const { result, envelope } = capturedRequest!;
  expect(result.documentHash).toBe(browserResult.expectedDocumentHash);
  expect(result.documentHash).toBe(envelope.deterministicResult.documentHash);
  expect(result.evidenceHash).toBe(envelope.deterministicResult.evidenceHash);
  expect(result.overallSimilarity).toBe(envelope.deterministicResult.overallSimilarity);
  expect(result.similarityAnalysis.findings).toEqual([browserResult.expectedFinding]);
  expect(envelope.canonicalDocument.rawText).toBe(browserResult.expectedRawText);
  expect(envelope.deterministicResult.similarityAnalysis.findings).toEqual([browserResult.expectedFinding]);
  expect(envelope.engineVersion).toBe('G5-DETERMINISTIC-v1');
  expect(envelope.policyVersion).toBe('G3-POLICY-v1');
  expect(envelope.canonicalDocument.rawText.slice(
    browserResult.expectedFinding.sourceStart,
    browserResult.expectedFinding.sourceEnd
  )).toBe(browserResult.expectedFinding.sourceSegment);
});
