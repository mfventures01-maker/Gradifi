import { createClient } from '@supabase/supabase-js';
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

/** Trusted, authenticated comparison. Private envelopes never leave this module. */
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
    .select('id').eq('auth_user_id', authData.user.id).eq('status', 'active').maybeSingle();
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
  if (corrected.correction_of_verification_id !== original.verification_id) {
    throw new CorrectionComparisonRequestError(409, 'Corrected receipt is not linked to the specified original receipt.');
  }
  if (original.document_hash === corrected.document_hash) {
    throw new CorrectionComparisonRequestError(409, 'Correction must produce a distinct canonical document hash.');
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

  // The response is deliberately a minimal DTO. No envelope, raw text, matched
  // passage, provider payload, source URL, or internal diagnostic is returned.
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
    remainingFindingCount: remaining + added,
    newFindingCount: added
  };
}
