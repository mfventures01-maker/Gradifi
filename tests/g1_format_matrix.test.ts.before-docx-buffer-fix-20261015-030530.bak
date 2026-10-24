import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

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

describe('G1 Universal Ingestion Deterministic Format Matrix', () => {
  it('TEST 1: DOCX (golden_test_001.docx) reaches canonical text deterministically', async () => {
    const docxPath = path.resolve(process.cwd(), 'tests/hoeos/g2/golden_test_001.docx');
    const docxBytes = fs.readFileSync(docxPath);

    const r1 = await ingestDocument({ name: 'golden_test_001.docx', buffer: docxBytes });
    const r2 = await ingestDocument({ name: 'golden_test_001.docx', buffer: docxBytes });

    expect(r1.success).toBe(true);
    expect(r1.canonicalDocument).toBeDefined();
    expect(r1.canonicalDocument?.documentId).toBe(r2.canonicalDocument?.documentId);
  });

  it('TEST 2: Text-native PDF reaches canonical text deterministically', async () => {
    const pdfStreamText =
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kinds [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj << /Length 200 >>\nstream\nBT\n/F1 12 Tf\n(Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks) Tj\n(By Dr. Aris Thorne and Prof. Elena Rostova 2024 Journal of Advanced Computer Science) Tj\n(Federated learning across edge networks faces latency challenges. We propose quantum inspired architecture for high order evidence systems.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n500\n%%EOF';
    const pdfBytes = new TextEncoder().encode(pdfStreamText);

    const r1 = await ingestDocument({ name: 'academic_paper.pdf', buffer: pdfBytes });
    const r2 = await ingestDocument({ name: 'academic_paper.pdf', buffer: pdfBytes });

    expect(r1.success).toBe(true);
    expect(r1.canonicalDocument).toBeDefined();
    expect(r1.canonicalDocument?.documentId).toBe(r2.canonicalDocument?.documentId);
  });

  it('TEST 3: TXT reaches canonical text deterministically', async () => {
    const txtContent =
      'Gradifi Universal Ingestion Service Text Document\r\nLine endings are normalized deterministically.\r\nThis document verifies plain text extraction without external dependencies.';
    const txtBytes = new TextEncoder().encode(txtContent);

    const r1 = await ingestDocument({ name: 'sample.txt', buffer: txtBytes });
    const r2 = await ingestDocument({ name: 'sample.txt', buffer: txtBytes });

    expect(r1.success).toBe(true);
    expect(r1.canonicalDocument).toBeDefined();
    expect(r1.canonicalDocument?.documentId).toBe(r2.canonicalDocument?.documentId);
  });

  it('TEST 4: EPUB reaches canonical text deterministically', async () => {
    const epubContainerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

    const epubOpfContent = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

    const epubCh1 = `<!DOCTYPE html><html><body><h1>Chapter 1: Quantum Foundations</h1><p>Deterministic similarity engine guarantees provenance transparency across distributed edge nodes.</p></body></html>`;
    const epubCh2 = `<!DOCTYPE html><html><body><h2>Chapter 2: Verification Protocol</h2><p>Multi-model AI federation verifies academic evidence non-repudiation.</p></body></html>`;

    const epubZipBytes = createZipArchive({
      'META-INF/container.xml': epubContainerXml,
      'OEBPS/content.opf': epubOpfContent,
      'OEBPS/chapter1.xhtml': epubCh1,
      'OEBPS/chapter2.xhtml': epubCh2,
    });

    const r1 = await ingestDocument({ name: 'quantum_book.epub', buffer: epubZipBytes });
    const r2 = await ingestDocument({ name: 'quantum_book.epub', buffer: epubZipBytes });

    expect(r1.success).toBe(true);
    expect(r1.canonicalDocument).toBeDefined();
    expect(r1.canonicalDocument?.documentId).toBe(r2.canonicalDocument?.documentId);
  });

  it('TEST 5: Malformed DOCX fails closed', async () => {
    const malformedDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const res = await ingestDocument({ name: 'corrupted.docx', buffer: malformedDocx });

    expect(res.success).toBe(false);
    expect(res.canonicalReady).toBe(false);
  });
});