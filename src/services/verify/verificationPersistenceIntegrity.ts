/**
 * HOEOS G4-D — PERSISTED EVIDENCE INTEGRITY CONTRACT
 *
 * Validates the immutable database projection against its embedded verification
 * envelope. This is deliberately read-only: it never repairs or regenerates
 * persisted evidence.
 */

import type { PublicVerificationRecord } from './verificationPersistenceService.js';
import { computeHash, toCanonicalEvidenceText } from './deterministicEngine.js';

export type PersistedIntegrityStatus = 'VALID' | 'MALFORMED_RECORD' | 'INTEGRITY_FAILED';

export interface PersistedIntegrityResult {
  status: PersistedIntegrityStatus;
  reason?: string;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sameNumber(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && Number.isFinite(a) &&
    typeof b === 'number' && Number.isFinite(b) && a === b;
}

/**
 * Verify outer row identity and all duplicated authoritative fields against
 * the embedded deterministic result. Where canonical submitted text and
 * findings are present, re-check every populated submitted-side UTF-16 range.
 */
export function validatePersistedVerificationRecord(
  record: PublicVerificationRecord | Record<string, any>
): PersistedIntegrityResult {
  if (!isObject(record)) return { status: 'MALFORMED_RECORD', reason: 'Record is not an object.' };

  const requiredStrings = [
    'verification_id', 'document_hash', 'evidence_hash', 'engine_version', 'policy_version'
  ];
  for (const key of requiredStrings) {
    if (typeof record[key] !== 'string' || !record[key].trim()) {
      return { status: 'MALFORMED_RECORD', reason: `Missing or invalid ${key}.` };
    }
  }
  if (!sameNumber(record.overall_similarity, record.overall_similarity) ||
      record.overall_similarity < 0 || record.overall_similarity > 100) {
    return { status: 'MALFORMED_RECORD', reason: 'overall_similarity must be a finite number from 0 to 100.' };
  }
  if (!isObject(record.evidence_envelope)) {
    return { status: 'MALFORMED_RECORD', reason: 'evidence_envelope is missing or malformed.' };
  }

  const expectedId = `VRF-${record.document_hash.slice(0, 8)}${record.evidence_hash.slice(0, 4)}`.toUpperCase();
  if (record.verification_id.toUpperCase() !== expectedId) {
    return { status: 'INTEGRITY_FAILED', reason: 'verification_id does not match document_hash and evidence_hash.' };
  }

  const envelope = record.evidence_envelope;
  const result = isObject(envelope.deterministicResult)
    ? envelope.deterministicResult
    : (isObject(envelope.result) ? envelope.result : undefined);

  if (!result) {
    return { status: 'MALFORMED_RECORD', reason: 'Evidence envelope does not contain a deterministic result.' };
  }

  const comparisons: Array<[string, unknown, unknown]> = [
    ['document_hash', record.document_hash, result.documentHash],
    ['evidence_hash', record.evidence_hash, result.evidenceHash],
    ['overall_similarity', record.overall_similarity, result.overallSimilarity],
    ['engine_version', record.engine_version, result.engineVersion],
    ['policy_version', record.policy_version, result.policyVersion],
    ['total_sources_found', record.total_sources_found, result.totalSourcesFound]
  ];
  for (const [field, persisted, embedded] of comparisons) {
    if (field === 'overall_similarity') {
      if (!sameNumber(persisted, embedded)) {
        return { status: 'INTEGRITY_FAILED', reason: `${field} differs between record and embedded result.` };
      }
    } else if (persisted !== undefined && embedded !== undefined && persisted !== embedded) {
      return { status: 'INTEGRITY_FAILED', reason: `${field} differs between record and embedded result.` };
    }
  }

  const canonicalDocument = isObject(envelope.canonicalDocument)
    ? envelope.canonicalDocument
    : (isObject(result.canonicalDocument) ? result.canonicalDocument : undefined);
  const rawText = typeof canonicalDocument?.rawText === 'string' ? canonicalDocument.rawText : undefined;

  if (rawText !== undefined) {
    if (computeHash(rawText) !== record.document_hash) {
      return { status: 'INTEGRITY_FAILED', reason: 'Canonical submitted text does not reproduce document_hash.' };
    }

    const similarity = isObject(result.similarityAnalysis) ? result.similarityAnalysis : undefined;
    const findings = Array.isArray(similarity?.findings) ? similarity.findings : [];
    const canonicalText = toCanonicalEvidenceText(rawText);

    for (const finding of findings) {
      if (!isObject(finding)) {
        return { status: 'MALFORMED_RECORD', reason: 'A persisted similarity finding is malformed.' };
      }
      const start = finding.sourceStart;
      const end = finding.sourceEnd;
      if (start === undefined && end === undefined) continue;
      if (!Number.isInteger(start) || !Number.isInteger(end) ||
          start < 0 || end <= start || end > canonicalText.length) {
        return { status: 'INTEGRITY_FAILED', reason: `Finding ${String(finding.findingId || 'unknown')} has invalid submitted offsets.` };
      }
      if (typeof finding.sourceSegment !== 'string' ||
          canonicalText.slice(start, end) !== finding.sourceSegment) {
        return { status: 'INTEGRITY_FAILED', reason: `Finding ${String(finding.findingId || 'unknown')} does not match its canonical submitted slice.` };
      }
      const matchedStart = finding.matchedStart;
      const matchedEnd = finding.matchedEnd;
      if ((matchedStart === undefined) !== (matchedEnd === undefined)) {
        return { status: 'INTEGRITY_FAILED', reason: `Finding ${String(finding.findingId || 'unknown')} has an incomplete source-side range.` };
      }
      if (finding.offsetBasis && finding.offsetBasis !== 'CANONICAL_EVIDENCE_TEXT_UTF16') {
        return { status: 'INTEGRITY_FAILED', reason: 'Finding uses an unsupported offset basis.' };
      }
    }
  }

  return { status: 'VALID' };
}
