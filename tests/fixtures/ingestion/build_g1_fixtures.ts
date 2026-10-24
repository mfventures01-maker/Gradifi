import fs from 'fs';
import path from 'path';
import { zipSync, strToU8 } from 'fflate';

const outDir = path.resolve('tests/fixtures/ingestion');
fs.mkdirSync(outDir, { recursive: true });

// 1. sample.htm (copy of valid HTML content)
const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Academic Paper</title></head>
<body>
<h1>GRADIFI UNIVERSAL INGESTION FIXTURE</h1>
<p>Document ingestion across HTML and HTM extensions. Deterministic canonical extraction across distributed edge networks.</p>
</body>
</html>`;
fs.writeFileSync(path.join(outDir, 'sample.htm'), htmlContent, 'utf-8');

// 2. sample.odt
// OpenDocument text package: mimetype + content.xml
const odtMimetype = strToU8('application/vnd.oasis.opendocument.text');
const odtContentXml = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:text>
      <text:h>GRADIFI UNIVERSAL INGESTION FIXTURE</text:h>
      <text:p>OpenDocument Text specification validation document. Deterministic canonical extraction across distributed edge networks.</text:p>
    </office:text>
  </office:body>
</office:document-content>`);

const odtZip = zipSync({
  'mimetype': odtMimetype,
  'content.xml': odtContentXml,
}, { level: 6 });
fs.writeFileSync(path.join(outDir, 'sample.odt'), odtZip);

// 3. sample.pptx
// PowerPoint presentation package: [Content_Types].xml + ppt/slides/slide1.xml
const pptxContentTypes = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`);

const pptxSlide1 = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>GRADIFI UNIVERSAL INGESTION FIXTURE</a:t></a:r></a:p>
          <a:p><a:r><a:t>Presentation slide deck text extraction. Deterministic canonical representation.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);

const pptxZip = zipSync({
  '[Content_Types].xml': pptxContentTypes,
  'ppt/slides/slide1.xml': pptxSlide1,
}, { level: 6 });
fs.writeFileSync(path.join(outDir, 'sample.pptx'), pptxZip);

// 4. sample.xlsx
// Excel spreadsheet package: [Content_Types].xml + xl/sharedStrings.xml
const xlsxContentTypes = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`);

const xlsxSharedStrings = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
  <si><t>GRADIFI UNIVERSAL INGESTION FIXTURE</t></si>
  <si><t>Spreadsheet workbook table data extraction. Deterministic canonical representation.</t></si>
</sst>`);

const xlsxZip = zipSync({
  '[Content_Types].xml': xlsxContentTypes,
  'xl/sharedStrings.xml': xlsxSharedStrings,
}, { level: 6 });
fs.writeFileSync(path.join(outDir, 'sample.xlsx'), xlsxZip);

// 5. sample.epub (clean text EPUB)
const epubContainer = strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

const epubOpf = strToU8(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`);

const epubCh1 = strToU8(`<!DOCTYPE html><html><body><h1>GRADIFI UNIVERSAL INGESTION FIXTURE</h1><p>Digital book electronic publication text extraction. Deterministic canonical representation.</p></body></html>`);

const epubZip = zipSync({
  'META-INF/container.xml': epubContainer,
  'OEBPS/content.opf': epubOpf,
  'OEBPS/chapter1.xhtml': epubCh1,
}, { level: 6 });
fs.writeFileSync(path.join(outDir, 'sample.epub'), epubZip);

// 6. Legacy binary formats: doc, ppt, xls
// Standard OLE2 compound document header: \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
const ole2Header = new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x00, 0x00, 0x00]);
fs.writeFileSync(path.join(outDir, 'legacy.doc'), ole2Header);
fs.writeFileSync(path.join(outDir, 'legacy.ppt'), ole2Header);
fs.writeFileSync(path.join(outDir, 'legacy.xls'), ole2Header);

// 7. Negative / Falsification control fixtures
fs.writeFileSync(path.join(outDir, 'empty.md'), '', 'utf-8');
fs.writeFileSync(path.join(outDir, 'empty.html'), '', 'utf-8');
fs.writeFileSync(path.join(outDir, 'empty.htm'), '', 'utf-8');
fs.writeFileSync(path.join(outDir, 'empty.rtf'), '', 'utf-8');
fs.writeFileSync(path.join(outDir, 'empty.csv'), '', 'utf-8');

const corruptedZip = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
fs.writeFileSync(path.join(outDir, 'corrupted.docx'), corruptedZip);
fs.writeFileSync(path.join(outDir, 'corrupted.odt'), corruptedZip);
fs.writeFileSync(path.join(outDir, 'corrupted.pptx'), corruptedZip);
fs.writeFileSync(path.join(outDir, 'corrupted.xlsx'), corruptedZip);
fs.writeFileSync(path.join(outDir, 'corrupted.epub'), corruptedZip);
fs.writeFileSync(path.join(outDir, 'corrupted.pdf'), new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A])); // %PDF-1.4\n truncated

console.log('Successfully generated all representative and negative control fixtures in tests/fixtures/ingestion');
