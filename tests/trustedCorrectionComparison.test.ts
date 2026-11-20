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
    evidence_envelope: { deterministicResult: result, canonicalDocument: { rawText } },
    verification_run_id: null as string | null,
    result_hash: 'a'.repeat(64),
    manifest_hash: 'b'.repeat(64),
  };
}

function queryChain(final: { data: any; error: any }) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => final);
  return chain;
}

describe('G6 trusted correction comparison', () => {
  const originalFinding = {
    findingId: 'f-1', matchedDocumentId: 'source-1',
    matchedSegment: 'private matched passage', matchMethod: 'EXACT_PHRASE',
    similarityScore: 90, provenance: 'DETERMINISTIC'
  };
  const original = receipt('Original submitted document text.', 'original-evidence', 45, [originalFinding]);
  const corrected = receipt('Corrected submitted document text.', 'corrected-evidence', 12, [], original.verification_id);
  original.verification_run_id = 'run-original';
  corrected.verification_run_id = 'run-corrected';

  const originalRun = {
    id: 'run-original', institution_id: 'institution-1', school_id: 'school-1',
    created_by_user_id: 'user-1', status: 'succeeded',
    verification_id: original.verification_id, document_hash: original.document_hash,
    evidence_hash: original.evidence_hash, result_hash: original.result_hash,
    manifest_hash: original.manifest_hash, engine_version: original.engine_version,
    policy_version: original.policy_version, parent_run_id: null
  };
  const correctedRun = {
    id: 'run-corrected', institution_id: 'institution-1', school_id: 'school-1',
    created_by_user_id: 'user-1', status: 'succeeded',
    verification_id: corrected.verification_id, document_hash: corrected.document_hash,
    evidence_hash: corrected.evidence_hash, result_hash: corrected.result_hash,
    manifest_hash: corrected.manifest_hash, engine_version: corrected.engine_version,
    policy_version: corrected.policy_version, parent_run_id: 'run-original'
  };

  const authClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from: vi.fn(() => queryChain({ data: {
      id: 'actor-1', institution_id: 'institution-1', school_id: 'school-1', actor_type: 'student'
    }, error: null }))
  };

  let currentReceiptId = '';
  let currentRunId = '';
  let originalFixture = original;
  let correctedFixture = corrected;
  let originalRunFixture = originalRun;
  let correctedRunFixture = correctedRun;

  const trustedClient = {
    from: vi.fn((table: string) => {
      const q: any = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn((_field: string, id: string) => {
        if (table === 'public_verification_records') currentReceiptId = id;
        if (table === 'verification_runs') currentRunId = id;
        return q;
      });
      q.maybeSingle = vi.fn(async () => {
        if (table === 'public_verification_records') {
          return { data: currentReceiptId === original.verification_id ? originalFixture : correctedFixture, error: null };
        }
        if (table === 'verification_runs') {
          return { data: currentRunId === originalRun.id ? originalRunFixture : correctedRunFixture, error: null };
        }
        throw new Error(`unexpected table: ${table}`);
      });
      return q;
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    originalFixture = original;
    correctedFixture = corrected;
    originalRunFixture = originalRun;
    correctedRunFixture = correctedRun;
    currentReceiptId = '';
    currentRunId = '';
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'anon-test' ? authClient : trustedClient
    );
  });

  it('returns a safe receipt-grounded DTO after validating both tenant-scoped runs', async () => {
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

  it('rejects a corrected receipt without the correct receipt and run parent relationships', async () => {
    correctedFixture = { ...corrected, correction_of_verification_id: null };
    correctedRunFixture = { ...correctedRun, parent_run_id: null };

    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, 'valid-token')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects a run belonging to another institution', async () => {
    correctedRunFixture = { ...correctedRun, institution_id: 'other-institution' };

    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, 'valid-token')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects receipts without a canonical verification run', async () => {
    correctedFixture = { ...corrected, verification_run_id: null };

    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, 'valid-token')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects missing authentication before creating Supabase clients', async () => {
    await expect(handleCorrectionComparisonRequest({
      originalVerificationId: original.verification_id,
      correctedVerificationId: corrected.verification_id
    }, '')).rejects.toMatchObject({ statusCode: 401 });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
