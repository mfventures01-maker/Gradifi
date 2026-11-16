import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeHash } from '../src/services/verify/documentNormalizer.js';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import {
  handleCorrectionComparisonRequest,
  CorrectionComparisonRequestError
} from '../src/services/verify/server/correctionComparisonServerHandler.js';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService.js';

function receipt(rawText: string, evidenceSeed: string, score: number, findings: any[], parent?: string) {
  const documentHash = computeHash(rawText);
  const evidenceHash = computeHash(evidenceSeed);
  const result = {
    documentHash, evidenceHash, engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1', overallSimilarity: score, totalSourcesFound: 1,
    similarityAnalysis: { findings, overallSimilarity: score }
  };
  return {
    verification_id: VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash),
    document_hash: documentHash, evidence_hash: evidenceHash,
    engine_version: result.engineVersion, policy_version: result.policyVersion,
    overall_similarity: score, total_sources_found: 1,
    correction_of_verification_id: parent ?? null,
    evidence_envelope: { deterministicResult: result, canonicalDocument: { rawText } }
  };
}

function chain(result: any) {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  return q;
}

describe('G6 trusted correction comparison', () => {
  const originalFinding = {
    findingId: 'f-1', matchedDocumentId: 'source-1',
    matchedSegment: 'private matched passage', matchMethod: 'EXACT_PHRASE',
    similarityScore: 90, provenance: 'DETERMINISTIC'
  };
  const original = receipt('Original submitted document text.', 'original-evidence', 45, [originalFinding]);
  const corrected = receipt('Corrected submitted document text.', 'corrected-evidence', 12, [], original.verification_id);
  const authClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from: vi.fn(() => chain({ data: { id: 'actor-1' }, error: null }))
  };
  const trustedClient = {
    from: vi.fn((table: string) => {
      if (table !== 'public_verification_records') throw new Error('unexpected table');
      return chain({
        data: currentId === original.verification_id ? original : corrected,
        error: null
      });
    })
  };
  let currentId = '';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'anon-test' ? authClient : trustedClient
    );
    trustedClient.from.mockImplementation(() => {
      const q: any = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn((_field: string, id: string) => {
        currentId = id;
        return q;
      });
      q.maybeSingle = vi.fn(async () => ({
        data: currentId === original.verification_id ? original : corrected,
        error: null
      }));
      return q;
    });
  });

  it('returns a safe receipt-grounded DTO and never returns private evidence', async () => {
    const result = await handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, 'valid-token');

    expect(result.status).toBe('VALID');
    expect(result.similarityDelta).toBe(-33);
    expect(result.resolvedFindingCount).toBe(1);
    expect(result.remainingFindingCount).toBe(0);
    expect(JSON.stringify(result)).not.toContain('private matched passage');
    expect(result).not.toHaveProperty('evidence_envelope');
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a corrected receipt without the correct parent relationship', async () => {
    const orphan = { ...corrected, correction_of_verification_id: null };
    trustedClient.from.mockImplementation(() => {
      const q: any = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn((_field: string, id: string) => { currentId = id; return q; });
      q.maybeSingle = vi.fn(async () => ({ data: idFor(currentId, original, orphan), error: null }));
      return q;
    });
    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: orphan.verification_id
    }, 'valid-token')).rejects.toBeInstanceOf(CorrectionComparisonRequestError);
  });

  it('rejects missing authentication before creating Supabase clients', async () => {
    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, '')).rejects.toMatchObject({ statusCode: 401 });
  });
});

function idFor(id: string, original: any, corrected: any) {
  return id === original.verification_id ? original : corrected;
}
