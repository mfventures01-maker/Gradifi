/**
 * GRADIFI VERIFY - AUTHENTICATED SERVER-SIDE PERSISTENCE
 * A valid Supabase session and an active identity actor are required before
 * the service-role client is constructed. The service-role key never leaves
 * this server module.
 */
import { createClient } from '@supabase/supabase-js';
import { VerificationPersistenceService, PublicVerificationRecord } from '../verificationPersistenceService.js';
import { computeHash } from '../documentNormalizer.js';
import type { G4DPersistenceEnvelope, PersistableEvidenceResult } from '../types.js';

export interface PersistenceServerRequestPayload {
  result: PersistableEvidenceResult;
  envelope: G4DPersistenceEnvelope;
}

export class PersistenceRequestError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 409 | 500, message: string) {
    super(message);
    this.name = 'PersistenceRequestError';
  }
}

type SafeReceipt = Omit<PublicVerificationRecord, 'evidence_envelope'>;

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

  // G5 evidence hash is independently reproducible only when the deterministic
  // engine's exact source-coverage inputs accompany the bounded persistence DTO.
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
}

function safeReceipt(record: PublicVerificationRecord): SafeReceipt {
  const { evidence_envelope: _privateEvidence, ...receipt } = record;
  return receipt;
}

export async function handlePersistenceServerRequest(
  payload: PersistenceServerRequestPayload,
  accessToken: string
): Promise<{ record: SafeReceipt; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new PersistenceRequestError(500, 'Trusted persistence is not configured on the server.');
  }

  // Authenticate the bearer token with Supabase Auth, then authorize the
  // authenticated identity against the authoritative active actor registry.
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
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (actorError || !actor) {
    throw new PersistenceRequestError(403, 'An active authorized identity is required to persist verification records.');
  }

  // Validate all client-controlled evidence before constructing privileged client.
  validatePayload(payload);

  const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const recordPayload = VerificationPersistenceService.buildPersistenceRecord(payload.result, payload.envelope);
  const { data: existing, error: fetchError } = await serverSupabase
    .from('public_verification_records')
    .select('*')
    .eq('verification_id', recordPayload.verification_id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new PersistenceRequestError(500, 'Unable to check existing verification record.');
  }
  if (existing) {
    const integrity = VerificationPersistenceService.validatePersistedRecord(existing);
    if (integrity.status !== 'VALID') {
      throw new PersistenceRequestError(409, 'Existing verification record failed integrity validation.');
    }
    if (existing.document_hash !== recordPayload.document_hash || existing.evidence_hash !== recordPayload.evidence_hash) {
      throw new PersistenceRequestError(409, 'Conflicting verification record exists for this identifier.');
    }
    return { record: safeReceipt(existing as PublicVerificationRecord), status: 'IDEMPOTENT_EXISTS' };
  }

  const { data: inserted, error: insertError } = await serverSupabase
    .from('public_verification_records')
    .insert(recordPayload)
    .select('*')
    .single();
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced } = await serverSupabase
        .from('public_verification_records')
        .select('*')
        .eq('verification_id', recordPayload.verification_id)
        .maybeSingle();
      if (raced &&
          raced.document_hash === recordPayload.document_hash &&
          raced.evidence_hash === recordPayload.evidence_hash &&
          VerificationPersistenceService.validatePersistedRecord(raced).status === 'VALID') {
        return { record: safeReceipt(raced as PublicVerificationRecord), status: 'IDEMPOTENT_EXISTS' };
      }
      throw new PersistenceRequestError(409, 'Conflicting verification record was created concurrently.');
    }
    throw new PersistenceRequestError(500, 'Unable to persist verification record.');
  }

  if (VerificationPersistenceService.validatePersistedRecord(inserted).status !== 'VALID') {
    throw new PersistenceRequestError(500, 'Persisted verification record failed integrity validation.');
  }
  return { record: safeReceipt(inserted as PublicVerificationRecord), status: 'CREATED' };
}
