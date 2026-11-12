import { describe, expect, it } from 'vitest';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

/**
 * G3 deterministic forensic E2E:
 * student submission -> G2 deterministic similarity -> G3 policy classification.
 * No provider, network, AI, clock, or random-number dependency is permitted.
 */
const SOURCE_ID = 'SOURCE-A';
const sourceText = [
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Researchers publish the calibrated observations with transparent methods and reproducible measurement records.'
].join(' ');

const studentText = [
  'Community gardens improve access to fresh produce in dense urban neighbourhoods.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Coastal monitoring networks record temperature changes using distributed acoustic sensors and preserve observations inside a verified evidence ledger.',
  'Local volunteers maintain planting schedules throughout the year.'
].join(' ');

const unrelatedText = [
  'Community gardens improve access to fresh produce in dense urban neighbourhoods.',
  'Local volunteers maintain planting schedules throughout the year.',
  'Public parks provide recreational space for families and visitors.'
].join(' ');

function runG3(student: string, source: string) {
  const studentDoc = buildCanonicalAnalysisDocument({
    rawText: student,
    title: 'STUDENT-A',
    filename: 'student-a.txt'
  });
  const sourceDoc = buildCanonicalAnalysisDocument({
    rawText: source,
    title: SOURCE_ID,
    filename: 'source-a.txt'
  });

  // The first argument is the submitted/student document. The second is the
  // comparison/source document, matching evaluateDocumentSimilarityInternal.
  const similarity = verifyCoreService.executeGranularSimilarityAnalysis(studentDoc, sourceDoc);
  const policy = verifyCoreService.executePlagiarismPolicy(similarity);
  return { studentDoc, sourceDoc, similarity, policy };
}

describe('G3 deterministic forensic interrogation', () => {
  it('detects exact copied text and modified overlap with traceable student spans', () => {
    const result = runG3(studentText, sourceText);
    const { similarity, policy, studentDoc, sourceDoc } = result;

    expect(similarity.deterministic).toBe(true);
    expect(similarity.overallSimilarity).toBeGreaterThan(0);
    expect(similarity.findings.length).toBeGreaterThan(0);
    expect(policy.deterministic).toBe(true);
    expect(policy.evidenceCount).toBe(similarity.findings.length);
    expect(policy.requiresHumanReview).toBe(true);
    expect(policy.riskLevel).not.toBe('NO_EVIDENCE');
    expect(policy.findings.every(f => f.provenance === 'DETERMINISTIC')).toBe(true);
    expect(policy.findings.every(f => f.matchedDocumentId === sourceDoc.documentId)).toBe(true);

    const exact = similarity.findings.find(f => f.matchMethod === 'EXACT_PHRASE');
    expect(exact).toBeDefined();
    expect(studentDoc.rawText.slice(exact!.sourceStart, exact!.sourceEnd)).toBe(exact!.sourceSegment);
    expect(studentDoc.rawText.includes(exact!.sourceSegment)).toBe(true);
    expect(sourceDoc.rawText.includes(exact!.matchedSegment)).toBe(true);
    expect(exact!.matchedDocumentId).toBe(sourceDoc.documentId);

    const ngramOrLexical = similarity.findings.find(f => f.matchMethod === 'NGRAM' || f.matchMethod === 'TOKEN_OVERLAP');
    expect(ngramOrLexical).toBeDefined();
    expect(policy.findings.some(f => f.similarityFindingId === ngramOrLexical!.findingId)).toBe(true);
  });

  it('returns no plagiarism evidence for an unrelated negative control', () => {
    const result = runG3(unrelatedText, sourceText);
    expect(result.similarity.overallSimilarity).toBe(0);
    expect(result.similarity.findings).toHaveLength(0);
    expect(result.policy.evidenceCount).toBe(0);
    expect(result.policy.riskLevel).toBe('NO_EVIDENCE');
    expect(result.policy.requiresHumanReview).toBe(false);
  });

  it('repeats identical evidence IDs, spans, scores and policy verdicts', () => {
    const first = runG3(studentText, sourceText);
    const second = runG3(studentText, sourceText);

    const signature = (r: ReturnType<typeof runG3>) => ({
      studentDocumentId: r.studentDoc.documentId,
      sourceDocumentId: r.sourceDoc.documentId,
      overallSimilarity: r.similarity.overallSimilarity,
      findings: r.similarity.findings.map(f => ({
        findingId: f.findingId,
        matchedDocumentId: f.matchedDocumentId,
        sourceSegment: f.sourceSegment,
        matchedSegment: f.matchedSegment,
        similarityScore: f.similarityScore,
        matchMethod: f.matchMethod,
        sourceStart: f.sourceStart,
        sourceEnd: f.sourceEnd
      })),
      policy: {
        riskLevel: r.policy.riskLevel,
        evidenceCount: r.policy.evidenceCount,
        exactPhraseCount: r.policy.exactPhraseCount,
        ngramFindingCount: r.policy.ngramFindingCount,
        tokenOverlapFindingCount: r.policy.tokenOverlapFindingCount,
        findings: r.policy.findings.map(f => ({
          findingId: f.findingId,
          similarityFindingId: f.similarityFindingId,
          policySignificance: f.policySignificance
        }))
      }
    });

    expect(signature(first)).toEqual(signature(second));
  });

  it('changes canonical identity when submitted content is altered', () => {
    const baseline = runG3(studentText, sourceText);
    const altered = runG3(studentText.replace('community gardens', 'community farms'), sourceText);
    expect(altered.studentDoc.documentId).not.toBe(baseline.studentDoc.documentId);
  });
});
