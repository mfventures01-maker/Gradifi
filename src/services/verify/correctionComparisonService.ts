/**
 * HOEOS G6 — receipt-grounded correction comparison.
 *
 * This module deliberately does not execute the verification engine or mutate
 * persisted receipts. Callers must retrieve each receipt independently before
 * invoking the comparison.
 */
import type { PublicVerificationRecord } from './verificationPersistenceService.js';
import { validatePersistedVerificationRecord } from './verificationPersistenceIntegrity.js';

export interface CorrectionLineage {
  relation: 'CORRECTED_FROM';
  originalVerificationId: string;
  correctedAt: string;
}

export interface CorrectionFindingDelta {
  key: string;
  sourceId: string;
  status: 'RESOLVED' | 'REMAINS';
  originalSimilarity: number;
  correctedSimilarity: number;
}

export interface CorrectionComparison {
  originalVerificationId: string;
  correctedVerificationId: string;
  originalDocumentHash: string;
  correctedDocumentHash: string;
  originalSimilarity: number;
  correctedSimilarity: number;
  similarityDelta: number;
  originalFindingCount: number;
  correctedFindingCount: number;
  resolvedFindingCount: number;
  remainingFindingCount: number;
  findings: CorrectionFindingDelta[];
}

export class CorrectionComparisonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorrectionComparisonError';
  }
}

type Finding = {
  matchedDocumentId?: string;
  matchedSegment?: string;
  matchMethod?: string;
  similarityScore?: number;
};

function normalized(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Finding IDs include the submitted document hash and therefore change after
 * correction. Match identity instead uses the stable source identity, source
 * passage and deterministic match method.
 */
function findingKey(finding: Finding): string {
  const sourceId = typeof finding.matchedDocumentId === 'string' ? finding.matchedDocumentId : '';
  const passage = typeof finding.matchedSegment === 'string' ? normalized(finding.matchedSegment) : '';
  const method = typeof finding.matchMethod === 'string' ? finding.matchMethod : '';
  if (!sourceId || !passage || !method) {
    throw new CorrectionComparisonError('Receipt contains a finding without stable source-passage identity.');
  }
  return [sourceId, passage, method].join('::');
}

function receiptFindings(record: PublicVerificationRecord): Finding[] {
  const result = record.evidence_envelope?.deterministicResult ??
    record.evidence_envelope?.result;
  const findings = result?.similarityAnalysis?.findings;
  if (!Array.isArray(findings)) {
    throw new CorrectionComparisonError('Receipt does not contain deterministic similarity findings.');
  }
  return findings;
}

function assertValidReceipt(record: PublicVerificationRecord, label: string): void {
  const integrity = validatePersistedVerificationRecord(record);
  if (integrity.status !== 'VALID') {
    throw new CorrectionComparisonError(`${label} receipt failed integrity validation: ${integrity.reason || integrity.status}`);
  }
}

/**
 * Compare two independently retrieved immutable receipts. The corrected
 * receipt must carry its lineage in the persisted evidence envelope.
 */
export function compareCorrectionReceipts(
  original: PublicVerificationRecord,
  corrected: PublicVerificationRecord
): CorrectionComparison {
  assertValidReceipt(original, 'Original');
  assertValidReceipt(corrected, 'Corrected');

  if (original.verification_id === corrected.verification_id) {
    throw new CorrectionComparisonError('Correction must create a distinct verification receipt.');
  }
  if (original.document_hash === corrected.document_hash) {
    throw new CorrectionComparisonError('Corrected receipt must represent a different canonical document hash.');
  }

  const lineage = corrected.evidence_envelope?.correctionLineage as CorrectionLineage | undefined;
  if (!lineage || lineage.relation !== 'CORRECTED_FROM' ||
      lineage.originalVerificationId !== original.verification_id ||
      !lineage.correctedAt || Number.isNaN(Date.parse(lineage.correctedAt))) {
    throw new CorrectionComparisonError('Corrected receipt does not contain valid lineage to the original receipt.');
  }

  const originalFindings = receiptFindings(original);
  const correctedFindings = receiptFindings(corrected);
  const correctedByKey = new Map<string, Finding>();
  for (const finding of correctedFindings) correctedByKey.set(findingKey(finding), finding);

  const deltas: CorrectionFindingDelta[] = originalFindings.map((finding) => {
    const key = findingKey(finding);
    const after = correctedByKey.get(key);
    const beforeScore = Number(finding.similarityScore ?? 0);
    const afterScore = after ? Number(after.similarityScore ?? 0) : 0;
    if (!Number.isFinite(beforeScore) || !Number.isFinite(afterScore)) {
      throw new CorrectionComparisonError('Receipt contains a non-finite finding similarity score.');
    }
    return {
      key,
      sourceId: String(finding.matchedDocumentId),
      status: after ? 'REMAINS' : 'RESOLVED',
      originalSimilarity: beforeScore,
      correctedSimilarity: afterScore
    };
  });

  const remainingKeys = new Set(deltas.map(item => item.key));
  for (const finding of correctedFindings) {
    const key = findingKey(finding);
    if (!remainingKeys.has(key)) {
      const score = Number(finding.similarityScore ?? 0);
      if (!Number.isFinite(score)) {
        throw new CorrectionComparisonError('Receipt contains a non-finite finding similarity score.');
      }
      deltas.push({
        key,
        sourceId: String(finding.matchedDocumentId),
        status: 'REMAINS',
        originalSimilarity: 0,
        correctedSimilarity: score
      });
    }
  }

  const originalSimilarity = Number(original.overall_similarity);
  const correctedSimilarity = Number(corrected.overall_similarity);
  if (!Number.isFinite(originalSimilarity) || !Number.isFinite(correctedSimilarity)) {
    throw new CorrectionComparisonError('Receipt similarity score is invalid.');
  }

  const resolvedFindingCount = deltas.filter(item => item.status === 'RESOLVED').length;
  return {
    originalVerificationId: original.verification_id,
    correctedVerificationId: corrected.verification_id,
    originalDocumentHash: original.document_hash,
    correctedDocumentHash: corrected.document_hash,
    originalSimilarity,
    correctedSimilarity,
    similarityDelta: Math.round((correctedSimilarity - originalSimilarity) * 10) / 10,
    originalFindingCount: originalFindings.length,
    correctedFindingCount: correctedFindings.length,
    resolvedFindingCount,
    remainingFindingCount: deltas.length - resolvedFindingCount,
    findings: deltas
  };
}
