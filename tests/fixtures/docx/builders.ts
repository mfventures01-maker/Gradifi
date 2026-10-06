/**
 * G5-M03 PHASE 4 FIXTURE BUILDERS
 *
 * Programmatically construct DOCX test fixtures as Uint8Array.
 * Each builder returns a complete DOCX package (a valid ZIP with the
 * required OOXML structure). Builders are deterministic: identical
 * invocation produces identical bytes.
 *
 * This file is a test artifact. It is NOT imported by production code.
 *
 * Used by tests/docxExtractor.test.ts to exercise extractDocx from
 * src/services/verify/ingestionAdapters/docxExtractor.ts.
 */

import { zipSync, strToU8 } from 'fflate';

// -------------------------------------------------------------------------
// SHARED SCAFFOLD
// -------------------------------------------------------------------------

/**
 * Wrap a word/document.xml body in a minimal valid DOCX package.
 * The package contains the four parts required for a DOCX to be
 * recognized by Word and by any conforming extractor:
 *   [Content_Types].xml
 *   _rels/.rels
 *   word/document.xml
 *   word/_rels/document.xml.rels
 *
 * All other parts (styles, fonts, settings) are omitted. A conforming
 * extractor must not require them.
 */
function docxPackage(documentXml: string): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(docRels),
  };

  return zipSync(files, { level: 6 });
}

function wrapBody(innerXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${innerXml}</w:body>
</w:document>`;
}

// -------------------------------------------------------------------------
// VALID FIXTURES (F-SERIES)
// -------------------------------------------------------------------------

/**
 * F02 — xml:space="preserve" in a w:t element.
 * Verifies the extractor honors the attribute instead of trimming.
 */
export function buildF02XmlSpace(): Uint8Array {
  const body = `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">  padded text  </w:t>
      </w:r>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F03 — tracked insertion (w:ins).
 * Expect success with warning TRACKED_INSERTION_PRESENT, inserted text included.
 */
export function buildF03TrackedInsertion(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>Base text. </w:t></w:r>
      <w:ins w:id="1" w:author="Tester" w:date="2026-01-01T00:00:00Z">
        <w:r><w:t>Inserted text.</w:t></w:r>
      </w:ins>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F04 — tracked deletion (w:del).
 * Expect success with warning TRACKED_DELETION_PRESENT, deleted text excluded.
 */
export function buildF04TrackedDeletion(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>Kept text. </w:t></w:r>
      <w:del w:id="1" w:author="Tester" w:date="2026-01-01T00:00:00Z">
        <w:r><w:delText>Deleted text.</w:delText></w:r>
      </w:del>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F05 — XML entity references in text content.
 * Expect success, with &amp;, &lt;, &gt; preserved literally in rawText.
 */
export function buildF05XmlEntities(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>a &amp; b &lt; c &gt; d</w:t></w:r>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F06 — a small table with two rows and two columns.
 * Expect success, cells in row-major order, no data loss.
 */
export function buildF06Table(): Uint8Array {
  const cell = (t: string) =>
    `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
  const row = (a: string, b: string) =>
    `<w:tr>${cell(a)}${cell(b)}</w:tr>`;
  const body = `
    <w:tbl>
      ${row('A1', 'B1')}
      ${row('A2', 'B2')}
    </w:tbl>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F07 — multiple paragraphs with mixed punctuation.
 * Expect paragraphBreak segments separating each w:p.
 */
export function buildF07MultiParagraph(): Uint8Array {
  const body = `
    <w:p><w:r><w:t>First sentence. Second sentence!</w:t></w:r></w:p>
    <w:p><w:r><w:t>Third question? Fourth.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Fifth paragraph here.</w:t></w:r></w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F08 — footnote reference inside a paragraph.
 * Expect success with warning FOOTNOTE_REFERENCE_IGNORED.
 */
export function buildF08FootnoteReference(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>Text with footnote</w:t></w:r>
      <w:r>
        <w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr>
        <w:footnoteReference w:id="1"/>
      </w:r>
      <w:r><w:t> continuation.</w:t></w:r>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F09 — embedded drawing element.
 * Expect success with warning DRAWING_IGNORED.
 */
export function buildF09Drawing(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>Before drawing.</w:t></w:r>
      <w:r><w:drawing></w:drawing></w:r>
      <w:r><w:t>After drawing.</w:t></w:r>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F11 — empty body paragraph.
 * Expect success, with only the structural paragraphBreak for the empty paragraph.
 */
export function buildF11EmptyBodyParagraph(): Uint8Array {
  const body = `
    <w:p><w:r><w:t>Content paragraph.</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Another content paragraph.</w:t></w:r></w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * F12 — CRLF newlines inside w:t.
 * Expect success, CRLF preserved as-is in rawText.
 */
export function buildF12CrlfInText(): Uint8Array {
  const body = `
    <w:p>
      <w:r><w:t>line one
line two</w:t></w:r>
    </w:p>
  `;
  return docxPackage(wrapBody(body));
}

// -------------------------------------------------------------------------
// ADVERSARIAL FIXTURES (A-SERIES)
// -------------------------------------------------------------------------

/**
 * A01 — truncated ZIP (first 100 bytes of a valid DOCX).
 * Expect CORRUPT_PACKAGE.
 */
export function buildA01TruncatedZip(): Uint8Array {
  const valid = buildF02XmlSpace();
  return valid.slice(0, Math.min(100, valid.length));
}

/**
 * A02 — ZIP without word/document.xml.
 * Expect MISSING_MAIN_PART.
 */
export function buildA02MissingMainPart(): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypes),
    'README.txt': strToU8('Not a real DOCX.'),
  };
  return zipSync(files, { level: 6 });
}

/**
 * A03 — non-ZIP bytes (40 zero bytes).
 * Expect INVALID_DOCX.
 */
export function buildA03NotAZip(): Uint8Array {
  return new Uint8Array(40);
}

/**
 * A04 — ZIP entry named '../etc/passwd'.
 * Expect SECURITY_REJECTED.
 * fflate does not allow '..' in zipSync keys, so this fixture is built
 * by manually crafting a minimal ZIP with a single entry.
 */
export function buildA04PathTraversal(): Uint8Array {
  return craftZipWithEntryName('../etc/passwd', strToU8('payload'));
}

/**
 * A05 — ZIP entry with absolute path '/absolute/path.xml'.
 * Expect SECURITY_REJECTED.
 */
export function buildA05AbsolutePath(): Uint8Array {
  return craftZipWithEntryName('/absolute/path.xml', strToU8('payload'));
}

/**
 * A06 — word/document.xml contains <!DOCTYPE.
 * Expect SECURITY_REJECTED.
 */
export function buildA06Doctype(): Uint8Array {
  const body = `
    <!DOCTYPE foo [<!ELEMENT foo ANY>]>
    <w:p><w:r><w:t>Text.</w:t></w:r></w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * A07 — word/document.xml contains <!ENTITY.
 * Expect SECURITY_REJECTED.
 */
export function buildA07EntityDeclaration(): Uint8Array {
  const body = `
    <!DOCTYPE foo [<!ENTITY xxe "test">]>
    <w:p><w:r><w:t>Text.</w:t></w:r></w:p>
  `;
  return docxPackage(wrapBody(body));
}

/**
 * A08 — ZIP with two entries both named 'word/document.xml'.
 * Expect SECURITY_REJECTED (duplicate critical part).
 * fflate cannot produce duplicate keys via zipSync. Craft manually.
 */
export function buildA08DuplicateMainPart(): Uint8Array {
  return craftZipWithDuplicateEntries('word/document.xml');
}

/**
 * A09 — ZIP with a declared decompressed size of 500 MB.
 * The actual payload is tiny; the central directory declares an
 * inflated size. Expect SECURITY_REJECTED (before decompression).
 */
export function buildA09OversizedDeclared(): Uint8Array {
  return craftZipWithDeclaredSize('word/document.xml', strToU8('x'), 500 * 1024 * 1024);
}

/**
 * A10 — raw file of 60 MB (>= maxBytes default 50 MB).
 * Expect OVERSIZED.
 * Allocated at test time, not module load. Do not call this at import.
 */
export function buildA10OversizedRaw(): Uint8Array {
  return new Uint8Array(60 * 1024 * 1024);
}

// -------------------------------------------------------------------------
// MANUAL ZIP CRAFTING HELPERS
// -------------------------------------------------------------------------

/**
 * Craft a minimal valid ZIP containing exactly one entry with the
 * given name (which may include '..' or leading '/').
 * Enables traversal-rejection fixtures that fflate's zipSync refuses to create.
 */
function craftZipWithEntryName(name: string, data: Uint8Array): Uint8Array {
  return craftZip([{ name, data }]);
}

/**
 * Craft a ZIP with two entries sharing the same name.
 */
function craftZipWithDuplicateEntries(name: string): Uint8Array {
  return craftZip([
    { name, data: strToU8('first') },
    { name, data: strToU8('second') },
  ]);
}

/**
 * Craft a ZIP whose central directory declares a decompressed size
 * larger than the actual payload. This produces a package that a
 * naive extractor will try to decompress into a huge buffer.
 */
function craftZipWithDeclaredSize(
  name: string,
  data: Uint8Array,
  declaredSize: number,
): Uint8Array {
  return craftZip([{ name, data, declaredSize }]);
}

/**
 * Minimal ZIP writer. Only supports entries with no compression
 * (STORED, method 0). Sufficient for adversarial fixtures where the
 * bytes do not need to be extractable — the extractor rejects them
 * during validation, before decompression.
 */
function craftZip(
  entries: Array<{ name: string; data: Uint8Array; declaredSize?: number }>,
): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];

  // Local file headers + data
  const localHeaderOffsets: number[] = [];
  let offset = 0;
  const localHeaders: number[] = [];

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const size = e.declaredSize ?? e.data.length;

    const lh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);   // local file header signature
    dv.setUint16(4, 20, true);           // version needed
    dv.setUint16(6, 0, true);            // flags
    dv.setUint16(8, 0, true);            // compression = STORED
    dv.setUint16(10, 0, true);           // mod time
    dv.setUint16(12, 0, true);           // mod date
    dv.setUint32(14, 0, true);           // crc32 (may be 0; extractor should reject or ignore)
    dv.setUint32(18, e.data.length, true);  // compressed size
    dv.setUint32(22, size, true);        // uncompressed size (declared)
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);           // extra field length
    lh.set(nameBytes, 30);

    localHeaders.push(offset);
    parts.push(lh, e.data);
    offset += lh.length + e.data.length;
  }

  // Central directory
  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const nameBytes = enc.encode(e.name);
    const size = e.declaredSize ?? e.data.length;

    const ch = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(ch.buffer);
    dv.setUint32(0, 0x02014b50, true);   // central dir header signature
    dv.setUint16(4, 20, true);           // version made by
    dv.setUint16(6, 20, true);           // version needed
    dv.setUint16(8, 0, true);            // flags
    dv.setUint16(10, 0, true);           // compression
    dv.setUint16(12, 0, true);           // mod time
    dv.setUint16(14, 0, true);           // mod date
    dv.setUint32(16, 0, true);           // crc32
    dv.setUint32(20, e.data.length, true);  // compressed size
    dv.setUint32(24, size, true);        // uncompressed size (declared)
    dv.setUint16(28, nameBytes.length, true);
    dv.setUint16(30, 0, true);           // extra field length
    dv.setUint16(32, 0, true);           // comment length
    dv.setUint16(34, 0, true);           // disk number start
    dv.setUint16(36, 0, true);           // internal attributes
    dv.setUint32(38, 0, true);           // external attributes
    dv.setUint32(42, localHeaders[i], true); // local header offset
    ch.set(nameBytes, 46);
    centralParts.push(ch);
    centralSize += ch.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const dvEocd = new DataView(eocd.buffer);
  dvEocd.setUint32(0, 0x06054b50, true);
  dvEocd.setUint16(4, 0, true);
  dvEocd.setUint16(6, 0, true);
  dvEocd.setUint16(8, entries.length, true);
  dvEocd.setUint16(10, entries.length, true);
  dvEocd.setUint32(12, centralSize, true);
  dvEocd.setUint32(16, offset, true);
  dvEocd.setUint16(20, 0, true);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  for (const p of centralParts) { out.set(p, pos); pos += p.length; }
  out.set(eocd, pos);
  return out;
}
