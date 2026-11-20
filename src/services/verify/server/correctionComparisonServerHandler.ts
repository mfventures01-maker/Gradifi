import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { VerificationPersistenceService } from '../verificationPersistenceService.js';
import { PublicVerificationService } from '../publicVerificationService.js';

export class CorrectionComparisonRequestError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 404 | 409 | 500, message: string) {
    super(message);
    this.name = 'CorrectionComparisonRequestError';
  }
}

export interface SafeCorrectionComparison {
  status: 'VALID';
  originalVerificationId: string;
  correctedVerificationId: string;
  originalDocumentHash: string;
  correctedDocumentHash: string;
  originalSimilarity: number;
  correctedSimilarity: number;
  similarityDelta: number;
  originalFindingCount: number;
  correctedFindingCount: number;
  resolvedFindingCount: number;
  remainingFindingCount: number;
  newFindingCount: number;
}

type ActiveActor = {
  id: string;
  institution_id: string | null;
  school_id: string | null;
  actor_type: string;
};

type VerificationRun = {
  id: string;
  institution_id: string | null;
  school_id: string | null;
  created_by_user_id: string | null;
  status: string;
  verification_id: string;
  document_hash: string;
  evidence_hash: string;
  result_hash: string | null;
  manifest_hash: string | null;
  engine_version: string;
  policy_version: string;
  parent_run_id: string | null;
};

async function loadAuthorizedRun(
  trusted: SupabaseClient,
  receipt: any,
  actor: ActiveActor,
  authUserId: string,
): Promise<VerificationRun> {
  if (!receipt.verification_run_id) {
    throw new CorrectionComparisonRequestError(409, 'Receipt is not linked to an authoritative verification run.');
  }

  const { data: run, error } = await trusted
    .from('verification_runs')
    .select('id,institution_id,school_id,created_by_user_id,status,verification_id,document_hash,evidence_hash,result_hash,manifest_hash,engine_version,policy_version,parent_run_id')
    .eq('id', receipt.verification_run_id)
    .maybeSingle();

  if (error || !run ||
      !['succeeded', 'superseded'].includes(run.status) ||
      run.verification_id !== receipt.verification_id ||
      run.document_hash !== receipt.document_hash ||
      run.evidence_hash !== receipt.evidence_hash ||
      !receipt.result_hash || run.result_hash !== receipt.result_hash ||
      !receipt.manifest_hash || run.manifest_hash !== receipt.manifest_hash ||
      run.engine_version !== receipt.engine_version ||
      run.policy_version !== receipt.policy_version) {
    throw new CorrectionComparisonRequestError(409, 'Receipt and completed verification run do not match.');
  }

  const actorCanAccessRun = actor.institution_id
    ? run.institution_id === actor.institution_id &&
      (!actor.school_id || run.school_id === actor.school_id)
    : run.created_by_user_id === authUserId;

  if (!actorCanAccessRun) {
    throw new CorrectionComparisonRequestError(403, 'The active identity is not authorized for one of these receipts.');
  }

  return run as VerificationRun;
}

/** Trusted, tenant-scoped comparison. Private envelopes never leave this module. */
export async function handleCorrectionComparisonRequest(
  payload: { originalVerificationId?: string; correctedVerificationId?: string },
  accessToken: string
): Promise<SafeCorrectionComparison> {
  const originalId = String(payload?.originalVerificationId ?? '').trim().toUpperCase();
  const correctedId = String(payload?.correctedVerificationId ?? '').trim().toUpperCase();
  if (!PublicVerificationService.validateVerificationIdFormat(originalId) ||
      !PublicVerificationService.validateVerificationIdFormat(correctedId) || originalId === correctedId) {
    throw new CorrectionComparisonRequestError(400, 'Two distinct valid verification IDs are required.');
  }
  if (!accessToken) throw new CorrectionComparisonRequestError(401, 'Authentication required.');

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new CorrectionComparisonRequestError(500, 'Trusted comparison is not configured.');
  }

  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data: authData, error: authError } = await auth.auth.getUser(accessToken);
  if (authError || !authData.user) throw new CorrectionComparisonRequestError(401, 'Supabase session is invalid or expired.');

  const { data: actor, error: actorError } = await auth.from('identity_actors')
    .select('id,institution_id,school_id,actor_type')
    .eq('auth_user_id', authData.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (actorError || !actor) throw new CorrectionComparisonRequestError(403, 'An active authorized identity is required.');

  const trusted = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const selectReceipt = async (id: string) => {
    const { data, error } = await trusted.from('public_verification_records')
      .select('*').eq('verification_id', id).maybeSingle();
    if (error) throw new CorrectionComparisonRequestError(500, 'Unable to retrieve a verification receipt.');
    if (!data) throw new CorrectionComparisonRequestError(404, 'A comparison receipt could not be found.');
    const integrity = VerificationPersistenceService.validatePersistedRecord(data);
    if (integrity.status !== 'VALID') throw new CorrectionComparisonRequestError(409, 'A comparison receipt failed integrity validation.');
    return data as any;
  };

  // Separate authoritative reads. Never trust browser-provided scores/findings.
  const original = await selectReceipt(originalId);
  const corrected = await selectReceipt(correctedId);
  const originalRun = await loadAuthorizedRun(trusted, original, actor as ActiveActor, authData.user.id);
  const correctedRun = await loadAuthorizedRun(trusted, corrected, actor as ActiveActor, authData.user.id);

  if (corrected.correction_of_verification_id !== original.verification_id ||
      correctedRun.parent_run_id !== originalRun.id) {
    throw new CorrectionComparisonRequestError(409, 'Corrected receipt and run are not linked to the specified original receipt and run.');
  }
  if (original.document_hash === corrected.document_hash) {
    throw new CorrectionComparisonRequestError(409, 'Correction must produce a distinct canonical document hash.');
  }
  if (originalRun.institution_id !== correctedRun.institution_id ||
      originalRun.school_id !== correctedRun.school_id) {
    throw new CorrectionComparisonRequestError(409, 'Original and corrected runs must remain within the same institution and school scope.');
  }

  const findingsOf = (record: any): any[] => {
    const findings = record.evidence_envelope?.deterministicResult?.similarityAnalysis?.findings
      ?? record.evidence_envelope?.result?.similarityAnalysis?.findings;
    if (!Array.isArray(findings)) throw new CorrectionComparisonRequestError(409, 'A receipt has no deterministic findings.');
    return findings;
  };
  const keyOf = (f: any) => [
    String(f.matchedDocumentId ?? ''),
    String(f.matchedSegment ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(),
    String(f.matchMethod ?? f.evidenceType ?? '')
  ].join('::');

  const before = findingsOf(original);
  const after = findingsOf(corrected);
  const afterKeys = new Set(after.map(keyOf));
  const beforeKeys = new Set(before.map(keyOf));
  const resolved = before.filter(f => !afterKeys.has(keyOf(f))).length;
  const remaining = before.length - resolved;
  const added = after.filter(f => !beforeKeys.has(keyOf(f))).length;

  const originalSimilarity = Number(original.overall_similarity);
  const correctedSimilarity = Number(corrected.overall_similarity);
  if (!Number.isFinite(originalSimilarity) || !Number.isFinite(correctedSimilarity)) {
    throw new CorrectionComparisonRequestError(409, 'Receipt similarity values are invalid.');
  }

  // Bounded DTO only. Envelopes, raw text, passages, provider payloads and
  // internal diagnostics remain server-side.
  return {
    status: 'VALID',
    originalVerificationId: original.verification_id,
    correctedVerificationId: corrected.verification_id,
    originalDocumentHash: original.document_hash,
    correctedDocumentHash: corrected.document_hash,
    originalSimilarity,
    correctedSimilarity,
    similarityDelta: Math.round((correctedSimilarity - originalSimilarity) * 10) / 10,
    originalFindingCount: before.length,
    correctedFindingCount: after.length,
    resolvedFindingCount: resolved,
    remainingFindingCount: remaining,
    newFindingCount: added
  };
}
