import { describe, expect, it } from 'vitest';
import {
  segmentDocument,
  tokenize,
} from '../src/services/verify/documentNormalizer';

const FORENSIC_TEXT = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.`;

function getSentences(text: string) {
  return segmentDocument(text, 'FORENSIC').paragraphs.flatMap(p => p.sentences);
}

describe('G2 canonical punctuation and segmentation contract', () => {
  // =================================================
  // LEGACY MATRIX (L1-L8) - unchanged from G5-M01
  // ================================================

  it('L1 preserves DOI decimal punctuation', () => {
    const sentences = getSentences('The DOI is 10.1038/s41586-023-00001-x.');
    expect(sentences.some(s => s.text.includes('10.1038/s41586-023-00001-x'))).toBe(true);
  });

  it('L2 preserves percentage decimal punctuation', () => {
    const sentences = getSentences(
      'The model achieves 99.4% accuracy across the dataset.'
    );
    expect(sentences.some(s => s.text.includes('99.4%'))).toBe(true);
  });

  it('L3 does not treat Dr. as a sentence boundary', () => {
    const sentences = getSentences('By Dr. Aris Thorne. He published the paper.');
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toContain('Dr. Aris Thorne.');
  });

  it('L4 does not treat Prof. as a sentence boundary', () => {
    const sentences = getSentences('By Prof. Elena Rostova. She published the paper.');
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toContain('Prof. Elena Rostova.');
  });

  it('L5 does not treat Vol. as a sentence boundary', () => {
    const sentences = getSentences('Published in Vol. 14. The journal is authoritative.');
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toContain('Vol. 14.');
  });

  it('L6 recognizes normal sentence endings', () => {
    const sentences = getSentences('This is sentence one. This is sentence two.');
    expect(sentences).toHaveLength(2);
  });

  it('L7 preserves all canonical tokens in the forensic fixture', () => {
    const canonicalTokens = tokenize(FORENSIC_TEXT);
    const sentences = getSentences(FORENSIC_TEXT);
    const sentenceTokens = sentences.flatMap(s => tokenize(s.text));

    expect(sentenceTokens.length).toBe(canonicalTokens.length);
  });

  it('L8 preserves decimal and DOI regions as lexical sentence content', () => {
    const sentences = getSentences(
      'Journal of Science, Vol. 14, DOI: 10.1038/s41586-023-00001-x.'
    );

    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('Vol. 14');
    expect(sentences[0].text).toContain('10.1038/s41586-023-00001-x');
  });

  // =================================================
  // EXPANDED MATRIX (E1-E10) - new in G5-M02
  // =================================================

  it('E1 multiple punctuation', () => {
    const sentences = getSentences('Wait!!! Are you serious?');
    expect(sentences).toHaveLength(2);
  });

  it('E2 question mark terminator', () => {
    const sentences = getSentences('Is this a question?');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('?');
  });

  it('E3 exclamation terminator', () => {
    const sentences = getSentences('This is an exclamation!');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('!');
  });

  it('E4 newline boundary', () => {
    const sentences = getSentences('First sentence.\nSecond sentence.');
    expect(sentences).toHaveLength(2);
  });

  it('E5 paragraph boundary', () => {
    const sentences = getSentences('First paragraph.\n\nSecond paragraph.');
    expect(sentences).toHaveLength(2);
  });

  it('E6 Dr. at start, continuation', () => {
    const sentences = getSentences('Dr. Aris Thorne published the paper.');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('Dr. Aris Thorne');
  });

  it('E7 mixed Dr., Prof., Vol. sequence', () => {
    const sentences = getSentences('Dr. Thorne, Prof. Rostova, Vol. 14, all agree.');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('Dr.');
    expect(sentences[0].text).toContain('Prof.');
    expect(sentences[0].text).toContain('Vol.');
  });

  it('E8 decimal with unit suffix', () => {
    const sentences = getSentences('The result was 99.4% accuracy.');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('99.4%');
  });

  it('E9 DOI with trailing period at end', () => {
    const sentences = getSentences('See DOI: 10.1038/s41586-023-00001-x.');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('10.1038/s41586-023-00001-x');
  });

  it('E10 abbreviation at end-of-document', () => {
    const sentences = getSentences('Published by Prof.');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toContain('Prof.');
  });
});
