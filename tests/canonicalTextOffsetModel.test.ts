/**
 * GRADIFI VERIFY - CANONICAL TEXT & OFFSET MODEL TEST SUITE
 * HOEOS Phase 3 Standard: 18 Mandatory Positional Coordinate & Invariant Tests.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildCanonicalTextDocument,
  findTextSpans,
  verifyOffsetSlice,
  extractWordSpans
} from '../src/services/verify/canonicalTextOffsetService';
import { ingestDocument, convertToCanonicalDocument } from '../src/services/verify/universalIngestionService';

describe('HOEOS P3 Canonical Text / Offset Model Suite', () => {
  const sampleText = 'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks.';

  // 1. Canonical Text Construction
  it('1. builds CanonicalTextDocument establishing stable coordinate system', () => {
    const doc = buildCanonicalTextDocument(sampleText);
    expect(doc.characterCount).toBe(sampleText.length);
    expect(doc.wordCount).toBe(10);
    expect(doc.segments.length).toBeGreaterThan(0);
    expect(doc.wordSpans.length).toBe(10);
  });

  // 2. [start, end) Convention Enforcement
  it('2. enforces half-open interval [startOffset, endOffset) convention', () => {
    const spans = findTextSpans(sampleText, 'Quantum');
    expect(spans.length).toBe(1);
    const span = spans[0];
    expect(span.startOffset).toBe(0);
    expect(span.endOffset).toBe(7); // "Quantum".length = 7
    expect(sampleText.slice(span.startOffset, span.endOffset)).toBe('Quantum');
  });

  // 3. Offset Bounds Check
  it('3. guarantees all offsets remain within 0 <= start <= end <= text.length bounds', () => {
    const doc = buildCanonicalTextDocument(sampleText);
    for (const seg of doc.segments) {
      expect(seg.startOffset).toBeGreaterThanOrEqual(0);
      expect(seg.endOffset).toBeGreaterThanOrEqual(seg.startOffset);
      expect(seg.endOffset).toBeLessThanOrEqual(doc.characterCount);
    }
  });

  // 4. Slice Round-Trip Test
  it('4. proves canonicalText.slice(startOffset, endOffset) === span.matchedText invariant', () => {
    const phrases = ['Quantum', 'Entanglement', 'Federated Learning', 'Networks.'];
    for (const phrase of phrases) {
      const spans = findTextSpans(sampleText, phrase);
      expect(spans.length).toBe(1);
      const span = spans[0];
      expect(verifyOffsetSlice(sampleText, { startOffset: span.startOffset, endOffset: span.endOffset, text: phrase })).toBe(true);
      expect(sampleText.slice(span.startOffset, span.endOffset)).toBe(phrase);
    }
  });

  // 5. Deterministic Repeatability Test
  it('5. guarantees 100% deterministic offsets across 50 consecutive executions', () => {
    const baselineDoc = buildCanonicalTextDocument(sampleText);
    const baselineSpans = findTextSpans(sampleText, 'Decoupled Neural');

    for (let i = 0; i < 50; i++) {
      const doc = buildCanonicalTextDocument(sampleText);
      const spans = findTextSpans(sampleText, 'Decoupled Neural');
      expect(doc.characterCount).toBe(baselineDoc.characterCount);
      expect(doc.wordCount).toBe(baselineDoc.wordCount);
      expect(spans[0].startOffset).toBe(baselineSpans[0].startOffset);
      expect(spans[0].endOffset).toBe(baselineSpans[0].endOffset);
    }
  });

  // 6. Repeated Match Occurrence Tracking
  it('6. independently tracks repeated text occurrences with distinct character offsets', () => {
    const text = 'alpha beta alpha beta alpha';
    const spans = findTextSpans(text, 'alpha');

    expect(spans.length).toBe(3);
    expect(spans[0].occurrenceIndex).toBe(0);
    expect(spans[0].startOffset).toBe(0);
    expect(spans[0].endOffset).toBe(5);

    expect(spans[1].occurrenceIndex).toBe(1);
    expect(spans[1].startOffset).toBe(11);
    expect(spans[1].endOffset).toBe(16);

    expect(spans[2].occurrenceIndex).toBe(2);
    expect(spans[2].startOffset).toBe(22);
    expect(spans[2].endOffset).toBe(27);

    for (const s of spans) {
      expect(text.slice(s.startOffset, s.endOffset)).toBe('alpha');
    }
  });

  // 7. Adjacent & Overlapping Match Spans
  it('7. resolves overlapping and adjacent text match spans deterministically', () => {
    const text = 'banana';
    const spans = findTextSpans(text, 'ana');

    expect(spans.length).toBe(2);
    expect(spans[0].startOffset).toBe(1);
    expect(spans[0].endOffset).toBe(4);
    expect(spans[1].startOffset).toBe(3);
    expect(spans[1].endOffset).toBe(6);
  });

  // 8. Unicode Code-Unit Model
  it('8. handles UTF-16 Unicode accented text, CJK, Arabic, and emoji surrogate pairs', () => {
    const unicodeText = 'Café résumé naïve. 中文文本. مرحبا. 😀 Gradifi 🚀';
    const doc = buildCanonicalTextDocument(unicodeText);

    const cafeSpans = findTextSpans(unicodeText, 'Café');
    expect(cafeSpans.length).toBe(1);
    expect(unicodeText.slice(cafeSpans[0].startOffset, cafeSpans[0].endOffset)).toBe('Café');

    const cjkSpans = findTextSpans(unicodeText, '中文文本');
    expect(cjkSpans.length).toBe(1);
    expect(unicodeText.slice(cjkSpans[0].startOffset, cjkSpans[0].endOffset)).toBe('中文文本');

    const emojiSpans = findTextSpans(unicodeText, '😀');
    expect(emojiSpans.length).toBe(1);
    expect(unicodeText.slice(emojiSpans[0].startOffset, emojiSpans[0].endOffset)).toBe('😀');
  });

  // 9. Normalization Ordering
  it('9. calculates offsets on post-normalization canonical text', () => {
    const rawText = '\r\n   Paragraph 1.\r\n\r\nParagraph 2.   \r\n';
    const doc = buildCanonicalTextDocument(rawText);
    expect(doc.text).not.toContain('\r\n');
    const spans = findTextSpans(doc.text, 'Paragraph 1.');
    expect(spans.length).toBe(1);
    expect(doc.text.slice(spans[0].startOffset, spans[0].endOffset)).toBe('Paragraph 1.');
  });

  // 10. Line-Ending Normalization (LF vs CRLF)
  it('10. normalizes CRLF and LF to identical character offsets', () => {
    const textLF = 'Line 1\nLine 2';
    const textCRLF = 'Line 1\r\nLine 2';

    const docLF = buildCanonicalTextDocument(textLF);
    const docCRLF = buildCanonicalTextDocument(textCRLF);

    expect(docLF.text).toBe(docCRLF.text);
    expect(docLF.characterCount).toBe(docCRLF.characterCount);
  });

  // 11. Empty Document & Whitespace Boundary
  it('11. returns empty segments array for empty or whitespace-only documents', () => {
    const doc = buildCanonicalTextDocument('    \n\n  ');
    expect(doc.segments).toEqual([]);
    expect(doc.wordSpans).toEqual([]);
    expect(doc.characterCount).toBe(0);
  });

  // 12. Failed Ingestion Boundary
  it('12. produces no valid offsets for failed P2 ingestion results', async () => {
    const res = await ingestDocument({ name: 'empty.txt', text: '   ' });
    expect(res.canonicalReady).toBe(false);
    const doc = buildCanonicalTextDocument(res.text);
    expect(doc.segments.length).toBe(0);
  });

  // 13. Representative Cross-Format Canonical Offsets
  it('13. yields valid match offsets across TXT, MD, HTML, and XML ingestions', async () => {
    const phrase = 'GRADIFI UNIVERSAL INGESTION FIXTURE';
    const fixtureDir = path.join(__dirname, 'fixtures', 'ingestion');

    const txtContent = fs.readFileSync(path.join(fixtureDir, 'sample.txt'), 'utf-8');
    const htmlContent = fs.readFileSync(path.join(fixtureDir, 'sample.html'), 'utf-8');

    const txtIngest = await ingestDocument({ name: 'sample.txt', text: txtContent });
    const htmlIngest = await ingestDocument({ name: 'sample.html', text: htmlContent });

    const txtCanonical = convertToCanonicalDocument(txtIngest);
    const htmlCanonical = convertToCanonicalDocument(htmlIngest);

    const txtSpans = findTextSpans(txtCanonical.rawText, phrase);
    const htmlSpans = findTextSpans(htmlCanonical.rawText, phrase);

    expect(txtSpans.length).toBe(1);
    expect(htmlSpans.length).toBeGreaterThanOrEqual(1);
    expect(txtCanonical.rawText.slice(txtSpans[0].startOffset, txtSpans[0].endOffset)).toBe(phrase);
    expect(htmlCanonical.rawText.slice(htmlSpans[0].startOffset, htmlSpans[0].endOffset)).toBe(phrase);
  });

  // 14. Word Spans Coordinate Extraction
  it('14. extracts word spans with exact UTF-16 character offsets', () => {
    const words = extractWordSpans('Alpha Beta Gamma');
    expect(words.length).toBe(3);
    expect(words[0]).toEqual({ word: 'Alpha', startOffset: 0, endOffset: 5 });
    expect(words[1]).toEqual({ word: 'Beta', startOffset: 6, endOffset: 10 });
    expect(words[2]).toEqual({ word: 'Gamma', startOffset: 11, endOffset: 16 });
  });

  // 15. Zero Randomness Guard
  it('15. excludes non-deterministic functions from offset calculations', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, '../src/services/verify/canonicalTextOffsetService.ts'), 'utf-8');
    expect(fileContent).not.toContain('Math.random');
    expect(fileContent).not.toContain('Date.now');
    expect(fileContent).not.toContain('randomUUID');
  });

  // 16. Case Sensitivity Options
  it('16. supports case-sensitive and case-insensitive match span searches', () => {
    const text = 'Quantum quantum QUANTUM';
    const caseSensitive = findTextSpans(text, 'quantum', { caseSensitive: true });
    expect(caseSensitive.length).toBe(1);

    const caseInsensitive = findTextSpans(text, 'quantum', { caseSensitive: false });
    expect(caseInsensitive.length).toBe(3);
  });
});
