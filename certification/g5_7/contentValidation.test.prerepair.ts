/**
 * GRADIFI HOEOS G5.7 - RETRIEVED CONTENT VALIDATION TEST SUITE
 */

import { contentValidationService } from '../src/services/verify/contentValidationService';
import { SourceRetrievalResult } from '../src/services/verify/types';

function createMockPdfBuffer(textContent: string): ArrayBuffer {
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

  return new TextEncoder().encode(pdfBody).buffer;
}

async function runG57Tests() {
  console.log('🧪 GRADIFI HOEOS G5.7 - CONTENT VALIDATION TEST SUITE');
  console.log('=======================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  const sampleText = 'Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement.';

  // 1. Valid PDF Bytes Validation
  console.log('\n1. Valid PDF Bytes Validation');
  const validRetrieval: SourceRetrievalResult = {
    sourceUrl: 'https://arxiv.org/pdf/2301.00001.pdf',
    status: 'SOURCE_RETRIEVED',
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: 500,
    contentBuffer: createMockPdfBuffer(sampleText),
    retrievedAt: new Date().toISOString(),
    correlationId: 'test_g57_001'
  };

  const res1 = await contentValidationService.validateRetrievedContent(validRetrieval, { docTitle: 'Quantum Paper' });

  assert(res1.status === 'CONTENT_VALID', 'Status is CONTENT_VALID');
  assert(Boolean(res1.documentHash), 'documentHash generated');
  assert(Boolean(res1.canonicalDocument), 'canonicalDocument constructed');
  assert(res1.canonicalDocument?.stats.wordCount! > 0, 'Word count stats populated');
  assert(res1.extractionMethod === 'pdf_stream_extractor', 'extractionMethod is pdf_stream_extractor');

  // 2. Empty Response Body (0 Bytes)
  console.log('\n2. Empty Response Body Validation');
  const emptyRetrieval: SourceRetrievalResult = {
    sourceUrl: 'https://journal.org/empty.pdf',
    status: 'SOURCE_RETRIEVED',
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: 0,
    contentBuffer: new ArrayBuffer(0),
    retrievedAt: new Date().toISOString(),
    correlationId: 'test_g57_002'
  };

  const res2 = await contentValidationService.validateRetrievedContent(emptyRetrieval);

  assert(res2.status === 'CONTENT_EMPTY', 'Status is CONTENT_EMPTY');
  assert(typeof res2.canonicalDocument === 'undefined', 'canonicalDocument is undefined for empty content');

  // 3. HTML Returned Instead of PDF (Landing Page)
  console.log('\n3. HTML Returned Instead of PDF');
  const htmlRetrieval: SourceRetrievalResult = {
    sourceUrl: 'https://journal.org/article.html',
    status: 'SOURCE_RETRIEVED',
    httpStatus: 200,
    contentType: 'text/html',
    contentBuffer: new TextEncoder().encode('<!DOCTYPE html><html><body><h1>Landing Page</h1></body></html>').buffer,
    retrievedAt: new Date().toISOString(),
    correlationId: 'test_g57_003'
  };

  const res3 = await contentValidationService.validateRetrievedContent(htmlRetrieval);

  assert(res3.status === 'CONTENT_UNSUPPORTED', 'Status is CONTENT_UNSUPPORTED for HTML');
  assert(res3.errorMessage?.includes('webpage HTML') === true, 'errorMessage explains HTML landing page unsupported');

  // 4. Malformed PDF Stream (No extractable text)
  console.log('\n4. Malformed PDF Stream Validation');
  const malformedRetrieval: SourceRetrievalResult = {
    sourceUrl: 'https://journal.org/corrupted.pdf',
    status: 'SOURCE_RETRIEVED',
    httpStatus: 200,
    contentType: 'application/pdf',
    contentBuffer: new TextEncoder().encode('%PDF-1.4 corrupted empty stream without Tj text commands').buffer,
    retrievedAt: new Date().toISOString(),
    correlationId: 'test_g57_004'
  };

  const res4 = await contentValidationService.validateRetrievedContent(malformedRetrieval);

  assert(res4.status === 'CONTENT_MALFORMED', 'Status is CONTENT_MALFORMED for stream without text');
  assert(Boolean(res4.errorMessage), 'errorMessage populated');

  // 5. Source Retrieval Failure Input
  console.log('\n5. Failed Retrieval Input Validation');
  const failedRetrieval: SourceRetrievalResult = {
    sourceUrl: 'https://journal.org/404.pdf',
    status: 'HTTP_ERROR',
    httpStatus: 404,
    retrievedAt: new Date().toISOString(),
    correlationId: 'test_g57_005'
  };

  const res5 = await contentValidationService.validateRetrievedContent(failedRetrieval);

  assert(res5.status === 'CONTENT_VALIDATION_FAILED', 'Status is CONTENT_VALIDATION_FAILED when retrieval failed');

  // 6. Boundary Isolation Proof
  console.log('\n6. Boundary Isolation Proof');
  assert(res1.status !== ('DETERMINISTIC_EVIDENCE_VERIFIED' as any), 'CONTENT_VALID DOES NOT claim DETERMINISTIC_EVIDENCE_VERIFIED');
  assert(typeof (res1 as any).verifiedMatches === 'undefined', 'ContentValidationResult DOES NOT produce verifiedMatches');

  console.log('=======================================================');
  console.log(`📊 G5.7 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG57Tests().catch(err => {
  console.error('G5.7 test execution failed:', err);
  process.exit(1);
});
