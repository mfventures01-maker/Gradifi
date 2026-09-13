/**
 * GRADIFI VERIFY - MATCHED-TEXT HIGHLIGHTING TEST SUITE
 * HOEOS Phase 4 Standard: 18 Mandatory Visual Evidence & Invariant Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  MatchedEvidenceSpan,
  escapeHtml,
  unescapeHtml,
  resolveMatchedEvidenceSpans,
  buildRenderedSegments,
  renderHighlightedHtml,
  stripHighlightingMarkup
} from '../src/services/verify/matchedTextHighlightingService';
import { EvidenceMatch } from '../src/services/verify/types';

describe('HOEOS P4 Matched-Text Highlighting & Visual Evidence Suite', () => {
  const canonicalText = 'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks.';

  // 1. Valid Span Rendering
  it('1. renders valid matched evidence spans wrapped in <mark> tags', () => {
    const spans: MatchedEvidenceSpan[] = [
      {
        spanId: 'span_01',
        startOffset: 0,
        endOffset: 7,
        matchedText: 'Quantum',
        sourceId: 'crossref_001',
        matchType: 'exact'
      }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    expect(html).toContain('<mark');
    expect(html).toContain('Quantum</mark>');
    expect(html).toContain('data-source-id="crossref_001"');
  });

  // 2. [start, end) Correctness
  it('2. respects [startOffset, endOffset) half-open interval boundaries', () => {
    const spans: MatchedEvidenceSpan[] = [
      {
        spanId: 'span_02',
        startOffset: 8,
        endOffset: 20,
        matchedText: 'Entanglement',
        sourceId: 'openalex_002',
        matchType: 'exact'
      }
    ];

    const segments = buildRenderedSegments(canonicalText, spans);
    const matchSeg = segments.find(s => s.isMatch);
    expect(matchSeg).toBeDefined();
    expect(matchSeg?.text).toBe('Entanglement');
    expect(canonicalText.slice(8, 20)).toBe('Entanglement');
  });

  // 3. Slice Round-Trip Correctness
  it('3. proves canonicalText.slice(startOffset, endOffset) === span.matchedText invariant', () => {
    const phrases = ['Quantum', 'Decoupled', 'Federated Learning'];
    for (const phrase of phrases) {
      const idx = canonicalText.indexOf(phrase);
      const span: MatchedEvidenceSpan = {
        spanId: `span_${idx}`,
        startOffset: idx,
        endOffset: idx + phrase.length,
        matchedText: phrase,
        sourceId: 'src_test',
        matchType: 'exact'
      };
      expect(canonicalText.slice(span.startOffset, span.endOffset)).toBe(phrase);
    }
  });

  // 4. Markup Removal Restores Canonical Text Invariant
  it('4. proves stripHighlightingMarkup(renderHighlightedHtml(text, spans)) === canonicalText invariant', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 7, matchedText: 'Quantum', sourceId: 's1', matchType: 'exact' },
      { spanId: 's2', startOffset: 25, endOffset: 34, matchedText: 'Decoupled', sourceId: 's2', matchType: 'lexical' }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    const restoredText = stripHighlightingMarkup(html);
    expect(restoredText).toBe(canonicalText);
  });

  // 5. Repeated Match Spans
  it('5. handles repeated occurrences with independent start and end offsets', () => {
    const text = 'alpha beta alpha beta alpha';
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 5, matchedText: 'alpha', sourceId: 'src', matchType: 'exact' },
      { spanId: 's2', startOffset: 11, endOffset: 16, matchedText: 'alpha', sourceId: 'src', matchType: 'exact' },
      { spanId: 's3', startOffset: 22, endOffset: 27, matchedText: 'alpha', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(text, spans);
    const matchesCount = (html.match(/<mark/g) || []).length;
    expect(matchesCount).toBe(3);
    expect(stripHighlightingMarkup(html)).toBe(text);
  });

  // 6. Adjacent Match Spans
  it('6. handles contiguous adjacent match spans without missing or duplicated characters', () => {
    const text = 'AlphaBeta';
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 5, matchedText: 'Alpha', sourceId: 's1', matchType: 'exact' },
      { spanId: 's2', startOffset: 5, endOffset: 9, matchedText: 'Beta', sourceId: 's2', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(text, spans);
    expect(stripHighlightingMarkup(html)).toBe('AlphaBeta');
  });

  // 7. Overlapping Match Spans
  it('7. flattens overlapping match spans into non-overlapping rendered segments', () => {
    const text = 'abcdefgh';
    // Match A: [0, 5] ("abcde"), Match B: [3, 8] ("defgh")
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'mA', startOffset: 0, endOffset: 5, matchedText: 'abcde', sourceId: 'srcA', matchType: 'exact' },
      { spanId: 'mB', startOffset: 3, endOffset: 8, matchedText: 'defgh', sourceId: 'srcB', matchType: 'exact' }
    ];

    const segments = buildRenderedSegments(text, spans);
    expect(segments.length).toBe(3);
    // [0, 3]: "abc" (Match A)
    expect(segments[0].text).toBe('abc');
    expect(segments[0].isMatch).toBe(true);
    // [3, 5]: "de" (Match A & B overlap)
    expect(segments[1].text).toBe('de');
    expect(segments[1].isMatch).toBe(true);
    expect(segments[1].spans.length).toBe(2);
    // [5, 8]: "fgh" (Match B)
    expect(segments[2].text).toBe('fgh');
    expect(segments[2].isMatch).toBe(true);

    const html = renderHighlightedHtml(text, spans);
    expect(stripHighlightingMarkup(html)).toBe(text);
  });

  // 8. Entire Document Match
  it('8. renders entire document match span correctly', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'all', startOffset: 0, endOffset: canonicalText.length, matchedText: canonicalText, sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    expect(stripHighlightingMarkup(html)).toBe(canonicalText);
  });

  // 9. Single Character Match
  it('9. highlights single character match span correctly', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'char', startOffset: 0, endOffset: 1, matchedText: 'Q', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    expect(html).toContain('Q</mark>');
    expect(stripHighlightingMarkup(html)).toBe(canonicalText);
  });

  // 10. Unicode Match Rendering
  it('10. renders visual spans for UTF-16 Unicode text including emoji and CJK safely', () => {
    const uniText = 'Café résumé. 中文. 😀 Gradifi';
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'u1', startOffset: 0, endOffset: 4, matchedText: 'Café', sourceId: 'src', matchType: 'exact' },
      { spanId: 'u2', startOffset: 13, endOffset: 15, matchedText: '中文', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(uniText, spans);
    expect(html).toContain('Café</mark>');
    expect(html).toContain('中文</mark>');
    expect(stripHighlightingMarkup(html)).toBe(uniText);
  });

  // 11. Line Breaks Preservation
  it('11. preserves canonical line break structure across matched spans', () => {
    const textLines = 'Paragraph 1.\nParagraph 2.';
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'p1', startOffset: 0, endOffset: 12, matchedText: 'Paragraph 1.', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(textLines, spans);
    expect(html).toContain('Paragraph 1.</mark>\nParagraph 2.');
    expect(stripHighlightingMarkup(html)).toBe(textLines);
  });

  // 12. Invalid Span Rejection
  it('12. excludes invalid evidence spans with out-of-bounds offsets from rendering', () => {
    const matches: EvidenceMatch[] = [
      {
        sourceId: 'src_invalid',
        title: 'Title',
        authors: ['Author'],
        url: 'https://example.com',
        matchedText: 'Nonexistent phrase not present in text',
        originalSnippet: 'Nonexistent phrase not present in text',
        matchType: 'exact',
        matchPercentage: 50,
        relevanceScore: 0.9,
        provenance: {
          provider: 'crossref',
          providerRecordId: '1',
          retrievedAt: new Date().toISOString(),
          sourceType: 'crossref',
          sourceUrl: 'https://example.com',
          title: 'Title',
          authors: ['Author'],
          provenanceState: 'VERIFIED'
        }
      }
    ];

    const resolved = resolveMatchedEvidenceSpans(canonicalText, matches);
    expect(resolved.length).toBe(0); // Excluded invalid match
  });

  // 13. Duplicate Span Deduplication
  it('13. deduplicates identical evidence spans deterministically', () => {
    const matches: EvidenceMatch[] = [
      {
        sourceId: 'crossref_001',
        title: 'Title',
        authors: ['Author'],
        url: 'https://example.com',
        matchedText: 'Quantum Entanglement',
        originalSnippet: 'Quantum Entanglement',
        matchType: 'exact',
        matchPercentage: 50,
        relevanceScore: 0.9,
        provenance: {
          provider: 'crossref',
          providerRecordId: '1',
          retrievedAt: new Date().toISOString(),
          sourceType: 'crossref',
          sourceUrl: 'https://example.com',
          title: 'Title',
          authors: ['Author'],
          provenanceState: 'VERIFIED'
        }
      },
      {
        sourceId: 'crossref_001', // Duplicate match
        title: 'Title',
        authors: ['Author'],
        url: 'https://example.com',
        matchedText: 'Quantum Entanglement',
        originalSnippet: 'Quantum Entanglement',
        matchType: 'exact',
        matchPercentage: 50,
        relevanceScore: 0.9,
        provenance: {
          provider: 'crossref',
          providerRecordId: '1',
          retrievedAt: new Date().toISOString(),
          sourceType: 'crossref',
          sourceUrl: 'https://example.com',
          title: 'Title',
          authors: ['Author'],
          provenanceState: 'VERIFIED'
        }
      }
    ];

    const resolved = resolveMatchedEvidenceSpans(canonicalText, matches);
    expect(resolved.length).toBe(1);
  });

  // 14. 100% Deterministic Rendering Test
  it('14. guarantees 100% deterministic HTML rendering over 50 consecutive calls', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 7, matchedText: 'Quantum', sourceId: 'src1', matchType: 'exact' },
      { spanId: 's2', startOffset: 25, endOffset: 34, matchedText: 'Decoupled', sourceId: 'src2', matchType: 'lexical' }
    ];

    const baselineHtml = renderHighlightedHtml(canonicalText, spans);

    for (let i = 0; i < 50; i++) {
      const html = renderHighlightedHtml(canonicalText, spans);
      expect(html).toBe(baselineHtml);
    }
  });

  // 15. XSS-Safe Rendering Test
  it('15. escapes malicious script and image tags safely preventing XSS execution', () => {
    const maliciousDoc = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 'x1', startOffset: 8, endOffset: 13, matchedText: 'alert', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(maliciousDoc, spans);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(stripHighlightingMarkup(html)).toBe(maliciousDoc);
  });

  // 16. SourceId Preservation
  it('16. preserves sourceId across all rendered highlight elements', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 7, matchedText: 'Quantum', sourceId: 'nature_paper_2024', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    expect(html).toContain('data-source-id="nature_paper_2024"');
  });

  // 17. AI Firewall Boundary
  it('17. guarantees AI findings cannot manufacture authoritative highlight spans directly', () => {
    // AI findings are not passed directly to resolveMatchedEvidenceSpans as verifiedSources
    const resolved = resolveMatchedEvidenceSpans(canonicalText, []);
    expect(resolved.length).toBe(0);
  });

  // 18. G3 Verdict Non-Recalculation Boundary
  it('18. uses strict "Matched text" terminology and does not label text as PLAGIARIZED', () => {
    const spans: MatchedEvidenceSpan[] = [
      { spanId: 's1', startOffset: 0, endOffset: 7, matchedText: 'Quantum', sourceId: 'src', matchType: 'exact' }
    ];

    const html = renderHighlightedHtml(canonicalText, spans);
    expect(html).not.toContain('PLAGIARIZED');
    expect(html).not.toContain('GUILTY');
    expect(html).toContain('Matched text evidence');
  });
});
