/**
 * GRADIFI VERIFY - PIPELINE AUDIT TEST HARNESS
 * Verifies all 6 pipeline audit suite requirements with node:assert.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import assert from 'node:assert';
import { auditPipeline, PipelineAuditResult } from '../../src/services/verify/pipelineAudit';

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
  console.log('HOEOS FULL PIPELINE AUDIT TEST SUITE');
  console.log('================================================================');

  let cachedAudit: PipelineAuditResult | null = null;

  // Test 1 — auditPipeline on a small sample returns exactly 8 stage records.
  await runAsyncTest('Test 1 — auditPipeline returns exactly 8 stage records', async () => {
    cachedAudit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
    assert.ok(cachedAudit, 'Audit result must be returned');
    assert.strictEqual(cachedAudit.stages.length, 8, `Expected 8 stages, got ${cachedAudit.stages.length}`);
  });

  // Test 2 — each stage record has the required fields.
  await runAsyncTest('Test 2 — each stage record has required fields', async () => {
    assert.ok(cachedAudit, 'Cached audit must exist');
    const expectedStages = [
      'INGESTION',
      'NORMALIZATION',
      'QUERY_BUILD',
      'FEDERATION',
      'SIMILARITY',
      'MARKERS',
      'AI_FEDERATION',
      'PERSISTENCE',
    ];

    for (let i = 0; i < 8; i++) {
      const stage = cachedAudit.stages[i];
      assert.strictEqual(stage.stage, expectedStages[i], `Stage ${i} should be ${expectedStages[i]}`);
      assert.ok(stage.startedAt && typeof stage.startedAt === 'string', `Stage ${stage.stage} missing startedAt`);
      assert.ok(typeof stage.durationMs === 'number' && stage.durationMs >= 0, `Stage ${stage.stage} invalid durationMs`);
      assert.ok(stage.status === 'PASS' || stage.status === 'PARTIAL' || stage.status === 'FAIL', `Stage ${stage.stage} invalid status`);
      assert.ok(stage.detail && typeof stage.detail === 'string', `Stage ${stage.stage} missing detail`);
    }
  });

  // Test 3 — INGESTION stage status is PASS for a known-good document.
  await runAsyncTest('Test 3 — INGESTION stage status is PASS', async () => {
    assert.ok(cachedAudit, 'Cached audit must exist');
    const ingestion = cachedAudit.stages.find((s) => s.stage === 'INGESTION');
    assert.ok(ingestion, 'INGESTION stage must exist');
    assert.strictEqual(ingestion.status, 'PASS', 'INGESTION status must be PASS');
    assert.ok(ingestion.artifact?.characterCount && (ingestion.artifact.characterCount as number) > 0);
  });

  // Test 4 — FEDERATION stage includes all 5 provider IDs.
  await runAsyncTest('Test 4 — FEDERATION stage includes all 5 provider IDs', async () => {
    assert.ok(cachedAudit, 'Cached audit must exist');
    const fed = cachedAudit.stages.find((s) => s.stage === 'FEDERATION');
    assert.ok(fed, 'FEDERATION stage must exist');
    assert.ok(fed.artifact?.perProvider, 'FEDERATION artifact must contain perProvider');

    const perProvider = fed.artifact.perProvider as Record<string, any>;
    const requiredProviders = ['openalex', 'crossref', 'unpaywall', 'core', 'googlebooks'];
    for (const p of requiredProviders) {
      assert.ok(perProvider[p], `Provider ${p} must be present in FEDERATION telemetry`);
      assert.ok(perProvider[p].status, `Provider ${p} must have a status`);
    }
  });

  // Test 5 — MARKERS stage segment count is >= 1.
  await runAsyncTest('Test 5 — MARKERS stage segment count is >= 1', async () => {
    assert.ok(cachedAudit, 'Cached audit must exist');
    const markers = cachedAudit.stages.find((s) => s.stage === 'MARKERS');
    assert.ok(markers, 'MARKERS stage must exist');
    assert.ok(markers.artifact?.segmentCount && (markers.artifact.segmentCount as number) >= 1);
  });

  // Test 6 — Determinism: two consecutive audits on the same input produce identical stage names, statuses, and highlight counts.
  await runAsyncTest('Test 6 — Determinism: two consecutive audits produce consistent telemetry', async () => {
    const secondAudit = await auditPipeline(SAMPLE_TEXT, SAMPLE_TITLE);
    assert.ok(cachedAudit, 'Cached audit must exist');
    assert.strictEqual(cachedAudit.stages.length, secondAudit.stages.length);

    for (let i = 0; i < cachedAudit.stages.length; i++) {
      const s1 = cachedAudit.stages[i];
      const s2 = secondAudit.stages[i];
      assert.strictEqual(s1.stage, s2.stage, `Stage mismatch at index ${i}`);
      assert.strictEqual(s1.status, s2.status, `Status mismatch at stage ${s1.stage}`);
    }

    const markers1 = cachedAudit.stages.find((s) => s.stage === 'MARKERS');
    const markers2 = secondAudit.stages.find((s) => s.stage === 'MARKERS');
    assert.strictEqual(markers1?.artifact?.segmentCount, markers2?.artifact?.segmentCount);
    assert.strictEqual(markers1?.artifact?.highlightedCount, markers2?.artifact?.highlightedCount);
  });

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
