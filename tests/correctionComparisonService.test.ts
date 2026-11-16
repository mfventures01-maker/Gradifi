import { describe, expect, it } from 'vitest';
import type { PublicVerificationRecord } from '../src/services/verify/verificationPersistenceService';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService';
import { computeHash } from '../src/services/verify/documentNormalizer';
import { compareCorrectionReceipts, CorrectionComparisonError } from '../src/services/verify/correctionComparisonService';

function receipt(options: {
  rawText: string;
  evidenceHash: string;
  similarity: number;
  findings: Array<{ matchedDocumentId: string; matchedSegment: string; matchMethod: string; similarityScore: number }>;
  correctionOfVerificationId?: string | null;
}): PublicVerificationRecord {
  const documentHash = computeHash(options.rawText);
  const result = {
    documentHash,
    evidenceHash: options.evidenceHash,
    engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: options.similarity,
    totalSourcesFound: 1,
    similarityAnalysis: { findings: options.findings }
  };
  const evidenceEnvelope: Record<string, unknown> = {
    deterministicResult: result,
    canonicalDocument: { rawText: options.rawText }
  };
  if (options.correctionLineage) evidenceEnvelope.correctionLineage = options.correctionLineage;
  return {
    verification_id: VerificationPersistenceService.deriveVerificationId(documentHash, options.evidenceHash),
    document_hash: documentHash,
    evidence_hash: options.evidenceHash,
    engine_version: result.engineVersion,
    policy_version: result.policyVersion,
    overall_similarity: options.similarity,
    total_sources_found: result.totalSourcesFound,
    evidence_envelope: evidenceEnvelope,
    correction_of_verification_id: options.correctionOfVerificationId ?? null
  };
}

const originalFinding = {
  matchedDocumentId: 'source-doi-001',
  matchedSegment: 'the source passage used as evidence',
  matchMethod: 'EXACT_PHRASE',
  similarityScore: 92
};

describe('G6 correction receipt comparison', () => {
  it('calculates comparison from two distinct integrity-valid receipts and persisted lineage', () => {
    const original = receipt({
      rawText: 'Original submitted text with a copied passage.',
      evidenceHash: '1111' + 'a'.repeat(60),
      similarity: 42.5,
      findings: [originalFinding]
    });
    const corrected = receipt({
      rawText: 'Rewritten submitted text with proper attribution and analysis.',
      evidenceHash: '2222' + 'b'.repeat(60),
      similarity: 12.5,
      findings: [],
      correctionOfVerificationId: original.verification_id
    });

    const comparison = compareCorrectionReceipts(original, corrected);
    expect(comparison.originalVerificationId).toBe(original.verification_id);
    expect(comparison.correctedVerificationId).toBe(corrected.verification_id);
    expect(comparison.similarityDelta).toBe(-30);
    expect(comparison.resolvedFindingCount).toBe(1);
    expect(comparison.remainingFindingCount).toBe(0);
  });

  it('rejects same-receipt comparison', () => {
    const original = receipt({
      rawText: 'Original submitted text.',
      evidenceHash: '3333' + 'c'.repeat(60),
      similarity: 20,
      findings: []
    });
    expect(() => compareCorrectionReceipts(original, original))
      .toThrow(CorrectionComparisonError);
  });

  it('rejects a corrected receipt without lineage to the original', () => {
    const original = receipt({
      rawText: 'Original submitted text.',
      evidenceHash: '4444' + 'd'.repeat(60),
      similarity: 20,
      findings: []
    });
    const corrected = receipt({
      rawText: 'Corrected submitted text.',
      evidenceHash: '5555' + 'e'.repeat(60),
      similarity: 10,
      findings: []
    });
    expect(() => compareCorrectionReceipts(original, corrected))
      .toThrow(/correction_of_verification_id/);
  });

  it('rejects a receipt whose persisted score conflicts with its embedded result', () => {
    const original = receipt({
      rawText: 'Original submitted text.',
      evidenceHash: '6666' + 'f'.repeat(60),
      similarity: 20,
      findings: []
    });
    const corrected = receipt({
      rawText: 'Corrected submitted text.',
      evidenceHash: '7777' + '0'.repeat(60),
      similarity: 10,
      findings: [],
      correctionOfVerificationId: original.verification_id
    });
    corrected.overall_similarity = 11;
    expect(() => compareCorrectionReceipts(original, corrected))
      .toThrow(/integrity validation/);
  });
});
