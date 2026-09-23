import { FineGrainedProviderStatus } from '../src/services/verify/types';

export function deriveMatrixStatuses(fineGrainedStatus: FineGrainedProviderStatus) {
  const realRequestStatus: 'VERIFIED' | 'FAILED' | 'BLOCKED' =
    fineGrainedStatus === 'VERIFIED' || fineGrainedStatus === 'EMPTY_RESULT' || fineGrainedStatus === 'PARTIALLY_VERIFIED'
      ? 'VERIFIED'
      : 'FAILED';
  const responseStatus: 'VERIFIED' | 'EMPTY' | 'FAILED' =
    fineGrainedStatus === 'VERIFIED' || fineGrainedStatus === 'PARTIALLY_VERIFIED'
      ? 'VERIFIED'
      : fineGrainedStatus === 'EMPTY_RESULT'
        ? 'EMPTY'
        : 'FAILED';
  return { realRequestStatus, responseStatus };
}

function runTests() {
  const tests: Array<{
    status: FineGrainedProviderStatus;
    expectedReq: 'VERIFIED' | 'FAILED' | 'BLOCKED';
    expectedRes: 'VERIFIED' | 'EMPTY' | 'FAILED';
    description: string;
  }> = [
    {
      status: 'REQUEST_FAILED',
      expectedReq: 'FAILED',
      expectedRes: 'FAILED',
      description: 'REQUEST_FAILED must produce FAILED request and FAILED response, not EMPTY'
    },
    {
      status: 'RATE_LIMITED',
      expectedReq: 'FAILED',
      expectedRes: 'FAILED',
      description: 'RATE_LIMITED must produce FAILED request and FAILED response, not EMPTY'
    },
    {
      status: 'AUTHENTICATION_FAILED',
      expectedReq: 'FAILED',
      expectedRes: 'FAILED',
      description: 'AUTHENTICATION_FAILED must produce FAILED request and FAILED response, not EMPTY'
    },
    {
      status: 'SCHEMA_FAILED',
      expectedReq: 'FAILED',
      expectedRes: 'FAILED',
      description: 'SCHEMA_FAILED must produce FAILED request and FAILED response'
    },
    {
      status: 'EMPTY_RESULT',
      expectedReq: 'VERIFIED',
      expectedRes: 'EMPTY',
      description: 'EMPTY_RESULT (200 with 0 matches) must produce VERIFIED request and EMPTY response'
    },
    {
      status: 'VERIFIED',
      expectedReq: 'VERIFIED',
      expectedRes: 'VERIFIED',
      description: 'VERIFIED (200 with matches) must produce VERIFIED request and VERIFIED response'
    },
    {
      status: 'PARTIALLY_VERIFIED',
      expectedReq: 'VERIFIED',
      expectedRes: 'VERIFIED',
      description: 'PARTIALLY_VERIFIED must produce VERIFIED request and VERIFIED response'
    }
  ];

  let passed = 0;
  for (const t of tests) {
    const result = deriveMatrixStatuses(t.status);
    if (result.realRequestStatus !== t.expectedReq || result.responseStatus !== t.expectedRes) {
      console.error(`FAIL: ${t.description}`);
      console.error(`  Expected: req=${t.expectedReq}, res=${t.expectedRes}`);
      console.error(`  Actual:   req=${result.realRequestStatus}, res=${result.responseStatus}`);
      process.exit(1);
    }
    console.log(`PASS: ${t.description}`);
    passed++;
  }

  console.log(`\nAll ${passed} verification matrix state assertions PASSED.`);
}

runTests();
