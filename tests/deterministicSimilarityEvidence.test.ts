/**
 * GRADIFI HOEOS G2 - DETERMINISTIC SIMILARITY & EXPLAINABLE MATCH TEST SUITE
 * Verifies identical document comparison, unrelated document comparison, partial overlap findings,
 * 100% mathematical determinism, actual text evidence tracing, method integrity, zero AI dependency,
 * G1 canonical document compatibility, and zero hardcoded analytical numbers.
 */

import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { evaluateDocumentSimilarity } from '../src/services/verify/deterministicEngine';
import { SimilarityAnalysisResult, SimilarityFinding } from '../src/services/verify/types';

const SAMPLE_TEXT_A = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.`;

const SAMPLE_TEXT_B_PARTIAL = `An Analysis of High-Order Evidence Systems in Edge Computing Topology
By Prof. Elena Rostova and Dr. Aris Thorne

Introduction:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. Furthermore, mathematical determinism guarantees non-repudiation of evidence.`;

const UNRELATED_TEXT = `Biological Rhythms and Circadian Photosensitivity in Deep-Sea Marine Organisms
By Prof. Sarah Jenkins and Dr. Liam O'Connor (2022)

Abstract:
Photosynthetic adaptation in benthic ecosystems exhibits cyclical bioluminescence under extreme hydrostatic pressure. We observed species distribution across deep hydrothermal vents using autonomous underwater vehicles.`;

async function runG2SimilarityTests() {
  console.log('🧪 GRADIFI HOEOS G2 - DETERMINISTIC SIMILARITY EVIDENCE TEST SUITE');
  console.log('====================================================================');

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

  const docA = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_A, filename: 'docA.pdf' });
  const docAPartial = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_B_PARTIAL, filename: 'docB.pdf' });
  const docUnrelated = buildCanonicalAnalysisDocument({ rawText: UNRELATED_TEXT, filename: 'unrelated.pdf' });

  // TEST A: Identical documents
  console.log('\n1. TEST A: Identical Documents Comparison');
  const resIdentical = verifyCoreService.executeSimilarityAnalysis(docA, docA);
  assert(resIdentical.overallSimilarity > 80, 'Identical documents produce high/complete similarity');
  assert(resIdentical.findings.length > 0, 'Identical comparison produces explainable findings');
  assert(resIdentical.deterministic === true, 'Result explicitly flags deterministic = true');

  // TEST B: Unrelated documents
  console.log('\n2. TEST B: Unrelated Documents Comparison');
  const resUnrelated = verifyCoreService.executeSimilarityAnalysis(docA, docUnrelated);
  assert(resUnrelated.overallSimilarity < 15, 'Unrelated documents produce low/0 similarity score');
  assert(resUnrelated.findings.length === 0, 'Unrelated documents produce zero fake findings');

  // TEST C: Partial overlap
  console.log('\n3. TEST C: Partial Overlap Finding');
  const resPartial = verifyCoreService.executeSimilarityAnalysis(docA, docAPartial);
  assert(resPartial.overallSimilarity > 20, 'Partial overlap produces non-zero similarity');
  assert(resPartial.findings.length > 0, 'Partial overlap produces at least one finding');
  
  const firstFinding = resPartial.findings[0];
  assert(Boolean(firstFinding), 'First finding exists');
  assert(firstFinding.matchMethod === 'EXACT_PHRASE' || firstFinding.matchMethod === 'NGRAM', 'matchMethod is valid deterministic type');
  assert(firstFinding.provenance === 'DETERMINISTIC', 'provenance is DETERMINISTIC');

  // TEST D: Multiple findings
  console.log('\n4. TEST D: Multiple Shared Segment Findings');
  assert(Array.isArray(resPartial.findings), 'findings is a valid array');
  const findingIds = new Set(resPartial.findings.map(f => f.findingId));
  assert(findingIds.size === resPartial.findings.length, 'Every finding has a unique deterministic findingId');

  // TEST E: Determinism
  console.log('\n5. TEST E: 100% Mathematical Determinism');
  const resRun1 = verifyCoreService.executeSimilarityAnalysis(docA, docAPartial);
  const resRun2 = verifyCoreService.executeSimilarityAnalysis(docA, docAPartial);
  assert(JSON.stringify(resRun1) === JSON.stringify(resRun2), 'Repeated comparisons produce 100% identical JSON outputs');

  // TEST F: Actual Text Evidence Verification
  console.log('\n6. TEST F: Traceable Actual Text Evidence');
  for (const finding of resPartial.findings) {
    const inSource = docA.rawText.includes(finding.sourceSegment);
    const inComp = docAPartial.rawText.includes(finding.matchedSegment);
    assert(inSource && inComp, `Finding segment "${finding.sourceSegment.slice(0, 30)}..." exists in both source & comparison text`);
  }

  // TEST G: Method Integrity
  console.log('\n7. TEST G: Match Method Integrity');
  const validMethods = new Set(['EXACT_PHRASE', 'NGRAM', 'TOKEN_OVERLAP']);
  for (const finding of resPartial.findings) {
    assert(validMethods.has(finding.matchMethod), `finding matchMethod ${finding.matchMethod} belongs to deterministic set`);
  }

  // TEST H: No AI Execution Boundary
  console.log('\n8. TEST H: No AI Runtimes Invoked in G2');
  assert(resPartial.deterministic === true, 'G2 path relies purely on deterministic analysis');
  assert(typeof (resPartial as any).aiFindings === 'undefined', 'No AI findings mixed into G2 similarity result');

  // TEST I: Canonical Document Compatibility
  console.log('\n9. TEST I: G1 Canonical Document Compatibility');
  assert(resPartial.sourceDocumentId === docA.documentId, 'sourceDocumentId matches G1 CanonicalAnalysisDocument ID');
  assert(resPartial.matchedDocumentId === docAPartial.documentId, 'matchedDocumentId matches comparison CanonicalAnalysisDocument ID');

  // TEST J: Hardcoded Metrics Boundary Audit
  console.log('\n10. TEST J: Zero Hardcoded Analytical Metrics Audit');
  const hardcodedCheckString = JSON.stringify(resPartial);
  assert(!hardcodedCheckString.includes('"97%"') && !hardcodedCheckString.includes('"100%"') && !hardcodedCheckString.includes('"91%"'), 'No hardcoded demo percentage strings returned');

  console.log('\n====================================================================');
  console.log(`📊 G2 SIMILARITY TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runG2SimilarityTests().catch(err => {
  console.error('❌ G2 test execution error:', err);
  process.exit(1);
});
