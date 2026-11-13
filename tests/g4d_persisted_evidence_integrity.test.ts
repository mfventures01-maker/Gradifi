import { describe, expect, it } from 'vitest';
import { computeHash } from '../src/services/verify/documentNormalizer';
import { toCanonicalEvidenceText } from '../src/services/verify/deterministicEngine';
import {
  validatePersistedVerificationRecord
} from '../src/services/verify/verificationPersistenceIntegrity';
import {
  VerificationPersistenceService
} from '../src/services/verify/verificationPersistenceService';
import type { EvidenceEngineResult, G4DPersistenceEnvelope, PersistableEvidenceResult, CanonicalAnalysisDocument } from '../src/services/verify/types';
import { buildG4DPersistencePayload } from '../src/services/verify/g4dPersistencePayload';

const rawText = [
  'Introductory material.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Closing material.'
].join('\r\n\r\n');
const canonical = toCanonicalEvidenceText(rawText);
const sourceSegment = 'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.';
const sourceStart = canonical.indexOf(sourceSegment);
const sourceEnd = sourceStart + sourceSegment.length;

function fixture() {
  const result = {
    documentHash: computeHash(rawText),
    evidenceHash: 'a1b2c3d4e5f60718293a',
    engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: 33.3,
    totalSourcesFound: 1,
    verifiedSources: [],
    findings: [],
    providerStatuses: {},
    fineGrainedStatuses: {},
    matrix: [],
    localAiStatus: 'RUNTIME_UNAVAILABLE',
    nemotronStatus: 'AUTHENTICATION_FAILED',
    geminiStatus: 'AUTHENTICATION_FAILED',
    processingTimeMs: 1,
    timestamp: '2026-11-12T00:00:00.000Z',
    similarityAnalysis: {
      analysisType: 'DETERMINISTIC_SIMILARITY',
      sourceDocumentId: computeHash(rawText),
      overallSimilarity: 33.3,
      findings: [{
        findingId: 'finding-g4d-001',
        sourceDocumentId: computeHash(rawText),
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
      engineVersion: 'G5-DETERMINISTIC-v1',
      policyVersion: 'G3-POLICY-v1',
      deterministic: true,
      warnings: []
    }
  } as unknown as EvidenceEngineResult;

  const persistableResult: PersistableEvidenceResult = {
    documentHash: result.documentHash,
    evidenceHash: result.evidenceHash,
    engineVersion: result.engineVersion,
    policyVersion: result.policyVersion,
    overallSimilarity: result.overallSimilarity,
    totalSourcesFound: result.totalSourcesFound,
    similarityAnalysis: { findings: result.similarityAnalysis!.findings }
  };
  const envelope: G4DPersistenceEnvelope = {
    analysisId: 'analysis-g4d-001',
    documentId: result.documentHash,
    timestamp: result.timestamp,
    engineVersion: result.engineVersion,
    policyVersion: result.policyVersion,
    status: 'VERIFIED',
    deterministicResult: persistableResult,
    canonicalDocument: { rawText },
    processingTimeMs: 1
  };

  return VerificationPersistenceService.buildPersistenceRecord(persistableResult, envelope);
}

describe('G4-D persisted evidence and retrieval integrity', () => {
  it('builds the exact browser payload accepted by G4-D after JSON serialization', () => {
    const persistedFixture = fixture();
    const persistedResult = persistedFixture.evidence_envelope.deterministicResult as PersistableEvidenceResult;
    const browserResult = {
      ...persistedResult,
      timestamp: '2026-11-12T00:00:00.000Z',
      processingTimeMs: 1,
      fineGrainedStatuses: { openalex: 'VERIFIED' },
      canonicalDocument: {
        documentId: persistedResult.documentHash,
        rawText
      } as CanonicalAnalysisDocument
    } as EvidenceEngineResult;

    const browserPayload = buildG4DPersistencePayload(browserResult);
    const serializedPayload = JSON.parse(JSON.stringify(browserPayload));
    const persisted = VerificationPersistenceService.buildPersistenceRecord(
      serializedPayload.result,
      serializedPayload.envelope
    );
    const retrieved = JSON.parse(JSON.stringify(persisted));

    expect(validatePersistedVerificationRecord(retrieved)).toEqual({ status: 'VALID' });
    expect(retrieved.evidence_envelope.deterministicResult.documentHash)
      .toBe(retrieved.document_hash);
    expect(retrieved.evidence_envelope.canonicalDocument.rawText).toBe(rawText);
    expect(retrieved.evidence_envelope.deterministicResult.similarityAnalysis.findings)
      .toEqual(browserResult.similarityAnalysis?.findings);
  });

  it('fails closed when the browser result has no canonical text or deterministic findings', () => {
    const persistedResult = fixture().evidence_envelope.deterministicResult as PersistableEvidenceResult;
    const base = {
      ...persistedResult,
      timestamp: '2026-11-12T00:00:00.000Z',
      processingTimeMs: 1,
      fineGrainedStatuses: {}
    } as EvidenceEngineResult;

    expect(() => buildG4DPersistencePayload({
      ...base,
      canonicalDocument: undefined
    })).toThrow(/canonical submitted document text/);

    expect(() => buildG4DPersistencePayload({
      ...base,
      canonicalDocument: { rawText } as CanonicalAnalysisDocument,
      similarityAnalysis: undefined
    })).toThrow(/deterministic similarity findings/);
  });

  it('persists and JSON-round-trips the original hashes, score, and canonical finding coordinates', () => {
    const persisted = fixture();
    const retrieved = JSON.parse(JSON.stringify(persisted));
    expect(validatePersistedVerificationRecord(retrieved)).toEqual({ status: 'VALID' });

    const result = retrieved.evidence_envelope.deterministicResult;
    const finding = result.similarityAnalysis.findings[0];
    expect(result.documentHash).toBe(retrieved.document_hash);
    expect(result.evidenceHash).toBe(retrieved.evidence_hash);
    expect(result.overallSimilarity).toBe(retrieved.overall_similarity);
    expect(canonical.slice(finding.sourceStart, finding.sourceEnd)).toBe(finding.sourceSegment);
  });

  it('rejects a persisted score changed independently of the embedded result', () => {
    const retrieved = JSON.parse(JSON.stringify(fixture()));
    retrieved.overall_similarity = 99.9;
    expect(validatePersistedVerificationRecord(retrieved).status).toBe('INTEGRITY_FAILED');
  });

  it('rejects an altered embedded evidence hash', () => {
    const retrieved = JSON.parse(JSON.stringify(fixture()));
    retrieved.evidence_envelope.deterministicResult.evidenceHash = 'ffffffffffffffffffff';
    expect(validatePersistedVerificationRecord(retrieved).status).toBe('INTEGRITY_FAILED');
  });

  it('rejects a finding whose stored passage no longer matches its canonical slice', () => {
    const retrieved = JSON.parse(JSON.stringify(fixture()));
    retrieved.evidence_envelope.deterministicResult.similarityAnalysis.findings[0].sourceSegment = 'fabricated passage';
    expect(validatePersistedVerificationRecord(retrieved).status).toBe('INTEGRITY_FAILED');
  });

  it('rejects invalid, out-of-range, and half-populated offsets', () => {
    const outOfRange = JSON.parse(JSON.stringify(fixture()));
    outOfRange.evidence_envelope.deterministicResult.similarityAnalysis.findings[0].sourceEnd = canonical.length + 1;
    expect(validatePersistedVerificationRecord(outOfRange).status).toBe('INTEGRITY_FAILED');

    const halfRange = JSON.parse(JSON.stringify(fixture()));
    delete halfRange.evidence_envelope.deterministicResult.similarityAnalysis.findings[0].sourceEnd;
    expect(validatePersistedVerificationRecord(halfRange).status).toBe('INTEGRITY_FAILED');
  });

  it('rejects a canonical text payload that no longer reproduces the document hash', () => {
    const retrieved = JSON.parse(JSON.stringify(fixture()));
    retrieved.evidence_envelope.canonicalDocument.rawText += ' tampered';
    expect(validatePersistedVerificationRecord(retrieved).status).toBe('INTEGRITY_FAILED');
  });

  it('rejects malformed envelopes instead of presenting them as valid receipts', () => {
    const retrieved = JSON.parse(JSON.stringify(fixture()));
    retrieved.evidence_envelope = { persistedAt: '2026-11-12T00:00:00.000Z' };
    expect(validatePersistedVerificationRecord(retrieved).status).toBe('MALFORMED_RECORD');
  });
});
