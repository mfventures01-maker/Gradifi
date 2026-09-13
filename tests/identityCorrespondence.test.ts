/**
 * GRADIFI HOEOS G5.8 - SOURCE / WORK IDENTITY CORRESPONDENCE TEST SUITE
 */

import { identityCorrespondenceService } from '../src/services/verify/identityCorrespondenceService';
import { UnpaywallMetadataResult, ContentValidationResult } from '../src/services/verify/types';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';

function createMockContent(text: string, title?: string): ContentValidationResult {
  const canonicalDoc = buildCanonicalAnalysisDocument({ rawText: text, title: title || 'Extracted Document' });
  return {
    status: 'CONTENT_VALID',
    extractedText: text,
    canonicalDocument: canonicalDoc,
    documentHash: canonicalDoc.documentId,
    extractionMethod: 'pdf_stream_extractor',
    validatedAt: new Date().toISOString()
  };
}

async function runG58Tests() {
  console.log('🧪 GRADIFI HOEOS G5.8 - IDENTITY CORRESPONDENCE TEST SUITE');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  const baseMeta: UnpaywallMetadataResult = {
    providerId: 'unpaywall',
    doi: '10.1038/s41586-023-00001-x',
    status: 'METADATA_FOUND',
    title: 'Quantum Advantage Demonstration in Superconducting Qubits',
    authors: ['Alice Smith', 'Bob Jones'],
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    correlationId: 'test_g58_001'
  };

  // 1. Exact DOI Match
  console.log('\n1. Exact DOI Match Evaluation');
  const text1 = `Journal of Quantum Physics. DOI: 10.1038/s41586-023-00001-x. Quantum Advantage Demonstration in Superconducting Qubits by Alice Smith and Bob Jones.`;
  const content1 = createMockContent(text1);
  const res1 = identityCorrespondenceService.evaluateCorrespondence(baseMeta, content1);

  assert(res1.status === 'IDENTITY_MATCHED', 'Status is IDENTITY_MATCHED for exact DOI');
  assert(res1.matchedBy === 'doi_exact', 'matchedBy is doi_exact');
  assert(res1.confidenceScore === 100, 'confidenceScore is 100');

  // 2. DOI Mismatch
  console.log('\n2. DOI Mismatch Evaluation');
  const text2 = `Journal of Astrophysics. DOI: 10.1016/j.astro.2023.99999. Cosmic Ray Observations in Deep Space by Charlie Brown.`;
  const content2 = createMockContent(text2);
  const res2 = identityCorrespondenceService.evaluateCorrespondence(baseMeta, content2);

  assert(res2.status === 'IDENTITY_MISMATCH', 'Status is IDENTITY_MISMATCH when DOIs differ');
  assert(res2.confidenceScore === 0, 'confidenceScore is 0 for DOI mismatch');

  // 3. Title & Author Match (No DOI in text)
  console.log('\n3. Title & Author Match (No DOI in text)');
  const text3 = `Quantum Advantage Demonstration in Superconducting Qubits. Authors: Alice Smith, Bob Jones. We report experimental evidence of quantum supremacy.`;
  const content3 = createMockContent(text3, 'Quantum Advantage Demonstration in Superconducting Qubits');
  const res3 = identityCorrespondenceService.evaluateCorrespondence(baseMeta, content3);

  assert(res3.status === 'IDENTITY_MATCHED', 'Status is IDENTITY_MATCHED for title/author match');
  assert(res3.matchedBy === 'title_author_correspondence', 'matchedBy is title_author_correspondence');
  assert(res3.confidenceScore >= 80, 'confidenceScore >= 80');

  // 4. Title Mismatch
  console.log('\n4. Title Mismatch Evaluation');
  const text4 = `Organic Chemistry Reaction Mechanisms in Aqueous Solutions. Authors: David Miller, Elena Rostova. Synthetic procedures described herein.`;
  const content4 = createMockContent(text4, 'Organic Chemistry Reaction Mechanisms');
  const res4 = identityCorrespondenceService.evaluateCorrespondence(baseMeta, content4);

  assert(res4.status === 'IDENTITY_MISMATCH', 'Status is IDENTITY_MISMATCH for completely different title/authors');

  // 5. Insufficient Metadata (Inconclusive)
  console.log('\n5. Insufficient Metadata (Inconclusive)');
  const text5 = `Quantum Demonstration of hardware benchmark results on experimental systems.`;
  const content5 = createMockContent(text5, 'Quantum Demonstration Overview');
  const res5 = identityCorrespondenceService.evaluateCorrespondence(baseMeta, content5);

  assert(res5.status === 'IDENTITY_INCONCLUSIVE', 'Status is IDENTITY_INCONCLUSIVE when evidence is insufficient');

  // 6. Eligibility Gate Proof
  console.log('\n6. Eligibility Gate Proof');
  assert(res1.status === 'IDENTITY_MATCHED', 'IDENTITY_MATCHED is ELIGIBLE');
  assert(res2.status !== 'IDENTITY_MATCHED', 'IDENTITY_MISMATCH is NOT ELIGIBLE');
  assert(res5.status !== 'IDENTITY_MATCHED', 'IDENTITY_INCONCLUSIVE is NOT ELIGIBLE');
  assert(typeof (res1 as any).provenanceState === 'undefined', 'IdentityCorrespondenceResult DOES NOT claim provenanceState = VERIFIED');

  console.log('===========================================================');
  console.log(`📊 G5.8 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG58Tests().catch(err => {
  console.error('G5.8 test execution failed:', err);
  process.exit(1);
});
