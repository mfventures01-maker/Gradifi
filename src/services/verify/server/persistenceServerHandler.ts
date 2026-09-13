/**
 * GRADIFI VERIFY - SERVER-SIDE PERSISTENCE HANDLER
 * Trusted server execution boundary for persisting certified verification records.
 * HOEOS Standard: Strict RLS enforcement, Service Role / Server Key Authority, Zero Client Key Exposure.
 */

import { createClient } from '@supabase/supabase-js';
import { VerificationPersistenceService, PublicVerificationRecord } from '../verificationPersistenceService';
import { EvidenceEngineResult, AnalysisResultEnvelope } from '../types';

export interface PersistenceServerRequestPayload {
  result: EvidenceEngineResult;
  envelope?: AnalysisResultEnvelope;
}

export async function handlePersistenceServerRequest(
  payload: PersistenceServerRequestPayload
): Promise<{ record: PublicVerificationRecord; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
  if (!payload || !payload.result) {
    throw new Error('Missing certified verification result in persistence payload');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server configuration unavailable');
  }

  // Create trusted server-side Supabase client using service_role authority
  const serverSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const recordPayload = VerificationPersistenceService.buildPersistenceRecord(payload.result, payload.envelope);

  // 1. Check for existing record by verification_id
  const { data: existing, error: fetchError } = await serverSupabase
    .from('public_verification_records')
    .select('*')
    .eq('verification_id', recordPayload.verification_id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.warn('Supabase server query error:', fetchError.message);
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

  // 2. Trusted Insert with service_role authority
  const { data: inserted, error: insertError } = await serverSupabase
    .from('public_verification_records')
    .insert(recordPayload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: reFetched } = await serverSupabase
        .from('public_verification_records')
        .select('*')
        .eq('verification_id', recordPayload.verification_id)
        .single();

      if (
        reFetched &&
        reFetched.document_hash === recordPayload.document_hash &&
        reFetched.evidence_hash === recordPayload.evidence_hash
      ) {
        return {
          record: reFetched as PublicVerificationRecord,
          status: 'IDEMPOTENT_EXISTS'
        };
      }

      throw new Error(`Conflicting verification record created concurrently for ID '${recordPayload.verification_id}'`);
    }

    throw new Error(`Failed to persist verification record on server: ${insertError.message}`);
  }

  return {
    record: inserted as PublicVerificationRecord,
    status: 'CREATED'
  };
}
