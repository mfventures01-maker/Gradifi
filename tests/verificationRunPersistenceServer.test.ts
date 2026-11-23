import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import { handlePersistenceServerRequest, PersistenceRequestError } from '../src/services/verify/server/persistenceServerHandler.js';
import { computeHash } from '../src/services/verify/documentNormalizer.js';

const USER_ID = 'b512de9b-3bcb-4260-8ff9-7f59bd0efa5d';
const WORKSPACE_ID = '3e55888b-3232-416e-900e-fdfe93ef1614';
const SERVICE_VERSION_ID = 'd7e91ded-b31f-4669-8e92-20630f289d60';
const ENGINE = 'G5-DETERMINISTIC-v1';
const POLICY = 'G3-POLICY-v1';
const ACCESS_TOKEN = 'verified-user-access-token';

function query(data: unknown) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  return chain;
}

function buildPayload() {
  const rawText = 'A synthetic deterministic verification document for the authoritative persistence contract.';
  const documentHash = computeHash(rawText);
  const evidenceHashMaterial = { sourceCoverage: [], totalUniqueMatchedTokens: 0 };
  const evidenceHash = computeHash(`${documentHash}::0:${ENGINE}:${POLICY}`);
  const result = {
    documentHash,
    evidenceHash,
    engineVersion: ENGINE,
    policyVersion: POLICY,
    overallSimilarity: 0,
    totalSourcesFound: 0,
    similarityAnalysis: { findings: [], overallSimilarity: 0 },
    evidenceHashMaterial,
  };
  return {
    result,
    envelope: {
      canonicalDocument: { rawText },
      deterministicResult: result,
      engineVersion: ENGINE,
      policyVersion: POLICY,
      documentId: documentHash,
    },
  } as any;
}

const receipt = {
  id: '6c1e60f8-8c8e-4a2a-a0a7-b9b4d3a2f550',
  verification_id: 'VRF-123456789ABC',
  document_hash: 'a'.repeat(64),
  evidence_hash: 'b'.repeat(64),
  engine_version: ENGINE,
  policy_version: POLICY,
  overall_similarity: 0,
  total_sources_found: 0,
  correction_of_verification_id: null,
  verification_run_id: '7b5e6e8c-0e4b-4d84-a0c5-fd3d2b4e8f10',
  result_hash: 'c'.repeat(64),
  manifest_hash: 'd'.repeat(64),
  status: 'VALID',
  public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
  created_at: '2026-11-23T12:00:00.000Z',
};

describe('HOEOS G8 authoritative verification-run persistence server boundary', () => {
  let authClient: any;
  let serverClient: any;
  let actorQuery: ReturnType<typeof query>;
  let workspaceQuery: ReturnType<typeof query>;
  let serviceVersionQuery: ReturnType<typeof query>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://gradifi-test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    actorQuery = query({ id: 'actor-1', institution_id: null, school_id: null, actor_type: 'individual' });
    workspaceQuery = query({
      id: WORKSPACE_ID,
      institution_id: null,
      workspace_type: 'individual',
      owner_user_id: USER_ID,
      status: 'active',
    });
    serviceVersionQuery = query({ id: SERVICE_VERSION_ID, engine_version: ENGINE, policy_version: POLICY });

    authClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'identity_actors') return actorQuery;
        throw new Error(`Unexpected auth-client table: ${table}`);
      }),
    };
    serverClient = {
      from: vi.fn((table: string) => {
        if (table === 'workspaces') return workspaceQuery;
        if (table === 'service_versions') return serviceVersionQuery;
        throw new Error(`Unexpected service-client table: ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: { status: 'CREATED', record: receipt }, error: null }),
    };
    createClientMock.mockImplementation((_url: string, key: string) =>
      key === 'test-anon-key' ? authClient : serverClient
    );
  });

  it('validates the session, active actor and workspace before invoking atomic run-plus-receipt persistence', async () => {
    const response = await handlePersistenceServerRequest(buildPayload(), ACCESS_TOKEN);

    expect(authClient.auth.getUser).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(authClient.from).toHaveBeenCalledWith('identity_actors');
    expect(serverClient.from).toHaveBeenCalledWith('workspaces');
    expect(serverClient.from).toHaveBeenCalledWith('service_versions');
    expect(serverClient.rpc).toHaveBeenCalledTimes(1);
    expect(serverClient.rpc).toHaveBeenCalledWith('persist_verification_run_and_receipt', expect.objectContaining({
      p_workspace_id: WORKSPACE_ID,
      p_created_by_user_id: USER_ID,
      p_service_version_id: SERVICE_VERSION_ID,
      p_public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
    }));
    expect(response.status).toBe('CREATED');
    expect(response.record.verification_run_id).toBe(receipt.verification_run_id);
    expect(response.record.result_hash).toBe(receipt.result_hash);
    expect(response.record.manifest_hash).toBe(receipt.manifest_hash);
    expect(response.record.status).toBe('VALID');
  });

  it('rejects a tampered evidence hash before constructing any Supabase client', async () => {
    const payload = buildPayload();
    payload.result.evidenceHash = '0'.repeat(16);
    payload.envelope.deterministicResult.evidenceHash = '0'.repeat(16);

    await expect(handlePersistenceServerRequest(payload, ACCESS_TOKEN)).rejects.toMatchObject({
      name: 'PersistenceRequestError',
      statusCode: 400,
      message: 'Evidence hash does not match independently recomputed evidence.',
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('fails closed when the authenticated user has no active identity actor', async () => {
    actorQuery = query(null);
    authClient.from.mockImplementation((table: string) => {
      if (table === 'identity_actors') return actorQuery;
      throw new Error(`Unexpected auth-client table: ${table}`);
    });

    await expect(handlePersistenceServerRequest(buildPayload(), ACCESS_TOKEN)).rejects.toBeInstanceOf(PersistenceRequestError);
    await expect(handlePersistenceServerRequest(buildPayload(), ACCESS_TOKEN)).rejects.toMatchObject({
      statusCode: 403,
      message: 'An active authorized identity is required to persist verification records.',
    });
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(serverClient.rpc).not.toHaveBeenCalled();
  });

  it('returns an idempotent result without changing the receipt contract', async () => {
    serverClient.rpc.mockResolvedValue({ data: { status: 'IDEMPOTENT_EXISTS', record: receipt }, error: null });

    const response = await handlePersistenceServerRequest(buildPayload(), ACCESS_TOKEN);

    expect(response.status).toBe('IDEMPOTENT_EXISTS');
    expect(response.record.verification_id).toBe(receipt.verification_id);
    expect(response.record.result_hash).toBe(receipt.result_hash);
    expect(response.record.manifest_hash).toBe(receipt.manifest_hash);
  });
});
