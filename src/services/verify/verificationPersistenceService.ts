/**
 * GRADIFI VERIFY - CERTIFIED VERIFICATION ENVELOPE PERSISTENCE SERVICE
 * HOEOS G6.2 Standard: Trusted Write Path, Idempotent Record Persistence & Conflict Protection.
 */

import { G4DPersistenceEnvelope, PersistableEvidenceResult } from './types.js';
import { supabase } from '../../lib/supabase.js';
import { validatePersistedVerificationRecord } from './verificationPersistenceIntegrity.js';

export interface PublicVerificationRecord {
  id?: string;
  verification_id: string;
  document_hash: string;
  evidence_hash: string;
  engine_version: string;
  policy_version: string;
  overall_similarity: number;
  total_sources_found: number;
  evidence_envelope?: any;
  correction_of_verification_id?: string | null;
  verification_run_id?: string;
  result_hash?: string;
  manifest_hash?: string;
  status?: string;
  public_schema_version?: string;
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
   * Generates the deterministic canonical verification ID from document and evidence hashes.
   *
   * The ID incorporates the evidence hash so that:
   * - Two runs with identical evidence produce the same ID (idempotency preserved).
   * - Two runs with different evidence produce different IDs (no collision).
   *
   * Format: VRF-{8 chars of document hash}{4 chars of evidence hash}
   * Total: 12 chars after the VRF- prefix.
   */
  static deriveVerificationId(documentHash: string, evidenceHash?: string): string {
    if (!documentHash || documentHash.length < 12) {
      throw new VerificationValidationError('Invalid documentHash for verification ID derivation');
    }
    const docPart = documentHash.slice(0, 8).toUpperCase();
    const evPart = evidenceHash ? evidenceHash.slice(0, 4).toUpperCase() : '';
    return `VRF-${docPart}${evPart}`;
  }

  /**
   * Validates the data integrity of a certified G5 result before persistence.
   */
  static validateResultIntegrity(result: PersistableEvidenceResult, providedVerificationId?: string): string {
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

    const expectedId = this.deriveVerificationId(result.documentHash, result.evidenceHash);

    if (providedVerificationId && providedVerificationId !== expectedId) {
      throw new VerificationValidationError(
        `Mismatched verification ID: Provided '${providedVerificationId}' does not match expected derived ID '${expectedId}'`
      );
    }

    return expectedId;
  }

  /**
   * G4-D read-only validation for database rows before idempotent return or public display.
   */
  static validatePersistedRecord(record: PublicVerificationRecord | Record<string, any>) {
    return validatePersistedVerificationRecord(record);
  }

  /**
   * Converts a certified PersistableEvidenceResult into a persistent PublicVerificationRecord database payload.
   */
  static buildPersistenceRecord(
    result: PersistableEvidenceResult,
    envelope: G4DPersistenceEnvelope,
    correctionOfVerificationId?: string | null
  ): PublicVerificationRecord {
    const verificationId = this.validateResultIntegrity(result);

    const record: PublicVerificationRecord = {
      verification_id: verificationId,
      document_hash: result.documentHash,
      evidence_hash: result.evidenceHash,
      engine_version: result.engineVersion || 'G5-DETERMINISTIC-v1',
      policy_version: result.policyVersion || 'G3-POLICY-v1',
      overall_similarity: result.overallSimilarity,
      total_sources_found: result.totalSourcesFound || 0,
      evidence_envelope: envelope,
      correction_of_verification_id: correctionOfVerificationId ?? null,
    };

    const integrity = validatePersistedVerificationRecord(record);
    if (integrity.status !== 'VALID') {
      throw new VerificationValidationError(
        `Verification envelope failed G4-D integrity validation: ${integrity.reason || integrity.status}`
      );
    }
    return record;
  }

  /**
   * Persists a certified G5 verification result to the public_verification_records table.
   * Enforces idempotency (same result = no-op return) and conflict rejection (conflicting hashes = throw error).
   */
  async persistVerificationRecord(
    result: PersistableEvidenceResult,
    envelope: G4DPersistenceEnvelope,
    correctionOfVerificationId?: string | null
  ): Promise<{ record: PublicVerificationRecord; status: 'CREATED' | 'IDEMPOTENT_EXISTS' }> {
    const recordPayload = VerificationPersistenceService.buildPersistenceRecord(result, envelope, correctionOfVerificationId);

    // Browser context: Delegate to trusted server endpoint /api/verify/persist
    if (typeof window !== 'undefined') {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('Unable to resolve the current Supabase session for trusted persistence.');
      }
      if (!session?.access_token) {
        throw new Error('Authentication required before a verification record can be persisted.');
      }

      const response = await fetch('/api/verify/persist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ result, envelope, correctionOfVerificationId: correctionOfVerificationId ?? null })
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

    // Server contexts must use handlePersistenceServerRequest with a verified user token.
    // A service-role direct-write fallback would bypass actor/workspace authorization and
    // could create a public receipt without the authoritative verification_runs projection.
    throw new Error('Trusted persistence requires the authenticated /api/verify/persist authority.');
  }
}

export const verificationPersistenceService = new VerificationPersistenceService();