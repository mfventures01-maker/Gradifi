import { spawnSync } from 'node:child_process';

const scriptStyleTests = [
  "tests/aiEvidenceFirewall.test.ts",
  "tests/bulkIngestionAndMetadata.test.ts",
  "tests/canonicalDocumentContract.test.ts",
  "tests/contentValidation.test.ts",
  "tests/demoWorkflow3Runs.test.ts",
  "tests/deterministicEvidenceBridge.test.ts",
  "tests/g2_ocr_determinism.test.ts",
  "tests/gemini_adapter.test.ts",
  "tests/gemmaServerHandler.test.ts",
  "tests/identityCorrespondence.test.ts",
  "tests/plagiarismEvidencePolicy.test.ts",
  "tests/publicOriginalityExposure.test.ts",
  "tests/publicVerificationResolution.test.ts",
  "tests/qrGenerator.test.ts",
  "tests/queryBuilder.test.ts",
  "tests/sourceRetrieval.test.ts",
  "tests/unpaywallOAResolver.test.ts",
  "tests/verificationMatrixState.test.ts",
  "tests/verificationSchemaRLS.test.ts",
  "tests/verifyCore.test.ts",
  "tests/federation/federationDeterminism.test.ts",
  "tests/federation/rateLimiter.test.ts",
  "tests/federation/requestQueue.test.ts",
  "tests/nemotron/retry.test.ts",
  "tests/pipeline/pipelineAudit.test.ts",
  "tests/pipeline/pipelineAuditFailClosed.test.ts",
  "tests/g1_docx_fidelity.test.ts",
  "tests/g2_repairs_regression.test.ts",
  "tests/g4-offset-invariants.test.ts",
  "tests/correction/correctionPanel.test.ts",
  "tests/markers/markerRendering.test.ts",
  "tests/provider/passageExtractor.test.ts",
  "tests/g2_offset_fidelity.test.ts",
  "tests/g1_epub_ocr.test.ts"
];

let failed = 0;
for (const file of scriptStyleTests) {
  console.log(`\n=== HOEOS standalone test: ${file} ===`);
  const run = spawnSync(process.execPath, ['--import', 'tsx', file], {
    stdio: 'inherit',
    env: process.env
  });

  if (run.error) {
    console.error(`FAILED to launch ${file}: ${run.error.message}`);
    failed += 1;
  } else if (run.status !== 0) {
    console.error(`FAILED: ${file} exited with status ${run.status}`);
    failed += 1;
  } else {
    console.log(`PASS: ${file}`);
  }
}

console.log(`\nHOEOS standalone test summary: ${scriptStyleTests.length - failed}/${scriptStyleTests.length} passed; ${failed} failed.`);
process.exitCode = failed === 0 ? 0 : 1;
