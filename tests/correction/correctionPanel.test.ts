/**
 * GRADIFI VERIFY - CORRECTION PANEL & CITATION FORMATTER TEST SUITE
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import assert from 'node:assert';
import { formatCitation, CitationFormat } from '../../src/components/verify/citationFormatter';
import { filterVerifiedFindings } from '../../src/components/verify/highlightUtils';
import { EvidenceMatch, SimilarityFinding } from '../../src/services/verify/types';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS — ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`FAIL — ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('================================================================');
console.log('HOEOS CORRECTION PANEL & CITATION FORMATTER TEST SUITE');
console.log('================================================================');

// Fixtures
const verifiedMatch: EvidenceMatch = {
  sourceId: 'src-verified-001',
  title: 'Federated Learning Principles',
  authors: ['Alice Smith', 'Bob Jones'],
  url: 'https://example.com/paper1',
  doi: '10.1038/s41586-023-00001-x',
  matchedText: 'Federated learning enables machine learning models to be trained',
  originalSnippet: 'Federated learning enables machine learning models to be trained across decentralized devices.',
  matchType: 'exact',
  matchPercentage: 95,
  relevanceScore: 0.98,
  provenance: {
    provider: 'crossref',
    providerRecordId: '10.1038/s41586-023-00001-x',
    retrievedAt: '2026-09-23T12:00:00Z',
    sourceType: 'academic',
    sourceUrl: 'https://example.com/paper1',
    title: 'Federated Learning Principles',
    authors: ['Alice Smith', 'Bob Jones'],
    doi: '10.1038/s41586-023-00001-x',
    publishedYear: 2024,
    publisher: 'Nature Publishing Group',
    provenanceState: 'VERIFIED',
  },
};

const partialMatch: EvidenceMatch = {
  sourceId: 'src-partial-002',
  title: 'Decentralized AI Architectures',
  authors: ['Charlie Brown'],
  url: 'https://example.com/paper2',
  matchedText: 'Decentralized devices preserve privacy',
  originalSnippet: 'Decentralized devices preserve privacy during model aggregation.',
  matchType: 'lexical',
  matchPercentage: 70,
  relevanceScore: 0.65,
  provenance: {
    provider: 'openalex',
    providerRecordId: 'W123456789',
    retrievedAt: '2026-09-23T12:00:00Z',
    sourceType: 'academic',
    sourceUrl: 'https://example.com/paper2',
    title: 'Decentralized AI Architectures',
    authors: ['Charlie Brown'],
    publishedYear: 2022,
    provenanceState: 'PARTIAL',
  },
};

const verifiedFinding: SimilarityFinding = {
  findingId: 'find-001',
  sourceDocumentId: 'doc-001',
  matchedDocumentId: 'src-verified-001',
  sourceSegment: 'Federated learning enables machine learning models to be trained across decentralized devices.',
  matchedSegment: 'Federated learning enables machine learning models to be trained across decentralized devices.',
  similarityScore: 95,
  matchMethod: 'EXACT_PHRASE',
  sourceStart: 0,
  sourceEnd: 92,
  provenance: 'DETERMINISTIC',
};

const partialFinding: SimilarityFinding = {
  findingId: 'find-002',
  sourceDocumentId: 'doc-001',
  matchedDocumentId: 'src-partial-002',
  sourceSegment: 'Decentralized devices preserve privacy during aggregation.',
  matchedSegment: 'Decentralized devices preserve privacy during model aggregation.',
  similarityScore: 70,
  matchMethod: 'TOKEN_OVERLAP',
  sourceStart: 93,
  sourceEnd: 150,
  provenance: 'DETERMINISTIC',
};

// Test 1 — Empty findings: formatter returns no cards
runTest('Test 1 — Empty findings: formatter returns no cards', () => {
  const result = filterVerifiedFindings([], [verifiedMatch]);
  assert.strictEqual(result.length, 0);
});

// Test 2 — One finding with VERIFIED source: one card
runTest('Test 2 — One finding with VERIFIED source: one card', () => {
  const result = filterVerifiedFindings([verifiedFinding], [verifiedMatch]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].findingId, 'find-001');
});

// Test 3 — One finding with PARTIAL source: no card
runTest('Test 3 — One finding with PARTIAL source: no card', () => {
  const result = filterVerifiedFindings([partialFinding], [partialMatch]);
  assert.strictEqual(result.length, 0);
});

// Test 4 — APA format correct for a known EvidenceMatch
runTest('Test 4 — APA format correct for a known EvidenceMatch', () => {
  const apa = formatCitation(verifiedMatch, 'APA');
  assert.ok(apa.includes('Alice Smith, Bob Jones'), 'Should include authors');
  assert.ok(apa.includes('(2024)'), 'Should include year');
  assert.ok(apa.includes('Federated Learning Principles'), 'Should include title');
  assert.ok(apa.includes('Nature Publishing Group'), 'Should include publisher');
  assert.ok(apa.includes('https://doi.org/10.1038/s41586-023-00001-x'), 'Should include DOI url');
});

// Test 5 — MLA format correct for the same match
runTest('Test 5 — MLA format correct for the same match', () => {
  const mla = formatCitation(verifiedMatch, 'MLA');
  assert.ok(mla.includes('Alice Smith, Bob Jones'), 'Should include authors');
  assert.ok(mla.includes('"Federated Learning Principles."'), 'Should include quoted title');
  assert.ok(mla.includes('Nature Publishing Group, 2024'), 'Should include publisher and year');
  assert.ok(mla.includes('https://doi.org/10.1038/s41586-023-00001-x'), 'Should include DOI url');
});

// Test 6 — Determinism: same match + same format -> identical string
runTest('Test 6 — Determinism: same match + same format -> identical string', () => {
  const c1 = formatCitation(verifiedMatch, 'Chicago');
  const c2 = formatCitation(verifiedMatch, 'Chicago');
  assert.strictEqual(c1, c2);
  const h1 = formatCitation(verifiedMatch, 'Harvard');
  const h2 = formatCitation(verifiedMatch, 'Harvard');
  assert.strictEqual(h1, h2);
});

// Test 7 — Citation with missing DOI uses ISBN in output
runTest('Test 7 — Citation with missing DOI uses ISBN in output', () => {
  const isbnMatch: EvidenceMatch = {
    ...verifiedMatch,
    doi: undefined,
    isbn: '978-0-123456-78-9',
    provenance: {
      ...verifiedMatch.provenance,
      doi: undefined,
      isbn: '978-0-123456-78-9',
    },
  };
  const apa = formatCitation(isbnMatch, 'APA');
  assert.ok(apa.includes('ISBN: 978-0-123456-78-9'), 'Should include ISBN when DOI is absent');
  assert.ok(!apa.includes('https://doi.org'), 'Should not contain DOI');
});

// Test 8 — Citation with no authors uses "Author metadata unavailable"
runTest('Test 8 — Citation with no authors uses "Author metadata unavailable"', () => {
  const noAuthorMatch: EvidenceMatch = {
    ...verifiedMatch,
    authors: [],
    provenance: {
      ...verifiedMatch.provenance,
      authors: [],
    },
  };
  const apa = formatCitation(noAuthorMatch, 'APA');
  assert.ok(apa.startsWith('Author metadata unavailable'), 'Should start with Author metadata unavailable');
});

console.log('================================================================');
console.log(`TOTAL: ${passed} PASS / ${failed} FAIL`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
