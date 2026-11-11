/**
 * G2 canonical authority closure test.
 * Same semantic document is ingested as TXT, DOCX and PDF.
 * Run: npx tsx tests/g2_canonical_authority_cross_format.test.ts
 */
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { jsPDF } from 'jspdf';
import { ingestDocument } from '../src/services/verify/universalIngestionService.js';
import { analyzeDocumentEvidence, evaluateDocumentSimilarity } from '../src/services/verify/deterministicEngine.js';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer.js';

const sourceText = [
  'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks',
  'By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)',
  'Journal of Advanced Computer Science and Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.',
  '',
  'Abstract:',
  'Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.'
].join('\n');

const comparisonText = [
  'An Analysis of High-Order Evidence Systems in Edge Computing Topology',
  'By Prof. Elena Rostova and Dr. Aris Thorne',
  '',
  'Introduction:',
  'Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. Furthermore, mathematical determinism guarantees non-repudiation of evidence.'
].join('\n');

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makeDocx(text: string): Uint8Array {
  const paragraphs = text.split('\n').map(line =>
    line
      ? `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`
      : '<w:p/>'
  ).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paragraphs}<w:sectPr/></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rels),
    'word/document.xml': strToU8(documentXml)
  });
}

function makePdf(text: string): Uint8Array {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(text, 510);
  pdf.text(lines, 42, 48);
  return new Uint8Array(pdf.output('arraybuffer'));
}

async function main() {
  const txtBytes = strToU8(sourceText);
  const docxBytes = makeDocx(sourceText);
  const pdfBytes = makePdf(sourceText);

  const inputs = [
    { name: 'g2-canonical.txt', mimeType: 'text/plain', bytes: txtBytes },
    { name: 'g2-canonical.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: docxBytes },
    { name: 'g2-canonical.pdf', mimeType: 'application/pdf', bytes: pdfBytes }
  ];

  const canonical: any[] = [];
  for (const input of inputs) {
    const result: any = await ingestDocument({
      name: input.name,
      mimeType: input.mimeType,
      buffer: arrayBuffer(input.bytes)
    });
    assert.equal(result.success, true, `${input.name}: ingestion must succeed; ${JSON.stringify(result.error ?? result.warnings)}`);
    assert.equal(result.canonicalReady, true, `${input.name}: canonicalReady must be true`);
    assert.ok(result.canonicalDocument?.normalizedText, `${input.name}: normalized canonical text missing`);
    canonical.push(result.canonicalDocument);
    console.log(input.name, {
      extractionMethod: result.extractionMethod,
      normalizedLength: result.canonicalDocument.normalizedText.length,
      documentId: result.canonicalDocument.documentId
    });
  }

  const expectedNormalized = canonical[0].normalizedText;
  for (const doc of canonical.slice(1)) {
    assert.equal(doc.normalizedText, expectedNormalized, 'Equivalent formats must produce identical normalized text');
    assert.equal(doc.documentId, canonical[0].documentId, 'Equivalent formats must produce identical canonical document IDs');
  }

  const engineRuns = canonical.map(doc => analyzeDocumentEvidence({
    documentText: doc.normalizedText,
    candidateMatches: []
  }));
  for (const run of engineRuns.slice(1)) {
    assert.equal(run.documentHash, engineRuns[0].documentHash, 'Document hashes must converge across formats');
    assert.equal(run.evidenceHash, engineRuns[0].evidenceHash, 'Evidence hashes must converge across formats');
  }

  const changed = analyzeDocumentEvidence({
    documentText: canonical[0].normalizedText + ' deliberate alteration',
    candidateMatches: []
  });
  assert.notEqual(changed.documentHash, engineRuns[0].documentHash, 'Content alteration must change document hash');
  assert.notEqual(changed.evidenceHash, engineRuns[0].evidenceHash, 'Content alteration must change evidence hash');

  const comparisonDoc = buildCanonicalAnalysisDocument({ rawText: comparisonText, filename: 'comparison.txt' });
  const findingSets = canonical.map(doc => {
    const result: any = evaluateDocumentSimilarity(doc, comparisonDoc);
    return (result.findings ?? []).map((finding: any) => finding.findingId).sort();
  });
  assert.ok(findingSets[0].length > 0, 'Known-positive comparison must produce at least one finding');
  for (const ids of findingSets.slice(1)) {
    assert.deepEqual(ids, findingSets[0], 'Finding IDs must remain stable across equivalent formats');
  }

  console.log('G2_CANONICAL_AUTHORITY_CROSS_FORMAT: PASS');
  console.log('FORMATS: TXT, DOCX, PDF');
  console.log('CANONICAL_DOCUMENT_ID:', canonical[0].documentId);
  console.log('ENGINE_DOCUMENT_HASH:', engineRuns[0].documentHash);
  console.log('EVIDENCE_HASH:', engineRuns[0].evidenceHash);
  console.log('FINDING_IDS:', findingSets[0]);
  console.log('TAMPER_DETECTION: PASS');
}

main().catch(error => {
  console.error('G2_CANONICAL_AUTHORITY_CROSS_FORMAT: FAIL');
  console.error(error);
  process.exitCode = 1;
});
