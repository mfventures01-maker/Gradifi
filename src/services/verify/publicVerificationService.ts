/**
 * GRADIFI VERIFY - PUBLIC VERIFICATION RESOLUTION SERVICE
 * HOEOS G6.3 Standard: Public Resolution, Format Validation, Hash Grounding & Integrity Checks.
 */

import { supabase } from '../../lib/supabase';
import { PublicVerificationRecord, VerificationPersistenceService } from './verificationPersistenceService';

export type PublicResolutionStatus =
  | 'VALID'
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'INTEGRITY_FAILED'
  | 'MALFORMED_RECORD'
  | 'RESOLUTION_ERROR';

export interface PublicVerificationResolution {
  status: PublicResolutionStatus;
  verificationId: string;
  record?: PublicVerificationRecord;
  errorMessage?: string;
}

export class PublicVerificationService {
  /**
   * Validates the format of a public verification ID.
   * Format: VRF- followed by 12 hex characters (e.g. VRF-8AFCFF6056B0)
   */
  static validateVerificationIdFormat(verificationId: string): boolean {
    if (!verificationId || typeof verificationId !== 'string') {
      return false;
    }
    const cleanId = verificationId.trim().toUpperCase();
    return /^VRF-[0-9A-F]{12}$/.test(cleanId);
  }

  /**
   * Resolves a public verification record from the authoritative public.public_verification_records table.
   * Performs format validation, database query, and strict identity/hash integrity validation.
   */
  async resolveVerification(verificationId: string): Promise<PublicVerificationResolution> {
    if (!verificationId || verificationId.trim().length === 0) {
      return {
        status: 'INVALID_FORMAT',
        verificationId: verificationId || '',
        errorMessage: 'Verification ID is required.',
      };
    }

    const cleanId = verificationId.trim().toUpperCase();

    if (!PublicVerificationService.validateVerificationIdFormat(cleanId)) {
      return {
        status: 'INVALID_FORMAT',
        verificationId: cleanId,
        errorMessage: 'Invalid verification ID format. Expected VRF-XXXXXXXXXXXX (12 hex characters).',
      };
    }

    try {
      const { data, error } = await supabase
        .from('public_verification_records')
        .select('*')
        .eq('verification_id', cleanId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Public verification query returned error:', error.message);
        return {
          status: 'RESOLUTION_ERROR',
          verificationId: cleanId,
          errorMessage: `Database error: ${error.message}`,
        };
      }

      if (!data) {
        return {
          status: 'NOT_FOUND',
          verificationId: cleanId,
          errorMessage: `No verification record found for ID '${cleanId}'.`,
        };
      }

      // PHASE 3 — Integrity Validation: Check document_hash <-> verification_id correlation
      if (!data.document_hash || typeof data.document_hash !== 'string') {
        return {
          status: 'MALFORMED_RECORD',
          verificationId: cleanId,
          errorMessage: 'Verification record is missing required document_hash.',
        };
      }

      const expectedDerivedId = VerificationPersistenceService.deriveVerificationId(data.document_hash);
      if (expectedDerivedId !== cleanId) {
        return {
          status: 'INTEGRITY_FAILED',
          verificationId: cleanId,
          errorMessage: `Verification integrity check failed: Verification ID '${cleanId}' does not match document hash derived ID '${expectedDerivedId}'.`,
        };
      }

      // Validate presence of required evidence fields
      if (!data.evidence_hash || !data.evidence_envelope) {
        return {
          status: 'MALFORMED_RECORD',
          verificationId: cleanId,
          errorMessage: 'Verification record is missing required evidence_hash or evidence_envelope.',
        };
      }

      return {
        status: 'VALID',
        verificationId: cleanId,
        record: data as PublicVerificationRecord,
      };
    } catch (err: any) {
      console.error('Public verification resolution error:', err);
      return {
        status: 'RESOLUTION_ERROR',
        verificationId: cleanId,
        errorMessage: err?.message || 'An unexpected error occurred resolving the verification record.',
      };
    }
  }
}

export const publicVerificationService = new PublicVerificationService();
