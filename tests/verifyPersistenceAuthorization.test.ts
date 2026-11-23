import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeHash } from '../src/services/verify/documentNormalizer.js';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import {
  handlePersistenceServerRequest,
  PersistenceRequestError
} from '../src/services/verify/server/persistenceServerHandler.js';

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

const receipt = {
  id: 'receipt-row-id',
  verification_id: 'VRF-123456789ABC',
  document_hash: 'a'.repeat(64),
  evidence_hash: 'b'.repeat(64),
  engine_version: engineVersion,
  policy_version: policyVersion,
  overall_similarity: 0,
  total_sources_found: 0,
  correction_of_verification_id: null,
  verification_run_id: 'run-row-id',
  result_hash: 'c'.repeat(64),
  manifest_hash: 'd'.repeat(64),
  status: 'VALID',
  public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
  created_at: '2026-11-23T12:00:00.000Z'
};

function queryChain(final: { data: any; error: any }) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => final);
  chain.single = vi.fn(async () => final);
  return chain;
}

describe('POST /api/verify/persist authoritative run + receipt boundary', () => {
  const authClient = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn()
  };
  const serviceClient = {
    from: vi.fn(),
    rpc: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';

    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    authClient.from.mockReturnValue(queryChain({
      data: { id: 'actor-1', institution_id: 'institution-1', school_id: null, actor_type: 'principal_admin' },
      error: null
    }));
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return queryChain({
          data: { id: 'workspace-1', institution_id: 'institution-1', workspace_type: 'institution', status: 'active' },
          error: null
        });
      }
      if (table === 'service_versions') {
        return queryChain({
          data: { id: 'service-version-1', engine_version: engineVersion, policy_version: policyVersion },
          error: null
        });
      }
      throw new Error(`Unexpected service-role table access: ${table}`);
    });
    serviceClient.rpc.mockResolvedValue({
      data: { status: 'CREATED', record: receipt },
      error: null
    });

    createClientMock.mockImplementation((_url: string, key: string) => {
      if (key === 'anon-test') return authClient;
      if (key === 'service-test') return serviceClient;
      throw new Error('Unexpected Supabase client key.');
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
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(serviceClient.rpc).not.toHaveBeenCalled();
  });

  it('rejects an actor without an active authorized workspace', async () => {
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'workspaces') return queryChain({ data: null, error: null });
      throw new Error(`Unexpected service-role table access: ${table}`);
    });

    await expect(handlePersistenceServerRequest(payload as any, 'valid-token'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(serviceClient.rpc).not.toHaveBeenCalled();
  });

  it('rejects a result without a matching active service version', async () => {
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return queryChain({
          data: { id: 'workspace-1', institution_id: 'institution-1', workspace_type: 'institution', status: 'active' },
          error: null
        });
      }
      if (table === 'service_versions') return queryChain({ data: null, error: null });
      throw new Error(`Unexpected service-role table access: ${table}`);
    });

    await expect(handlePersistenceServerRequest(payload as any, 'valid-token'))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(serviceClient.rpc).not.toHaveBeenCalled();
  });

  it('delegates to one atomic database authority after authentication and workspace authorization', async () => {
    const response = await handlePersistenceServerRequest(payload as any, 'valid-token');

    expect(serviceClient.rpc).toHaveBeenCalledTimes(1);
    expect(serviceClient.rpc).toHaveBeenCalledWith('persist_verification_run_and_receipt', {
      p_workspace_id: 'workspace-1',
      p_created_by_user_id: 'user-123',
      p_service_version_id: 'service-version-1',
      p_school_id: null,
      p_source_upload_id: null,
      p_correction_of_verification_id: null,
      p_raw_text: rawText,
      p_result: result,
      p_public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1'
    });
    expect(response.status).toBe('CREATED');
    expect(response.record.verification_run_id).toBe('run-row-id');
    expect(response.record.result_hash).toBe('c'.repeat(64));
    expect(response.record.manifest_hash).toBe('d'.repeat(64));
    expect(serviceClient.from).toHaveBeenCalledWith('workspaces');
    expect(serviceClient.from).toHaveBeenCalledWith('service_versions');
  });

  it('returns idempotent authority responses without performing a direct table insert', async () => {
    serviceClient.rpc.mockResolvedValue({
      data: { status: 'IDEMPOTENT_EXISTS', record: receipt },
      error: null
    });

    const response = await handlePersistenceServerRequest(payload as any, 'valid-token');

    expect(response.status).toBe('IDEMPOTENT_EXISTS');
    expect(serviceClient.from).not.toHaveBeenCalledWith('public_verification_records');
  });

  it('maps a database integrity collision to HTTP 409 without exposing database internals', async () => {
    serviceClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'PUBLIC_RECEIPT_ID_COLLISION_OR_EXISTING_INTEGRITY_FAILURE' }
    });

    await expect(handlePersistenceServerRequest(payload as any, 'valid-token'))
      .rejects.toMatchObject({
        statusCode: 409,
        message: 'The verification conflicts with existing authoritative evidence or lineage.'
      });
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

  it('rejects a malformed correction parent before privileged client creation', async () => {
    await expect(handlePersistenceServerRequest({
      ...payload,
      correctionOfVerificationId: 'not-a-receipt'
    } as any, 'valid-token')).rejects.toMatchObject({ statusCode: 400 });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
