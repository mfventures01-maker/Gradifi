/**
 * HOEOS V2 G1 COMPREHENSIVE 17-FORMAT CONTRACT TEST
 * Verifies all 17 formats in the G1 contract + falsification negative controls + repeatability.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ingestDocument } from '../src/services/verify/universalIngestionService';
import { computeHash } from '../src/services/verify/documentNormalizer';

describe('HOEOS V2 G1 Comprehensive 17-Format Contract & Repeatability', () => {
  const dir = path.resolve('tests/fixtures/ingestion');

  // Group 1: Modern Supported Document Formats
  const supportedCases = [
    {
      format: 'pdf',
      fixture: 'quantum_federated_learning_paper.pdf',
      method: 'pdf_stream_extractor',
      marker: 'Quantum Entanglement and Decoupled Neural Architecture'
    },
    {
      format: 'docx',
      fixture: 'sample.docx', // We will also test golden_test_001.docx
      altPath: path.resolve('tests/hoeos/g2/golden_test_001.docx'),
      method: 'docx_xml_extractor',
      marker: 'Gradifi Universal Ingestion Service'
    },
    {
      format: 'txt',
      fixture: 'sample.txt',
      method: 'txt_text_reader',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'md',
      fixture: 'sample.md',
      method: 'md_text_reader',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'html',
      fixture: 'sample.html',
      method: 'html_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'htm',
      fixture: 'sample.htm',
      method: 'html_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'rtf',
      fixture: 'sample.rtf',
      method: 'rtf_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'csv',
      fixture: 'sample.csv',
      method: 'csv_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'json',
      fixture: 'sample.json',
      method: 'json_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'xml',
      fixture: 'sample.xml',
      method: 'xml_parser',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'epub',
      fixture: 'sample.epub',
      method: 'epub_xhtml_extractor',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'odt',
      fixture: 'sample.odt',
      method: 'odt_xml_extractor',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'pptx',
      fixture: 'sample.pptx',
      method: 'pptx_xml_extractor',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    },
    {
      format: 'xlsx',
      fixture: 'sample.xlsx',
      method: 'xlsx_xml_extractor',
      marker: 'GRADIFI UNIVERSAL INGESTION FIXTURE'
    }
  ];

  for (const c of supportedCases) {
    it(`Supported format [${c.format}]: extracts valid canonical text and achieves canonicalReady deterministically`, async () => {
      const filePath = c.altPath || path.join(dir, c.fixture);
      expect(fs.existsSync(filePath)).toBe(true);

      const bytes = fs.readFileSync(filePath);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

      // Repeat 3 times for determinism verification
      let firstHash = '';
      for (let run = 1; run <= 3; run++) {
        const res = await ingestDocument({ name: path.basename(filePath), buffer });

        expect(res.success).toBe(true);
        expect(res.canonicalReady).toBe(true);
        expect(res.text.length).toBeGreaterThan(0);
        expect(res.text).toContain(c.marker);
        expect(res.extractionMethod).toBe(c.method);
        expect(res.canonicalDocument).toBeDefined();

        const currentHash = computeHash(res.text);
        if (run === 1) {
          firstHash = currentHash;
        } else {
          expect(currentHash).toBe(firstHash);
        }
      }
    });
  }

  // OCR Branch Test
  it('Supported format [pdf - OCR]: extracts scanned image PDF via Tesseract and sets ocrUsed=true', { timeout: 60000 }, async () => {
    const ocrPath = path.join(dir, 'scanned_page_001.pdf');
    expect(fs.existsSync(ocrPath)).toBe(true);

    const bytes = fs.readFileSync(ocrPath);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const res = await ingestDocument({ name: 'scanned_page_001.pdf', buffer });
    expect(res.success).toBe(true);
    expect(res.ocrUsed).toBe(true);
    expect(res.ocrStatus).toBe('USED');
    expect(res.extractionMethod).toBe('ocr_tesseract');
    expect(res.text).toContain('HOEOS_KNOWN_PHRASE_7F3A9C');
    expect(res.canonicalReady).toBe(true);
  });

  // Group 2: Legacy Binary Fail-Closed Formats
  const legacyCases = [
    { format: 'doc', fixture: 'legacy.doc', target: 'docx' },
    { format: 'ppt', fixture: 'legacy.ppt', target: 'pptx' },
    { format: 'xls', fixture: 'legacy.xls', target: 'xlsx' }
  ];

  for (const l of legacyCases) {
    it(`Legacy format [${l.format}]: rejects fail-closed with UNSUPPORTED_FORMAT and helpful conversion guidance`, async () => {
      const filePath = path.join(dir, l.fixture);
      const bytes = fs.readFileSync(filePath);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

      const res = await ingestDocument({ name: l.fixture, buffer });
      expect(res.success).toBe(false);
      expect(res.canonicalReady).toBe(false);
      expect(res.error?.code).toBe('UNSUPPORTED_FORMAT');
      expect(res.error?.message).toContain(`Legacy binary .${l.format} format is not directly supported.`);
      expect(res.error?.message).toContain(`Please convert ${l.fixture} to .${l.target} or PDF.`);
    });
  }

  // Group 3: Falsification Negative Controls
  const negativeCases = [
    { name: 'empty.txt', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'empty.md', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'empty.html', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'empty.htm', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'empty.rtf', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'empty.csv', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'invalid.json', expectedCode: 'MALFORMED_DOCUMENT' },
    { name: 'malformed.xml', expectedCode: 'MALFORMED_DOCUMENT' },
    { name: 'corrupted.docx', expectedCode: 'INVALID_PACKAGE' },
    { name: 'corrupted.odt', expectedCode: 'INVALID_PACKAGE' },
    { name: 'corrupted.pptx', expectedCode: 'INVALID_PACKAGE' },
    { name: 'corrupted.xlsx', expectedCode: 'INVALID_PACKAGE' },
    { name: 'corrupted.epub', expectedCode: 'EMPTY_DOCUMENT' },
    { name: 'corrupted.pdf', expectedCode: 'TEXT_EXTRACTION_UNAVAILABLE' }
  ];

  for (const neg of negativeCases) {
    it(`Negative Control [${neg.name}]: fails closed safely with code ${neg.expectedCode}`, async () => {
      const filePath = path.join(dir, neg.name);
      expect(fs.existsSync(filePath)).toBe(true);

      const bytes = fs.readFileSync(filePath);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

      const res = await ingestDocument({ name: neg.name, buffer });
      expect(res.success).toBe(false);
      expect(res.canonicalReady).toBe(false);
      if (neg.expectedCode === 'INVALID_PACKAGE') {
        expect(['INVALID_PACKAGE', 'CORRUPT_PACKAGE']).toContain(res.error?.code);
      } else {
        expect(res.error?.code).toBe(neg.expectedCode);
      }
    });
  }
});
