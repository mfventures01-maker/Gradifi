/**
 * GRADIFI HOEOS G1 - CANONICAL DOCUMENT ANALYSIS CONTRACT TEST SUITE
 * Verifies canonical document construction, required fields, repeatability,
 * zero fake metrics, fixture provenance distinction, and Verify Core compatibility.
 */

import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { CanonicalAnalysisDocument, AnalysisInputContract } from '../src/services/verify/types';

const SAMPLE_TEXT = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x, ISBN: 978-0-123456-78-9.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy. We compare our approach against standard Crossref and OpenAlex benchmarks.`;

async function runG1ContractTests() {
  console.log('🧪 GRADIFI HOEOS G1 - CANONICAL DOCUMENT ANALYSIS CONTRACT TEST SUITE');
  console.log('======================================================================');

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // Test A: Canonical document construction
  console.log('\n1. Test A: Canonical Document Construction');
  const canonicalDoc = buildCanonicalAnalysisDocument({
    rawText: SAMPLE_TEXT,
    filename: 'test_paper.pdf',
    extractionMethod: 'pdf_stream_extractor',
    isFixture: true
  });

  assert(Boolean(canonicalDoc), 'CanonicalAnalysisDocument object created');
  assert(typeof canonicalDoc.documentId === 'string' && canonicalDoc.documentId.length === 16, 'documentId is deterministic 16-char hash');
  assert(canonicalDoc.extractionStatus === 'SUCCESS', 'extractionStatus is SUCCESS');
  assert(canonicalDoc.normalizationStatus === 'NORMALIZED', 'normalizationStatus is NORMALIZED');

  // Test B: Required fields representation
  console.log('\n2. Test B: Required Fields Representation');
  assert(canonicalDoc.title.includes('Quantum Entanglement'), 'title extracted correctly');
  assert(canonicalDoc.authors.length >= 2, 'authors array populated');
  assert(canonicalDoc.year === 2024, 'year extracted correctly');
  assert(canonicalDoc.doi === '10.1038/s41586-023-00001-x', 'DOI extracted correctly');
  assert(canonicalDoc.isbn === '978-0-123456-78-9', 'ISBN extracted correctly');
  assert(canonicalDoc.stats.wordCount > 50, 'word count calculated in stats');
  assert(canonicalDoc.stats.characterCount === SAMPLE_TEXT.length, 'character count matches raw text length');

  // Test C: Repeatability (Mathematical Determinism)
  console.log('\n3. Test C: Deterministic Repeatability');
  const canonicalDoc2 = buildCanonicalAnalysisDocument({
    rawText: SAMPLE_TEXT,
    filename: 'test_paper.pdf',
    extractionMethod: 'pdf_stream_extractor',
    isFixture: true
  });

  assert(canonicalDoc.documentId === canonicalDoc2.documentId, 'Same raw text produces identical documentId');
  assert(canonicalDoc.normalizedText === canonicalDoc2.normalizedText, 'Same raw text produces identical normalizedText');
  assert(canonicalDoc.stats.wordCount === canonicalDoc2.stats.wordCount, 'Same raw text produces identical token stats');

  // Test D: No Fabricated Metrics
  console.log('\n4. Test D: No Fabricated Metrics Boundary');
  const emptyDoc = buildCanonicalAnalysisDocument({
    rawText: 'Short text without metadata fields.',
    isFixture: false
  });
  assert(emptyDoc.doi === undefined, 'Absent DOI is undefined, not fabricated');
  assert(emptyDoc.isbn === undefined, 'Absent ISBN is undefined, not fabricated');
  assert(emptyDoc.identifiers.length === 0, 'Absent identifiers array is empty, not fabricated');

  // Test E: Fixture Provenance Distinction
  console.log('\n5. Test E: Fixture Provenance Distinction');
  const fixtureDoc = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT, isFixture: true });
  const realDoc = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT, isFixture: false });

  assert(fixtureDoc.source.isFixture === true, 'Fixture doc explicitly flagged as isFixture = true');
  assert(fixtureDoc.source.origin === 'FIXTURE', 'Fixture doc origin is FIXTURE');
  assert(realDoc.source.isFixture === false, 'Real uploaded doc explicitly flagged as isFixture = false');
  assert(realDoc.source.origin === 'NORMALIZED', 'Real uploaded doc origin is NORMALIZED');

  // Test F: Existing Verify Core Compatibility & Envelope Execution
  console.log('\n6. Test F: Verify Core & Envelope Compatibility');
  const inputContract: AnalysisInputContract = {
    canonicalDocument: canonicalDoc,
    options: { searchLimit: 3 }
  };

  const envelope = await verifyCoreService.executeCanonicalAnalysis(inputContract);

  assert(Boolean(envelope), 'AnalysisResultEnvelope produced by VerifyCoreService');
  assert(envelope.documentId === canonicalDoc.documentId, 'Envelope documentId matches CanonicalAnalysisDocument');
  assert(Boolean(envelope.deterministicResult), 'Envelope embeds pure deterministic EvidenceEngineResult');
  assert(envelope.canonicalDocument.source.isFixture === true, 'Envelope preserves canonical document fixture flag');

  console.log('\n======================================================================');
  console.log(`📊 G1 TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runG1ContractTests().catch(err => {
  console.error('❌ G1 test execution error:', err);
  process.exit(1);
});
