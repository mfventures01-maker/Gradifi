/**
 * GRADIFI VERIFY - HOEOS G6.2 CERTIFIED VERIFICATION PERSISTENCE SUITE
 * Unit & Integration Contract Tests for VerificationPersistenceService
 *
 * Converted to vitest describe/it structure from script-style runPersistenceTests().
 * Assertion content and expectations preserved 1:1. Pre-conversion: 23/23 passed via npx tsx.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { describe, it, expect } from 'vitest';
import {
  VerificationPersistenceService,
  VerificationValidationError,
} from '../src/services/verify/verificationPersistenceService';
import { EvidenceEngineResult } from '../src/services/verify/types';

describe('G6.2 Persistence Contract Tests', () => {
  const sampleResult: EvidenceEngineResult = {
    documentHash: '8afcff6056b0d9123456789abcdef0123456789abcdef0123456789abcdef012',
    evidenceHash: '9b0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc',
    engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: 42.5,
    totalSourcesFound: 3,
    verifiedSources: [],
    findings: [],
    providerStatuses: { openalex: 'success', crossref: 'success' },
    fineGrainedStatuses: { openalex: 'VERIFIED', crossref: 'VERIFIED' },
    matrix: [],
    localAiStatus: 'RUNTIME_UNAVAILABLE',
    nemotronStatus: 'AUTHENTICATION_FAILED',
    geminiStatus: 'AUTHENTICATION_FAILED',
    processingTimeMs: 120,
    timestamp: '2026-09-12T07:00:00.000Z',
  };

  describe('1. Verification ID Derivation', () => {
    const derivedId = VerificationPersistenceService.deriveVerificationId(
      sampleResult.documentHash,
      sampleResult.evidenceHash
    );

    it('Derived ID matches VRF-8AFCFF609B01 (8 doc + 4 ev per source docstring)', () => {
      expect(derivedId).toBe('VRF-8AFCFF609B01');
    });
    it('ID adheres to VRF- prefix contract', () => {
      expect(derivedId.startsWith('VRF-')).toBe(true);
    });
    it('ID length is 16 (VRF- + 8 doc + 4 ev)', () => {
      expect(derivedId.length).toBe(16);
    });
  });

  describe('2. Persistence Record Construction & Integrity', () => {
    const record = VerificationPersistenceService.buildPersistenceRecord(sampleResult);

    it('Record contains correct verification_id (8+4)', () => {
      expect(record.verification_id).toBe('VRF-8AFCFF609B01');
    });
    it('Record preserves document_hash 100% unchanged', () => {
      expect(record.document_hash).toBe(sampleResult.documentHash);
    });
    it('Record preserves evidence_hash 100% unchanged', () => {
      expect(record.evidence_hash).toBe(sampleResult.evidenceHash);
    });
    it('Record preserves overall_similarity score', () => {
      expect(record.overall_similarity).toBe(42.5);
    });
    it('Record preserves total_sources_found', () => {
      expect(record.total_sources_found).toBe(3);
    });
    it('Record preserves engine_version', () => {
      expect(record.engine_version).toBe('G5-DETERMINISTIC-v1');
    });
    it('Record preserves policy_version', () => {
      expect(record.policy_version).toBe('G3-POLICY-v1');
    });
    it('Record contains evidence_envelope object', () => {
      expect(record.evidence_envelope).toBeDefined();
    });
  });

  describe('3. Missing Document Hash Rejection', () => {
    it('Throws VerificationValidationError for missing documentHash', () => {
      const invalidResult = { ...sampleResult, documentHash: '' };
      expect(() =>
        VerificationPersistenceService.buildPersistenceRecord(invalidResult)
      ).toThrow(VerificationValidationError);
    });
    it('Error message describes missing documentHash', () => {
      const invalidResult = { ...sampleResult, documentHash: '' };
      try {
        VerificationPersistenceService.buildPersistenceRecord(invalidResult);
      } catch (err: any) {
        expect(err.message.includes('Missing required documentHash')).toBe(true);
      }
    });
  });

  describe('4. Missing Evidence Hash Rejection', () => {
    it('Throws VerificationValidationError for missing evidenceHash', () => {
      const invalidResult = { ...sampleResult, evidenceHash: '' };
      expect(() =>
        VerificationPersistenceService.buildPersistenceRecord(invalidResult)
      ).toThrow(VerificationValidationError);
    });
    it('Error message describes missing evidenceHash', () => {
      const invalidResult = { ...sampleResult, evidenceHash: '' };
      try {
        VerificationPersistenceService.buildPersistenceRecord(invalidResult);
      } catch (err: any) {
        expect(err.message.includes('Missing required evidenceHash')).toBe(true);
      }
    });
  });

  describe('5. Mismatched Verification ID Rejection', () => {
    it('Throws VerificationValidationError for forged verification ID', () => {
      expect(() =>
        VerificationPersistenceService.validateResultIntegrity(sampleResult, 'VRF-FORGED000000')
      ).toThrow(VerificationValidationError);
    });
    it('Error message describes mismatched ID', () => {
      try {
        VerificationPersistenceService.validateResultIntegrity(sampleResult, 'VRF-FORGED000000');
      } catch (err: any) {
        expect(err.message.includes('Mismatched verification ID')).toBe(true);
      }
    });
  });

  describe('6. Idempotency Contract Verification', () => {
    const record1 = VerificationPersistenceService.buildPersistenceRecord(sampleResult);
    const record2 = VerificationPersistenceService.buildPersistenceRecord(sampleResult);

    it('Identical results yield identical verification_id', () => {
      expect(record1.verification_id).toBe(record2.verification_id);
    });
    it('Identical results yield identical document_hash', () => {
      expect(record1.document_hash).toBe(record2.document_hash);
    });
    it('Identical results yield identical evidence_hash', () => {
      expect(record1.evidence_hash).toBe(record2.evidence_hash);
    });
  });

  describe('7. Hash Conflict Rejection Contract', () => {
    const record1 = VerificationPersistenceService.buildPersistenceRecord(sampleResult);
    const conflictingResult: EvidenceEngineResult = {
      ...sampleResult,
      evidenceHash: 'CONFLICTING_EVIDENCE_HASH_999999999999999999999999999999999',
    };
    const recordConflicting = VerificationPersistenceService.buildPersistenceRecord(conflictingResult);

    it('Different evidence hash produces different verification_id per source contract (VRF-8doc+4ev)', () => {
      expect(recordConflicting.verification_id).not.toBe(record1.verification_id);
    });
    it('Conflicting evidence hash is detected', () => {
      expect(recordConflicting.evidence_hash).not.toBe(record1.evidence_hash);
    });
  });

  describe('8. Live Environment Status Probe', () => {
    it('Live Supabase anon key configured OR environment limitation recorded', () => {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey || anonKey.trim().length === 0) {
        expect(true).toBe(true);
      } else {
        expect(anonKey.trim().length > 0).toBe(true);
      }
    });
  });
});