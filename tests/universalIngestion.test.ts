/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION & CANONICAL EXTRACTION SUITE
 * HOEOS Phase 2 Standard: 17-Format Extraction, Determinism & Canonical Convergence Tests.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectFileFormat,
  ingestDocument,
  convertToCanonicalDocument
} from '../src/services/verify/universalIngestionService';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';

describe('HOEOS P2 Universal Ingestion & Canonical Extraction Suite', () => {
  const fixtureDir = path.join(__dirname, 'fixtures', 'ingestion');

  // 1. Format Detection Test
  it('1. detects file formats deterministically across all 17 supported extensions', () => {
    const formats: Array<[string, string]> = [
      ['paper.pdf', 'pdf'],
      ['document.doc', 'doc'],
      ['manuscript.docx', 'docx'],
      ['styled.rtf', 'rtf'],
      ['open.odt', 'odt'],
      ['notes.txt', 'txt'],
      ['book.epub', 'epub'],
      ['page.html', 'html'],
      ['page.htm', 'htm'],
      ['readme.md', 'md'],
      ['slides.ppt', 'ppt'],
      ['deck.pptx', 'pptx'],
      ['sheets.xls', 'xls'],
      ['workbook.xlsx', 'xlsx'],
      ['data.csv', 'csv'],
      ['config.json', 'json'],
      ['metadata.xml', 'xml']
    ];

    for (const [filename, expectedFormat] of formats) {
      expect(detectFileFormat(filename)).toBe(expectedFormat);
    }
    expect(detectFileFormat('unknown.xyz')).toBe('unknown');
  });

  // 2. TXT Extraction & Empty File Rejection
  it('2. extracts TXT file and rejects empty TXT file cleanly', async () => {
    const validTxtPath = path.join(fixtureDir, 'sample.txt');
    const validText = fs.readFileSync(validTxtPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.txt', text: validText });
    
    expect(res.success).toBe(true);
    expect(res.format).toBe('txt');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');
    expect(res.text).toContain('GRADIFI-P2-001');
    expect(res.wordCount).toBeGreaterThan(10);
    expect(res.canonicalReady).toBe(true);

    const emptyRes = await ingestDocument({ name: 'empty.txt', text: '   ' });
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.error?.code).toBe('EMPTY_DOCUMENT');
  });

  // 3. Markdown (MD) Extraction & Formatting Stripping
  it('3. extracts Markdown documents deterministically stripping header markers', async () => {
    const mdPath = path.join(fixtureDir, 'sample.md');
    const mdText = fs.readFileSync(mdPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.md', text: mdText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('md');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');
    expect(res.text).not.toContain('# GRADIFI');
    expect(res.canonicalReady).toBe(true);
  });

  // 4. HTML / HTM Extraction & Tag Stripping
  it('4. extracts HTML documents stripping script and style tags', async () => {
    const htmlPath = path.join(fixtureDir, 'sample.html');
    const htmlText = fs.readFileSync(htmlPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.html', text: htmlText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('html');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');
    expect(res.text).not.toContain('ignore script');
    expect(res.text).not.toContain('color: red');
  });

  // 5. RTF Extraction
  it('5. extracts RTF documents removing formatting control words', async () => {
    const rtfPath = path.join(fixtureDir, 'sample.rtf');
    const rtfText = fs.readFileSync(rtfPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.rtf', text: rtfText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('rtf');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');
    expect(res.text).not.toContain('\\rtf1');
  });

  // 6. Structured CSV Extraction
  it('6. extracts CSV spreadsheet rows deterministically', async () => {
    const csvPath = path.join(fixtureDir, 'sample.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.csv', text: csvText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('csv');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');
    expect(res.text).toContain('GRADIFI-P2-001');
  });

  // 7. Structured JSON Extraction & Malformed Error Handling
  it('7. extracts JSON documents with key sorting and handles invalid JSON syntax', async () => {
    const jsonPath = path.join(fixtureDir, 'sample.json');
    const jsonText = fs.readFileSync(jsonPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.json', text: jsonText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('json');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');

    const invalidPath = path.join(fixtureDir, 'invalid.json');
    const invalidText = fs.readFileSync(invalidPath, 'utf-8');
    const errRes = await ingestDocument({ name: 'invalid.json', text: invalidText });

    expect(errRes.success).toBe(false);
    expect(errRes.error?.code).toBe('MALFORMED_DOCUMENT');
  });

  // 8. XML Extraction & XXE Security Guard
  it('8. extracts XML safely and rejects XXE entity declarations', async () => {
    const xmlPath = path.join(fixtureDir, 'sample.xml');
    const xmlText = fs.readFileSync(xmlPath, 'utf-8');
    const res = await ingestDocument({ name: 'sample.xml', text: xmlText });

    expect(res.success).toBe(true);
    expect(res.format).toBe('xml');
    expect(res.text).toContain('GRADIFI UNIVERSAL INGESTION FIXTURE');

    const xxeXml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>';
    const secRes = await ingestDocument({ name: 'xxe.xml', text: xxeXml });

    expect(secRes.success).toBe(false);
    expect(secRes.error?.code).toBe('SECURITY_REJECTED');
  });

  // 9. Legacy Binary Format Rejection Boundary
  it('9. handles legacy binary .doc, .ppt, .xls returning UNSUPPORTED_FORMAT with clear message', async () => {
    const docRes = await ingestDocument({ name: 'legacy.doc', text: 'binary content' });
    expect(docRes.success).toBe(false);
    expect(docRes.error?.code).toBe('UNSUPPORTED_FORMAT');
    expect(docRes.error?.message).toContain('Please convert legacy.doc to .docx');

    const pptRes = await ingestDocument({ name: 'slides.ppt', text: 'binary content' });
    expect(pptRes.success).toBe(false);
    expect(pptRes.error?.code).toBe('UNSUPPORTED_FORMAT');

    const xlsRes = await ingestDocument({ name: 'sheet.xls', text: 'binary content' });
    expect(xlsRes.success).toBe(false);
    expect(xlsRes.error?.code).toBe('UNSUPPORTED_FORMAT');
  });

  // 10. File Size Limit Security Guard
  it('10. rejects files exceeding 15MB file size limit', async () => {
    const hugeBuffer = new ArrayBuffer(16 * 1024 * 1024); // 16 MB
    const res = await ingestDocument({ name: 'huge.txt', buffer: hugeBuffer });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('FILE_TOO_LARGE');
  });

  // 11. Deterministic Repeatability Test
  it('11. guarantees 100% deterministic output across 50 consecutive extractions', async () => {
    const txtPath = path.join(fixtureDir, 'sample.txt');
    const txtContent = fs.readFileSync(txtPath, 'utf-8');

    const baseline = await ingestDocument({ name: 'sample.txt', text: txtContent });
    const baselineCanonical = convertToCanonicalDocument(baseline);

    for (let i = 0; i < 50; i++) {
      const run = await ingestDocument({ name: 'sample.txt', text: txtContent });
      const canonical = convertToCanonicalDocument(run);

      expect(run.text).toBe(baseline.text);
      expect(run.wordCount).toBe(baseline.wordCount);
      expect(run.characterCount).toBe(baseline.characterCount);
      expect(canonical.documentId).toBe(baselineCanonical.documentId);
    }
  });

  // 12. Cross-Format Canonical Convergence Test
  it('12. converges identical semantic text across TXT, MD, HTML, and XML to identical documentId', async () => {
    const rawPhrase = 'GRADIFI UNIVERSAL INGESTION FIXTURE\nAlpha paragraph discussing quantum entanglement and federated edge networks.';

    const txtRes = await ingestDocument({ name: 'fixture.txt', text: rawPhrase });
    const mdRes = await ingestDocument({ name: 'fixture.md', text: `# ${rawPhrase}` });
    const htmlRes = await ingestDocument({ name: 'fixture.html', text: `<h1>GRADIFI UNIVERSAL INGESTION FIXTURE</h1><p>Alpha paragraph discussing quantum entanglement and federated edge networks.</p>` });

    const txtCanonical = convertToCanonicalDocument(txtRes);
    const mdCanonical = convertToCanonicalDocument(mdRes);
    const htmlCanonical = convertToCanonicalDocument(htmlRes);

    expect(txtCanonical.documentId).toBe(mdCanonical.documentId);
    expect(txtCanonical.documentId).toBe(htmlCanonical.documentId);
  });

  // 13. Scanned PDF / Zero-Text Error Boundary
  it('13. returns TEXT_EXTRACTION_UNAVAILABLE when PDF has no extractable text (prevents false 0% similarity)', async () => {
    const emptyPdfBuffer = new ArrayBuffer(500); // 500 bytes empty stream
    const res = await ingestDocument({ name: 'scanned_empty.pdf', buffer: emptyPdfBuffer });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('TEXT_EXTRACTION_UNAVAILABLE');
    expect(res.error?.message).toContain('Text extraction unavailable. OCR required.');
    expect(res.canonicalReady).toBe(false);
  });
});
