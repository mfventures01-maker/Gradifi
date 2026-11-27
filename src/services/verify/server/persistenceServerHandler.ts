/**
 * HOEOS G8: authenticated, atomic verification-run and public-receipt persistence.
 * The browser never receives service-role authority. The database calculates
 * the authoritative SHA-256 hashes and writes run + receipt in one transaction.
 */
import { createClient } from '@supabase/supabase-js';
import type { PublicVerificationRecord } from '../verificationPersistenceService.js';
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

type SafeReceipt = Pick<
  PublicVerificationRecord,
  | 'id'
  | 'verification_id'
  | 'document_hash'
  | 'evidence_hash'
  | 'engine_version'
  | 'policy_version'
  | 'overall_similarity'
  | 'total_sources_found'
  | 'correction_of_verification_id'
  | 'verification_run_id'
  | 'result_hash'
  | 'manifest_hash'
  | 'status'
  | 'public_schema_version'
  | 'created_at'
>;

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
    throw new PersistenceRequestError(400, 'The deterministic engine hashes have an invalid format.');
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

  if (payload.correctionOfVerificationId &&
      !/^VRF-[0-9A-F]{12}$/i.test(payload.correctionOfVerificationId)) {
    throw new PersistenceRequestError(400, 'Correction parent verification ID is malformed.');
  }
  if (payload.sourceUploadId && !/^[0-9a-f-]{36}$/i.test(payload.sourceUploadId)) {
    throw new PersistenceRequestError(400, 'Source upload ID is malformed.');
  }
}

function safeReceipt(value: unknown, requestedCorrectionParentId: string | null): SafeReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PersistenceRequestError(500, 'The persistence authority returned an invalid receipt.');
  }
  const row = value as Record<string, unknown>;
  const requiredStrings = [
    'id', 'verification_id', 'document_hash', 'evidence_hash', 'engine_version',
    'policy_version', 'verification_run_id', 'result_hash', 'manifest_hash',
    'status', 'public_schema_version', 'created_at'
  ];
  if (requiredStrings.some(key => typeof row[key] !== 'string' || !String(row[key]).trim()) ||
      typeof row.overall_similarity !== 'number' ||
      !Number.isInteger(row.total_sources_found)) {
    throw new PersistenceRequestError(500, 'The persistence authority returned incomplete receipt metadata.');
  }

  const persistedCorrectionParentId = typeof row.correction_of_verification_id === 'string'
    ? row.correction_of_verification_id
    : null;
  if (persistedCorrectionParentId && persistedCorrectionParentId !== requestedCorrectionParentId) {
    throw new PersistenceRequestError(500, 'The persistence authority returned conflicting correction lineage.');
  }

  return {
    id: row.id as string,
    verification_id: row.verification_id as string,
    document_hash: row.document_hash as string,
    evidence_hash: row.evidence_hash as string,
    engine_version: row.engine_version as string,
    policy_version: row.policy_version as string,
    overall_similarity: row.overall_similarity as number,
    total_sources_found: row.total_sources_found as number,
    // The database RPC validates and stores this parent on verification_runs.
    // It is not a physical column on public_verification_records, so the RPC
    // response may omit it. Echo the verified request value for the UI contract.
    correction_of_verification_id: persistedCorrectionParentId ?? requestedCorrectionParentId,
    verification_run_id: row.verification_run_id as string,
    result_hash: row.result_hash as string,
    manifest_hash: row.manifest_hash as string,
    status: row.status as string,
    public_schema_version: row.public_schema_version as string,
    created_at: row.created_at as string,
  };
}

function mapPersistenceError(message: string): PersistenceRequestError {
  if (/WORKSPACE|MEMBERSHIP|SCOPE|SCHOOL|SOURCE_UPLOAD/i.test(message)) {
    return new PersistenceRequestError(403, 'The authenticated identity is not authorized for this verification workspace or source upload.');
  }
  if (/CORRECTION|RECEIPT|COLLISION|ORPHANED|INTEGRITY/i.test(message)) {
    return new PersistenceRequestError(409, 'The verification conflicts with existing authoritative evidence or lineage.');
  }
  if (/SERVICE_VERSION/i.test(message)) {
    return new PersistenceRequestError(503, 'The active verification service version does not match this result.');
  }
  return new PersistenceRequestError(500, 'The authoritative verification persistence operation failed.');
}

export async function handlePersistenceServerRequest(
  payload: PersistenceServerRequestPayload,
  accessToken: string
): Promise<{ record: SafeReceipt; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new PersistenceRequestError(401, 'Authentication required.');
  }

  validatePayload(payload);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new PersistenceRequestError(503, 'Trusted persistence is not configured on the server.');
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
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

  const serverClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let workspaceQuery = serverClient
    .from('workspaces')
    .select('id,institution_id,workspace_type,owner_user_id,status')
    .eq('status', 'active');

  if (actor.institution_id) {
    workspaceQuery = workspaceQuery
      .eq('workspace_type', 'institution')
      .eq('institution_id', actor.institution_id);
  } else {
    workspaceQuery = workspaceQuery
      .eq('workspace_type', 'individual')
      .eq('owner_user_id', authData.user.id);
  }

  let { data: workspace, error: workspaceError } = await workspaceQuery.maybeSingle();

  if (!actor.institution_id && (!workspace || workspaceError)) {
    const { data: personalWorkspaceId, error: ensureError } =
      await authClient.rpc('ensure_personal_workspace');
    if (ensureError || typeof personalWorkspaceId !== 'string') {
      throw new PersistenceRequestError(403, 'An active personal workspace and owner membership are required.');
    }
    const resolved = await serverClient
      .from('workspaces')
      .select('id,institution_id,workspace_type,owner_user_id,status')
      .eq('id', personalWorkspaceId)
      .eq('status', 'active')
      .maybeSingle();
    workspace = resolved.data;
    workspaceError = resolved.error;
  }

  if (workspaceError || !workspace || workspace.status !== 'active') {
    throw new PersistenceRequestError(403, 'An active authorized verification workspace is required.');
  }

  const { data: serviceVersion, error: serviceVersionError } = await serverClient
    .from('service_versions')
    .select('id,engine_version,policy_version')
    .eq('status', 'active')
    .eq('engine_version', payload.result.engineVersion)
    .eq('policy_version', payload.result.policyVersion)
    .maybeSingle();
  if (serviceVersionError || !serviceVersion) {
    throw new PersistenceRequestError(503, 'The active verification service version does not match this result.');
  }

  const { data, error: persistError } = await serverClient.rpc('persist_verification_run_and_receipt', {
    p_workspace_id: workspace.id,
    p_created_by_user_id: authData.user.id,
    p_service_version_id: serviceVersion.id,
    p_school_id: actor.school_id ?? null,
    p_source_upload_id: payload.sourceUploadId ?? null,
    p_correction_of_verification_id: payload.correctionOfVerificationId ?? null,
    p_raw_text: payload.envelope.canonicalDocument.rawText,
    p_result: payload.result,
    p_public_schema_version: 'SEFAES-PUBLIC-RECEIPT-v1',
  });

  if (persistError) {
    console.error('[verify/persist] Atomic run-and-receipt persistence rejected.');
    throw mapPersistenceError(persistError.message || '');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new PersistenceRequestError(500, 'The persistence authority returned an invalid response.');
  }

  const response = data as Record<string, unknown>;
  if (response.status !== 'CREATED' && response.status !== 'IDEMPOTENT_EXISTS') {
    throw new PersistenceRequestError(500, 'The persistence authority returned an unknown status.');
  }

  return {
    record: safeReceipt(response.record, payload.correctionOfVerificationId ?? null),
    status: response.status,
  };
}
