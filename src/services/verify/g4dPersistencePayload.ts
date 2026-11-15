import type { EvidenceEngineResult, G4DPersistenceEnvelope, PersistableEvidenceResult } from './types.js';

export interface G4DPersistencePayload {
  result: PersistableEvidenceResult;
  envelope: G4DPersistenceEnvelope;
}

/**
 * Build the exact bounded payload sent by the browser to /api/verify/persist.
 * Fail closed when the verification result lacks the canonical submitted text
 * or deterministic similarity evidence required by G4-D.
 */
export function buildG4DPersistencePayload(
  verification: EvidenceEngineResult
): G4DPersistencePayload {
  const canonicalRawText = verification.canonicalDocument?.rawText;
  if (typeof canonicalRawText !== 'string' || canonicalRawText.length === 0) {
    throw new Error('G4-D persistence requires the canonical submitted document text.');
  }
  if (!verification.similarityAnalysis) {
    throw new Error('G4-D persistence requires deterministic similarity findings.');
  }

  const result: PersistableEvidenceResult = {
    documentHash: verification.documentHash,
    evidenceHash: verification.evidenceHash,
    engineVersion: verification.engineVersion,
    policyVersion: verification.policyVersion,
    overallSimilarity: verification.overallSimilarity,
    totalSourcesFound: verification.totalSourcesFound,
    similarityAnalysis: {
      findings: verification.similarityAnalysis.findings
    }
  };

  const providerOutcomes = Object.values(verification.fineGrainedStatuses ?? {});
  const successfulProviderOutcomes = providerOutcomes.filter(status =>
    status === 'VERIFIED' ||
    status === 'PARTIALLY_VERIFIED' ||
    status === 'EMPTY_RESULT'
  ).length;
  const status: G4DPersistenceEnvelope['status'] =
    successfulProviderOutcomes === 0
      ? 'FAILED'
      : successfulProviderOutcomes === providerOutcomes.length
        ? 'VERIFIED'
        : 'PARTIALLY_VERIFIED';

  const envelope: G4DPersistenceEnvelope = {
    analysisId: `ANL-${verification.documentHash.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
    documentId: verification.canonicalDocument?.documentId ?? verification.documentHash,
    timestamp: verification.timestamp,
    engineVersion: verification.engineVersion,
    policyVersion: verification.policyVersion,
    status,
    deterministicResult: result,
    canonicalDocument: { rawText: canonicalRawText },
    processingTimeMs: verification.processingTimeMs,
    warnings: verification.similarityAnalysis.warnings
  };

  return { result, envelope };
}
