/**
 * GRADIFI HOEOS G5.9 - DETERMINISTIC EVIDENCE BRIDGE TEST SUITE
 */

import { deterministicEvidenceBridge } from '../src/services/verify/deterministicEvidenceBridge';
import { UnpaywallMetadataResult } from '../src/services/verify/types';

function createMockFetch(responses: Record<string, { status: number; contentType?: string; body?: ArrayBuffer | string }>) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const mock = responses[urlStr];

    if (!mock) {
      return new Response('Not found', { status: 404, statusText: 'Not Found' });
    }

    const headers = new Headers();
    if (mock.contentType) {
      headers.set('content-type', mock.contentType);
    }

    let bodyData: ArrayBuffer;
    if (typeof mock.body === 'string') {
      bodyData = new TextEncoder().encode(mock.body).buffer;
    } else if (mock.body instanceof ArrayBuffer) {
      bodyData = mock.body;
    } else {
      bodyData = new ArrayBuffer(0);
    }

    headers.set('content-length', bodyData.byteLength.toString());

    return new Response(bodyData, {
      status: mock.status,
      statusText: mock.status === 200 ? 'OK' : 'Error',
      headers
    });
  };
}

function createPdfBytes(textContent: string): ArrayBuffer {
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

async function runG59Tests() {
  console.log('🧪 GRADIFI HOEOS G5.9 - DETERMINISTIC EVIDENCE BRIDGE TEST SUITE');
  console.log('==================================================================');

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

  const sampleStudentDoc = `Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computation. Traditional computers encode information into binary bits.`;
  const samplePdfContent = `Journal of Quantum Physics. DOI: 10.1038/s41586-023-00001-x. Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computation.`;

  const validMeta: UnpaywallMetadataResult = {
    providerId: 'unpaywall',
    doi: '10.1038/s41586-023-00001-x',
    status: 'METADATA_FOUND',
    title: 'Quantum Advantage Demonstration',
    authors: ['Alice Smith'],
    bestOALocation: {
      url: 'https://arxiv.org/pdf/2301.00001.pdf',
      urlForPdf: 'https://arxiv.org/pdf/2301.00001.pdf',
      isBest: true
    },
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    correlationId: 'test_g59_001'
  };

  const mockFetch = createMockFetch({
    'https://arxiv.org/pdf/2301.00001.pdf': {
      status: 200,
      contentType: 'application/pdf',
      body: createPdfBytes(samplePdfContent)
    },
    'https://arxiv.org/pdf/mismatch.pdf': {
      status: 200,
      contentType: 'application/pdf',
      body: createPdfBytes('Astrophysics deep space gamma ray emissions. DOI: 10.1016/j.astro.2023.999.')
    },
    'https://journal.org/html-only.html': {
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Landing Page</body></html>'
    },
    'https://journal.org/404.pdf': {
      status: 404
    }
  });

  // 1. Positive Path: Full Chain Execution
  console.log('\n1. Positive Path: Complete 6-Stage Evidence Chain');
  const res1 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/s41586-023-00001-x',
    sampleStudentDoc,
    { fetchImpl: mockFetch as any, metadataOverride: validMeta }
  );

  assert(res1.bridgeEligible === true, 'bridgeEligible is true for valid chain');
  assert(res1.metadataResult.status === 'METADATA_FOUND', 'Metadata status is METADATA_FOUND');
  assert(res1.locationResult.status === 'OA_LOCATION_FOUND', 'Location status is OA_LOCATION_FOUND');
  assert(res1.retrievalResult.status === 'SOURCE_RETRIEVED', 'Retrieval status is SOURCE_RETRIEVED');
  assert(res1.validationResult.status === 'CONTENT_VALID', 'Validation status is CONTENT_VALID');
  assert(res1.identityResult.status === 'IDENTITY_MATCHED', 'Identity status is IDENTITY_MATCHED');
  assert(Boolean(res1.deterministicResult), 'Deterministic engine executed');

  // 2. Negative Path 1: Missing Metadata
  console.log('\n2. Negative Path 1: Missing Metadata');
  const res2 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/missing-meta',
    sampleStudentDoc,
    {
      fetchImpl: mockFetch as any,
      metadataOverride: { ...validMeta, status: 'METADATA_NOT_FOUND', errorMessage: 'DOI missing' }
    }
  );

  assert(res2.bridgeEligible === false, 'bridgeEligible is false when metadata is missing');

  // 3. Negative Path 2: Missing OA Location
  console.log('\n3. Negative Path 2: Missing OA Location');
  const res3 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/no-oa',
    sampleStudentDoc,
    {
      fetchImpl: mockFetch as any,
      metadataOverride: { ...validMeta, bestOALocation: undefined, oaLocations: [] }
    }
  );

  assert(res3.bridgeEligible === false, 'bridgeEligible is false when no OA location exists');

  // 4. Negative Path 3: Retrieval Failure (HTTP 404)
  console.log('\n4. Negative Path 3: Retrieval Failure (404)');
  const res4 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/404',
    sampleStudentDoc,
    {
      fetchImpl: mockFetch as any,
      metadataOverride: { ...validMeta, bestOALocation: { urlForPdf: 'https://journal.org/404.pdf' } }
    }
  );

  assert(res4.bridgeEligible === false, 'bridgeEligible is false on HTTP 404');
  assert(res4.retrievalResult.status === 'HTTP_ERROR', 'retrievalResult status is HTTP_ERROR');

  // 5. Negative Path 4: Content Validation Failure (HTML instead of PDF)
  console.log('\n5. Negative Path 4: Invalid Content (HTML Landing Page)');
  const res5 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/html',
    sampleStudentDoc,
    {
      fetchImpl: mockFetch as any,
      metadataOverride: { ...validMeta, bestOALocation: { urlForPdf: 'https://journal.org/html-only.html' } }
    }
  );

  assert(res5.bridgeEligible === false, 'bridgeEligible is false for HTML landing page');
  assert(res5.retrievalResult.status === 'CONTENT_TYPE_MISMATCH', 'retrievalResult status is CONTENT_TYPE_MISMATCH for HTML');

  // 6. Negative Path 5: Identity Mismatch
  console.log('\n6. Negative Path 5: Identity Mismatch');
  const res6 = await deterministicEvidenceBridge.executeEvidenceChain(
    '10.1038/s41586-023-00001-x',
    sampleStudentDoc,
    {
      fetchImpl: mockFetch as any,
      metadataOverride: { ...validMeta, bestOALocation: { urlForPdf: 'https://arxiv.org/pdf/mismatch.pdf' } }
    }
  );

  assert(res6.bridgeEligible === false, 'bridgeEligible is false when DOIs mismatch');
  assert(res6.identityResult.status === 'IDENTITY_MISMATCH', 'identityResult status is IDENTITY_MISMATCH');

  // 7. Hash & Immutability Proof
  console.log('\n7. Hash & Immutability Proof');
  assert(Boolean(res1.deterministicResult?.documentHash), 'Deterministic documentHash generated');
  assert(Boolean(res1.deterministicResult?.evidenceHash), 'Deterministic evidenceHash generated');

  console.log('==================================================================');
  console.log(`📊 G5.9 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG59Tests().catch(err => {
  console.error('G5.9 test execution failed:', err);
  process.exit(1);
});
