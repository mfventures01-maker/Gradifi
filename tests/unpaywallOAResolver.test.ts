/**
 * GRADIFI HOEOS G5.5 - UNPAYWALL OA LOCATION RESOLVER TEST SUITE
 */

import { unpaywallOAResolver } from '../src/services/verify/unpaywallOAResolver';
import { UnpaywallMetadataResult } from '../src/services/verify/types';

async function runG55Tests() {
  console.log('🧪 GRADIFI HOEOS G5.5 - OA LOCATION RESOLUTION TEST SUITE');
  console.log('===========================================================');

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

  const baseMeta: UnpaywallMetadataResult = {
    providerId: 'unpaywall',
    doi: '10.1038/s41586-023-00001-x',
    status: 'METADATA_FOUND',
    title: 'Quantum Advantage Demonstration',
    authors: ['Dr. Alice Vance'],
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    correlationId: 'test_g55_001'
  };

  // 1. Best PDF Location
  console.log('\n1. Best PDF Location Resolution');
  const res1 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    bestOALocation: {
      url: 'https://arxiv.org/abs/2301.00001',
      urlForPdf: 'https://arxiv.org/pdf/2301.00001.pdf',
      isBest: true,
      license: 'cc-by'
    }
  });

  assert(res1.status === 'OA_LOCATION_FOUND', 'Status is OA_LOCATION_FOUND for valid best PDF');
  assert(res1.isBestLocation === true, 'isBestLocation is true');
  assert(res1.selectedLocation?.urlForPdf === 'https://arxiv.org/pdf/2301.00001.pdf', 'Selected location contains urlForPdf');

  // 2. Landing-page-only Location
  console.log('\n2. Landing-Page-Only Location');
  const res2 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    bestOALocation: {
      url: 'https://journal.org/articles/10.1038-s41586',
      urlForLandingPage: 'https://journal.org/articles/10.1038-s41586',
      isBest: true
    }
  });

  assert(res2.status === 'OA_LOCATION_FOUND', 'Status is OA_LOCATION_FOUND for landing page');
  assert(Boolean(res2.selectedLocation?.url), 'Selected location url exists');
  assert(typeof res2.selectedLocation?.urlForPdf === 'undefined', 'urlForPdf is undefined for landing page only');

  // 3. Multiple Locations (Deterministic Fallback)
  console.log('\n3. Multiple Locations Resolution');
  const res3 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    bestOALocation: undefined,
    oaLocations: [
      { url: 'https://repository.edu/paper', isBest: false },
      { urlForPdf: 'https://repository.edu/paper.pdf', isBest: false }
    ]
  });

  assert(res3.status === 'OA_LOCATION_FOUND', 'Status is OA_LOCATION_FOUND');
  assert(res3.selectedLocation?.urlForPdf === 'https://repository.edu/paper.pdf', 'Deterministically selects PDF candidate over HTML candidate');

  // 4. No OA Locations
  console.log('\n4. No OA Locations');
  const res4 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    isOA: false,
    bestOALocation: undefined,
    oaLocations: []
  });

  assert(res4.status === 'NO_OA_LOCATION', 'Status is NO_OA_LOCATION when no OA locations exist');
  assert(typeof res4.selectedLocation === 'undefined', 'selectedLocation is undefined');

  // 5. Malformed URL
  console.log('\n5. Malformed URL Detection');
  const res5 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    bestOALocation: {
      url: 'ht!tp://malformed-url-format',
      isBest: true
    }
  });

  assert(res5.status === 'OA_LOCATION_INVALID', 'Status is OA_LOCATION_INVALID for malformed URL');
  assert(Boolean(res5.errorMessage), 'errorMessage populated for invalid URL');

  // 6. Metadata Not Found
  console.log('\n6. Metadata Not Found Input');
  const res6 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    status: 'METADATA_NOT_FOUND',
    errorMessage: 'DOI not found in Unpaywall index'
  });

  assert(res6.status === 'NO_OA_LOCATION', 'Status is NO_OA_LOCATION when metadata status is METADATA_NOT_FOUND');

  // 7. Provider Request Failure
  console.log('\n7. Provider Request Failure Input');
  const res7 = unpaywallOAResolver.resolveLocation({
    ...baseMeta,
    status: 'REQUEST_FAILED',
    errorMessage: 'Unpaywall API HTTP 500 error'
  });

  assert(res7.status === 'NO_OA_LOCATION', 'Status is NO_OA_LOCATION when provider request failed');

  // 8. Boundary Proof Verification
  console.log('\n8. Boundary Proof Verification');
  assert(res1.status !== ('DETERMINISTIC_EVIDENCE_VERIFIED' as any), 'OA location resolution NEVER claims DETERMINISTIC_EVIDENCE_VERIFIED');
  assert(typeof (res1 as any).provenanceState === 'undefined', 'OALocationResolutionResult does NOT attach false provenanceState');

  console.log('===========================================================');
  console.log(`📊 G5.5 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG55Tests().catch(err => {
  console.error('G5.5 test execution failed:', err);
  process.exit(1);
});
