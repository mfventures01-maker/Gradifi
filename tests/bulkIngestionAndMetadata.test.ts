/**
 * GRADIFI HOEOS G5.2 / G5.3 / G5.4 - BULK PDF INGESTION & UNPAYWALL METADATA TEST SUITE
 */

import { bulkIngestionService } from '../src/services/verify/bulkIngestionService';
import { UnpaywallProvider } from '../src/services/verify/providers/unpaywallProvider';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

const SAMPLE_TEXT_1 = `Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computation. Traditional computers encode information into binary bits.`;
const SAMPLE_TEXT_2 = `Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired paradigm.`;

/**
 * Constructs an in-memory PDF File containing extractable PDF stream text syntax.
 */
function createMockPdfFile(filename: string, textContent: string): File {
  const cleanText = textContent.replace(/[\r\n]+/g, ' ').replace(/[()]/g, '');
  const pdfBody = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kinds [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Length ${cleanText.length + 50} >> stream
BT
/F1 12 Tf
(${cleanText}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000185 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
290
%%EOF`;

  const blob = new Blob([pdfBody], { type: 'application/pdf' });
  return new File([blob], filename, { type: 'application/pdf' });
}

function createInvalidPdfFile(filename: string): File {
  const blob = new Blob([], { type: 'application/pdf' });
  return new File([blob], filename, { type: 'application/pdf' });
}

async function runG5SuiteTests() {
  console.log('🧪 GRADIFI HOEOS G5.2–G5.4 - BULK INGESTION & METADATA TEST SUITE');
  console.log('===================================================================');

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // 1. G5.2 — Single & Multiple Valid Text Documents Ingestion
  console.log('\n1. G5.2 — Bulk Ingestion Contract (Valid Text Inputs)');
  const validBatch = await bulkIngestionService.processBulkTextInputs([
    { fileName: 'paper_1.txt', text: SAMPLE_TEXT_1 },
    { fileName: 'paper_2.txt', text: SAMPLE_TEXT_2 }
  ]);

  assert(validBatch.total === 2, 'Batch total is 2');
  assert(validBatch.completed === 2, 'Batch completed is 2');
  assert(validBatch.failed === 0, 'Batch failed is 0');
  assert(validBatch.items[0].status === 'COMPLETED', 'Item 1 status is COMPLETED');
  assert(validBatch.items[1].status === 'COMPLETED', 'Item 2 status is COMPLETED');
  assert(Boolean(validBatch.items[0].documentHash), 'Item 1 has deterministic documentHash');
  assert(validBatch.items[0].documentHash !== validBatch.items[1].documentHash, 'Different content produces distinct documentHash');

  // 2. G5.2 / G5.3 — Real Bulk PDF File Ingestion (processBulkFiles)
  console.log('\n2. G5.2 / G5.3 — Real Bulk PDF File Ingestion & Extraction');
  const pdfAlpha = createMockPdfFile('quantum_research.pdf', SAMPLE_TEXT_1);
  const pdfBeta = createMockPdfFile('federated_learning.pdf', SAMPLE_TEXT_2);
  const pdfInvalid = createInvalidPdfFile('corrupted_empty.pdf');

  const pdfBatch = await bulkIngestionService.processBulkFiles([pdfAlpha, pdfInvalid, pdfBeta]);

  assert(pdfBatch.total === 3, 'Real PDF batch total is 3');
  assert(pdfBatch.completed === 2, 'Real PDF batch completed count is 2');
  assert(pdfBatch.failed === 1, 'Real PDF batch failed count is 1');
  assert(pdfBatch.items[0].status === 'COMPLETED', 'PDF Item 0 (valid) status is COMPLETED');
  assert(pdfBatch.items[0].extractionMethod === 'pdf_stream_extractor', 'PDF Item 0 extracted via pdf_stream_extractor');
  assert(Boolean(pdfBatch.items[0].documentHash), 'PDF Item 0 has content-anchored documentHash');

  assert(pdfBatch.items[1].status === 'FAILED', 'PDF Item 1 (corrupted empty) status is FAILED');
  assert(Boolean(pdfBatch.items[1].error), 'PDF Item 1 contains error message');

  assert(pdfBatch.items[2].status === 'COMPLETED', 'PDF Item 2 (valid) completed after failed Item 1');
  assert(pdfBatch.items[0].documentHash !== pdfBatch.items[2].documentHash, 'Distinct PDF contents yield distinct documentHashes');

  // 3. G5.2 — Duplicate Content Under Different Filenames
  console.log('\n3. G5.2 — Content-Anchored Document Identity (Duplicates)');
  const duplicateBatch = await bulkIngestionService.processBulkTextInputs([
    { fileName: 'document_original.txt', text: SAMPLE_TEXT_1 },
    { fileName: 'document_copy_v2.txt', text: SAMPLE_TEXT_1 }
  ]);

  assert(duplicateBatch.completed === 2, 'Duplicate batch completed both items');
  assert(duplicateBatch.items[0].documentHash === duplicateBatch.items[1].documentHash, 'Duplicate content produces 100% identical documentHash despite different filenames');

  // 4. G5.2 & G5.3 — Failure Isolation
  console.log('\n4. G5.2 / G5.3 — Failure Isolation');
  const mixedBatch = await bulkIngestionService.processBulkTextInputs([
    { fileName: 'valid_alpha.txt', text: SAMPLE_TEXT_1 },
    { fileName: 'invalid_empty.txt', text: '   ' },
    { fileName: 'valid_beta.txt', text: SAMPLE_TEXT_2 }
  ]);

  assert(mixedBatch.total === 3, 'Mixed batch total is 3');
  assert(mixedBatch.completed === 2, 'Mixed batch completed count is 2');
  assert(mixedBatch.failed === 1, 'Mixed batch failed count is 1');
  assert(mixedBatch.items[0].status === 'COMPLETED', 'Item 0 (valid) is COMPLETED');
  assert(mixedBatch.items[1].status === 'FAILED', 'Item 1 (empty) is FAILED');
  assert(Boolean(mixedBatch.items[1].error), 'Item 1 contains error message');
  assert(mixedBatch.items[2].status === 'COMPLETED', 'Item 2 (valid) is COMPLETED after failed Item 1');

  // 5. G5.4 — Unpaywall Metadata Contract & Evidence Boundary
  console.log('\n5. G5.4 — Unpaywall Metadata Contract & Evidence Boundary');
  const unpaywall = new UnpaywallProvider();
  
  const validDoiResult = await unpaywall.fetchMetadata('10.1038/s41586-023-00001-x');
  assert(validDoiResult.providerId === 'unpaywall', 'Unpaywall metadata result providerId is unpaywall');
  assert(['METADATA_FOUND', 'METADATA_NOT_FOUND', 'REQUEST_FAILED'].includes(validDoiResult.status), `Unpaywall status '${validDoiResult.status}' belongs to metadata contract`);

  const invalidDoiResult = await unpaywall.fetchMetadata('invalid-doi-format');
  assert(invalidDoiResult.status === 'METADATA_NOT_FOUND', 'Invalid DOI format returns METADATA_NOT_FOUND');

  // Unpaywall Search Evidence Boundary Test
  const searchRes = await unpaywall.search({ query: '10.1038/s41586-023-00001-x', documentText: SAMPLE_TEXT_1 });
  assert(searchRes.fineGrainedStatus !== 'VERIFIED', 'Unpaywall search DOES NOT claim fineGrainedStatus = VERIFIED without evidence verification');
  assert(['EMPTY_RESULT', 'REQUEST_FAILED'].includes(searchRes.fineGrainedStatus || ''), `Unpaywall search fineGrainedStatus '${searchRes.fineGrainedStatus}' is unverified discovery status`);
  if (searchRes.matches.length > 0) {
    assert(searchRes.matches[0].provenance.provenanceState === 'UNVERIFIED', 'Candidate match provenanceState is UNVERIFIED');
  }

  // 6. G5.4 — Unpaywall Credential Semantics Audit
  console.log('\n6. G5.4 — Credential Semantics Audit');
  const coreResult = await verifyCoreService.executeVerifyRun(SAMPLE_TEXT_1);
  const unpaywallEntry = coreResult.matrix.find(m => m.provider === 'unpaywall');
  assert(unpaywallEntry?.credentialStatus === 'NOT_APPLICABLE', 'Unpaywall credentialStatus is strictly NOT_APPLICABLE');

  console.log('===================================================================');
  console.log(`📊 G5.2–G5.4 SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runG5SuiteTests().catch(err => {
  console.error('G5 test execution failed:', err);
  process.exit(1);
});
