/**
 * GRADIFI HOEOS G5.6 - SOURCE RETRIEVAL TEST SUITE
 */

import { sourceRetrievalService } from '../src/services/verify/sourceRetrievalService';

function createMockFetch(responses: Record<string, { status: number; contentType?: string; body?: ArrayBuffer | string; throwError?: boolean }>) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const mock = responses[urlStr];

    if (!mock) {
      return new Response('Not found', { status: 404, statusText: 'Not Found' });
    }

    if (mock.throwError) {
      throw new TypeError('Failed to fetch (Network connection error)');
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
      statusText: mock.status === 200 ? 'OK' : (mock.status === 404 ? 'Not Found' : 'Server Error'),
      headers
    });
  };
}

async function runG56Tests() {
  console.log('🧪 GRADIFI HOEOS G5.6 - SOURCE RETRIEVAL TEST SUITE');
  console.log('====================================================');

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

  const pdfMagic = new TextEncoder().encode('%PDF-1.4 sample pdf content stream');

  const mockFetch = createMockFetch({
    'https://arxiv.org/pdf/2301.00001.pdf': {
      status: 200,
      contentType: 'application/pdf',
      body: pdfMagic.buffer
    },
    'https://journal.org/paper-404.pdf': {
      status: 404
    },
    'https://journal.org/paper-500.pdf': {
      status: 500
    },
    'https://journal.org/network-error.pdf': {
      status: 0,
      throwError: true
    },
    'https://journal.org/empty.pdf': {
      status: 200,
      contentType: 'application/pdf',
      body: new ArrayBuffer(0)
    },
    'https://journal.org/landing-page.html': {
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<html><body><h1>Scholarly Article Landing Page</h1></body></html>'
    }
  });

  // 1. Successful PDF Retrieval
  console.log('\n1. Successful PDF Retrieval');
  const res1 = await sourceRetrievalService.retrieveSource('https://arxiv.org/pdf/2301.00001.pdf', {
    fetchImpl: mockFetch as any,
    expectedContentType: 'pdf'
  });

  assert(res1.status === 'SOURCE_RETRIEVED', 'Status is SOURCE_RETRIEVED');
  assert(res1.httpStatus === 200, 'httpStatus is 200');
  assert(Boolean(res1.contentBuffer && res1.contentBuffer.byteLength > 0), 'contentBuffer exists and is non-empty');
  assert(Boolean(res1.correlationId), 'correlationId is populated');

  // 2. HTTP 404 Error
  console.log('\n2. HTTP 404 Handling');
  const res2 = await sourceRetrievalService.retrieveSource('https://journal.org/paper-404.pdf', {
    fetchImpl: mockFetch as any
  });

  assert(res2.status === 'HTTP_ERROR', 'Status is HTTP_ERROR for 404');
  assert(res2.httpStatus === 404, 'httpStatus is 404');

  // 3. HTTP 500 Error
  console.log('\n3. HTTP 500 Handling');
  const res3 = await sourceRetrievalService.retrieveSource('https://journal.org/paper-500.pdf', {
    fetchImpl: mockFetch as any
  });

  assert(res3.status === 'HTTP_ERROR', 'Status is HTTP_ERROR for 500');
  assert(res3.httpStatus === 500, 'httpStatus is 500');

  // 4. Network Failure
  console.log('\n4. Network Connection Failure');
  const res4 = await sourceRetrievalService.retrieveSource('https://journal.org/network-error.pdf', {
    fetchImpl: mockFetch as any
  });

  assert(res4.status === 'NETWORK_ERROR', 'Status is NETWORK_ERROR');
  assert(Boolean(res4.errorMessage), 'errorMessage populated for network error');

  // 5. Empty Response Body (0 Bytes)
  console.log('\n5. Empty Response Body (0 Bytes)');
  const res5 = await sourceRetrievalService.retrieveSource('https://journal.org/empty.pdf', {
    fetchImpl: mockFetch as any
  });

  assert(res5.status === 'EMPTY_RESPONSE', 'Status is EMPTY_RESPONSE');
  assert(res5.contentLength === 0, 'contentLength is 0');

  // 6. Content-Type Mismatch (HTML when expecting PDF)
  console.log('\n6. Content-Type Mismatch (Landing Page HTML)');
  const res6 = await sourceRetrievalService.retrieveSource('https://journal.org/landing-page.html', {
    fetchImpl: mockFetch as any,
    expectedContentType: 'pdf'
  });

  assert(res6.status === 'CONTENT_TYPE_MISMATCH', 'Status is CONTENT_TYPE_MISMATCH when expecting PDF');
  assert(res6.contentType?.includes('text/html') === true, 'contentType is text/html');

  // 7. Valid Landing Page Candidate (no strict PDF requirement)
  console.log('\n7. Generic HTML Retrieval (Landing Page Candidate)');
  const res7 = await sourceRetrievalService.retrieveSource('https://journal.org/landing-page.html', {
    fetchImpl: mockFetch as any,
    expectedContentType: 'any'
  });

  assert(res7.status === 'SOURCE_RETRIEVED', 'Generic retrieval returns SOURCE_RETRIEVED for HTML');
  assert(res7.contentType?.includes('text/html') === true, 'Preserves text/html contentType');

  // 8. Boundary Isolation Proof
  console.log('\n8. Boundary Isolation Proof');
  assert(res1.status !== ('CONTENT_VALID' as any), 'SOURCE_RETRIEVED DOES NOT claim CONTENT_VALID');
  assert(res1.status !== ('DETERMINISTIC_EVIDENCE_VERIFIED' as any), 'SOURCE_RETRIEVED DOES NOT claim DETERMINISTIC_EVIDENCE_VERIFIED');

  console.log('====================================================');
  console.log(`📊 G5.6 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG56Tests().catch(err => {
  console.error('G5.6 test execution failed:', err);
  process.exit(1);
});
