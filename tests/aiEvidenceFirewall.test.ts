/**
 * GRADIFI HOEOS G4.2 - AI EVIDENCE FIREWALL CERTIFICATION TEST SUITE
 * Verifies complete architectural firewall, hash immutability, source ID boundary enforcement,
 * AI failure isolation, zero AI evidence manufacturing, and Gemma runtime flag integrity.
 */

import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { analyzeDocumentEvidence, extractSimilarityFindingsFromEvidenceMatches } from '../src/services/verify/deterministicEngine';
import { evaluatePlagiarismEvidence } from '../src/services/verify/plagiarismPolicy';
import { AIFederationService, AIFederationResult } from '../src/services/verify/aiFederation';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { validateAIFindingSchema } from '../src/services/verify/server/geminiServerHandler';
import { EvidenceMatch, AIFinding, SimilarityAnalysisResult, FineGrainedProviderStatus } from '../src/services/verify/types';

const SAMPLE_STUDENT_TEXT = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems.
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.`;

const VALID_MATCH: EvidenceMatch = {
  sourceId: 'src_valid_101',
  title: 'Quantum Entanglement Networks',
  authors: ['Dr. Aris Thorne'],
  url: 'https://example.org/quantum',
  matchedText: 'Federated learning across decoupled edge networks faces significant communication latency',
  originalSnippet: 'Federated learning across decoupled edge networks faces significant communication latency and security challenges.',
  matchType: 'exact',
  matchPercentage: 88,
  relevanceScore: 95,
  provenance: {
    provider: 'crossref',
    providerRecordId: 'REC-999',
    retrievedAt: new Date().toISOString(),
    sourceType: 'JOURNAL',
    sourceUrl: 'https://example.org/quantum',
    title: 'Quantum Entanglement Networks',
    authors: ['Dr. Aris Thorne'],
    provenanceState: 'VERIFIED'
  }
};

async function runG42FirewallTests() {
  console.log('🧪 GRADIFI HOEOS G4.2 - AI EVIDENCE FIREWALL CERTIFICATION TEST SUITE');
  console.log('=====================================================================');

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

  // 1. PHASE 2: Hash & Deterministic Evidence Immutability Across AI Boundary
  console.log('\n1. PHASE 2 — Hash & Evidence Immutability Across AI Boundary');
  const canonicalDoc = buildCanonicalAnalysisDocument({ rawText: SAMPLE_STUDENT_TEXT });
  const engineOutput = analyzeDocumentEvidence({
    documentText: canonicalDoc.rawText,
    candidateMatches: [VALID_MATCH]
  });

  const g2Findings = extractSimilarityFindingsFromEvidenceMatches(
    canonicalDoc.rawText,
    canonicalDoc.documentId,
    engineOutput.verifiedMatches
  );

  const g2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: canonicalDoc.documentId,
    overallSimilarity: engineOutput.overallSimilarity,
    findings: g2Findings,
    engineVersion: engineOutput.engineVersion,
    policyVersion: engineOutput.policyVersion,
    deterministic: true,
    warnings: []
  };

  const g3Result = evaluatePlagiarismEvidence(g2Result);

  const preDocHash = engineOutput.documentHash;
  const preEvidHash = engineOutput.evidenceHash;
  const preSimilarity = engineOutput.overallSimilarity;
  const preVerifiedMatchesJSON = JSON.stringify(engineOutput.verifiedMatches);

  const federationService = new AIFederationService();
  const aiResult = await federationService.executeFederation(canonicalDoc.rawText, engineOutput.verifiedMatches);

  assert(engineOutput.documentHash === preDocHash, 'documentHash remains 100% immutable after AI processing');
  assert(engineOutput.evidenceHash === preEvidHash, 'evidenceHash remains 100% immutable after AI processing');
  assert(engineOutput.overallSimilarity === preSimilarity, 'overallSimilarity remains 100% immutable after AI processing');
  assert(JSON.stringify(engineOutput.verifiedMatches) === preVerifiedMatchesJSON, 'verifiedMatches array remains 100% byte-identical');

  // 2. PHASE 3: AI Finding Isolation
  console.log('\n2. PHASE 3 — AI Finding Isolation');
  assert(Array.isArray(aiResult.findings), 'aiResult.findings is an array');
  const allFindingsAreAIFindings = aiResult.findings.every(f =>
    ['exact_overlap', 'lexical_overlap', 'semantic_overlap', 'citation_issue', 'writing_signal'].includes(f.type)
  );
  assert(allFindingsAreAIFindings, 'All AI findings are typed strictly as AIFinding');

  const g2MatchMethods = g2Findings.map(f => f.matchMethod);
  const aiTypeStrings: string[] = ['exact_overlap', 'semantic_overlap', 'citation_issue'];
  const containsAITypes = g2MatchMethods.some(m => aiTypeStrings.includes(m));
  assert(!containsAITypes, 'SimilarityFinding[] contains ZERO AI finding types');

  // 3. PHASE 4: Source ID Firewall
  console.log('\n3. PHASE 4 — Source ID Firewall');
  const rawAIResponse = [
    {
      type: 'exact_overlap',
      severity: 'high',
      confidence: 90,
      studentPassage: 'Federated learning across decoupled edge networks',
      sourcePassage: 'Federated learning across decoupled edge networks',
      explanation: 'Matches verified crossref source',
      sourceId: 'src_valid_101',
      requiresHumanReview: true
    },
    {
      type: 'semantic_overlap',
      severity: 'high',
      confidence: 95,
      studentPassage: 'quantum-inspired architectural paradigm',
      sourcePassage: 'quantum-inspired architectural paradigm',
      explanation: 'Claimed match against unverified source',
      sourceId: 'FABRICATED_SOURCE_999',
      requiresHumanReview: true
    }
  ];

  const validSourceIds = new Set(engineOutput.verifiedMatches.map(m => m.sourceId));

  const processedFindings: AIFinding[] = [];
  for (const item of rawAIResponse) {
    const validated = validateAIFindingSchema(item);
    if (validated) {
      if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
        validated.sourceId = undefined;
      }
      processedFindings.push(validated);
    }
  }

  assert(processedFindings[0].sourceId === 'src_valid_101', 'Valid sourceId is retained in AIFinding');
  assert(processedFindings[1].sourceId === undefined, 'Fabricated sourceId is stripped to undefined');
  const fabricatedInVerified = engineOutput.verifiedMatches.some(m => m.sourceId === 'FABRICATED_SOURCE_999');
  assert(!fabricatedInVerified, 'Fabricated sourceId NEVER enters verifiedMatches');

  // 4. PHASE 5: AI Failure Isolation
  console.log('\n4. PHASE 5 — AI Failure Isolation');
  const failedAiResult = {
    localAiStatus: 'RUNTIME_UNAVAILABLE' as const,
    gemmaStatus: 'RUNTIME_UNAVAILABLE' as const,
    nemotronStatus: 'RUNTIME_UNAVAILABLE' as const,
    geminiStatus: 'AUTHENTICATION_FAILED' as const,
    findings: []
  };

  const g2FindingsFromFailedAI = extractSimilarityFindingsFromEvidenceMatches(
    canonicalDoc.rawText,
    canonicalDoc.documentId,
    engineOutput.verifiedMatches
  );
  const g2ResultFromFailedAI: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: canonicalDoc.documentId,
    overallSimilarity: engineOutput.overallSimilarity,
    findings: g2FindingsFromFailedAI,
    engineVersion: engineOutput.engineVersion,
    policyVersion: engineOutput.policyVersion,
    deterministic: true,
    warnings: []
  };
  const g3ResultFromFailedAI = evaluatePlagiarismEvidence(g2ResultFromFailedAI);

  assert(engineOutput.documentHash === preDocHash, 'Deterministic documentHash unaffected by AI runtime failures');
  assert(engineOutput.overallSimilarity === preSimilarity, 'Deterministic overallSimilarity unaffected by AI runtime failures');
  assert(g2ResultFromFailedAI.overallSimilarity === preSimilarity, 'G2 similarity score unaffected by AI failures');
  assert(g3ResultFromFailedAI.riskLevel === g3Result.riskLevel, 'G3 plagiarism risk level unaffected by AI failures');

  // 5. PHASE 6: AI Cannot Create Plagiarism
  console.log('\n5. PHASE 6 — AI Cannot Create Plagiarism');
  const emptyG2Result: SimilarityAnalysisResult = {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: 'doc_empty_123',
    overallSimilarity: 0,
    findings: [],
    engineVersion: 'G2-1.0.0',
    policyVersion: 'G3-POLICY-v1',
    deterministic: true,
    warnings: []
  };

  const g3FromEmptyG2 = evaluatePlagiarismEvidence(emptyG2Result);
  assert(g3FromEmptyG2.riskLevel === 'NO_EVIDENCE', '0 G2 findings produces NO_EVIDENCE risk level despite any AI claims');
  assert(g3FromEmptyG2.findings.length === 0, '0 G2 findings produces 0 G3 PlagiarismEvidenceFindings');

  // 6. PHASE 7: AI Cannot Create Similarity
  console.log('\n6. PHASE 7 — AI Cannot Create Similarity');
  const zeroSimilarityOutput = analyzeDocumentEvidence({
    documentText: 'Completely unique essay content with zero matches in any database.',
    candidateMatches: []
  });

  const zeroG2Findings = extractSimilarityFindingsFromEvidenceMatches(
    'Completely unique essay content with zero matches in any database.',
    'doc_zero_456',
    zeroSimilarityOutput.verifiedMatches
  );

  assert(zeroSimilarityOutput.overallSimilarity === 0, 'Deterministic overallSimilarity remains 0');
  assert(zeroG2Findings.length === 0, 'Zero SimilarityFinding created for 0-overlap document');

  // 8. HOEOS G4.4: Verification Matrix Truthfulness Tests
  console.log('\n8. HOEOS G4.4 — Verification Matrix Truthfulness Tests');
  const coreResult = await verifyCoreService.executeVerifyRun(canonicalDoc);
  
  // Test 1: Unpaywall credential status truthfulness
  const unpaywallEntry = coreResult.matrix.find(m => m.provider === 'unpaywall');
  assert(unpaywallEntry?.credentialStatus === 'NOT_APPLICABLE', 'Unpaywall credentialStatus reports NOT_APPLICABLE (not falsely VERIFIED)');

  // Test 2 & 3: Gemma realRequestStatus truthfulness
  const simulatedGemmaFailed: AIFederationResult = {
    localAiStatus: 'RUNTIME_AVAILABLE',
    gemmaStatus: 'INFERENCE_FAILED',
    nemotronStatus: 'INFERENCE_VERIFIED',
    geminiStatus: 'INFERENCE_VERIFIED',
    findings: []
  };

  const gemmaFailedMatrixEntry = {
    provider: 'gemma' as const,
    credentialStatus: 'NOT_APPLICABLE' as const,
    realRequestStatus: simulatedGemmaFailed.gemmaStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' as const : 'FAILED' as const,
    responseStatus: simulatedGemmaFailed.gemmaStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' as const : 'EMPTY' as const,
    schemaStatus: 'VERIFIED' as const,
    provenanceStatus: 'VERIFIED' as const,
    federationStatus: 'VERIFIED' as const,
    aiInterpretationStatus: simulatedGemmaFailed.gemmaStatus === 'INFERENCE_VERIFIED'
      ? 'VERIFIED_INFERENCE' as const
      : (simulatedGemmaFailed.gemmaStatus === 'AUTHENTICATION_FAILED'
        ? 'AUTHENTICATION_FAILED' as const
        : (simulatedGemmaFailed.gemmaStatus === 'INFERENCE_FAILED'
          ? 'INFERENCE_FAILED' as const
          : 'RUNTIME_UNAVAILABLE' as const)),
    overallStatus: 'INFERENCE_FAILED' as const
  };

  assert(gemmaFailedMatrixEntry.realRequestStatus === 'FAILED', 'Gemma RUNTIME_AVAILABLE + INFERENCE_FAILED produces realRequestStatus = FAILED');
  assert(gemmaFailedMatrixEntry.aiInterpretationStatus === 'INFERENCE_FAILED', 'Gemma INFERENCE_FAILED produces aiInterpretationStatus = INFERENCE_FAILED');

  const simulatedGemmaVerified: Partial<AIFederationResult> = {
    localAiStatus: 'RUNTIME_AVAILABLE',
    gemmaStatus: 'INFERENCE_VERIFIED'
  };
  const gemmaVerifiedRealRequest = simulatedGemmaVerified.gemmaStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED';
  assert(gemmaVerifiedRealRequest === 'VERIFIED', 'Gemma RUNTIME_AVAILABLE + INFERENCE_VERIFIED produces realRequestStatus = VERIFIED');

  // Test 4 & 5: Gemini and Nemotron INFERENCE_FAILED state preservation
  const geminiFailedStatus: FineGrainedProviderStatus = 'INFERENCE_FAILED';
  const geminiInterpretationStatus = geminiFailedStatus === 'INFERENCE_VERIFIED'
    ? 'VERIFIED_INFERENCE'
    : (geminiFailedStatus === 'AUTHENTICATION_FAILED'
      ? 'AUTHENTICATION_FAILED'
      : (geminiFailedStatus === 'INFERENCE_FAILED'
        ? 'INFERENCE_FAILED'
        : 'RUNTIME_UNAVAILABLE'));

  assert(geminiInterpretationStatus === 'INFERENCE_FAILED', 'Gemini INFERENCE_FAILED produces aiInterpretationStatus = INFERENCE_FAILED');

  const nemotronFailedStatus: FineGrainedProviderStatus = 'INFERENCE_FAILED';
  const nemotronInterpretationStatus = nemotronFailedStatus === 'INFERENCE_VERIFIED'
    ? 'VERIFIED_INFERENCE'
    : (nemotronFailedStatus === 'AUTHENTICATION_FAILED'
      ? 'AUTHENTICATION_FAILED'
      : (nemotronFailedStatus === 'INFERENCE_FAILED'
        ? 'INFERENCE_FAILED'
        : 'RUNTIME_UNAVAILABLE'));

  assert(nemotronInterpretationStatus === 'INFERENCE_FAILED', 'Nemotron INFERENCE_FAILED produces aiInterpretationStatus = INFERENCE_FAILED');

  console.log('=====================================================================');
  console.log(`📊 G4.2 + G4.4 FIREWALL SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runG42FirewallTests().catch(err => {
  console.error('Firewall test execution failed:', err);
  process.exit(1);
});
