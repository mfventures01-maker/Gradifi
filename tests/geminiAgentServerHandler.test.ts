import { describe, expect, it } from 'vitest';
import {
  classifyProviderFailure,
  extractDeterministicPayload
} from '../src/services/verify/server/geminiAgentServerHandler.js';

describe('Gemini evidence agent provider classification', () => {
  it('distinguishes authentication, rate limit, timeout and provider outage', () => {
    expect(classifyProviderFailure(401)).toBe('AUTHENTICATION_FAILED');
    expect(classifyProviderFailure(403)).toBe('AUTHENTICATION_FAILED');
    expect(classifyProviderFailure(429)).toBe('RATE_LIMITED');
    expect(classifyProviderFailure(504)).toBe('TIMEOUT');
    expect(classifyProviderFailure(503)).toBe('RUNTIME_UNAVAILABLE');
    expect(classifyProviderFailure(500)).toBe('INFERENCE_FAILED');
  });

  it('recognizes an invalid API key returned as an HTTP 400 provider error', () => {
    expect(classifyProviderFailure(400, 'API_KEY_INVALID')).toBe('AUTHENTICATION_FAILED');
  });
});

describe('Gemini evidence agent receipt context', () => {
  it('exposes bounded G5 passages and source identity from the persisted deterministic envelope', () => {
    const context = extractDeterministicPayload({
      overall_similarity: 18.4,
      document_hash: 'doc-hash',
      evidence_hash: 'evidence-hash',
      engine_version: 'G5-DETERMINISTIC-v1',
      policy_version: 'POLICY-1',
      evidence_envelope: {
        deterministicResult: {
          verifiedSources: [{
            sourceId: 'SOURCE-A',
            title: 'Verified source',
            matchedText: 'Student-side matched words',
            originalSnippet: 'Source-side excerpt',
            matchPercentage: 82
          }],
          similarityAnalysis: {
            findings: [{
              findingId: 'FINDING-1',
              sourceDocumentId: 'STUDENT-DOC',
              matchedDocumentId: 'SOURCE-A',
              sourceSegment: 'Student passage',
              matchedSegment: 'Source passage',
              matchMethod: 'EXACT_PHRASE',
              similarityScore: 100
            }]
          },
          aggregation: {
            totalParagraphMatches: 1,
            totalSentenceMatches: 2,
            totalPhraseMatches: 3,
            sourceReports: []
          }
        }
      }
    });

    expect(context.similarity).toBe(18.4);
    expect(context.findings[0]).toMatchObject({
      findingId: 'FINDING-1',
      studentPassage: 'Student passage',
      sourcePassage: 'Source passage',
      matchedSegment: 'Source passage',
      matchedDocumentId: 'SOURCE-A',
      matchMethod: 'EXACT_PHRASE',
      similarityScore: 100
    });
    expect(context.sources[0]).toMatchObject({
      sourceId: 'SOURCE-A',
      title: 'Verified source',
      matchedText: 'Student-side matched words',
      sourceExcerpt: 'Source-side excerpt'
    });
    expect(context).not.toHaveProperty('receiptMutation');
    expect(context).not.toHaveProperty('setOverallSimilarity');
    expect(context).not.toHaveProperty('updateEvidenceHash');
  });
});
