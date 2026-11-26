import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { computeHash } from '../src/services/verify/documentNormalizer';
import { handlePersistenceServerRequest } from '../src/services/verify/server/persistenceServerHandler';
import type { G4DPersistenceEnvelope, PersistableEvidenceResult } from '../src/services/verify/types';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

const userId = 'b512de9b-3bcb-4260-8ff9-7f59bd0efa5d';
const institutionId = '4f405a7a-2a93-4890-8848-41b95b9dfdc2';
const schoolId = '0178b8de-1df6-4de6-babf-7657743f8cd5';
const workspaceId = '3e55888b-3232-416e-900e-fdfe93ef1614';
const serviceVersionId = 'd7e91ded-b31f-4669-8e92-20630f289d60';
const serviceId = '8e55888b-3232-416e-900e-fdfe93ef1614';
const rawText = 'Atomic verification persistence test document.';
const documentHash = computeHash(rawText);
const evidenceHashMaterial = { totalUniqueMatchedTokens: 0, sourceCoverage: [] as Array<{ sourceId: string; documentCoverage: number }> };
const evidenceHash = computeHash(`${documentHash}::0:G5-DETERMINISTIC-v1:G3-POLICY-v1`);

function validPayload(correctionOfVerificationId: string | null = null) {
  const result: PersistableEvidenceResult = {
    documentHash,
    evidenceHash,
    engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: 0,
    totalSourcesFound: 0,
    similarityAnalysis: { findings: [], overallSimilarity: 0 },
    evidenceHashMaterial,
  };
  const envelope: G4DPersistenceEnvelope = {
    analysisId: 'ANL-G8-TEST',
    documentId: documentHash,
    timestamp: '2026-11-26T00:00:00.000Z',
    engineVersion: result.engineVersion,
    policyVersion: result.policyVersion,
    status: 'VERIFIED',
    deterministicResult: result,
    canonicalDocument: { rawText },
    processingTimeMs: 1,
  };
  return { result, envelope, correctionOfVerificationId };
}

function query(data: unknown, error: unknown = null) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

function rpcReceipt() {
  return {
    status: 'CREATED',
    record: {
      id: '0b950f40-25aa-4b51-ad78-b2ee6771ef6e',
      verification_id: 'VRF-AAAAAAAABBBB',
      document_hash: 'a'.repeat(64),
      evidence_hash: 'b'.repeat(64),
      engine_version: 'G5-DETERMINISTIC-v1',
      policy_version: 'G3-POLICY-v1',
      overall_similarity: 0,
      total_sources_found: 0,
      verification_run_id: '8a00ef79-df49-4ff4-9eaa-3928ac95a525',
      result_hash: 'c'.repeat(64),
      manifest_hash: 'd'.repeat(64),
      status: 'VALID',
      public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
      created_at: '2026-11-26T00:00:00.000Z',
    },
  };
}

function configureClients(options: {
  actorType?: 'individual' | 'principal_admin';
  membership?: unknown;
  rpcData?: unknown;
  rpcError?: unknown;
} = {}) {
  const actorType = options.actorType ?? 'individual';
  const actor = {
    id: 'a8e8c620-da60-4da6-8e9f-e4af5d6cc2f3',
    institution_id: actorType === 'individual' ? null : institutionId,
    school_id: actorType === 'individual' ? null : schoolId,
    actor_type: actorType,
  };
  const authClient = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn(() => query(actor)),
  };
  const workspace = actorType === 'individual'
    ? { id: workspaceId, workspace_type: 'individual', institution_id: null, owner_user_id: userId, status: 'active' }
    : { id: workspaceId, workspace_type: 'institution', institution_id: institutionId, owner_user_id: null, status: 'active' };
  const workspaceQuery = query(workspace);
  const membershipQuery = query(options.membership === undefined
    ? { id: 'membership-001', role: actorType === 'individual' ? 'owner' : 'principal_admin', status: 'active' }
    : options.membership);
  const serviceVersionQuery = query({ id: serviceVersionId, service_id: serviceId });
  const serviceQuery = query({ id: serviceId });
  const rpc = vi.fn().mockResolvedValue({
    data: options.rpcData === undefined ? rpcReceipt() : options.rpcData,
    error: options.rpcError ?? null,
  });
  const serverClient = {
    from: vi.fn((table: string) => {
      if (table === 'workspaces') return workspaceQuery;
      if (table === 'workspace_members') return membershipQuery;
      if (table === 'service_versions') return serviceVersionQuery;
      if (table === 'services') return serviceQuery;
      throw new Error(`Unexpected table access: ${table}`);
    }),
    rpc,
  };
  vi.mocked(createClient)
    .mockReset()
    .mockReturnValueOnce(authClient as any)
    .mockReturnValueOnce(serverClient as any);
  return { authClient, serverClient, rpc, membershipQuery };
}

describe('G8 atomic verification run and receipt persistence', () => {
  const previousEnv = {
    url: process.env.VITE_SUPABASE_URL,
    anon: process.env.VITE_SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://gradifi-test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  afterEach(() => {
    if (previousEnv.url === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = previousEnv.url;
    if (previousEnv.anon === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = previousEnv.anon;
    if (previousEnv.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousEnv.service;
    vi.clearAllMocks();
  });

  it.each([
    ['individual owner', 'individual' as const],
    ['institution member', 'principal_admin' as const],
  ])('persists %s through one atomic database RPC', async (_label, actorType) => {
    const { rpc, serverClient } = configureClients({ actorType });
    const payload = validPayload();
    const response = await handlePersistenceServerRequest(payload, 'valid-access-token');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('persist_verification_run_and_receipt', expect.objectContaining({
      p_workspace_id: workspaceId,
      p_created_by_user_id: userId,
      p_service_version_id: serviceVersionId,
      p_school_id: actorType === 'individual' ? null : schoolId,
      p_source_upload_id: null,
      p_correction_of_verification_id: null,
      p_raw_text: rawText,
      p_result: payload.result,
      p_public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
    }));
    expect(serverClient.from).not.toHaveBeenCalledWith('public_verification_records');
    expect(response.status).toBe('CREATED');
    expect(response.record.verification_run_id).toBe('8a00ef79-df49-4ff4-9eaa-3928ac95a525');
    expect(response.record.result_hash).toBe('c'.repeat(64));
    expect(response.record.manifest_hash).toBe('d'.repeat(64));
    expect(response.record.status).toBe('VALID');
  });

  it('passes correction lineage to the same atomic transaction', async () => {
    const parentId = 'VRF-0123456789AB';
    const { rpc } = configureClients();
    const response = await handlePersistenceServerRequest(validPayload(parentId), 'valid-access-token');

    expect(rpc).toHaveBeenCalledWith('persist_verification_run_and_receipt', expect.objectContaining({
      p_correction_of_verification_id: parentId,
    }));
    expect(response.record.correction_of_verification_id).toBe(parentId);
  });

  it('rejects an identity without active workspace membership before any write', async () => {
    const { rpc } = configureClients({ membership: null });
    await expect(handlePersistenceServerRequest(validPayload(), 'valid-access-token'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps a database correction or receipt conflict to HTTP 409', async () => {
    const { rpc } = configureClients({
      rpcError: { message: 'VERIFICATION_CORRECTION_PARENT_SCOPE_INVALID', code: 'P0001' },
    });
    await expect(handlePersistenceServerRequest(validPayload('VRF-0123456789AB'), 'valid-access-token'))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('accepts the database idempotent result without issuing a second write', async () => {
    const data = rpcReceipt();
    data.status = 'IDEMPOTENT_EXISTS';
    const { rpc } = configureClients({ rpcData: data });
    const response = await handlePersistenceServerRequest(validPayload(), 'valid-access-token');
    expect(response.status).toBe('IDEMPOTENT_EXISTS');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
