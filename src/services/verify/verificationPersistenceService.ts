/**
 * GRADIFI VERIFY - CERTIFIED VERIFICATION ENVELOPE PERSISTENCE SERVICE
 * HOEOS G6.2 Standard: Trusted Write Path, Idempotent Record Persistence & Conflict Protection.
 */

import { EvidenceEngineResult, AnalysisResultEnvelope } from './types';
import { supabase } from '../../lib/supabase';

export interface PublicVerificationRecord {
  id?: string;
  verification_id: string;
  document_hash: string;
  evidence_hash: string;
  engine_version: string;
  policy_version: string;
  overall_similarity: number;
  total_sources_found: number;
  evidence_envelope: any;
  created_at?: string;
}

export class VerificationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationConflictError';
  }
}

export class VerificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationValidationError';
  }
}

export class VerificationPersistenceService {
  /**
   * Generates the deterministic canonical verification ID from a document hash.
   */
  static deriveVerificationId(documentHash: string): string {
    if (!documentHash || documentHash.length < 12) {
      throw new VerificationValidationError('Invalid documentHash for verification ID derivation');
    }
    return `VRF-${documentHash.slice(0, 12).toUpperCase()}`;
  }

  /**
   * Validates the data integrity of a certified G5 result before persistence.
   */
  static validateResultIntegrity(result: EvidenceEngineResult, providedVerificationId?: string): string {
    if (!result) {
      throw new VerificationValidationError('Missing certified verification result');
    }

    if (!result.documentHash || result.documentHash.trim().length === 0) {
      throw new VerificationValidationError('Missing required documentHash in verification result');
    }

    if (!result.evidenceHash || result.evidenceHash.trim().length === 0) {
      throw new VerificationValidationError('Missing required evidenceHash in verification result');
    }

    if (typeof result.overallSimilarity !== 'number' || !Number.isFinite(result.overallSimilarity)) {
      throw new VerificationValidationError('Invalid overallSimilarity in verification result');
    }

    const expectedId = this.deriveVerificationId(result.documentHash);

    if (providedVerificationId && providedVerificationId !== expectedId) {
      throw new VerificationValidationError(
        `Mismatched verification ID: Provided '${providedVerificationId}' does not match expected derived ID '${expectedId}'`
      );
    }

    return expectedId;
  }

  /**
   * Converts a certified EvidenceEngineResult into a persistent PublicVerificationRecord database payload.
   */
  static buildPersistenceRecord(
    result: EvidenceEngineResult,
    envelope?: AnalysisResultEnvelope
  ): PublicVerificationRecord {
    const verificationId = this.validateResultIntegrity(result);

    return {
      verification_id: verificationId,
      document_hash: result.documentHash,
      evidence_hash: result.evidenceHash,
      engine_version: result.engineVersion || 'G5-DETERMINISTIC-v1',
      policy_version: result.policyVersion || 'G3-POLICY-v1',
      overall_similarity: result.overallSimilarity,
      total_sources_found: result.totalSourcesFound || 0,
      evidence_envelope: envelope || {
        result,
        persistedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Persists a certified G5 verification result to the public_verification_records table.
   * Enforces idempotency (same result = no-op return) and conflict rejection (conflicting hashes = throw error).
   */
  async persistVerificationRecord(
    result: EvidenceEngineResult,
    envelope?: AnalysisResultEnvelope
  ): Promise<{ record: PublicVerificationRecord; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
    const recordPayload = VerificationPersistenceService.buildPersistenceRecord(result, envelope);

    // Browser context: Delegate to trusted server endpoint /api/verify/persist
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/verify/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, envelope })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error || `Server returned HTTP ${response.status}`;
        if (msg.includes('Conflicting verification record')) {
          throw new VerificationConflictError(msg);
        }
        throw new Error(msg);
      }

      const resData = await response.json();
      return resData;
    }

    // Node / Server Context: Use service role client if process.env.SUPABASE_SERVICE_ROLE_KEY is present
    const getEnvVar = (key: string) => (typeof process !== 'undefined' && process.env ? process.env[key] : undefined);
    const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');

    let client = supabase;
    if (serviceRoleKey && supabaseUrl) {
      const { createClient } = await import('@supabase/supabase-js');
      client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }

    // 1. Check for existing record by verification_id
    const { data: existing, error: fetchError } = await client
      .from('public_verification_records')
      .select('*')
      .eq('verification_id', recordPayload.verification_id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Supabase query returned error (or offline mode):', fetchError.message);
    }

    if (existing) {
      // 2. Conflict Check: Verify hash immutability
      if (
        existing.document_hash !== recordPayload.document_hash ||
        existing.evidence_hash !== recordPayload.evidence_hash
      ) {
        throw new VerificationConflictError(
          `Conflicting verification record exists for ID '${recordPayload.verification_id}'. Existing documentHash: '${existing.document_hash}', New: '${recordPayload.document_hash}'`
        );
      }

      // Idempotent success: return existing record
      return {
        record: existing as PublicVerificationRecord,
        status: 'IDEMPOTENT_EXISTS',
      };
    }

    // 3. Insert new certified record with server authority
    const { data: inserted, error: insertError } = await client
      .from('public_verification_records')
      .insert(recordPayload)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: reFetched } = await client
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
            status: 'IDEMPOTENT_EXISTS',
          };
        }

        throw new VerificationConflictError(
          `Conflicting verification record created concurrently for ID '${recordPayload.verification_id}'`
        );
      }

      throw new Error(`Failed to persist verification record: ${insertError.message}`);
    }

    return {
      record: inserted as PublicVerificationRecord,
      status: 'CREATED',
    };
  }
}

export const verificationPersistenceService = new VerificationPersistenceService();
