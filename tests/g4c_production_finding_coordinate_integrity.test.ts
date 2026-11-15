import { describe, expect, it } from 'vitest';
import {
  analyzeDocumentEvidence,
  extractSimilarityFindingsFromEvidenceMatches,
  toCanonicalEvidenceText
} from '../src/services/verify/deterministicEngine';

const submitted = [
  'Opening material is unrelated.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Closing material is unrelated.'
].join('\r\n\r\n');

const providerSnippet = 'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.';

const providerMatch = {
  sourceId: 'provider-record-17',
  title: 'Coastal Monitoring Study',
  authors: ['Research Group'],
  url: 'https://example.invalid/study',
  matchedText: providerSnippet,
  originalSnippet: providerSnippet,
  matchType: 'exact',
  matchPercentage: 100,
  relevanceScore: 1,
  provenance: {
    provider: 'openalex',
    providerRecordId: 'provider-record-17',
    retrievedAt: '2026-01-01T00:00:00.000Z',
    sourceType: 'article',
    sourceUrl: 'https://example.invalid/study',
    title: 'Coastal Monitoring Study',
    authors: ['Research Group'],
    provenanceState: 'VERIFIED'
  }
};

describe('G4-C production finding coordinate integrity', () => {
  it('verifies provider-path submitted offsets and withholds full-source offsets for snippets', () => {
    const engine = analyzeDocumentEvidence({
      documentText: submitted,
      candidateMatches: [providerMatch],
      engineVersion: 'G4C-TEST',
      policyVersion: 'G4C-TEST'
    });
    const warnings: string[] = [];
    const findings = extractSimilarityFindingsFromEvidenceMatches(
      submitted,
      'submitted-doc-g4c',
      engine.verifiedMatches,
      engine.aggregation,
      warnings
    );
    const canonical = toCanonicalEvidenceText(submitted);

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.offsetBasis).toBe('CANONICAL_EVIDENCE_TEXT_UTF16');
      expect(finding.sourceStart).toBeDefined();
      expect(finding.sourceEnd).toBeDefined();
      expect(canonical.slice(finding.sourceStart!, finding.sourceEnd!)).toBe(finding.sourceSegment);
      expect(finding.matchedStart).toBeUndefined();
      expect(finding.matchedEnd).toBeUndefined();
    }
  });

  it('verifies fallback-path offsets against canonical submitted text after CRLF and whitespace normalization', () => {
    const warnings: string[] = [];
    const findings = extractSimilarityFindingsFromEvidenceMatches(
      submitted,
      'submitted-doc-fallback',
      [providerMatch],
      undefined,
      warnings
    );
    const canonical = toCanonicalEvidenceText(submitted);

    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding.offsetBasis).toBe('CANONICAL_EVIDENCE_TEXT_UTF16');
    expect(finding.sourceStart).toBeDefined();
    expect(finding.sourceEnd).toBeDefined();
    expect(canonical.slice(finding.sourceStart!, finding.sourceEnd!)).toBe(finding.sourceSegment);
    expect(finding.matchedSegment).toBe(providerSnippet);
    expect(finding.matchedStart).toBeUndefined();
    expect(finding.matchedEnd).toBeUndefined();
  });

  it('suppresses unrelated provider text without fabricating offsets or a finding', () => {
    const warnings: string[] = [];
    const unrelated = { ...providerMatch, matchedText: 'Quantum devices measure superconducting phase transitions.', originalSnippet: 'Quantum devices measure superconducting phase transitions.' };
    const findings = extractSimilarityFindingsFromEvidenceMatches(
      submitted,
      'submitted-doc-negative',
      [unrelated],
      undefined,
      warnings
    );
    expect(findings).toHaveLength(0);
    expect(warnings.some(w => w.includes('could not be located'))).toBe(true);
  });

  it('keeps repeated fallback extraction stable', () => {
    const first = extractSimilarityFindingsFromEvidenceMatches(submitted, 'stable-doc', [providerMatch]);
    const second = extractSimilarityFindingsFromEvidenceMatches(submitted, 'stable-doc', [providerMatch]);
    expect(first).toEqual(second);
  });
});
