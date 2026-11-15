import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { analyzeDocumentEvidence } from '../src/services/verify/deterministicEngine';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

describe('G2.1 PDF structural ingestion to deterministic engine E2E', () => {
  it('parses a text-native PDF structurally in Node and produces stable canonical engine identity', async () => {
    const fixturePath = 'tests/fixtures/ingestion/quantum_federated_learning_paper.pdf';
    const bytes = fs.readFileSync(fixturePath);

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );

    const ingestion = await ingestDocument({
      name: 'quantum_federated_learning_paper.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    expect(ingestion.success).toBe(true);
    expect(ingestion.format).toBe('pdf');
    expect(ingestion.extractionMethod).toBe('pdf_stream_extractor');
    expect(ingestion.ocrUsed).toBe(false);
    expect(ingestion.ocrStatus).toBe('NOT_REQUIRED');
    expect(ingestion.canonicalReady).toBe(true);
    expect(ingestion.canonicalDocument).toBeDefined();
    expect(ingestion.canonicalDocument!.normalizedText.length).toBeGreaterThan(50);

    const canonicalText = ingestion.canonicalDocument!.normalizedText;
    const runA = analyzeDocumentEvidence({
      documentText: canonicalText,
      candidateMatches: []
    });
    const runB = analyzeDocumentEvidence({
      documentText: canonicalText,
      candidateMatches: []
    });

    expect(runA.documentHash).toBe(runB.documentHash);
    expect(runA.evidenceHash).toBe(runB.evidenceHash);
    expect(runA.aggregation.totalDocumentTokens).toBeGreaterThan(0);
  }, 120000);
});
