import { describe, expect, it } from 'vitest';
import {
  buildCanonicalAnalysisDocument,
  segmentDocument,
  computeHash
} from '../src/services/verify/documentNormalizer';
import {
  evaluateDocumentSimilarity,
  toCanonicalEvidenceText,
  analyzeDocumentEvidence
} from '../src/services/verify/deterministicEngine';

const SOURCE = [
  'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks',
  'By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)',
  'Journal of Advanced Computer Science and Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.',
  '',
  'Abstract:',
  'Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.'
].join('\n');

const COMPARISON = [
  'An Analysis of High-Order Evidence Systems in Edge Computing Topology',
  'By Prof. Elena Rostova and Dr. Aris Thorne',
  '',
  'Introduction:',
  'Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. Furthermore, mathematical determinism guarantees non-repudiation of evidence.'
].join('\n');

describe('G2 canonical evidence regression', () => {
  it('keeps finding offsets faithful to the whitespace-normalized canonical evidence text', () => {
    const source = buildCanonicalAnalysisDocument({ rawText: SOURCE, filename: 'source.txt' });
    const comparison = buildCanonicalAnalysisDocument({ rawText: COMPARISON, filename: 'comparison.txt' });
    const evidenceText = toCanonicalEvidenceText(source.rawText);
    const result = evaluateDocumentSimilarity(source, comparison);

    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(typeof finding.sourceStart).toBe('number');
      expect(typeof finding.sourceEnd).toBe('number');
      expect(evidenceText.slice(finding.sourceStart!, finding.sourceEnd!)).toBe(finding.sourceSegment);
    }
  });

  it('produces identical finding signatures across repeated executions', () => {
    const source = buildCanonicalAnalysisDocument({ rawText: SOURCE, filename: 'repeat.txt' });
    const comparison = buildCanonicalAnalysisDocument({ rawText: COMPARISON, filename: 'comparison.txt' });
    const signature = () => evaluateDocumentSimilarity(source, comparison).findings.map(f => ({
      findingId: f.findingId,
      sourceSegment: f.sourceSegment,
      matchedSegment: f.matchedSegment,
      similarityScore: f.similarityScore,
      matchMethod: f.matchMethod,
      sourceStart: f.sourceStart,
      sourceEnd: f.sourceEnd
    }));
    expect(signature()).toEqual(signature());
    expect(signature()).toEqual(signature());
  });

  it('preserves punctuation, abbreviations, DOI, and decimal boundaries deterministically', () => {
    const text = 'By Dr. Aris Thorne, Prof. Elena Rostova. See Vol. 14, DOI: 10.1038/s41586-023-00001-x. Accuracy reached 99.4%. Next sentence follows.';
    const first = segmentDocument(text, 'PUNCTUATION-DOC');
    const second = segmentDocument(text, 'PUNCTUATION-DOC');
    const sentences = first.paragraphs.flatMap(p => p.sentences).map(s => s.text);

    expect(sentences).toEqual(second.paragraphs.flatMap(p => p.sentences).map(s => s.text));
    expect(sentences.length).toBe(4);
    expect(sentences[0]).toContain('Dr. Aris Thorne');
    expect(sentences[0]).toContain('Prof. Elena Rostova');
    expect(sentences[1]).toContain('Vol. 14');
    expect(sentences[1]).toContain('10.1038/s41586-023-00001-x');
    expect(sentences[2]).toContain('99.4%');
    expect(sentences[3]).toContain('Next sentence follows.');
  });

  it('changes canonical and evidence identity after a small alteration to otherwise preserved content', () => {
    const original = buildCanonicalAnalysisDocument({ rawText: SOURCE, filename: 'original.txt' });
    const alteredText = SOURCE.replace('significant communication latency', 'substantial communication latency');
    const altered = buildCanonicalAnalysisDocument({ rawText: alteredText, filename: 'altered.txt' });

    expect(altered.normalizedText).not.toBe(original.normalizedText);
    expect(altered.documentId).not.toBe(original.documentId);

    const originalEngine = analyzeDocumentEvidence({
      documentText: original.normalizedText,
      candidateMatches: []
    });
    const alteredEngine = analyzeDocumentEvidence({
      documentText: altered.normalizedText,
      candidateMatches: []
    });
    expect(alteredEngine.documentHash).not.toBe(originalEngine.documentHash);
    expect(alteredEngine.evidenceHash).not.toBe(originalEngine.evidenceHash);

    const comparison = buildCanonicalAnalysisDocument({ rawText: COMPARISON, filename: 'comparison.txt' });
    const originalFindings = evaluateDocumentSimilarity(original, comparison).findings.map(f => f.findingId).sort();
    const alteredFindings = evaluateDocumentSimilarity(altered, comparison).findings.map(f => f.findingId).sort();
    expect(originalFindings.length).toBeGreaterThan(0);
    expect(alteredFindings).not.toEqual(originalFindings);
  });

  it('uses identical canonical evidence text for equivalent whitespace layouts', () => {
    const layoutA = 'First sentence.\n\nSecond sentence.\nThird sentence.';
    const layoutB = 'First sentence. Second sentence. Third sentence.';
    expect(toCanonicalEvidenceText(layoutA)).toBe(toCanonicalEvidenceText(layoutB));
    expect(computeHash(toCanonicalEvidenceText(layoutA))).toBe(computeHash(toCanonicalEvidenceText(layoutB)));
  });
});
