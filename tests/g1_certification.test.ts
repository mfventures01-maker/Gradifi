import { describe, it, expect } from 'vitest';
import { ingestDocument, G1_MAX_FILE_SIZE_BYTES, G1_MAX_CANONICAL_TEXT_BYTES } from '../src/services/verify/universalIngestionService';
import { unzipPackageTextFile } from '../src/services/verify/ingestionAdapters/officeZipAdapter';

function createZipArchive(files: Record<string, string | Uint8Array>): Uint8Array {
  const parts: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const fileBytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const nameBytes = new TextEncoder().encode(filename);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, fileBytes.length, true);
    view.setUint32(22, fileBytes.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, 0, true);
    cdView.setUint32(20, fileBytes.length, true);
    cdView.setUint32(24, fileBytes.length, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cdHeader.set(nameBytes, 46);

    centralDirectoryHeaders.push(cdHeader);
    parts.push(header);
    parts.push(fileBytes);

    offset += header.length + fileBytes.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const cd of centralDirectoryHeaders) {
    parts.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, centralDirectoryHeaders.length, true);
  eocdView.setUint16(10, centralDirectoryHeaders.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdStart, true);
  eocdView.setUint16(20, 0, true);
  parts.push(eocd);

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

describe('G1 Ingestion Engine Certification Suite', () => {
  it('1. Format Matrix: Ingests TXT successfully with hash and canonical text', async () => {
    const textContent = 'Gradifi G1 TXT Ingestion Test Content - 123456789';
    const result = await ingestDocument({ name: 'test.txt', text: textContent });

    expect(result.success).toBe(true);
    expect(result.text).toContain('Gradifi G1 TXT Ingestion Test Content');
    expect(result.format).toBe('txt');
    expect(result.canonicalDocument?.documentId).toBeDefined();
    expect(result.canonicalDocument?.documentId.length).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('2. Format Matrix: Ingests DOCX successfully', async () => {
    const docxXml = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX Certification Standard</w:t></w:r></w:p></w:body></w:document>';
    const zipBytes = createZipArchive({ 'word/document.xml': docxXml });
    const result = await ingestDocument({ name: 'certified.docx', buffer: zipBytes.buffer });

    expect(result.success).toBe(true);
    expect(result.text).toContain('Hello DOCX Certification Standard');
    expect(result.format).toBe('docx');
    expect(result.canonicalDocument?.documentId).toBeDefined();
  });

  it('3. Format Matrix: Ingests EPUB successfully', async () => {
    const zipBytes = createZipArchive({
      'mimetype': 'application/epub+zip',
      'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      'OEBPS/content.opf': '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><manifest><item id="item1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="item1"/></spine></package>',
      'OEBPS/chapter1.xhtml': '<html><body><h1>EPUB Certification Header</h1><p>EPUB body paragraph test.</p></body></html>'
    });
    const result = await ingestDocument({ name: 'book.epub', buffer: zipBytes.buffer });

    expect(result.success).toBe(true);
    expect(result.text).toContain('EPUB Certification Header');
    expect(result.text).toContain('EPUB body paragraph test.');
    expect(result.format).toBe('epub');
    expect(result.canonicalDocument?.documentId).toBeDefined();
  });

  it('4. Resource Limits: Rejects files exceeding 50MB with FILE_TOO_LARGE code', async () => {
    const overSizedInput = {
      name: 'huge.txt',
      buffer: new ArrayBuffer(G1_MAX_FILE_SIZE_BYTES + 1024),
    };

    const result = await ingestDocument(overSizedInput);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('FILE_TOO_LARGE');
    expect(result.error?.message).toContain('exceeds maximum allowed 50MB limit');
  });

  it('5. Resource Limits: Rejects canonical text exceeding 1MB with TEXT_SIZE_EXCEEDED code', async () => {
    const largeText = 'A'.repeat(G1_MAX_CANONICAL_TEXT_BYTES + 10);
    const result = await ingestDocument({ name: 'oversized_text.txt', text: largeText });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TEXT_SIZE_EXCEEDED');
    expect(result.error?.message).toContain('exceeds maximum 1MB limit');
  });

  it('6. Resource Limits: Decompresses valid zip archive and extracts target document', async () => {
    const xmlContent = 'Test uncompressed content stream';
    const zipBytes = createZipArchive({ 'word/document.xml': xmlContent });
    const extracted = await unzipPackageTextFile(zipBytes.buffer, 'word/document.xml');
    expect(extracted).toBe(xmlContent);
  });

  it('7. 2x Determinism Contract: Ingesting identical file twice produces identical documentId', async () => {
    const sampleText = 'Deterministic Hash Test Content 12345';
    const input1 = { name: 'doc1.txt', text: sampleText };
    const input2 = { name: 'doc1.txt', text: sampleText };

    const result1 = await ingestDocument(input1);
    const result2 = await ingestDocument(input2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.canonicalDocument?.documentId).toBe(result2.canonicalDocument?.documentId);
  });

  it('8. Fail-Closed Handling: Unsupported format returns UNSUPPORTED_FORMAT code', async () => {
    const unknownInput = { name: 'unknown.bin', buffer: new ArrayBuffer(16) };
    const result = await ingestDocument(unknownInput);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNSUPPORTED_FORMAT');
    expect(result.error?.message).toContain('Unsupported file format .bin');
  });
});
