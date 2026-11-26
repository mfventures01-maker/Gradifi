/**
 * GRADIFI VERIFY - AUTHENTICATED ATOMIC RUN + RECEIPT PERSISTENCE
 * The browser submits deterministic evidence to this handler. The handler
 * authenticates the session, resolves the caller's active workspace and
 * service version, then delegates the only durable write to the database RPC.
 */
import { createClient } from '@supabase/supabase-js';
import { computeHash } from '../documentNormalizer.js';
import type { G4DPersistenceEnvelope, PersistableEvidenceResult } from '../types.js';

export interface PersistenceServerRequestPayload {
  result: PersistableEvidenceResult;
  envelope: G4DPersistenceEnvelope;
  correctionOfVerificationId?: string | null;
  sourceUploadId?: string | null;
}

export class PersistenceRequestError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 409 | 500 | 503, message: string) {
    super(message);
    this.name = 'PersistenceRequestError';
  }
}

interface ActiveActor {
  id: string;
  institution_id: string | null;
  school_id: string | null;
  actor_type: string;
}

interface PersistedReceipt {
  id: string;
  verification_id: string;
  document_hash: string;
  evidence_hash: string;
  engine_version: string;
  policy_version: string;
  overall_similarity: number;
  total_sources_found: number;
  verification_run_id: string;
  result_hash: string;
  manifest_hash: string;
  status: 'VALID';
  public_schema_version: string;
  created_at: string;
}

type SafeReceipt = PersistedReceipt & {
  correction_of_verification_id: string | null;
};

function validatePayload(payload: PersistenceServerRequestPayload): void {
  if (!payload || typeof payload !== 'object' || !payload.result || !payload.envelope) {
    throw new PersistenceRequestError(400, 'A verification result and evidence envelope are required.');
  }

  const { result, envelope } = payload;
  const rawText = envelope.canonicalDocument?.rawText;
  if (typeof rawText !== 'string' || rawText.length === 0 || rawText.length > 3_500_000) {
    throw new PersistenceRequestError(400, 'Canonical submitted text is missing or exceeds the persistence limit.');
  }
  if (!/^[a-f0-9]{16}$/i.test(result.documentHash || '') ||
      !/^[a-f0-9]{16}$/i.test(result.evidenceHash || '')) {
    throw new PersistenceRequestError(400, 'Document or evidence hash has an invalid format.');
  }
  if (computeHash(rawText) !== result.documentHash) {
    throw new PersistenceRequestError(400, 'Canonical submitted text does not reproduce documentHash.');
  }
  if (!Number.isFinite(result.overallSimilarity) || result.overallSimilarity < 0 || result.overallSimilarity > 100 ||
      !Number.isInteger(result.totalSourcesFound) || result.totalSourcesFound < 0 ||
      typeof result.engineVersion !== 'string' || !result.engineVersion.trim() ||
      typeof result.policyVersion !== 'string' || !result.policyVersion.trim() ||
      !Array.isArray(result.similarityAnalysis?.findings)) {
    throw new PersistenceRequestError(400, 'Verification result fields are invalid.');
  }

  const embedded = envelope.deterministicResult;
  if (!embedded ||
      embedded.documentHash !== result.documentHash ||
      embedded.evidenceHash !== result.evidenceHash ||
      embedded.engineVersion !== result.engineVersion ||
      embedded.policyVersion !== result.policyVersion ||
      embedded.overallSimilarity !== result.overallSimilarity ||
      embedded.totalSourcesFound !== result.totalSourcesFound ||
      embedded.similarityAnalysis?.findings?.length !== result.similarityAnalysis.findings.length ||
      envelope.engineVersion !== result.engineVersion ||
      envelope.policyVersion !== result.policyVersion ||
      envelope.documentId !== result.documentHash) {
    throw new PersistenceRequestError(400, 'Evidence envelope does not match the submitted deterministic result.');
  }

  const material = result.evidenceHashMaterial;
  if (!material || !Array.isArray(material.sourceCoverage) ||
      !Number.isInteger(material.totalUniqueMatchedTokens) || material.totalUniqueMatchedTokens < 0) {
    throw new PersistenceRequestError(400, 'Independent evidence-hash inputs are missing.');
  }
  if (material.sourceCoverage.some(source =>
    !source || typeof source.sourceId !== 'string' || !source.sourceId.trim() ||
    !Number.isFinite(source.documentCoverage) || source.documentCoverage < 0 || source.documentCoverage > 100
  )) {
    throw new PersistenceRequestError(400, 'Evidence-hash source coverage is invalid.');
  }
  const sourceKeysSorted = material.sourceCoverage
    .map(source => `${source.sourceId}:${source.documentCoverage.toFixed(1)}`)
    .sort()
    .join('|');
  const expectedEvidenceHash = computeHash(
    `${result.documentHash}:${sourceKeysSorted}:${material.totalUniqueMatchedTokens}:${result.engineVersion}:${result.policyVersion}`
  );
  if (expectedEvidenceHash !== result.evidenceHash) {
    throw new PersistenceRequestError(400, 'Evidence hash does not match independently recomputed evidence.');
  }
  if (embedded.evidenceHashMaterial?.totalUniqueMatchedTokens !== material.totalUniqueMatchedTokens ||
      JSON.stringify(embedded.evidenceHashMaterial?.sourceCoverage) !== JSON.stringify(material.sourceCoverage)) {
    throw new PersistenceRequestError(400, 'Embedded evidence-hash inputs do not match the submitted inputs.');
  }
  if (result.similarityAnalysis.overallSimilarity !== undefined &&
      result.similarityAnalysis.overallSimilarity !== result.overallSimilarity) {
    throw new PersistenceRequestError(400, 'Similarity score differs from deterministic findings.');
  }

  if (payload.sourceUploadId != null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sourceUploadId)) {
    throw new PersistenceRequestError(400, 'Source upload ID is invalid.');
  }
}

async function resolveAuthorizedWorkspace(
  server: ReturnType<typeof createClient>,
  actor: ActiveActor,
  userId: string
): Promise<{ id: string; institution_id: string | null }> {
  const individual = actor.actor_type === 'individual';
  if (individual && (actor.institution_id || actor.school_id)) {
    throw new PersistenceRequestError(403, 'Individual identity has an invalid institutional scope.');
  }
  if (!individual && !actor.institution_id) {
    throw new PersistenceRequestError(403, 'Institutional identity is not linked to an institution.');
  }

  const workspaceQuery = server.from('workspaces')
    .select('id,workspace_type,institution_id,owner_user_id,status');
  const { data: workspace, error: workspaceError } = individual
    ? await workspaceQuery.eq('workspace_type', 'individual')
        .eq('owner_user_id', userId).eq('status', 'active').maybeSingle()
    : await workspaceQuery.eq('workspace_type', 'institution')
        .eq('institution_id', actor.institution_id).eq('status', 'active').maybeSingle();

  if (workspaceError) {
    throw new PersistenceRequestError(500, 'Unable to resolve the authorized workspace.');
  }
  if (!workspace || workspace.status !== 'active') {
    throw new PersistenceRequestError(403, 'No active workspace is available for this identity.');
  }
  if (individual
      ? workspace.workspace_type !== 'individual' || workspace.owner_user_id !== userId || workspace.institution_id !== null
      : workspace.workspace_type !== 'institution' || workspace.institution_id !== actor.institution_id) {
    throw new PersistenceRequestError(403, 'Workspace and identity authority do not match.');
  }

  const { data: membership, error: membershipError } = await server
    .from('workspace_members')
    .select('id,role,status')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw new PersistenceRequestError(500, 'Unable to verify active workspace membership.');
  }
  if (!membership || (individual && membership.role !== 'owner')) {
    throw new PersistenceRequestError(403, 'An active authorized workspace membership is required.');
  }

  return { id: workspace.id, institution_id: workspace.institution_id ?? null };
}

function mapAtomicPersistenceError(error: { message?: string; code?: string }): PersistenceRequestError {
  const message = error.message || '';
  if (/CORRECTION|RECEIPT_ID|IDEMPOTENCY|COLLISION|ORPHANED|ALREADY_HAS_RUN|PARENT_RUN/i.test(message)) {
    return new PersistenceRequestError(409, 'The verification conflicts with an existing receipt or correction lineage.');
  }
  if (/WORKSPACE|MEMBER|OWNER|SCOPE|AUTHORITY|IDENTITY/i.test(message)) {
    return new PersistenceRequestError(403, 'The authenticated identity is not authorized for this verification workspace.');
  }
  if (/INVALID_INPUT|RESULT_RANGE|SERVICE_VERSION_NOT_ACTIVE_OR_MISMATCHED|SOURCE_UPLOAD_NOT_CANONICALIZED/i.test(message)) {
    return new PersistenceRequestError(400, 'The verification payload or selected service version is not valid for persistence.');
  }
  return new PersistenceRequestError(500, 'The authoritative verification run and receipt could not be persisted.');
}

function toSafeReceipt(value: unknown, correctionParentId: string | null, result: PersistableEvidenceResult): SafeReceipt {
  if (!value || typeof value !== 'object') {
    throw new PersistenceRequestError(500, 'The persistence authority returned no receipt.');
  }
  const record = value as Record<string, unknown>;
  const documentHash = String(record.document_hash || '');
  const evidenceHash = String(record.evidence_hash || '');
  const verificationId = String(record.verification_id || '');
  const expectedId = `VRF-${documentHash.slice(0, 8)}${evidenceHash.slice(0, 4)}`.toUpperCase();

  if (!/^[a-f0-9]{64}$/i.test(documentHash) ||
      !/^[a-f0-9]{64}$/i.test(evidenceHash) ||
      !/^[a-f0-9]{64}$/i.test(String(record.result_hash || '')) ||
      !/^[a-f0-9]{64}$/i.test(String(record.manifest_hash || '')) ||
      !/^VRF-[0-9A-F]{12}$/.test(verificationId) ||
      verificationId !== expectedId ||
      typeof record.verification_run_id !== 'string' ||
      record.status !== 'VALID' ||
      typeof record.public_schema_version !== 'string' ||
      typeof record.created_at !== 'string' ||
      record.engine_version !== result.engineVersion ||
      record.policy_version !== result.policyVersion ||
      Number(record.overall_similarity) !== result.overallSimilarity ||
      Number(record.total_sources_found) !== result.totalSourcesFound) {
    throw new PersistenceRequestError(500, 'The authoritative receipt failed its response integrity contract.');
  }

  return {
    id: String(record.id || ''),
    verification_id: verificationId,
    document_hash: documentHash,
    evidence_hash: evidenceHash,
    engine_version: String(record.engine_version),
    policy_version: String(record.policy_version),
    overall_similarity: Number(record.overall_similarity),
    total_sources_found: Number(record.total_sources_found),
    verification_run_id: String(record.verification_run_id),
    result_hash: String(record.result_hash),
    manifest_hash: String(record.manifest_hash),
    status: 'VALID',
    public_schema_version: String(record.public_schema_version),
    created_at: String(record.created_at),
    correction_of_verification_id: correctionParentId,
  };
}

export async function handlePersistenceServerRequest(
  payload: PersistenceServerRequestPayload,
  accessToken: string
): Promise<{ record: SafeReceipt; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new PersistenceRequestError(401, 'Authentication required.');
  }
  validatePayload(payload);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new PersistenceRequestError(500, 'Trusted persistence is not configured on the server.');
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new PersistenceRequestError(401, 'Supabase session is invalid or expired.');
  }

  const { data: actor, error: actorError } = await authClient
    .from('identity_actors')
    .select('id,institution_id,school_id,actor_type')
    .eq('auth_user_id', authData.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (actorError || !actor) {
    throw new PersistenceRequestError(403, 'An active authorized identity is required to persist verification records.');
  }

  const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const workspace = await resolveAuthorizedWorkspace(serverSupabase, actor as ActiveActor, authData.user.id);

  const { data: serviceVersion, error: serviceVersionError } = await serverSupabase
    .from('service_versions')
    .select('id,service_id')
    .eq('engine_version', payload.result.engineVersion)
    .eq('policy_version', payload.result.policyVersion)
    .eq('status', 'active')
    .maybeSingle();
  if (serviceVersionError || !serviceVersion) {
    throw new PersistenceRequestError(409, 'No active service version matches this deterministic engine and policy.');
  }
  const { data: service, error: serviceError } = await serverSupabase
    .from('services')
    .select('id')
    .eq('id', serviceVersion.service_id)
    .eq('status', 'active')
    .maybeSingle();
  if (serviceError || !service) {
    throw new PersistenceRequestError(409, 'The verification service is not active.');
  }

  const correctionParentId = payload.correctionOfVerificationId ?? null;
  const { data: persisted, error: persistenceError } = await serverSupabase.rpc(
    'persist_verification_run_and_receipt',
    {
      p_workspace_id: workspace.id,
      p_created_by_user_id: authData.user.id,
      p_service_version_id: serviceVersion.id,
      p_school_id: actor.school_id ?? null,
      p_source_upload_id: payload.sourceUploadId ?? null,
      p_correction_of_verification_id: correctionParentId,
      p_raw_text: payload.envelope.canonicalDocument.rawText,
      p_result: payload.result,
      p_public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
    }
  );

  if (persistenceError) throw mapAtomicPersistenceError(persistenceError);
  if (!persisted || typeof persisted !== 'object' ||
      !['CREATED', 'IDEMPOTENT_EXISTS'].includes(String((persisted as any).status))) {
    throw new PersistenceRequestError(500, 'The persistence authority returned an invalid transaction result.');
  }

  const response = persisted as { status: 'CREATED' | 'IDEMPOTENT_EXISTS'; record?: unknown };
  return {
    record: toSafeReceipt(response.record, correctionParentId, payload.result),
    status: response.status,
  };
}
