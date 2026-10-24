/**
 * G2 Runtime Verification — Repairs 2, 3, 4, 5
 * Executed via `npx tsx`. Exit 0 = all assertions pass.
 * No external test framework; local describe/it/expect shim.
 */
import { segmentDocument } from '../src/services/verify/documentNormalizer.js';
import {
  analyzeDocumentEvidence,
  extractSimilarityFindingsFromEvidenceMatches
} from '../src/services/verify/deterministicEngine.js';
import type { EvidenceMatch } from '../src/services/verify/types.js';

// --- Minimal test shim ---------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function describe(name: string, fn: () => void) {
  console.log(`\n[${name}]`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(`${name}: ${err?.message ?? String(err)}`);
    console.log(`  FAIL  ${name}: ${err?.message ?? err}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!(actual > expected)) {
        throw new Error(`expected > ${expected}, got ${actual}`);
      }
    },
    toContain(substr: string) {
      if (typeof actual !== 'string' || !actual.includes(substr)) {
        throw new Error(`expected string containing ${JSON.stringify(substr)}, got ${JSON.stringify(actual)}`);
      }
    }
  };
}
// -------------------------------------------------------------------------

describe('Repair 2 — sentence admission guard', () => {
  it('rejects the "4 ." pathological sentence', () => {
    const doc = segmentDocument('4 .\n5 .\n6 .\n', 'TEST-DOC');
    const allSentences = doc.paragraphs.flatMap(p => p.sentences);
    const pathological = allSentences.filter(s => s.text.trim() === '4 .');
    expect(pathological.length).toBe(0);
  });

  it('still admits a legitimate 5-token sentence', () => {
    const legit = 'The quick brown fox jumps over the lazy dog.';
    const doc = segmentDocument(legit, 'TEST-DOC');
    const allSentences = doc.paragraphs.flatMap(p => p.sentences);
    expect(allSentences.length).toBeGreaterThan(0);
    expect(allSentences[0].text.trim().length).toBeGreaterThan(15);
  });
});

describe('Repair 3 — containment guard', () => {
  const sourceSnippet = 'The document discusses federated learning in distributed systems.';
  const candidateMatch: EvidenceMatch = {
    sourceId: 'test-source',
    title: 'Test Source',
    authors: [],
    url: '',
    matchedText: sourceSnippet,
    matchPercentage: 50,
    matchType: 'lexical',
    provenance: {
      provider: 'openalex',
      providerRecordId: 'test-rec',
      retrievedAt: new Date().toISOString(),
      sourceType: 'document',
      sourceUrl: '',
      title: 'Test Source',
      authors: [],
      provenanceState: 'VERIFIED'
    }
  } as any;

  it('does not produce a finding from a single-token sentence containment', () => {
    const doc = 'Chapter 4 . This document is about distributed systems and other topics of interest.';
    const result = analyzeDocumentEvidence({
      documentText: doc,
      candidateMatches: [candidateMatch],
      engineVersion: 'test',
      policyVersion: 'test'
    } as any);
    const exactFindings = (result.aggregation.sentenceFlags as any[]).filter(
      (s: any) => s.similarityPercentage === 100 && s.text && s.text.trim() === '4 .'
    );
    expect(exactFindings.length).toBe(0);
  });
});

describe('Repairs 4 and 5 — warningsOut parameter and call-site propagation', () => {
  it('records suppression warnings when matches cannot be located', () => {
    const documentText = 'This is a short test document that does not contain the source snippets.';

    const unlocatableMatch: EvidenceMatch = {
      sourceId: 'test-source-A',
      title: 'A', authors: [], url: '',
      matchedText: 'This text does not appear in the document at all',
      matchPercentage: 40, matchType: 'lexical',
      provenance: {
        provider: 'openalex', providerRecordId: 'rec-A',
        retrievedAt: new Date().toISOString(), sourceType: 'document',
        sourceUrl: '', title: 'A', authors: [], provenanceState: 'VERIFIED'
      }
    } as any;

    const warnings: string[] = [];
    const findings = extractSimilarityFindingsFromEvidenceMatches(
      documentText, 'DOC-HASH', [unlocatableMatch], undefined, warnings
    );

    expect(findings.length).toBe(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('test-source-A');
    expect(warnings[0]).toContain('suppressed');
  });

  it('records nothing when all matches are locatable', () => {
    const documentText = 'This is a document about federated learning and related topics in detail.';

    const locatableMatch: EvidenceMatch = {
      sourceId: 'test-source-B',
      title: 'B', authors: [], url: '',
      matchedText: 'federated learning',
      matchPercentage: 60, matchType: 'exact',
      provenance: {
        provider: 'openalex', providerRecordId: 'rec-B',
        retrievedAt: new Date().toISOString(), sourceType: 'document',
        sourceUrl: '', title: 'B', authors: [], provenanceState: 'VERIFIED'
      }
    } as any;

    const warnings: string[] = [];
    const findings = extractSimilarityFindingsFromEvidenceMatches(
      documentText, 'DOC-HASH', [locatableMatch], undefined, warnings
    );

    expect(findings.length).toBeGreaterThan(0);
    const suppressions = warnings.filter(w => w.includes('suppressed'));
    expect(suppressions.length).toBe(0);
  });
});

console.log(`\n=== SUMMARY ===`);
console.log(`PASS: ${passed}`);
console.log(`FAIL: ${failed}`);
if (failed > 0) {
  console.log(`\nFailing assertions:`);
  failures.forEach(f => console.log(`  - ${f}`));
  if (typeof process !== 'undefined' && !process.env.VITEST) process.exit(1);
}
if (typeof process !== 'undefined' && !process.env.VITEST) process.exit(0);
