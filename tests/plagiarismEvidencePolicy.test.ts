/**
 * GRADIFI HOEOS G3 - PLAGIARISM EVIDENCE & POLICY TEST SUITE
 * Verifies risk classification levels, evidence counting, traceability to G2 findings,
 * 100% mathematical determinism, AI firewall isolation, policy versioning, and G1/G2 regressions.
 */

import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { evaluatePlagiarismEvidence, PLAGIARISM_POLICY_VERSION } from '../src/services/verify/plagiarismPolicy';
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

async function runG3PolicyTests() {
  console.log('🧪 GRADIFI HOEOS G3 - PLAGIARISM EVIDENCE & POLICY TEST SUITE');
  console.log('================================================================');

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
  const docB = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_B_PARTIAL, filename: 'docB.pdf' });

  // TEST A: No similarity findings -> NO_EVIDENCE
  console.log('\n1. TEST A: No Similarity Findings Boundary');
  const emptyG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: docA.documentId,
    overallSimilarity: 0,
    findings: [],
    engineVersion: '1.0.0',
    policyVersion: '2026.09',
    deterministic: true,
    warnings: []
  };

  const g3Empty = evaluatePlagiarismEvidence(emptyG2Result);
  assert(g3Empty.riskLevel === 'NO_EVIDENCE', '0 G2 findings produces NO_EVIDENCE risk level');
  assert(g3Empty.requiresHumanReview === false, 'NO_EVIDENCE requiresHumanReview is false');
  assert(g3Empty.findings.length === 0, '0 G2 findings produces 0 G3 findings');

  // TEST B: Weak isolated overlap -> LOW risk level
  console.log('\n2. TEST B: Weak Isolated Overlap Risk Level');
  const weakG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: docA.documentId,
    overallSimilarity: 8,
    findings: [
      {
        findingId: 'f1',
        sourceDocumentId: docA.documentId,
        matchedDocumentId: 'doc_other',
        sourceSegment: 'security challenges',
        matchedSegment: 'security challenges',
        similarityScore: 12,
        matchMethod: 'TOKEN_OVERLAP',
        provenance: 'DETERMINISTIC'
      }
    ],
    engineVersion: '1.0.0',
    policyVersion: '2026.09',
    deterministic: true,
    warnings: []
  };

  const g3Weak = evaluatePlagiarismEvidence(weakG2Result);
  assert(g3Weak.riskLevel === 'LOW', 'Low similarity with token overlap produces LOW risk level');
  assert(g3Weak.requiresHumanReview === true, 'LOW risk level flags requiresHumanReview = true');

  // TEST C: Meaningful multiple overlap -> MODERATE risk level
  console.log('\n3. TEST C: Moderate Evidence Overlap Risk Level');
  const modG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: docA.documentId,
    overallSimilarity: 25,
    findings: [
      {
        findingId: 'f1',
        sourceDocumentId: docA.documentId,
        matchedDocumentId: 'doc_other',
        sourceSegment: 'Federated learning across decoupled edge networks faces significant communication latency and security challenges.',
        matchedSegment: 'Federated learning across decoupled edge networks faces significant communication latency and security challenges.',
        similarityScore: 100,
        matchMethod: 'EXACT_PHRASE',
        provenance: 'DETERMINISTIC'
      }
    ],
    engineVersion: '1.0.0',
    policyVersion: '2026.09',
    deterministic: true,
    warnings: []
  };

  const g3Mod = evaluatePlagiarismEvidence(modG2Result);
  assert(g3Mod.riskLevel === 'MODERATE', '1 exact phrase match with ~25% similarity produces MODERATE risk level');

  // TEST D: Strong exact phrase evidence -> HIGH risk level
  console.log('\n4. TEST D: High Evidence Overlap Risk Level');
  const highG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: docA.documentId,
    overallSimilarity: 55,
    findings: [
      {
        findingId: 'f1',
        sourceDocumentId: docA.documentId,
        matchedDocumentId: 'doc_other',
        sourceSegment: 'Federated learning across decoupled edge networks faces significant communication latency and security challenges.',
        matchedSegment: 'Federated learning across decoupled edge networks faces significant communication latency and security challenges.',
        similarityScore: 100,
        matchMethod: 'EXACT_PHRASE',
        provenance: 'DETERMINISTIC'
      },
      {
        findingId: 'f2',
        sourceDocumentId: docA.documentId,
        matchedDocumentId: 'doc_other',
        sourceSegment: 'In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems.',
        matchedSegment: 'In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems.',
        similarityScore: 100,
        matchMethod: 'EXACT_PHRASE',
        provenance: 'DETERMINISTIC'
      }
    ],
    engineVersion: '1.0.0',
    policyVersion: '2026.09',
    deterministic: true,
    warnings: []
  };

  const g3High = evaluatePlagiarismEvidence(highG2Result);
  assert(g3High.riskLevel === 'HIGH', 'Multiple exact phrases with >35% similarity produces HIGH risk level');

  // TEST E: Near-total / complete overlap -> CRITICAL risk level
  console.log('\n5. TEST E: Critical Evidence Overlap Risk Level');
  const critG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: docA.documentId,
    overallSimilarity: 85,
    findings: Array.from({ length: 5 }, (_, i) => ({
      findingId: `f_${i}`,
      sourceDocumentId: docA.documentId,
      matchedDocumentId: 'doc_other',
      sourceSegment: `Exact sentence match segment ${i} in academic document payload`,
      matchedSegment: `Exact sentence match segment ${i} in academic document payload`,
      similarityScore: 100,
      matchMethod: 'EXACT_PHRASE' as const,
      provenance: 'DETERMINISTIC' as const
    })),
    engineVersion: '1.0.0',
    policyVersion: '2026.09',
    deterministic: true,
    warnings: []
  };

  const g3Crit = evaluatePlagiarismEvidence(critG2Result);
  assert(g3Crit.riskLevel === 'CRITICAL', '85% similarity with 5 exact phrases produces CRITICAL risk level');

  // TEST F: Multiple evidence types counting
  console.log('\n6. TEST F: Multiple Evidence Types Breakdown');
  assert(g3Crit.exactPhraseCount === 5, 'exactPhraseCount === 5');
  assert(g3Weak.tokenOverlapFindingCount === 1, 'tokenOverlapFindingCount === 1');

  // TEST G: Traceability to G2 findings
  console.log('\n7. TEST G: Traceability to G2 Findings');
  const g2Real = verifyCoreService.executeSimilarityAnalysis(docA, docB);
  const g3Real = evaluatePlagiarismEvidence(g2Real);
  
  for (const g3f of g3Real.findings) {
    const orig = g2Real.findings.find(f => f.findingId === g3f.similarityFindingId);
    assert(Boolean(orig), `G3 finding ${g3f.findingId} traces to real G2 similarityFindingId ${g3f.similarityFindingId}`);
  }

  // TEST H: Actual Text Preservation
  console.log('\n8. TEST H: Actual Text Segment Preservation');
  for (const g3f of g3Real.findings) {
    const orig = g2Real.findings.find(f => f.findingId === g3f.similarityFindingId);
    assert(g3f.sourceSegment === orig?.sourceSegment, 'sourceSegment text is preserved 100% unchanged');
    assert(g3f.matchedSegment === orig?.matchedSegment, 'matchedSegment text is preserved 100% unchanged');
  }

  // TEST I: Deterministic Repeatability
  console.log('\n9. TEST I: Deterministic Repeatability');
  const run1 = evaluatePlagiarismEvidence(g2Real);
  const run2 = evaluatePlagiarismEvidence(g2Real);
  assert(JSON.stringify(run1) === JSON.stringify(run2), 'Repeated G3 policy evaluations produce byte-identical JSON output');

  // TEST J: AI Firewall Isolation
  console.log('\n10. TEST J: AI Firewall Isolation Boundary');
  assert(g3Real.deterministic === true, 'G3 result flags deterministic = true');
  assert(typeof (g3Real as any).aiFindings === 'undefined', 'No AI findings mixed into G3 policy calculation');

  // TEST K: Policy Versioning
  console.log('\n11. TEST K: Explicit Policy Versioning');
  assert(g3Real.policyVersion === PLAGIARISM_POLICY_VERSION, `policyVersion strictly equals ${PLAGIARISM_POLICY_VERSION}`);

  // TEST L: No Fabricated Evidence
  console.log('\n12. TEST L: Zero Fabricated Evidence');
  assert(g3Empty.findings.length === 0, 'Empty G2 result produces 0 G3 findings');

  console.log('\n================================================================');
  console.log(`📊 G3 POLICY TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runG3PolicyTests().catch(err => {
  console.error('❌ G3 test execution error:', err);
  process.exit(1);
});
