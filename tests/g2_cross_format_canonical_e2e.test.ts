import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import {
  analyzeDocumentEvidence,
  evaluateDocumentSimilarity,
} from '../src/services/verify/deterministicEngine';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { ingestDocument } from '../src/services/verify/universalIngestionService';
import type { EvidenceMatch } from '../src/services/verify/types';

const PDF_FIXTURE = 'tests/fixtures/ingestion/quantum_federated_learning_paper.pdf';

// PDF.js emits the three text objects in reading order, separated by spaces.
// TXT and DOCX are constructed from this exact extracted text so the test
// compares equivalent content rather than format-specific metadata.
const EXPECTED_CANONICAL_RAW_TEXT =
  'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks ' +
  'By Dr. Aris Thorne and Prof. Elena Rostova 2024 Journal of Advanced Computer Science ' +
  'Federated learning across edge networks faces latency challenges. We propose quantum inspired architecture for high order evidence systems.';

const SOURCE_PASSAGE =
  'Federated learning across edge networks faces latency challenges. We propose quantum inspired architecture for high order evidence systems.';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function buildDocxWithExactText(text: string): Uint8Array {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body><w:p><w:r><w:t xml:space="preserve">' +
    escaped +
    '</w:t></w:r></w:p></w:body></w:document>';

  return zipSync({
    'word/document.xml': strToU8(documentXml),
  });
}

function makeCandidate(sourceText: string): EvidenceMatch {
  const source = buildCanonicalAnalysisDocument({
    rawText: sourceText,
    filename: 'controlled-source.txt',
  });

  return {
    sourceId: source.documentId,
    title: 'G2 Controlled Positive Source',
    authors: ['G2 E2E Fixture'],
    url: '',
    matchedText: sourceText,
    originalSnippet: sourceText,
    matchType: 'exact',
    matchPercentage: 100,
    relevanceScore: 100,
    provenance: {
      provider: 'openalex',
      providerRecordId: source.documentId,
      retrievedAt: '2026-01-01T00:00:00.000Z',
      sourceType: 'document',
      sourceUrl: '',
      title: 'G2 Controlled Positive Source',
      authors: ['G2 E2E Fixture'],
      provenanceState: 'VERIFIED',
    },
  };
}

describe('G2 cross-format canonical authority E2E', () => {
  it('converges TXT, DOCX and PDF on identical canonical identity and deterministic positive evidence', async () => {
    const pdfBytes = fs.readFileSync(PDF_FIXTURE);
    expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const txt = await ingestDocument({
      name: 'equivalent.txt',
      mimeType: 'text/plain',
      text: EXPECTED_CANONICAL_RAW_TEXT,
    });

    const docxBytes = buildDocxWithExactText(EXPECTED_CANONICAL_RAW_TEXT);
    const docx = await ingestDocument({
      name: 'equivalent.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: toArrayBuffer(docxBytes),
    });

    const pdf = await ingestDocument({
      name: 'quantum_federated_learning_paper.pdf',
      mimeType: 'application/pdf',
      buffer: toArrayBuffer(new Uint8Array(pdfBytes)),
    });

    const ingestions = [
      { format: 'txt', result: txt },
      { format: 'docx', result: docx },
      { format: 'pdf', result: pdf },
    ];

    expect(txt.extractionMethod).toBe('txt_text_reader');
    expect(docx.extractionMethod).toBe('docx_xml_extractor');
    expect(pdf.extractionMethod).toBe('pdf_stream_extractor');

    for (const item of ingestions) {
      expect(item.result.success).toBe(true);
      expect(item.result.canonicalReady).toBe(true);
      expect(item.result.canonicalDocument).toBeDefined();
      expect(item.result.canonicalDocument!.rawText).toBe(EXPECTED_CANONICAL_RAW_TEXT);
    }

    const canonicalDocs = ingestions.map(item => item.result.canonicalDocument!);
    const baseline = canonicalDocs[0];

    for (const doc of canonicalDocs.slice(1)) {
      expect(doc.normalizedText).toBe(baseline.normalizedText);
      expect(doc.documentId).toBe(baseline.documentId);
      expect(doc.stats.characterCount).toBe(baseline.stats.characterCount);
      expect(doc.stats.tokenCount).toBe(baseline.stats.tokenCount);
    }

    const candidate = makeCandidate(SOURCE_PASSAGE);
    const engineRuns = canonicalDocs.map(doc =>
      analyzeDocumentEvidence({
        documentText: doc.rawText,
        candidateMatches: [candidate],
      }),
    );

    for (const run of engineRuns.slice(1)) {
      expect(run.documentHash).toBe(engineRuns[0].documentHash);
      expect(run.evidenceHash).toBe(engineRuns[0].evidenceHash);
      expect(run.overallSimilarity).toBe(engineRuns[0].overallSimilarity);
      expect(run.aggregation.totalDocumentTokens).toBe(engineRuns[0].aggregation.totalDocumentTokens);
      expect(run.aggregation.totalUniqueMatchedTokens).toBe(engineRuns[0].aggregation.totalUniqueMatchedTokens);
    }

    expect(engineRuns[0].overallSimilarity).toBeGreaterThan(0);
    expect(engineRuns[0].aggregation.sentenceFlags.length).toBeGreaterThan(0);
    expect(engineRuns[0].aggregation.phraseFlags.length).toBeGreaterThan(0);

    const sourceDoc = buildCanonicalAnalysisDocument({
      rawText: SOURCE_PASSAGE,
      filename: 'controlled-source.txt',
    });
    const similarityRuns = canonicalDocs.map(doc =>
      evaluateDocumentSimilarity(doc, sourceDoc),
    );
    const baselineFindingIds = similarityRuns[0].findings.map(f => f.findingId);

    expect(baselineFindingIds.length).toBeGreaterThan(0);

    similarityRuns.forEach((result, index) => {
      expect(result.findings.map(f => f.findingId)).toEqual(baselineFindingIds);
      expect(result.findings.every(f => f.provenance === 'DETERMINISTIC')).toBe(true);

      for (const finding of result.findings) {
        expect(typeof finding.sourceStart).toBe('number');
        expect(typeof finding.sourceEnd).toBe('number');
        expect(
          canonicalDocs[index].rawText.slice(finding.sourceStart!, finding.sourceEnd!),
        ).toBe(finding.sourceSegment);
      }
    });
  }, 120000);

  it('changes canonical identity when document content changes', async () => {
    const original = await ingestDocument({
      name: 'identity-original.txt',
      text: EXPECTED_CANONICAL_RAW_TEXT,
    });
    const changed = await ingestDocument({
      name: 'identity-changed.txt',
      text: EXPECTED_CANONICAL_RAW_TEXT + ' An additional independent sentence.',
    });

    expect(original.canonicalReady).toBe(true);
    expect(changed.canonicalReady).toBe(true);
    expect(changed.canonicalDocument!.documentId).not.toBe(
      original.canonicalDocument!.documentId,
    );
  });

  it('fails closed for empty text instead of issuing canonical identity', async () => {
    const empty = await ingestDocument({
      name: 'empty-g2-control.txt',
      text: '   ',
    });

    expect(empty.success).toBe(false);
    expect(empty.canonicalReady).toBe(false);
    expect(empty.canonicalDocument).toBeUndefined();
  });
});
