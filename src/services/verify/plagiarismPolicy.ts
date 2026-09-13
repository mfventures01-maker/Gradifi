/**
 * GRADIFI VERIFY - PLAGIARISM EVIDENCE & POLICY LAYER
 * Deterministic evidence policy classification operating on G2 similarity evidence.
 * HOEOS G3 Standard: ZERO AI dependency, ZERO Math.random(), 100% reproducible.
 */

import {
  SimilarityAnalysisResult,
  PlagiarismEvidenceResult,
  PlagiarismEvidenceFinding,
  PlagiarismRiskLevel
} from './types';
import { computeHash } from './documentNormalizer';

export const PLAGIARISM_POLICY_VERSION = 'G3-POLICY-v1';

/**
 * Evaluates plagiarism risk classification deterministically from G2 similarity evidence.
 * HOEOS Invariant: SIMILARITY != PLAGIARISM. Plagiarism is an evidence policy classification.
 */
export function evaluatePlagiarismEvidence(
  similarityResult: SimilarityAnalysisResult
): PlagiarismEvidenceResult {
  const warnings: string[] = [...(similarityResult.warnings || [])];
  const g2Findings = similarityResult.findings || [];

  let exactPhraseCount = 0;
  let ngramFindingCount = 0;
  let tokenOverlapFindingCount = 0;

  const g3Findings: PlagiarismEvidenceFinding[] = [];

  for (const f of g2Findings) {
    if (f.matchMethod === 'EXACT_PHRASE') {
      exactPhraseCount++;
    } else if (f.matchMethod === 'NGRAM') {
      ngramFindingCount++;
    } else if (f.matchMethod === 'TOKEN_OVERLAP') {
      tokenOverlapFindingCount++;
    }

    // Policy significance assignment based on deterministic evidence type
    let policySignificance: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (f.matchMethod === 'EXACT_PHRASE') {
      policySignificance = 'HIGH';
    } else if (f.matchMethod === 'NGRAM' && f.similarityScore >= 50) {
      policySignificance = 'MODERATE';
    } else if (f.similarityScore >= 75) {
      policySignificance = 'HIGH';
    }

    const findingId = computeHash(`${PLAGIARISM_POLICY_VERSION}:${f.findingId}`);

    g3Findings.push({
      findingId,
      similarityFindingId: f.findingId,
      sourceDocumentId: f.sourceDocumentId,
      matchedDocumentId: f.matchedDocumentId,
      sourceSegment: f.sourceSegment,
      matchedSegment: f.matchedSegment,
      similarityScore: f.similarityScore,
      evidenceType: f.matchMethod,
      policySignificance,
      provenance: 'DETERMINISTIC'
    });
  }

  // Deterministic sorting of findings: Significance -> Score -> ID
  const sigOrder = { HIGH: 3, MODERATE: 2, LOW: 1 };
  g3Findings.sort((a, b) => {
    if (sigOrder[b.policySignificance] !== sigOrder[a.policySignificance]) {
      return sigOrder[b.policySignificance] - sigOrder[a.policySignificance];
    }
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return a.findingId.localeCompare(b.findingId);
  });

  const overall = similarityResult.overallSimilarity;
  const evidenceCount = g3Findings.length;

  // Determine Risk Level deterministically from evidence nature & scores
  let riskLevel: PlagiarismRiskLevel = 'NO_EVIDENCE';

  if (evidenceCount === 0) {
    riskLevel = 'NO_EVIDENCE';
  } else if (overall >= 70 || exactPhraseCount >= 4) {
    riskLevel = 'CRITICAL';
  } else if (overall >= 35 || exactPhraseCount >= 2) {
    riskLevel = 'HIGH';
  } else if (overall >= 15 || exactPhraseCount >= 1 || ngramFindingCount >= 3) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  const requiresHumanReview = riskLevel !== 'NO_EVIDENCE';

  return {
    analysisType: 'PLAGIARISM_EVIDENCE',
    sourceDocumentId: similarityResult.sourceDocumentId,
    matchedDocumentId: similarityResult.matchedDocumentId,
    similarityResult,
    riskLevel,
    evidenceCount,
    exactPhraseCount,
    ngramFindingCount,
    tokenOverlapFindingCount,
    evidenceCoveragePercent: Math.min(100, overall),
    findings: g3Findings,
    policyVersion: PLAGIARISM_POLICY_VERSION,
    deterministic: true,
    requiresHumanReview,
    warnings
  };
}
