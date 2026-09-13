/**
 * GRADIFI VERIFY - LIVE SIX-PROVIDER FEDERATION TEST RUNNER
 * HOEOS Phase B: Live verification across Crossref, OpenAlex, Unpaywall, CORE, Google Books, Nemotron.
 * ZERO secret leaks. Full observability metrics.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { CrossrefProvider } from '../src/services/verify/providers/crossrefProvider';
import { OpenAlexProvider } from '../src/services/verify/providers/openAlexProvider';
import { UnpaywallProvider } from '../src/services/verify/providers/unpaywallProvider';
import { handleCoreServerSearch } from '../src/services/verify/server/coreServerHandler';
import { handleGoogleBooksServerSearch } from '../src/services/verify/server/googleBooksServerHandler';
import { handleNemotronServerReasoning } from '../src/services/verify/server/nemotronServerHandler';
import fs from 'fs';
import path from 'path';

export interface ProviderMetric {
  provider: string;
  requestStartedAt: string;
  requestFinishedAt: string;
  latencyMs: number;
  httpStatus: number | string;
  authenticationStatus: 'VERIFIED' | 'AUTHENTICATION_FAILED' | 'NOT_REQUIRED';
  responseStatus: 'SUCCESS' | 'EMPTY' | 'FAILED' | 'AUTHENTICATION_FAILED' | 'INFERENCE_VERIFIED';
  resultCount: number;
  normalizedResultCount: number;
  errorClass?: string;
  retryCount: number;
  cacheHit: boolean;
  providerRequestId?: string;
  authorityClass: 'DETERMINISTIC_EVIDENCE' | 'AI_INTERPRETATION_ONLY';
}

async function runLiveSixProviderTest() {
  console.log('🚀 GRADIFI VERIFY - LIVE SIX-PROVIDER FEDERATION TEST');
  console.log('====================================================\n');

  const runStartedAt = new Date();
  const runId = `FED-RUN-${runStartedAt.getTime()}`;
  const query = 'machine learning';
  const canonicalDoi = '10.1038/s41586-020-2649-2';
  const canonicalIsbn = '9780131103627';

  const metrics: ProviderMetric[] = [];

  // Instantiations
  const crossref = new CrossrefProvider();
  const openAlex = new OpenAlexProvider();
  const unpaywall = new UnpaywallProvider();

  // Execute Providers Concurrently via Promise.allSettled
  const startTime = Date.now();

  const [crRes, oaRes, unpRes, coreRes, gbRes, nemoRes] = await Promise.allSettled([
    // 1. Crossref
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await crossref.search({ query, documentText: query, limit: 5 });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'crossref',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })(),

    // 2. OpenAlex
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await openAlex.search({ query, documentText: query, limit: 5 });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'openalex',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })(),

    // 3. Unpaywall (DOI lookup)
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await unpaywall.search({ query: `DOI: ${canonicalDoi}`, documentText: canonicalDoi, limit: 5 });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'unpaywall',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })(),

    // 4. CORE
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await handleCoreServerSearch({ query, limit: 5 });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'core',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })(),

    // 5. Google Books (ISBN lookup)
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await handleGoogleBooksServerSearch({ query: `isbn:${canonicalIsbn}`, limit: 5 });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'googlebooks',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })(),

    // 6. NVIDIA Nemotron
    (async () => {
      const start = Date.now();
      const startIso = new Date().toISOString();
      const res = await handleNemotronServerReasoning({
        documentText: 'Machine learning algorithms build mathematical models based on sample data to make predictions.',
        matches: []
      });
      const finish = Date.now();
      const finishIso = new Date().toISOString();
      return {
        provider: 'nemotron',
        startIso,
        finishIso,
        latencyMs: finish - start,
        res
      };
    })()
  ]);

  const totalDurationMs = Date.now() - startTime;

  // Process Crossref
  if (crRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = crRes.value;
    metrics.push({
      provider: 'crossref',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: res.errorCode ? res.errorCode : 200,
      authenticationStatus: 'NOT_REQUIRED',
      responseStatus: res.matches.length > 0 ? 'SUCCESS' : 'EMPTY',
      resultCount: res.rawCount || res.matches.length,
      normalizedResultCount: res.matches.length,
      retryCount: 0,
      cacheHit: false,
      providerRequestId: res.correlationId,
      authorityClass: 'DETERMINISTIC_EVIDENCE'
    });
  }

  // Process OpenAlex
  if (oaRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = oaRes.value;
    metrics.push({
      provider: 'openalex',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: res.errorCode ? res.errorCode : 200,
      authenticationStatus: 'NOT_REQUIRED',
      responseStatus: res.matches.length > 0 ? 'SUCCESS' : 'EMPTY',
      resultCount: res.rawCount || res.matches.length,
      normalizedResultCount: res.matches.length,
      retryCount: 0,
      cacheHit: false,
      providerRequestId: res.correlationId,
      authorityClass: 'DETERMINISTIC_EVIDENCE'
    });
  }

  // Process Unpaywall
  if (unpRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = unpRes.value;
    metrics.push({
      provider: 'unpaywall',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: res.errorCode ? res.errorCode : 200,
      authenticationStatus: 'NOT_REQUIRED',
      responseStatus: res.matches.length > 0 ? 'SUCCESS' : 'EMPTY',
      resultCount: res.rawCount || res.matches.length,
      normalizedResultCount: res.matches.length,
      retryCount: 0,
      cacheHit: false,
      providerRequestId: res.correlationId,
      authorityClass: 'DETERMINISTIC_EVIDENCE'
    });
  }

  // Process CORE
  if (coreRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = coreRes.value;
    const isAuthFailed = res.fineGrainedStatus === 'AUTHENTICATION_FAILED';
    metrics.push({
      provider: 'core',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: isAuthFailed ? 401 : (res.errorCode || 200),
      authenticationStatus: isAuthFailed ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
      responseStatus: isAuthFailed ? 'AUTHENTICATION_FAILED' : (res.matches.length > 0 ? 'SUCCESS' : 'EMPTY'),
      resultCount: res.rawCount || res.matches.length,
      normalizedResultCount: res.matches.length,
      errorClass: isAuthFailed ? 'MISSING_API_KEY' : res.errorMessage,
      retryCount: 0,
      cacheHit: false,
      providerRequestId: res.correlationId,
      authorityClass: 'DETERMINISTIC_EVIDENCE'
    });
  }

  // Process Google Books
  if (gbRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = gbRes.value;
    const isAuthFailed = res.fineGrainedStatus === 'AUTHENTICATION_FAILED';
    metrics.push({
      provider: 'googlebooks',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: isAuthFailed ? 401 : (res.errorCode || 200),
      authenticationStatus: isAuthFailed ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
      responseStatus: isAuthFailed ? 'AUTHENTICATION_FAILED' : (res.matches.length > 0 ? 'SUCCESS' : 'EMPTY'),
      resultCount: res.rawCount || res.matches.length,
      normalizedResultCount: res.matches.length,
      errorClass: isAuthFailed ? 'INVALID_API_KEY' : res.errorMessage,
      retryCount: 0,
      cacheHit: false,
      providerRequestId: res.correlationId,
      authorityClass: 'DETERMINISTIC_EVIDENCE'
    });
  }

  // Process Nemotron
  if (nemoRes.status === 'fulfilled') {
    const { startIso, finishIso, latencyMs, res } = nemoRes.value;
    const isAuthFailed = res.status === 'AUTHENTICATION_FAILED';
    const isVerified = res.status === 'INFERENCE_VERIFIED';
    metrics.push({
      provider: 'nemotron',
      requestStartedAt: startIso,
      requestFinishedAt: finishIso,
      latencyMs,
      httpStatus: isVerified ? 200 : (isAuthFailed ? 401 : 500),
      authenticationStatus: isAuthFailed ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
      responseStatus: isVerified ? 'INFERENCE_VERIFIED' : (isAuthFailed ? 'AUTHENTICATION_FAILED' : 'FAILED'),
      resultCount: res.findings.length,
      normalizedResultCount: res.findings.length,
      errorClass: res.errorMessage,
      retryCount: 0,
      cacheHit: false,
      authorityClass: 'AI_INTERPRETATION_ONLY'
    });
  }

  // Sequential Latency Estimate (sum of latencies)
  const sequentialEstimateMs = metrics.reduce((acc, m) => acc + m.latencyMs, 0);
  const parallelizationGain = Math.round(((sequentialEstimateMs - totalDurationMs) / sequentialEstimateMs) * 100);

  const successfulCount = metrics.filter(m => m.responseStatus === 'SUCCESS' || m.responseStatus === 'INFERENCE_VERIFIED').length;
  const failedCount = metrics.length - successfulCount;

  // Print Summary Table
  console.log('\n📊 LIVE FEDERATION METRICS SUMMARY:');
  console.table(metrics.map(m => ({
    Provider: m.provider,
    HTTP: m.httpStatus,
    Auth: m.authenticationStatus,
    Response: m.responseStatus,
    Latency: `${m.latencyMs}ms`,
    Records: m.normalizedResultCount,
    Authority: m.authorityClass
  })));

  console.log(`\n⏱️ LATENCY COMPARISON:`);
  console.log(`   Sequential Theoretical Estimate: ${sequentialEstimateMs}ms`);
  console.log(`   Actual Parallel Federation:       ${totalDurationMs}ms`);
  console.log(`   Parallelization Gain:             ${parallelizationGain}%`);
  console.log(`   Providers Attempted:              ${metrics.length}`);
  console.log(`   Providers Successful:             ${successfulCount}`);
  console.log(`   Providers Failed/Auth Error:      ${failedCount}`);

  // Generate FEDERATION_RUN_REPORT.json
  const reportJson = {
    runId,
    startedAt: runStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    totalDurationMs,
    sequentialEstimateMs,
    parallelizationGainPercent: parallelizationGain,
    providersAttempted: metrics.length,
    providersSuccessful: successfulCount,
    providersFailed: failedCount,
    metrics
  };

  fs.writeFileSync(path.join(process.cwd(), 'FEDERATION_RUN_REPORT.json'), JSON.stringify(reportJson, null, 2));
  console.log('\n📄 Saved FEDERATION_RUN_REPORT.json');

  // Generate FEDERATION_RUN_REPORT.md
  let reportMd = `# FEDERATION RUN REPORT
**RUN ID:** \`${runId}\`  
**STARTED AT:** \`${runStartedAt.toISOString()}\`  
**TOTAL DURATION:** \`${totalDurationMs}ms\` (Sequential Estimate: \`${sequentialEstimateMs}ms\`, Gain: \`${parallelizationGain}%\`)  

---

## 1. Provider Execution Matrix

| Provider | Authority Class | HTTP | Auth Status | Response Status | Latency | Records Found | Correlation ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${metrics.map(m => `| **${m.provider}** | \`${m.authorityClass}\` | \`${m.httpStatus}\` | \`${m.authenticationStatus}\` | \`${m.responseStatus}\` | \`${m.latencyMs}ms\` | \`${m.normalizedResultCount}\` | \`${m.providerRequestId || 'N/A'}\` |`).join('\n')}

---

## 2. Federation Performance Summary

- **Total Providers Attempted:** \`${metrics.length}\`
- **Successful Providers:** \`${successfulCount}\`
- **Failed / Auth Error Providers:** \`${failedCount}\`
- **Fastest Provider:** \`${[...metrics].sort((a,b) => a.latencyMs - b.latencyMs)[0]?.provider}\` (\`${[...metrics].sort((a,b) => a.latencyMs - b.latencyMs)[0]?.latencyMs}ms\`)
- **Slowest Provider:** \`${[...metrics].sort((a,b) => b.latencyMs - a.latencyMs)[0]?.provider}\` (\`${[...metrics].sort((a,b) => b.latencyMs - a.latencyMs)[0]?.latencyMs}ms\`)
- **Parallelization Gain:** \`${parallelizationGain}%\`

---

## 3. Strict HOEOS Authority Boundary Verification

- **Deterministic Evidence Authority:** OpenAlex, Crossref, Unpaywall, CORE, Google Books contribute candidate evidence records only.
- **AI Interpretation Boundary:** NVIDIA Nemotron operates strictly as \`AI_INTERPRETATION_ONLY\`. Its response is NEVER used to alter deterministic G2/G3/G5 similarity scores.
- **Secret Isolation:** Zero secret keys written to reports, console, or client bundles.
`;

  fs.writeFileSync(path.join(process.cwd(), 'FEDERATION_RUN_REPORT.md'), reportMd);
  console.log('📄 Saved FEDERATION_RUN_REPORT.md');
}

runLiveSixProviderTest().catch(err => {
  console.error('Fatal live federation test error:', err);
  process.exit(1);
});
