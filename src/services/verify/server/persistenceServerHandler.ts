/**
 * GRADIFI VERIFY - SERVER-SIDE PERSISTENCE HANDLER
 * Trusted server execution boundary for persisting server-computed verification records.
 * Never fall back to an anonymous key for privileged writes.
 */

import { createClient } from '@supabase/supabase-js';
import { VerificationPersistenceService, PublicVerificationRecord } from '../verificationPersistenceService.js';
import { EvidenceEngineResult, AnalysisResultEnvelope } from '../types.js';

export interface PersistenceServerRequestPayload {
  result: EvidenceEngineResult;
  envelope?: Record<string, unknown>;
}

export async function handlePersistenceServerRequest(
  payload: PersistenceServerRequestPayload
): Promise<{ record: PublicVerificationRecord; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
  if (!payload || !payload.result) {
    throw new Error('Missing server-computed verification result');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Trusted receipt storage is not configured');
  }

  const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const recordPayload = VerificationPersistenceService.buildPersistenceRecord(
    payload.result,
    payload.envelope as unknown as AnalysisResultEnvelope
  );

  if (
    !Number.isFinite(recordPayload.overall_similarity) ||
    recordPayload.overall_similarity < 0 ||
    recordPayload.overall_similarity > 100
  ) {
    throw new Error('Server-computed similarity score is outside the accepted range');
  }

  const { data: existing, error: fetchError } = await serverSupabase
    .from('public_verification_records')
    .select('*')
    .eq('verification_id', recordPayload.verification_id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error('Receipt storage lookup failed');
  }

  if (existing) {
    if (
      existing.document_hash !== recordPayload.document_hash ||
      existing.evidence_hash !== recordPayload.evidence_hash
    ) {
      throw new Error(
        `Conflicting verification record exists for ID '${recordPayload.verification_id}'.`
      );
    }

    return {
      record: existing as PublicVerificationRecord,
      status: 'IDEMPOTENT_EXISTS'
    };
  }

  const { data: inserted, error: insertError } = await serverSupabase
    .from('public_verification_records')
    .insert(recordPayload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: reFetched, error: reFetchError } = await serverSupabase
        .from('public_verification_records')
        .select('*')
        .eq('verification_id', recordPayload.verification_id)
        .single();

      if (
        !reFetchError &&
        reFetched &&
        reFetched.document_hash === recordPayload.document_hash &&
        reFetched.evidence_hash === recordPayload.evidence_hash
      ) {
        return {
          record: reFetched as PublicVerificationRecord,
          status: 'IDEMPOTENT_EXISTS'
        };
      }

      throw new Error('Conflicting verification record created concurrently');
    }

    throw new Error('Trusted receipt persistence failed');
  }

  return {
    record: inserted as PublicVerificationRecord,
    status: 'CREATED'
  };
}
