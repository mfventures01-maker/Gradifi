/**
 * GRADIFI VERIFY - GEMMA SERVER HANDLER & OLLAMA FEDERATION TEST SUITE
 */

import { handleGemmaServerReasoning } from '../src/services/verify/server/gemmaServerHandler';
import { AIFederationService } from '../src/services/verify/aiFederation';
import { EvidenceMatch } from '../src/services/verify/types';

async function runGemmaServerTests() {
  console.log('🧪 GRADIFI - GEMMA OLLAMA SERVER HANDLER TEST SUITE');
  console.log('====================================================');

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

  const sampleMatch: EvidenceMatch = {
    sourceId: 'src_test_01',
    title: 'Federated Learning Quantum Paradigm',
    authors: ['Dr. Aris Thorne'],
    url: 'https://example.org/paper',
    matchedText: 'Federated learning across decoupled edge networks',
    originalSnippet: 'Federated learning across decoupled edge networks faces significant communication latency.',
    matchType: 'exact',
    matchPercentage: 85,
    relevanceScore: 92,
    provenance: {
      provider: 'crossref',
      providerRecordId: 'REC-12345',
      retrievedAt: new Date().toISOString(),
      sourceType: 'JOURNAL',
      sourceUrl: 'https://example.org/paper',
      title: 'Federated Learning Quantum Paradigm',
      authors: ['Dr. Aris Thorne'],
      provenanceState: 'VERIFIED'
    }
  };

  const sampleDocument = 'Federated learning across decoupled edge networks faces significant communication latency.';

  // Test 1: Handler returns valid GemmaServerResponse object
  console.log('\n1. Test Gemma Server Response Structure');
  const response = await handleGemmaServerReasoning({
    documentText: sampleDocument,
    matches: [sampleMatch],
    model: 'gemma4:31b'
  });

  assert(typeof response === 'object' && response !== null, 'Response is an object');
  assert(['INFERENCE_VERIFIED', 'RUNTIME_UNAVAILABLE', 'INFERENCE_FAILED', 'AUTHENTICATION_FAILED'].includes(response.status), `Response status '${response.status}' belongs to canonical vocabulary`);
  assert(Array.isArray(response.findings), 'Response findings is an array');

  // Test 2: AI Federation Integration
  console.log('\n2. Test AI Federation Service Gemma Adapter');
  const federationService = new AIFederationService();
  const probeStatus = await federationService.probeLocalGemma();
  assert(['RUNTIME_AVAILABLE', 'RUNTIME_UNAVAILABLE'].includes(probeStatus), `Local Gemma probe status '${probeStatus}' is valid`);

  const gemmaResult = await federationService.runGemmaReasoning(sampleDocument, [sampleMatch]);
  assert(['INFERENCE_VERIFIED', 'RUNTIME_UNAVAILABLE', 'INFERENCE_FAILED', 'AUTHENTICATION_FAILED'].includes(gemmaResult.status), `Federation gemmaResult status '${gemmaResult.status}' is valid`);
  assert(Array.isArray(gemmaResult.findings), 'Federation gemmaResult findings is an array');

  const fullFedResult = await federationService.executeFederation(sampleDocument, [sampleMatch]);
  assert(fullFedResult.localAiStatus === probeStatus, 'Federation localAiStatus matches probe result');
  assert(fullFedResult.gemmaStatus !== undefined, 'Federation includes gemmaStatus');
  assert(Array.isArray(fullFedResult.findings) && fullFedResult.findings.length > 0, 'Federation produces findings array');

  console.log('====================================================');
  console.log(`📊 GEMMA OLLAMA TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runGemmaServerTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
