/**
 * GRADIFI VERIFY - DETERMINISTIC MARKER RENDERING TEST HARNESS
 * Verifies all 8 marker generation and filtering requirements.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import assert from 'node:assert';
import {
  applyHighlights,
  filterVerifiedFindings,
  methodToClass,
} from '../../src/components/verify/highlightUtils';
import { SimilarityFinding, EvidenceMatch } from '../../src/services/verify/types';

let passCount = 0;
let failCount = 0;

function runTest(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS — ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`FAIL — ${testName}:`, err);
    failCount++;
  }
}

console.log('================================================================');
console.log('HOEOS DETERMINISTIC MARKER RENDERING TEST SUITE');
console.log('================================================================');

// Test 1 — Empty findings
runTest('Test 1 — Empty findings', () => {
  const text = 'Hello world';
  const findings: SimilarityFinding[] = [];
  const output = applyHighlights(text, findings);

  assert.strictEqual(output.length, 1);
  assert.strictEqual(output[0].findingId, undefined);
  assert.strictEqual(output[0].text, 'Hello world');
});

// Test 2 — One finding at start
runTest('Test 2 — One finding at start', () => {
  const text = 'Hello world';
  const findings: any[] = [
    {
      findingId: 'f1',
      sourceDocumentId: 'doc1',
      matchedDocumentId: 'm1',
      sourceSegment: 'Hello',
      matchedSegment: 'Hello',
      similarityScore: 100,
      matchMethod: 'EXACT_PHRASE',
      sourceStart: 0,
      sourceEnd: 5,
      provenance: 'DETERMINISTIC',
    },
  ];
  const output = applyHighlights(text, findings);

  assert.strictEqual(output[0].text, 'Hello');
  assert.strictEqual(output[0].findingId, 'f1');
  assert.strictEqual(output[1].text, ' world');
  assert.strictEqual(output[1].findingId, undefined);
});

// Test 3 — Two non-overlapping findings
runTest('Test 3 — Two non-overlapping findings', () => {
  const text = 'Hello world';
  const findings: any[] = [
    {
      sourceStart: 0,
      sourceEnd: 5,
      matchMethod: 'EXACT_PHRASE',
      findingId: 'f1',
      sourceSegment: 'Hello',
      sourceDocumentId: 'doc1',
      matchedDocumentId: 'm1',
      matchedSegment: 'Hello',
      similarityScore: 100,
      provenance: 'DETERMINISTIC',
    },
    {
      sourceStart: 6,
      sourceEnd: 11,
      matchMethod: 'NGRAM',
      findingId: 'f2',
      sourceSegment: 'world',
      sourceDocumentId: 'doc1',
      matchedDocumentId: 'm2',
      matchedSegment: 'world',
      similarityScore: 90,
      provenance: 'DETERMINISTIC',
    },
  ];
  const output = applyHighlights(text, findings);

  assert.strictEqual(output.length, 3);
  assert.strictEqual(output[0].text, 'Hello');
  assert.strictEqual(output[0].findingId, 'f1');
  assert.strictEqual(output[1].text, ' ');
  assert.strictEqual(output[1].findingId, undefined);
  assert.strictEqual(output[2].text, 'world');
  assert.strictEqual(output[2].findingId, 'f2');
});

// Test 4 — Two overlapping findings
runTest('Test 4 — Two overlapping findings', () => {
  const text = 'Hello world';
  const findings: any[] = [
    {
      sourceStart: 0,
      sourceEnd: 7,
      matchMethod: 'NGRAM',
      findingId: 'f1',
      sourceDocumentId: 'doc1',
      matchedDocumentId: 'm1',
      matchedSegment: 'Hello w',
      similarityScore: 80,
      provenance: 'DETERMINISTIC',
    },
    {
      sourceStart: 4,
      sourceEnd: 11,
      matchMethod: 'EXACT_PHRASE',
      findingId: 'f2',
      sourceDocumentId: 'doc1',
      matchedDocumentId: 'm2',
      matchedSegment: 'o world',
      similarityScore: 95,
      provenance: 'DETERMINISTIC',
    },
  ];
  const output = applyHighlights(text, findings);

  assert.strictEqual(output.length, 1);
  assert.strictEqual(output[0].method, 'EXACT_PHRASE');
  assert.strictEqual(output[0].findingId, 'f1');
  assert.strictEqual(output[0].text, 'Hello world');
});

// Test 5 — Colour class by method
runTest('Test 5 — Colour class by method', () => {
  const exactClass = methodToClass('EXACT_PHRASE');
  const ngramClass = methodToClass('NGRAM');
  const tokenClass = methodToClass('TOKEN_OVERLAP');

  assert.ok(exactClass.includes('red'), 'EXACT_PHRASE class must contain red');
  assert.ok(ngramClass.includes('orange'), 'NGRAM class must contain orange');
  assert.ok(tokenClass.includes('yellow'), 'TOKEN_OVERLAP class must contain yellow');
});

// Test 6 — filterVerifiedFindings drops PARTIAL
runTest('Test 6 — filterVerifiedFindings drops PARTIAL', () => {
  const f1: any = { findingId: 'f1', matchedDocumentId: 'a' };
  const f2: any = { findingId: 'f2', matchedDocumentId: 'b' };
  const matches: any[] = [
    { sourceId: 'a', provenance: { provenanceState: 'VERIFIED' } },
    { sourceId: 'b', provenance: { provenanceState: 'PARTIAL' } },
  ];
  const result = filterVerifiedFindings([f1, f2], matches);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].findingId, 'f1');
});

// Test 7 — Out-of-bounds finding is discarded
runTest('Test 7 — Out-of-bounds finding is discarded', () => {
  const text = 'Hello';
  const findings: any[] = [
    {
      sourceStart: 0,
      sourceEnd: 100,
      findingId: 'f_oob',
      matchMethod: 'EXACT_PHRASE',
      sourceSegment: 'Hello',
    },
  ];
  const output = applyHighlights(text, findings);

  assert.strictEqual(output.length, 1);
  assert.strictEqual(output[0].findingId, undefined);
  assert.strictEqual(output[0].text, 'Hello');
});

// Test 8 — Determinism
runTest('Test 8 — Determinism across shuffled findings', () => {
  const text = 'The quick brown fox jumps over the lazy dog near the riverbank.';
  const f1: any = {
    findingId: 'f1',
    sourceStart: 0,
    sourceEnd: 15,
    matchMethod: 'EXACT_PHRASE',
    sourceSegment: 'The quick brown',
  };
  const f2: any = {
    findingId: 'f2',
    sourceStart: 10,
    sourceEnd: 25,
    matchMethod: 'NGRAM',
    sourceSegment: 'brown fox jumps',
  };
  const f3: any = {
    findingId: 'f3',
    sourceStart: 35,
    sourceEnd: 48,
    matchMethod: 'TOKEN_OVERLAP',
    sourceSegment: 'the lazy dog',
  };

  const listA = [f1, f2, f3];
  const listB = [f3, f1, f2];
  const listC = [f2, f3, f1];

  const resA = JSON.stringify(applyHighlights(text, listA));
  const resB = JSON.stringify(applyHighlights(text, listB));
  const resC = JSON.stringify(applyHighlights(text, listC));

  assert.strictEqual(resA, resB);
  assert.strictEqual(resB, resC);
});

console.log('================================================================');
console.log(`TOTAL: ${passCount} PASS / ${failCount} FAIL`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
