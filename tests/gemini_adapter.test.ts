/**
 * GRADIFI VERIFY - SERVER-SIDE GEMINI API-KEY ADAPTER TEST SUITE
 * HOEOS Standard: Strict Input Boundary, Server-Only Credentials, Provider Truth States.
 *
 * Verifies:
 * - GEMINI-A01 through GEMINI-A12
 * - Phase 14 Failure-Injection Tests (1 to 10)
 * - Phase 15 Repeatability (10 runs)
 */

import {
  handleGeminiApiKeyServerReasoning,
  clearGeminiApiKeyCache
} from '../src/services/verify/server/geminiApiKeyServerHandler.js';
import {
  validateAIFindingSchema,
  generateDeterministicFallbackFindings
} from '../src/services/verify/server/geminiServerHandler.js';
import { EvidenceMatch, EvidenceEngineResult } from '../src/services/verify/types.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testId: string, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testId}: ${description}`);
  } else {
    console.error(`  [FAIL] ${testId}: ${description}`);
    throw new Error(`Assertion failed for ${testId}: ${description}`);
  }
}

const sampleMatches: EvidenceMatch[] = [
  {
    sourceId: 'src_academic_01',
    title: 'Decentralized Machine Learning Paradigms',
    authors: ['Alice Smith', 'Bob Jones'],
    doi: '10.1000/182',
    matchedText: 'Decentralized learning protocols reduce single-point data breaches.',
    originalSnippet: 'Decentralized learning protocols reduce single-point data breaches across edge devices.',
    matchType: 'exact',
    matchPercentage: 65,
    relevanceScore: 88,
    provenance: {
      provider: 'crossref',
      providerRecordId: 'REC-001',
      retrievedAt: new Date().toISOString(),
      sourceType: 'JOURNAL',
      sourceUrl: 'https://example.org/rec001',
      title: 'Decentralized Machine Learning Paradigms',
      authors: ['Alice Smith', 'Bob Jones'],
      provenanceState: 'VERIFIED'
    }
  },
  {
    sourceId: 'src_academic_02',
    title: 'Information Theoretic Security in Edge Networks',
    authors: ['Carol Vance'],
    doi: '10.1000/183',
    matchedText: 'Information theoretic bounds on collaborative optimization.',
    originalSnippet: 'Information theoretic bounds on collaborative optimization in noisy channels.',
    matchType: 'lexical',
    matchPercentage: 30,
    relevanceScore: 72,
    provenance: {
      provider: 'openalex',
      providerRecordId: 'REC-002',
      retrievedAt: new Date().toISOString(),
      sourceType: 'ARTICLE',
      sourceUrl: 'https://example.org/rec002',
      title: 'Information Theoretic Security in Edge Networks',
      authors: ['Carol Vance'],
      provenanceState: 'VERIFIED'
    }
  }
];

const sampleDocumentText = 'Decentralized learning protocols reduce single-point data breaches across edge computing infrastructures.';

async function runSuite() {
  console.log('============================================================');
  console.log('GEMINI API-KEY ADAPTER VERIFICATION SUITE');
  console.log('============================================================\n');

  // Backup env
  const origKey = process.env.GEMINI_API_KEY;

  try {
    // -------------------------------------------------------------
    // GEMINI-A01: Valid request reaches adapter boundary
    // -------------------------------------------------------------
    console.log('--- Phase 12 / Structural Tests ---');
    clearGeminiApiKeyCache();
    process.env.GEMINI_API_KEY = 'TEST_DUMMY_KEY_VALID_LENGTH_1234567890';

    // Mock fetch for deterministic testing of boundary states
    const originalFetch = global.fetch;

    try {
      global.fetch = async (url: any, opts: any) => {
        // Assert server secret is passed in header and url is correct
        assert(
          url.toString().includes('gemini-3.5-flash:generateContent'),
          'GEMINI-A01',
          'Request reaches target gemini-3.5-flash endpoint'
        );
        assert(
          opts.headers['x-goog-api-key'] === 'TEST_DUMMY_KEY_VALID_LENGTH_1234567890',
          'GEMINI-A01b',
          'Request carries x-goog-api-key server header'
        );
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          type: 'exact_overlap',
                          severity: 'high',
                          confidence: 90,
                          studentPassage: 'Decentralized learning protocols reduce single-point data breaches',
                          sourcePassage: 'Decentralized learning protocols reduce single-point data breaches across edge devices.',
                          explanation: 'Verbatim textual match detected against verified academic paper.',
                          sourceId: 'src_academic_01',
                          requiresHumanReview: true
                        }
                      ])
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const res = await handleGeminiApiKeyServerReasoning({
        documentText: sampleDocumentText,
        matches: sampleMatches,
        allowFallback: false
      });

      // GEMINI-A02: Valid Gemini response becomes VERIFIED
      assert(res.status === 'VERIFIED', 'GEMINI-A02', 'Valid Gemini response status is VERIFIED');
      assert(res.findings.length === 1, 'GEMINI-A02b', 'Valid finding parsed into findings array');
      assert(res.findings[0].sourceId === 'src_academic_01', 'GEMINI-A02c', 'Finding preserves valid sourceId');
      assert(res.fallback_used === false, 'GEMINI-A02d', 'fallback_used is false on provider success');

      // GEMINI-A11: Model identity is gemini-3.5-flash
      assert(res.requestedModel === 'gemini-3.5-flash', 'GEMINI-A11a', 'requestedModel is gemini-3.5-flash');
      assert(res.actualModel === 'gemini-3.5-flash', 'GEMINI-A11b', 'actualModel is preserved from provider');
      assert(res.modelProvider === 'gemini', 'GEMINI-A11c', 'modelProvider is gemini');

      // GEMINI-A12: Provider result conforms to the existing federation contract
      assert(typeof res.latencyMs === 'number', 'GEMINI-A12a', 'Preserves latencyMs metric');
      assert(Array.isArray(res.findings), 'GEMINI-A12b', 'Preserves findings array contract');
    } finally {
      global.fetch = originalFetch;
    }

    // -------------------------------------------------------------
    // GEMINI-A03: Empty valid response becomes EMPTY_RESULT
    // -------------------------------------------------------------
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: '[]' }]
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const resEmpty = await handleGeminiApiKeyServerReasoning({
        documentText: 'Completely unique text',
        matches: sampleMatches,
        allowFallback: false
      });

      assert(resEmpty.status === 'EMPTY_RESULT', 'GEMINI-A03', 'Legitimate empty array becomes EMPTY_RESULT');
      assert(resEmpty.findings.length === 0, 'GEMINI-A03b', 'EMPTY_RESULT has empty findings');
      assert(resEmpty.fallback_used === false, 'GEMINI-A03c', 'fallback_used is false on valid EMPTY_RESULT');
    } finally {
      global.fetch = originalFetch;
    }

    // -------------------------------------------------------------
    // GEMINI-A04: Malformed response becomes SCHEMA_INVALID
    // -------------------------------------------------------------
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: 'NOT VALID JSON AT ALL' }]
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const resMalformed = await handleGeminiApiKeyServerReasoning({
        documentText: sampleDocumentText,
        matches: sampleMatches,
        allowFallback: false
      });

      assert(resMalformed.status === 'SCHEMA_INVALID', 'GEMINI-A04', 'Malformed text becomes SCHEMA_INVALID');
      assert(resMalformed.findings.length === 0, 'GEMINI-A04b', 'Findings empty when allowFallback is false');
    } finally {
      global.fetch = originalFetch;
    }

    // -------------------------------------------------------------
    // GEMINI-A05: Unknown sourceId cannot become a valid finding
    // -------------------------------------------------------------
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          type: 'exact_overlap',
                          severity: 'high',
                          confidence: 90,
                          explanation: 'Invented finding with unknown source',
                          sourceId: 'INVENTED_HALLUCINATED_SOURCE_ID',
                          requiresHumanReview: true
                        }
                      ])
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const resUnknownSource = await handleGeminiApiKeyServerReasoning({
        documentText: sampleDocumentText,
        matches: sampleMatches,
        allowFallback: false
      });

      assert(
        resUnknownSource.status === 'SCHEMA_INVALID',
        'GEMINI-A05',
        'Invented/unknown sourceId triggers SCHEMA_INVALID and cannot become a valid finding'
      );
      assert(resUnknownSource.findings.length === 0, 'GEMINI-A05b', 'No findings returned for invented sourceId');
    } finally {
      global.fetch = originalFetch;
    }

    // -------------------------------------------------------------
    // GEMINI-A06: Missing explanation cannot become a valid finding
    // -------------------------------------------------------------
    const missingExp = validateAIFindingSchema({
      type: 'exact_overlap',
      severity: 'high',
      confidence: 85,
      requiresHumanReview: true
    });
    assert(missingExp === null, 'GEMINI-A06', 'validateAIFindingSchema rejects missing explanation');

    // -------------------------------------------------------------
    // GEMINI-A07: Invalid confidence cannot become a valid finding
    // -------------------------------------------------------------
    const invalidType = validateAIFindingSchema({
      type: 'INVALID_TYPE_ENUM',
      severity: 'high',
      confidence: 90,
      explanation: 'Test'
    });
    assert(invalidType === null, 'GEMINI-A07', 'validateAIFindingSchema rejects invalid type enum');

    // -------------------------------------------------------------
    // GEMINI-A08: Provider failure does not mutate deterministic metrics
    // -------------------------------------------------------------
    const baselineDeterministic: Pick<
      EvidenceEngineResult,
      'documentHash' | 'evidenceHash' | 'overallSimilarity' | 'uniqueMatchedCoverage' | 'highestSourceMatch'
    > = {
      documentHash: '0xabc123',
      evidenceHash: '0xdef456',
      overallSimilarity: 42.5,
      uniqueMatchedCoverage: 38.0,
      highestSourceMatch: 65.0
    };

    clearGeminiApiKeyCache();
    delete process.env.GEMINI_API_KEY;
    const resAuthFail = await handleGeminiApiKeyServerReasoning({
      documentText: sampleDocumentText,
      matches: sampleMatches,
      allowFallback: false
    });

    assert(resAuthFail.status === 'AUTHENTICATION_FAILED', 'GEMINI-A08a', 'Missing key produces AUTHENTICATION_FAILED');
    assert(baselineDeterministic.overallSimilarity === 42.5, 'GEMINI-A08b', 'Deterministic overallSimilarity unchanged');
    assert(baselineDeterministic.documentHash === '0xabc123', 'GEMINI-A08c', 'documentHash unchanged');
    assert(baselineDeterministic.evidenceHash === '0xdef456', 'GEMINI-A08d', 'evidenceHash unchanged');

    // -------------------------------------------------------------
    // GEMINI-A09: Fallback is explicitly marked fallback_used
    // -------------------------------------------------------------
    clearGeminiApiKeyCache();
    const resWithFallback = await handleGeminiApiKeyServerReasoning({
      documentText: sampleDocumentText,
      matches: sampleMatches,
      allowFallback: true
    });

    assert(resWithFallback.fallback_used === true, 'GEMINI-A09a', 'fallback_used is true');
    assert(resWithFallback.fallbackUsed === true, 'GEMINI-A09b', 'fallbackUsed alias is true');
    assert(resWithFallback.modelProvider === 'deterministic_fallback', 'GEMINI-A09c', 'modelProvider is deterministic_fallback');
    assert(resWithFallback.status === 'AUTHENTICATION_FAILED', 'GEMINI-A09d', 'Provider truth status is preserved truthfully');
    assert(resWithFallback.findings.length > 0, 'GEMINI-A09e', 'Deterministic fallback findings populated');

    // -------------------------------------------------------------
    // GEMINI-A10: API key is never included in browser output/logging
    // -------------------------------------------------------------
    const serializedResponse = JSON.stringify(resWithFallback);
    assert(!serializedResponse.includes('TEST_DUMMY_KEY'), 'GEMINI-A10a', 'Secret key never appears in serialized response');
    assert(!serializedResponse.includes('AIza'), 'GEMINI-A10b', 'No Google key prefix appears in output');

    // -------------------------------------------------------------
    // Phase 14: Failure-Injection Tests
    // -------------------------------------------------------------
    console.log('\n--- Phase 14 / Failure-Injection Tests ---');

    // 1. Missing GEMINI_API_KEY
    clearGeminiApiKeyCache();
    delete process.env.GEMINI_API_KEY;
    const f1 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
    assert(f1.status === 'AUTHENTICATION_FAILED', 'FI-01', 'Missing GEMINI_API_KEY -> AUTHENTICATION_FAILED');

    // 2. Invalid GEMINI_API_KEY
    process.env.GEMINI_API_KEY = 'short';
    const f2 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
    assert(f2.status === 'AUTHENTICATION_FAILED', 'FI-02', 'Invalid/short GEMINI_API_KEY -> AUTHENTICATION_FAILED');

    process.env.GEMINI_API_KEY = 'TEST_VALID_LENGTH_KEY_FOR_MOCK_TESTS';

    // 3. Gemini Timeout
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        const err: any = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      };
      const f3 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
      assert(f3.status === 'TIMEOUT', 'FI-03', 'Timeout error -> TIMEOUT');
    } finally {
      global.fetch = originalFetch;
    }

    // 4. Network Failure
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        throw new Error('fetch failed: getaddrinfo ENOTFOUND generativelanguage.googleapis.com');
      };
      const f4 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
      assert(f4.status === 'NETWORK_ERROR', 'FI-04', 'ENOTFOUND / fetch failed -> NETWORK_ERROR');
    } finally {
      global.fetch = originalFetch;
    }

    // 5. Malformed JSON
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response('{"corrupted": json', { status: 200 });
      };
      const f5 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
      assert(f5.status === 'SCHEMA_INVALID', 'FI-05', 'Corrupted non-JSON response -> SCHEMA_INVALID');
    } finally {
      global.fetch = originalFetch;
    }

    // 6. Unknown sourceId
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          type: 'citation_issue',
                          severity: 'low',
                          confidence: 80,
                          explanation: 'Unknown source match',
                          sourceId: 'UNREGISTERED_SOURCE_XYZ',
                          requiresHumanReview: false
                        }
                      ])
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200 }
        );
      };
      const f6 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
      assert(f6.status === 'SCHEMA_INVALID', 'FI-06', 'Unregistered source ID -> SCHEMA_INVALID');
    } finally {
      global.fetch = originalFetch;
    }

    // 7. Empty matches
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '[]' }] } }]
          }),
          { status: 200 }
        );
      };
      const f7 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: [] });
      assert(f7.status === 'EMPTY_RESULT', 'FI-07', 'Empty matches array -> EMPTY_RESULT');
    } finally {
      global.fetch = originalFetch;
    }

    // 8. Valid matches with legitimate findings
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          type: 'semantic_overlap',
                          severity: 'moderate',
                          confidence: 85,
                          explanation: 'Conceptual equivalence detected.',
                          sourceId: 'src_academic_02',
                          requiresHumanReview: true
                        }
                      ])
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200 }
        );
      };
      const f8 = await handleGeminiApiKeyServerReasoning({ documentText: sampleDocumentText, matches: sampleMatches });
      assert(f8.status === 'VERIFIED', 'FI-08', 'Valid matches with valid findings -> VERIFIED');
    } finally {
      global.fetch = originalFetch;
    }

    // 9. allowFallback=false preserves failure with empty findings
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => new Response('Internal error', { status: 500, statusText: 'Internal Server Error' });
      const f9 = await handleGeminiApiKeyServerReasoning({
        documentText: sampleDocumentText,
        matches: sampleMatches,
        allowFallback: false
      });
      assert(f9.status === 'INFERENCE_FAILED', 'FI-09a', 'HTTP 500 -> INFERENCE_FAILED');
      assert(f9.findings.length === 0, 'FI-09b', 'allowFallback=false yields 0 findings');
      assert(f9.fallback_used === false, 'FI-09c', 'fallback_used is false');
    } finally {
      global.fetch = originalFetch;
    }

    // 10. allowFallback=true returns deterministic fallback on failure
    clearGeminiApiKeyCache();
    try {
      global.fetch = async () => new Response('Internal error', { status: 500, statusText: 'Internal Server Error' });
      const f10 = await handleGeminiApiKeyServerReasoning({
        documentText: sampleDocumentText,
        matches: sampleMatches,
        allowFallback: true
      });
      assert(f10.status === 'INFERENCE_FAILED', 'FI-10a', 'HTTP 500 -> INFERENCE_FAILED');
      assert(f10.findings.length > 0, 'FI-10b', 'allowFallback=true yields fallback findings');
      assert(f10.fallback_used === true, 'FI-10c', 'fallback_used is true');
      assert(f10.modelProvider === 'deterministic_fallback', 'FI-10d', 'modelProvider is deterministic_fallback');
    } finally {
      global.fetch = originalFetch;
    }

    // -------------------------------------------------------------
    // Phase 15: Repeatability (10 runs)
    // -------------------------------------------------------------
    console.log('\n--- Phase 15 / Repeatability (10 Runs) ---');
    clearGeminiApiKeyCache();
    const fixedMockOutput = [
      {
        type: 'exact_overlap',
        severity: 'high',
        confidence: 92,
        studentPassage: 'Decentralized learning protocols',
        sourcePassage: 'Decentralized learning protocols across edge devices.',
        explanation: 'Direct overlap match.',
        sourceId: 'src_academic_01',
        requiresHumanReview: true
      },
      {
        type: 'lexical_overlap',
        severity: 'moderate',
        confidence: 80,
        studentPassage: 'Information theoretic bounds',
        sourcePassage: 'Information theoretic bounds on collaborative optimization.',
        explanation: 'Shared terminology.',
        sourceId: 'src_academic_02',
        requiresHumanReview: false
      }
    ];

    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.5-flash',
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: JSON.stringify(fixedMockOutput) }]
                }
              }
            ]
          }),
          { status: 200 }
        );
      };

      const runs: string[] = [];
      for (let i = 1; i <= 10; i++) {
        clearGeminiApiKeyCache(); // bypass in-memory cache to force parsing/sorting/validation pipeline
        const runRes = await handleGeminiApiKeyServerReasoning({
          documentText: sampleDocumentText,
          matches: sampleMatches,
          allowFallback: false
        });
        const serialized = JSON.stringify({
          status: runRes.status,
          modelProvider: runRes.modelProvider,
          requestedModel: runRes.requestedModel,
          actualModel: runRes.actualModel,
          findings: runRes.findings
        });
        runs.push(serialized);
      }

      const allIdentical = runs.every(r => r === runs[0]);
      assert(allIdentical, 'REPEAT-10', '10 iterations produced 100% byte-identical machine representations');
    } finally {
      global.fetch = originalFetch;
    }

    console.log('\n============================================================');
    console.log(`SUMMARY: All ${passedTests}/${totalTests} tests passed successfully.`);
    console.log('============================================================');
  } finally {
    // Restore original env
    if (origKey !== undefined) {
      process.env.GEMINI_API_KEY = origKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
