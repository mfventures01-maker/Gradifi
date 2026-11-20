import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeHash } from '../src/services/verify/documentNormalizer.js';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import {
  handlePersistenceServerRequest,
  PersistenceRequestError
} from '../src/services/verify/server/persistenceServerHandler.js';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService.js';

const rawText = 'A server-authorized persistence test document.';
const documentHash = computeHash(rawText);
const engineVersion = 'G5-DETERMINISTIC-v1';
const policyVersion = 'G3-POLICY-v1';
const evidenceHash = computeHash(`${documentHash}::0:${engineVersion}:${policyVersion}`);

const result = {
  documentHash,
  evidenceHash,
  engineVersion,
  policyVersion,
  overallSimilarity: 0,
  totalSourcesFound: 0,
  similarityAnalysis: { findings: [], overallSimilarity: 0 },
  evidenceHashMaterial: { totalUniqueMatchedTokens: 0, sourceCoverage: [] }
};
const envelope = {
  analysisId: 'ANL-AUTH-TEST',
  documentId: documentHash,
  timestamp: '2026-11-15T00:00:00.000Z',
  engineVersion,
  policyVersion,
  status: 'VERIFIED' as const,
  deterministicResult: result,
  canonicalDocument: { rawText },
  processingTimeMs: 1,
  warnings: []
};
const payload = { result, envelope };

function queryChain(final: { data: any; error: any }) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => final);
  chain.single = vi.fn(async () => final);
  chain.insert = vi.fn(() => chain);
  return chain;
}

describe('POST /api/verify/persist authorization boundary', () => {
  const authClient = {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  };
  const serviceClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';

    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    authClient.from.mockReturnValue(queryChain({ data: { id: 'actor-1' }, error: null }));

    const record = {
      ...VerificationPersistenceService.buildPersistenceRecord(result as any, envelope as any),
      id: 'internal-row-id',
      verification_run_id: 'internal-run-id',
      result_hash: 'internal-result-hash',
      manifest_hash: 'internal-manifest-hash',
      status: 'internal-status',
      public_schema_version: 'internal-schema-version'
    };
    const existingChain = queryChain({ data: null, error: null });
    const insertChain = queryChain({ data: record, error: null });
    serviceClient.from.mockImplementation(() => {
      const chain = queryChain({ data: null, error: null });
      chain.insert = vi.fn(() => insertChain);
      return chain;
    });

    createClientMock.mockImplementation((_url: string, key: string) => {
      if (key === 'anon-test') return authClient;
      if (key === 'service-test') return serviceClient;
      return { auth: {}, from: vi.fn(() => existingChain) };
    });
  });

  it('rejects a missing bearer token before creating any Supabase client', async () => {
    await expect(handlePersistenceServerRequest(payload as any, ''))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid Supabase session before privileged client creation', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token')
    });

    await expect(handlePersistenceServerRequest(payload as any, 'bad-token'))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-test',
      expect.any(Object)
    );
  });

  it('rejects an authenticated user without an active identity actor', async () => {
    authClient.from.mockReturnValue(queryChain({ data: null, error: null }));

    await expect(handlePersistenceServerRequest(payload as any, 'valid-token'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('allows an authenticated active actor and returns only the safe receipt DTO', async () => {
    const response = await handlePersistenceServerRequest(payload as any, 'valid-token');

    expect(response.status).toBe('CREATED');
    expect(response.record.verification_id).toBe(
      VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash)
    );
    expect(response.record).not.toHaveProperty('evidence_envelope');
    expect(Object.keys(response.record).sort()).toEqual([
      'correction_of_verification_id',
      'created_at',
      'document_hash',
      'engine_version',
      'evidence_hash',
      'overall_similarity',
      'policy_version',
      'total_sources_found',
      'verification_id'
    ]);
    expect(response.record).not.toHaveProperty('id');
    expect(response.record).not.toHaveProperty('verification_run_id');
    expect(response.record).not.toHaveProperty('result_hash');
    expect(response.record).not.toHaveProperty('manifest_hash');
    expect(response.record).not.toHaveProperty('status');
    expect(response.record).not.toHaveProperty('public_schema_version');
    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(serviceClient.from).toHaveBeenCalledWith('public_verification_records');
  });

  it('rejects a correction parent run outside the active actor tenant', async () => {
    const parentRecord = {
      ...VerificationPersistenceService.buildPersistenceRecord(result as any, envelope as any),
      verification_run_id: 'parent-run-1'
    };
    const parentRun = {
      id: 'parent-run-1',
      institution_id: 'other-institution',
      school_id: 'other-school',
      created_by_user_id: 'someone-else',
      status: 'succeeded',
      verification_id: parentRecord.verification_id,
      document_hash: parentRecord.document_hash,
      evidence_hash: parentRecord.evidence_hash
    };

    authClient.from.mockReturnValue(queryChain({
      data: { id: 'actor-1', institution_id: 'institution-1', school_id: 'school-1', actor_type: 'student' },
      error: null
    }));
    serviceClient.from.mockImplementation((table: string) => {
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({
        data: table === 'public_verification_records' ? parentRecord : parentRun,
        error: null
      }));
      return chain;
    });

    await expect(handlePersistenceServerRequest({
      ...payload,
      correctionOfVerificationId: parentRecord.verification_id
    } as any, 'valid-token')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects tampered canonical text before privileged client creation', async () => {
    const tampered = {
      ...payload,
      envelope: { ...envelope, canonicalDocument: { rawText: 'tampered text' } }
    };

    await expect(handlePersistenceServerRequest(tampered as any, 'valid-token'))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
