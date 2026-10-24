/**
 * GRADIFI VERIFY - PIPELINE AUDIT STAGE 8 FAIL-CLOSED TEST HARNESS
 * Verifies all fail-closed invariants for Stage 8 persistence under HOEOS.
 *
 * Requirements:
 * 1. Persistence success:
 *    - authoritative record returned
 *    - verification_id present
 *    - Stage 8 = PASS
 *    - artifact.persisted = true
 *    - artifact.verificationId equals returned authoritative ID
 *
 * 2. Persistence failure:
 *    - persistence service throws
 *    - Stage 8 = FAIL
 *    - artifact.persisted = false
 *    - artifact.verificationId is empty
 *    - no derived VRF ID appears
 *    - no "Persistence fallback engaged" appears
 *    - no persistence failure is reported as PASS
 *
 * 3. Idempotent persistence:
 *    - persistence service returns an authoritative existing record
 *    - Stage 8 = PASS
 *    - returned verification_id is used
 *    - no locally derived ID is used
 *
 * 4. Missing verification_id:
 *    - persistence service returns no authoritative verification_id
 *    - Stage 8 = FAIL
 *    - artifact.persisted = false
 *    - artifact.verificationId is empty
 *
 * 5. Slim DTO payload verification:
 *    - verifyResult payload is slimmed down to authoritative fields only
 *    - no raw document text, provider payloads, or unrelated execution state
 */

import assert from 'node:assert';
import { auditPipeline } from '../../src/services/verify/pipelineAudit.js';
import { verificationPersistenceService } from '../../src/services/verify/verificationPersistenceService.js';

const SAMPLE_TEXT = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges.
In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems.`;

const SAMPLE_TITLE = 'Quantum Entanglement and Decoupled Neural Architecture';

let passCount = 0;
let failCount = 0;

async function runAsyncTest(testName: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS — ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`FAIL — ${testName}:`, err);
    failCount++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('HOEOS PIPELINE AUDIT STAGE 8 FAIL-CLOSED TEST SUITE');
  console.log('================================================================');

  const originalPersist = verificationPersistenceService.persistVerificationRecord.bind(verificationPersistenceService);

  try {
    // -------------------------------------------------------------------------
    // Test 1: Persistence Success with Authoritative Record
    // -------------------------------------------------------------------------
    await runAsyncTest('Test 1 — Persistence Success with Authoritative Record', async () => {
      let capturedResult: any = null;
      let capturedEnvelope: any = null;

      verificationPersistenceService.persistVerificationRecord = async (result: any, envelope: any) => {
        capturedResult = result;
        capturedEnvelope = envelope;
        return {
          record: {
            verification_id: 'VRF-AUTH-SUCCESS-777',
            document_hash: result.documentHash,
            evidence_hash: result.evidenceHash,
            engine_version: result.engineVersion,
            policy_version: result.policyVersion,
            overall_similarity: 0.15,
            total_sources_found: result.totalSourcesFound,
            evidence_envelope: envelope,
          },
          status: 'CREATED' as const,
        };
      };

      const audit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
      const stage8 = audit.stages.find((s) => s.stage === 'PERSISTENCE');

      assert.ok(stage8, 'Stage 8 PERSISTENCE must exist');
      assert.strictEqual(stage8.status, 'PASS', 'Stage 8 status must be PASS on authoritative record');
      assert.strictEqual(stage8.artifact?.persisted, true, 'artifact.persisted must be true');
      assert.strictEqual(stage8.artifact?.verificationId, 'VRF-AUTH-SUCCESS-777', 'artifact.verificationId must match authoritative ID');
      assert.ok(stage8.detail.includes('VRF-AUTH-SUCCESS-777'), 'Stage 8 detail must include authoritative verification_id');

      // Slim DTO validation
      assert.ok(capturedResult, 'capturedResult must exist');
      assert.strictEqual(capturedResult.documentHash !== undefined, true, 'documentHash must be present');
      assert.strictEqual(capturedResult.evidenceHash !== undefined, true, 'evidenceHash must be present');
      assert.strictEqual(capturedResult.engineVersion !== undefined, true, 'engineVersion must be present');
      assert.strictEqual(capturedResult.policyVersion !== undefined, true, 'policyVersion must be present');
      assert.strictEqual(capturedResult.totalSourcesFound !== undefined, true, 'totalSourcesFound must be present');

      // Forbidden fields in slim DTO
      assert.strictEqual((capturedResult as any).rawText, undefined, 'rawText must NOT be present in slim DTO');
      assert.strictEqual((capturedResult as any).findings, undefined, 'findings must NOT be in top-level persistResult');
      assert.strictEqual((capturedResult as any).verifiedSources, undefined, 'verifiedSources must NOT be in top-level persistResult');
    });

    // -------------------------------------------------------------------------
    // Test 2: Persistence Failure (Remote Store Throws) -> FAIL-CLOSED
    // -------------------------------------------------------------------------
    await runAsyncTest('Test 2 — Persistence Failure (Remote Store Throws) -> FAIL-CLOSED', async () => {
      verificationPersistenceService.persistVerificationRecord = async () => {
        throw new Error('Supabase network connection timeout 503');
      };

      const audit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
      const stage8 = audit.stages.find((s) => s.stage === 'PERSISTENCE');

      assert.ok(stage8, 'Stage 8 PERSISTENCE must exist');
      assert.strictEqual(stage8.status, 'FAIL', 'Stage 8 status must be FAIL on store exception');
      assert.strictEqual(stage8.artifact?.persisted, false, 'artifact.persisted must be false on failure');
      assert.strictEqual(stage8.artifact?.verificationId, '', 'artifact.verificationId must be empty string on failure');
      assert.strictEqual(stage8.detail.includes('Persistence fallback engaged'), false, 'Forbidden string "Persistence fallback engaged" must NOT appear');
      assert.strictEqual(stage8.detail.includes('VRF-'), false, 'No fallback VRF ID must appear in detail');
      assert.ok(stage8.detail.includes('Persistence failed: Supabase network connection timeout 503'), 'Detail must report exact failure');
    });

    // -------------------------------------------------------------------------
    // Test 3: Idempotent Persistence with Existing Authoritative Record
    // -------------------------------------------------------------------------
    await runAsyncTest('Test 3 — Idempotent Persistence with Existing Authoritative Record', async () => {
      verificationPersistenceService.persistVerificationRecord = async (result: any, envelope: any) => {
        return {
          record: {
            verification_id: 'VRF-IDEMPOTENT-RECORD-888',
            document_hash: result.documentHash,
            evidence_hash: result.evidenceHash,
            engine_version: result.engineVersion,
            policy_version: result.policyVersion,
            overall_similarity: 0.15,
            total_sources_found: result.totalSourcesFound,
            evidence_envelope: envelope,
          },
          status: 'IDEMPOTENT_EXISTS' as const,
        };
      };

      const audit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
      const stage8 = audit.stages.find((s) => s.stage === 'PERSISTENCE');

      assert.ok(stage8, 'Stage 8 PERSISTENCE must exist');
      assert.strictEqual(stage8.status, 'PASS', 'Stage 8 status must be PASS on authoritative idempotent record');
      assert.strictEqual(stage8.artifact?.persisted, true, 'artifact.persisted must be true');
      assert.strictEqual(stage8.artifact?.verificationId, 'VRF-IDEMPOTENT-RECORD-888', 'artifact.verificationId must match returned ID');
      assert.ok(stage8.detail.includes('status=IDEMPOTENT_EXISTS'), 'Detail must reflect IDEMPOTENT_EXISTS');
    });

    // -------------------------------------------------------------------------
    // Test 4: Missing verification_id on returned record -> FAIL-CLOSED
    // -------------------------------------------------------------------------
    await runAsyncTest('Test 4 — Missing verification_id on returned record -> FAIL-CLOSED', async () => {
      verificationPersistenceService.persistVerificationRecord = async () => {
        return {
          record: null as any,
          status: 'CREATED' as const,
        };
      };

      const audit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
      const stage8 = audit.stages.find((s) => s.stage === 'PERSISTENCE');

      assert.ok(stage8, 'Stage 8 PERSISTENCE must exist');
      assert.strictEqual(stage8.status, 'FAIL', 'Stage 8 status must be FAIL when record is missing/incomplete');
      assert.strictEqual(stage8.artifact?.persisted, false, 'artifact.persisted must be false');
      assert.strictEqual(stage8.artifact?.verificationId, '', 'artifact.verificationId must be empty string');
      assert.ok(stage8.detail.includes('Persistence returned no authoritative verification_id'), 'Detail must indicate missing authoritative verification_id');
    });

  } finally {
    // Restore original method
    verificationPersistenceService.persistVerificationRecord = originalPersist;
  }

  console.log('================================================================');
  console.log(`TOTAL: ${passCount} PASS / ${failCount} FAIL`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
