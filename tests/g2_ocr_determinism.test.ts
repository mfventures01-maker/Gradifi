import { ingestDocument } from '../src/services/verify/universalIngestionService';
import { analyzeDocumentEvidence } from '../src/services/verify/deterministicEngine';
import fs from 'fs';

async function run() {
  const fileBytes = fs.readFileSync('tests/fixtures/ingestion/scanned_page_001.pdf');
  const buffer = fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength);
  const ingest: any = await ingestDocument({ name: 'scanned_page_001.pdf', buffer });
  if (!ingest.success || ingest.extractionMethod !== 'ocr_tesseract') {
    console.error('FAIL: OCR ingestion did not succeed');
    process.exit(1);
  }
  const canonical = ingest.canonicalDocument;
  if (!canonical || !canonical.normalizedText) {
    console.error('FAIL: canonicalDocument.normalizedText missing');
    process.exit(1);
  }
  console.log('INGESTION_METHOD:', ingest.extractionMethod);
  console.log('CANONICAL_DOCUMENT_ID:', canonical.documentId);
  console.log('NORMALIZED_TEXT_LENGTH:', canonical.normalizedText.length);
  const input = { sourceDocument: canonical, comparisonDocument: canonical, candidateMatches: [], policyVersion: 'G2-POLICY-v1' };
  const run1: any = analyzeDocumentEvidence(input as any);
  const run2: any = analyzeDocumentEvidence(input as any);
  const json1 = JSON.stringify(run1);
  const json2 = JSON.stringify(run2);
  console.log('RUN1_EVIDENCE_HASH:', run1.evidenceHash);
  console.log('RUN2_EVIDENCE_HASH:', run2.evidenceHash);
  console.log('BYTE_IDENTICAL:', json1 === json2);
  if (json1 !== json2) {
    console.error('FAIL: G2 output not deterministic');
    process.exit(1);
  }
  const findings = run1.verifiedMatches || [];
  console.log('VERIFIED_MATCHES:', findings.length);
  console.log('G2-3 OCR-PATH DETERMINISM: PASS');
  process.exit(0);
}

run().catch(err => { console.error('ERROR:', err); process.exit(1); });
