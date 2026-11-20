/**
 * GRADIFI VERIFY - PUBLIC VERIFICATION RESOLUTION SERVICE
 * G7 public receipt reads are served only by lookup_public_verification().
 * The RPC is SECURITY DEFINER and returns a bounded metadata DTO; the browser
 * never queries public_verification_records directly or selects evidence_envelope.
 */
import { supabase } from '../../lib/supabase.js';
import { PublicVerificationRecord, VerificationPersistenceService } from './verificationPersistenceService.js';

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
  static validateVerificationIdFormat(verificationId: string): boolean {
    return typeof verificationId === 'string' &&
      /^VRF-[0-9A-F]{12}$/i.test(verificationId.trim());
  }

  async resolveVerification(verificationId: string): Promise<PublicVerificationResolution> {
    if (!verificationId || verificationId.trim().length === 0) {
      return { status: 'INVALID_FORMAT', verificationId: verificationId || '', errorMessage: 'Verification ID is required.' };
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
      const { data, error } = await supabase.rpc('lookup_public_verification', {
        p_verification_id: cleanId,
      });

      if (error) {
        console.warn('Public verification RPC returned error:', error.message);
        return {
          status: 'RESOLUTION_ERROR',
          verificationId: cleanId,
          errorMessage: 'Public verification is temporarily unavailable.',
        };
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
          status: 'NOT_FOUND',
          verificationId: cleanId,
          errorMessage: `No publicly resolvable verification receipt exists for ID '${cleanId}'.`,
        };
      }

      const dto = data as Record<string, unknown>;
      const record: PublicVerificationRecord = {
        verification_id: String(dto.verificationId || ''),
        document_hash: String(dto.documentHash || ''),
        evidence_hash: String(dto.evidenceHash || ''),
        engine_version: String(dto.engineVersion || ''),
        policy_version: String(dto.policyVersion || ''),
        overall_similarity: Number(dto.overallSimilarity),
        total_sources_found: Number(dto.sourceCount),
        correction_of_verification_id: typeof dto.correctionOfVerificationId === 'string'
          ? dto.correctionOfVerificationId
          : null,
        created_at: typeof dto.createdAt === 'string' ? dto.createdAt : undefined,
      };

      if (!record.document_hash || !record.evidence_hash || !record.engine_version ||
          !record.policy_version || !Number.isFinite(record.overall_similarity) ||
          record.overall_similarity < 0 || record.overall_similarity > 100 ||
          !Number.isInteger(record.total_sources_found) || record.total_sources_found < 0 ||
          typeof dto.resultHash !== 'string' || !dto.resultHash ||
          typeof dto.manifestHash !== 'string' || !dto.manifestHash ||
          typeof dto.schemaVersion !== 'string' || !dto.schemaVersion) {
        return {
          status: 'MALFORMED_RECORD',
          verificationId: cleanId,
          errorMessage: 'Public receipt metadata is incomplete or invalid.',
        };
      }

      const expectedId = VerificationPersistenceService.deriveVerificationId(
        record.document_hash,
        record.evidence_hash,
      );
      if (record.verification_id !== cleanId || expectedId !== cleanId) {
        return {
          status: 'INTEGRITY_FAILED',
          verificationId: cleanId,
          errorMessage: 'Public receipt identity does not match its document and evidence hashes.',
        };
      }

      if (record.correction_of_verification_id &&
          !PublicVerificationService.validateVerificationIdFormat(record.correction_of_verification_id)) {
        return {
          status: 'MALFORMED_RECORD',
          verificationId: cleanId,
          errorMessage: 'Correction lineage metadata is malformed.',
        };
      }

      return { status: 'VALID', verificationId: cleanId, record };
    } catch (error) {
      console.error('Public verification resolution error:', error);
      return {
        status: 'RESOLUTION_ERROR',
        verificationId: cleanId,
        errorMessage: 'An unexpected error occurred resolving the verification receipt.',
      };
    }
  }
}

export const publicVerificationService = new PublicVerificationService();
