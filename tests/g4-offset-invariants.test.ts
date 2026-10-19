/**
 * GRADIFI HOEOS GATE 4 - STRUCTURAL OFFSET-INVARIANT TEST SUITE
 * Deterministic Invariant Verification for Canonical Text and Highlighting Services
 * Governance: HOEOS P4 Standard (Pure Deterministic Visual Evidence, XSS Safety, Round-Trip Invariant)
 */

import assert from 'node:assert/strict';
import {
  resolveMatchedEvidenceSpans,
  buildRenderedSegments,
  renderHighlightedHtml,
  stripHighlightingMarkup,
  escapeHtml,
  unescapeHtml
} from '../src/services/verify/matchedTextHighlightingService.js';
import {
  verifyOffsetSlice,
  findTextSpans,
  buildCanonicalTextDocument
} from '../src/services/verify/canonicalTextOffsetService.js';
import {
  applyHighlights,
  filterVerifiedFindings,
  methodToClass
} from '../src/components/verify/highlightUtils.js';
import type { SimilarityFinding, EvidenceMatch } from '../src/services/verify/types.js';
import {
  G4_CANONICAL_DOCUMENT_TEXT,
  G4_FIXTURE_FINDINGS,
  G4_FIXTURE_VERIFIED_SOURCES,
  G4_EXPECTED_HIGHLIGHTS
} from '../e2e/g4-fixtures.js';

let assertionCount = 0;
function recordAssertion(name: string, condition: boolean, details?: string) {
  assertionCount++;
  assert.ok(condition, `[FAIL] Assertion #${assertionCount}: ${name} ${details ? '(' + details + ')' : ''}`);
  console.log(`  [PASS #${assertionCount}] ${name}`);
}

console.log('=== HOEOS G4 OFFSET INVARIANTS STRUCTURAL TEST SUITE ===');
const canonicalText = G4_CANONICAL_DOCUMENT_TEXT;

// --- CATEGORY 1: VALID EXACT OFFSETS ---
console.log('\n[Category 1: Valid Exact Offsets]');
{
  const exp0 = G4_EXPECTED_HIGHLIGHTS[0];
  const isValidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: exp0.startOffset,
    endOffset: exp0.endOffset,
    text: exp0.expectedText
  });
  recordAssertion('verifyOffsetSlice returns true for exact valid slice', isValidSlice);

  const directSlice = canonicalText.slice(exp0.startOffset, exp0.endOffset);
  recordAssertion('Direct canonical slice strictly equals expectedText', directSlice === exp0.expectedText);

  const spans = resolveMatchedEvidenceSpans(canonicalText, G4_FIXTURE_VERIFIED_SOURCES, G4_FIXTURE_FINDINGS);
  recordAssertion('resolveMatchedEvidenceSpans resolves valid spans', spans.length >= 2);
  const primarySpan = spans[0];
  recordAssertion(
    'Primary span startOffset and endOffset match fixture',
    primarySpan.startOffset === exp0.startOffset && primarySpan.endOffset === exp0.endOffset
  );
  recordAssertion(
    'Primary span matchedText strictly equals canonical slice',
    canonicalText.slice(primarySpan.startOffset, primarySpan.endOffset) === primarySpan.matchedText
  );

  const segments = applyHighlights(canonicalText, G4_FIXTURE_FINDINGS);
  const highlighted = segments.filter(s => s.findingId);
  recordAssertion('applyHighlights renders highlighted segments for valid findings', highlighted.length === 2);
  recordAssertion(
    'Highlighted segment text strictly equals canonical slice',
    canonicalText.slice(highlighted[0].start!, highlighted[0].end!) === highlighted[0].text
  );
}

// --- CATEGORY 2: NEGATIVE START OFFSET ---
console.log('\n[Category 2: Negative Start Offset]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: -5,
    endOffset: 20,
    text: 'invalid'
  });
  recordAssertion('verifyOffsetSlice rejects negative start offset', invalidSlice === false);

  const findingWithNegStart: SimilarityFinding = {
    findingId: 'f-neg-start',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'invalid',
    matchedSegment: 'invalid',
    similarityScore: 80,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: -10,
    sourceEnd: 30,
    provenance: 'DETERMINISTIC'
  };

  const spans = resolveMatchedEvidenceSpans(canonicalText, [], [findingWithNegStart]);
  recordAssertion('resolveMatchedEvidenceSpans excludes finding with negative start offset', spans.length === 0);

  const segs = applyHighlights(canonicalText, [findingWithNegStart]);
  const hasMarks = segs.some(s => s.findingId === 'f-neg-start');
  recordAssertion('applyHighlights suppresses mark with negative start offset', hasMarks === false);
}

// --- CATEGORY 3: NEGATIVE END OFFSET ---
console.log('\n[Category 3: Negative End Offset]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: 0,
    endOffset: -1,
    text: 'invalid'
  });
  recordAssertion('verifyOffsetSlice rejects negative end offset', invalidSlice === false);

  const findingWithNegEnd: SimilarityFinding = {
    findingId: 'f-neg-end',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'invalid',
    matchedSegment: 'invalid',
    similarityScore: 80,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: 10,
    sourceEnd: -5,
    provenance: 'DETERMINISTIC'
  };

  const spans = resolveMatchedEvidenceSpans(canonicalText, [], [findingWithNegEnd]);
  recordAssertion('resolveMatchedEvidenceSpans excludes finding with negative end offset', spans.length === 0);
}

// --- CATEGORY 4: START BEYOND CANONICAL TEXT ---
console.log('\n[Category 4: Start Beyond Canonical Text]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: canonicalText.length + 50,
    endOffset: canonicalText.length + 100,
    text: 'out-of-bounds'
  });
  recordAssertion('verifyOffsetSlice rejects start offset beyond canonical length', invalidSlice === false);

  const findingOutOfBounds: SimilarityFinding = {
    findingId: 'f-start-oob',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'out-of-bounds',
    matchedSegment: 'out-of-bounds',
    similarityScore: 80,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: canonicalText.length + 10,
    sourceEnd: canonicalText.length + 40,
    provenance: 'DETERMINISTIC'
  };

  const spans = resolveMatchedEvidenceSpans(canonicalText, [], [findingOutOfBounds]);
  recordAssertion('resolveMatchedEvidenceSpans excludes finding with start offset beyond canonical length', spans.length === 0);
}

// --- CATEGORY 5: END BEYOND CANONICAL TEXT ---
console.log('\n[Category 5: End Beyond Canonical Text]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: 10,
    endOffset: canonicalText.length + 10,
    text: 'end-overflow'
  });
  recordAssertion('verifyOffsetSlice rejects end offset beyond canonical length', invalidSlice === false);

  const findingEndOOB: SimilarityFinding = {
    findingId: 'f-end-oob',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'end-overflow',
    matchedSegment: 'end-overflow',
    similarityScore: 80,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: 0,
    sourceEnd: canonicalText.length + 5,
    provenance: 'DETERMINISTIC'
  };

  const spans = resolveMatchedEvidenceSpans(canonicalText, [], [findingEndOOB]);
  recordAssertion('resolveMatchedEvidenceSpans excludes finding with end offset beyond canonical length', spans.length === 0);
}

// --- CATEGORY 6: REVERSED OFFSETS (start > end) ---
console.log('\n[Category 6: Reversed Offsets]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: 80,
    endOffset: 20,
    text: 'reversed'
  });
  recordAssertion('verifyOffsetSlice rejects reversed offsets (start > end)', invalidSlice === false);

  const findingReversed: SimilarityFinding = {
    findingId: 'f-reversed',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'reversed',
    matchedSegment: 'reversed',
    similarityScore: 80,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: 100,
    sourceEnd: 50,
    provenance: 'DETERMINISTIC'
  };

  const spans = resolveMatchedEvidenceSpans(canonicalText, [], [findingReversed]);
  recordAssertion('resolveMatchedEvidenceSpans excludes finding with reversed offsets', spans.length === 0);
}

// --- CATEGORY 7 & 8: MISSING OR MALFORMED OFFSETS AND FALLBACK BEHAVIOR ---
console.log('\n[Category 7, 8 & 9: Missing, Malformed Offsets & Fallback]');
{
  const targetPhrase = 'Federated learning across decoupled edge networks faces significant communication latency';
  const expectedLocStart = canonicalText.indexOf(targetPhrase);
  const expectedLocEnd = expectedLocStart + targetPhrase.length;

  const findingMissingOffsets: SimilarityFinding = {
    findingId: 'f-missing-offsets',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: targetPhrase,
    matchedSegment: targetPhrase,
    similarityScore: 85,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: undefined,
    sourceEnd: undefined,
    provenance: 'DETERMINISTIC'
  };

  // applyHighlights documented fallback locates candidate segment in document text
  const segs = applyHighlights(canonicalText, [findingMissingOffsets]);
  const resolved = segs.find(s => s.findingId === 'f-missing-offsets');
  recordAssertion('applyHighlights resolves segment offsets from sourceSegment fallback', Boolean(resolved));
  recordAssertion('Fallback resolved start offset matches text location', resolved?.start === expectedLocStart);
  recordAssertion('Fallback resolved end offset matches text location', resolved?.end === expectedLocEnd);
  recordAssertion(
    'Fallback resolved segment text preserves exact canonical slice',
    canonicalText.slice(resolved!.start!, resolved!.end!) === targetPhrase
  );

  // Missing offsets with no sourceSegment cannot be resolved and must be suppressed
  const findingMissingAll: SimilarityFinding = {
    findingId: 'f-empty-all',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: '',
    matchedSegment: '',
    similarityScore: 50,
    matchMethod: 'TOKEN_OVERLAP',
    sourceStart: undefined,
    sourceEnd: undefined,
    provenance: 'DETERMINISTIC'
  };
  const segsEmpty = applyHighlights(canonicalText, [findingMissingAll]);
  const resolvedEmpty = segsEmpty.find(s => s.findingId === 'f-empty-all');
  recordAssertion('Missing offsets without valid sourceSegment are suppressed', resolvedEmpty === undefined);

  // Malformed NaN offsets
  const findingNaN: SimilarityFinding = {
    findingId: 'f-nan',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: '',
    matchedSegment: '',
    similarityScore: 50,
    matchMethod: 'TOKEN_OVERLAP',
    sourceStart: NaN as any,
    sourceEnd: NaN as any,
    provenance: 'DETERMINISTIC'
  };
  const spansNaN = resolveMatchedEvidenceSpans(canonicalText, [], [findingNaN]);
  recordAssertion('resolveMatchedEvidenceSpans filters out NaN offsets', spansNaN.length === 0);
}

// --- CATEGORY 10: EMPTY OR INVALID MATCHED TEXT ---
console.log('\n[Category 10: Empty or Invalid Matched Text]');
{
  const spansEmptyText = resolveMatchedEvidenceSpans('', G4_FIXTURE_VERIFIED_SOURCES, G4_FIXTURE_FINDINGS);
  recordAssertion('resolveMatchedEvidenceSpans returns empty array for empty canonical text', spansEmptyText.length === 0);

  const emptySources: EvidenceMatch[] = [
    {
      sourceId: 'src-empty',
      title: 'Empty Source',
      authors: [],
      url: '',
      matchedText: '',
      originalSnippet: '',
      matchType: 'lexical',
      matchPercentage: 50,
      relevanceScore: 0.5,
      provenance: {
        provider: 'crossref',
        providerRecordId: 'empty-1',
        retrievedAt: '2026-10-17T00:00:00Z',
        sourceType: 'crossref',
        sourceUrl: '',
        title: '',
        authors: [],
        provenanceState: 'VERIFIED'
      }
    }
  ];
  const spansEmptyMatch = resolveMatchedEvidenceSpans(canonicalText, emptySources, []);
  recordAssertion('resolveMatchedEvidenceSpans ignores empty matchedText in verified sources', spansEmptyMatch.length === 0);

  const textSpans = findTextSpans(canonicalText, '   ');
  recordAssertion('findTextSpans returns empty array for whitespace-only query', textSpans.length === 0);
}

// --- CATEGORY 11: CANONICAL SLICE MISMATCH ---
console.log('\n[Category 11: Canonical Slice Mismatch]');
{
  const invalidSlice = verifyOffsetSlice(canonicalText, {
    startOffset: 0,
    endOffset: 20,
    text: 'COMPLETELY DIFFERENT TEXT'
  });
  recordAssertion('verifyOffsetSlice returns false when text does not match canonical slice', invalidSlice === false);

  const findingMismatch: SimilarityFinding = {
    findingId: 'f-mismatch',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'Fabricated non-matching text passage',
    matchedSegment: 'Fabricated non-matching text passage',
    similarityScore: 90,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: 0,
    sourceEnd: 36,
    provenance: 'DETERMINISTIC'
  };

  const segs = applyHighlights(canonicalText, [findingMismatch]);
  const hasMismatchMark = segs.some(s => s.findingId === 'f-mismatch');
  recordAssertion('applyHighlights suppresses finding whose sourceSegment conflicts with canonical slice', hasMismatchMark === false);
}

// --- CATEGORY 12: MULTIPLE INDEPENDENT FINDINGS ---
console.log('\n[Category 12: Multiple Independent Findings]');
{
  const segs = applyHighlights(canonicalText, G4_FIXTURE_FINDINGS);
  const markSegs = segs.filter(s => s.findingId);
  recordAssertion('Multiple independent findings emit discrete marks', markSegs.length === 2);
  recordAssertion('Marks are ordered ascending by start offset', markSegs[0].start! < markSegs[1].start!);

  // Invariant: joining all segments reconstructs canonical text verbatim
  const reconstructed = segs.map(s => s.text).join('');
  recordAssertion('Segment concatenation equals canonical document text exactly', reconstructed === canonicalText);
}

// --- CATEGORY 13: OVERLAPPING FINDINGS ---
console.log('\n[Category 13: Overlapping Findings]');
{
  const sample = 'Quantum federated learning systems require mathematical verification algorithms.';
  const f1: SimilarityFinding = {
    findingId: 'f-overlap-1',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'Quantum federated learning',
    matchedSegment: 'Quantum federated learning',
    similarityScore: 95,
    matchMethod: 'EXACT_PHRASE',
    sourceStart: 0,
    sourceEnd: 26,
    provenance: 'DETERMINISTIC'
  };
  const f2: SimilarityFinding = {
    findingId: 'f-overlap-2',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-1',
    sourceSegment: 'federated learning systems',
    matchedSegment: 'federated learning systems',
    similarityScore: 80,
    matchMethod: 'TOKEN_OVERLAP',
    sourceStart: 8,
    sourceEnd: 34,
    provenance: 'DETERMINISTIC'
  };

  const segs = applyHighlights(sample, [f1, f2]);
  const reconstructed = segs.map(s => s.text).join('');
  recordAssertion('Overlapping findings preserve exact text reconstruction invariant', reconstructed === sample);
  recordAssertion('Overlapping findings are merged into a single non-fragmented highlighted range', segs.filter(s => s.findingId).length === 1);
  const merged = segs.find(s => s.findingId);
  recordAssertion('Merged range start equals earliest start (0)', merged?.start === 0);
  recordAssertion('Merged range end equals furthest end (34)', merged?.end === 34);
  recordAssertion('Stronger method (EXACT_PHRASE) is preserved over TOKEN_OVERLAP', merged?.method === 'EXACT_PHRASE');
}

// --- CATEGORY 14: HTML RENDERING & CANONICAL ROUND-TRIP INVARIANT ---
console.log('\n[Category 14: Canonical Text Round-Trip Invariant]');
{
  const spans = resolveMatchedEvidenceSpans(canonicalText, G4_FIXTURE_VERIFIED_SOURCES, G4_FIXTURE_FINDINGS);
  const renderedHtml = renderHighlightedHtml(canonicalText, spans);
  recordAssertion('renderHighlightedHtml produces <mark> tags', renderedHtml.includes('<mark class='));

  const stripped = stripHighlightingMarkup(renderedHtml);
  recordAssertion(
    'stripHighlightingMarkup(renderHighlightedHtml(text, spans)) === canonicalText',
    stripped === canonicalText
  );

  // XSS Safety & Round-trip check
  const maliciousText = '<script>alert("XSS")</script> & <b>bold</b> evidence text.';
  const escaped = escapeHtml(maliciousText);
  recordAssertion('escapeHtml escapes angle brackets and ampersands', !escaped.includes('<script>') && escaped.includes('&lt;script&gt;'));
  recordAssertion('unescapeHtml recovers original raw characters', unescapeHtml(escaped) === maliciousText);
}

// --- CATEGORY 15: PROVENANCE FILTERING & SUPPRESSION OF UNVERIFIED EVIDENCE ---
console.log('\n[Category 15: Provenance Filtering & Suppression]');
{
  const unverifiedMatch: EvidenceMatch = {
    sourceId: 'src-unverified-001',
    title: 'Unverified Paper',
    authors: [],
    url: '',
    matchedText: 'some text',
    originalSnippet: 'some text',
    matchType: 'lexical',
    matchPercentage: 50,
    relevanceScore: 0.5,
    provenance: {
      provider: 'crossref',
      providerRecordId: 'unverified-1',
      retrievedAt: '2026-10-17T00:00:00Z',
      sourceType: 'crossref',
      sourceUrl: '',
      title: 'Unverified Paper',
      authors: [],
      provenanceState: 'UNVERIFIED' // Not VERIFIED
    }
  };

  const findingForUnverified: SimilarityFinding = {
    findingId: 'f-unverified-source',
    sourceDocumentId: 'doc-1',
    matchedDocumentId: 'src-unverified-001',
    sourceSegment: 'some text',
    matchedSegment: 'some text',
    similarityScore: 50,
    matchMethod: 'TOKEN_OVERLAP',
    sourceStart: 0,
    sourceEnd: 9,
    provenance: 'DETERMINISTIC'
  };

  const filtered = filterVerifiedFindings([findingForUnverified], [unverifiedMatch]);
  recordAssertion('filterVerifiedFindings drops findings mapped to UNVERIFIED provenanceState', filtered.length === 0);

  const filteredValid = filterVerifiedFindings(G4_FIXTURE_FINDINGS, G4_FIXTURE_VERIFIED_SOURCES);
  recordAssertion('filterVerifiedFindings retains findings mapped to VERIFIED provenanceState', filteredValid.length === 2);
}

console.log(`\n======================================================`);
console.log(`HOEOS G4 STRUCTURAL OFFSET INVARIANTS: ALL ${assertionCount} ASSERTIONS PASSED.`);
console.log(`======================================================`);
process.exit(0);
