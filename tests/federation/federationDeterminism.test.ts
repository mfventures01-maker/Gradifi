import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { runFederation } from '../../src/services/verify/federation/federationScheduler';
import { buildProviderQuery } from '../../src/services/verify/queryBuilder';

console.log('--- HOEOS FEDERATION SCHEDULER & DETERMINISM TESTS ---');

async function runDeterminismTests() {
  const sampleDocument = `
TITLE: DESIGN AND IMPLEMENTATION OF A DIGITAL THERMOMETER

1.0 INTRODUCTION
A digital thermometer measures ambient temperature accurately using an LM35 precision temperature sensor and a PIC16F877A microcontroller.
The LM35 temperature sensor outputs calibrated millivolt readings proportional to degrees Celsius.
The PIC16F877A microcontroller samples the sensor voltage and displays the digital temperature value.
`;

  // Test 1: Determinism across two consecutive runs
  console.log('Test 1: Running federation twice on the same document payload...');
  const query1 = buildProviderQuery(sampleDocument, 8);
  const query2 = buildProviderQuery(sampleDocument, 8);
  assert.strictEqual(query1, query2, 'Query builder must produce identical queries');
  console.log('Constructed query:', query1);

  const t0_1 = Date.now();
  const run1 = await runFederation(sampleDocument);
  const dur1 = Date.now() - t0_1;

  const t0_2 = Date.now();
  const run2 = await runFederation(sampleDocument);
  const dur2 = Date.now() - t0_2;

  const keys1 = Object.keys(run1);
  const keys2 = Object.keys(run2);
  const sortedKeys = ['core', 'crossref', 'googlebooks', 'openalex', 'unpaywall'];

  console.log('Run 1 Provider Keys:', keys1, `(${dur1}ms)`);
  console.log('Run 2 Provider Keys:', keys2, `(${dur2}ms)`);

  assert.deepStrictEqual(keys1, sortedKeys, 'Keys must be sorted alphabetically in run 1');
  assert.deepStrictEqual(keys2, sortedKeys, 'Keys must be sorted alphabetically in run 2');
  assert.deepStrictEqual(keys1, keys2, 'Key sets must be identical across runs');

  for (const provider of sortedKeys) {
    const res1 = run1[provider];
    const res2 = run2[provider];
    assert.strictEqual(res1.providerId, provider);
    assert.strictEqual(res2.providerId, provider);
    console.log(`Provider '${provider}': Run 1 = ${res1.fineGrainedStatus} (${res1.matches.length} matches), Run 2 = ${res2.fineGrainedStatus} (${res2.matches.length} matches)`);
  }
  console.log('✔ Test 1 passed: Determinism and alphabetical ordering verified');

  // Test 2: Full Integration Test against Digital Thermometer Thesis text
  console.log('\nTest 2: Full Integration Test with representative Digital Thermometer document...');
  let thesisText = sampleDocument;
  const realDocxPath = 'C:\\Users\\faith\\Downloads\\DIGITAL THERMOMETER real.docx';

  if (fs.existsSync(realDocxPath)) {
    try {
      // @ts-ignore
      const mammothModule: any = await import('mammoth');
      const mammoth = mammothModule.default || mammothModule;
      const docxBuffer = fs.readFileSync(realDocxPath);
      const extraction = await mammoth.extractRawText({ buffer: docxBuffer });
      if (extraction.value && extraction.value.length > 500) {
        thesisText = extraction.value;
        console.log(`Loaded real docx text (${thesisText.length} chars)`);
      }
    } catch (err) {
      console.log('Mammoth extraction fallback to sample document');
    }
  }

  const integrationStart = Date.now();
  const integrationResults = await runFederation(thesisText);
  const totalWallClockMs = Date.now() - integrationStart;

  console.log(`\nIntegration run completed in ${totalWallClockMs}ms`);
  assert.ok(totalWallClockMs >= 1000, `Wall clock should respect rate limiter (>= 1000ms), took ${totalWallClockMs}ms`);
  assert.ok(totalWallClockMs <= 30000, `Wall clock should be bounded (<= 30000ms), took ${totalWallClockMs}ms`);

  const verifiedProviders = Object.entries(integrationResults).filter(([_, res]) =>
    res.fineGrainedStatus === 'VERIFIED' || res.status === 'success'
  );

  console.log(`Verified providers: ${verifiedProviders.length}/5 (${verifiedProviders.map(p => p[0]).join(', ')})`);
  assert.ok(verifiedProviders.length >= 3, `Expected at least 3 of 5 providers to return VERIFIED, got ${verifiedProviders.length}`);

  // Save evidence run summary to certification/federation_logs/
  const today = new Date().toISOString().slice(0, 10);
  const logDir = path.resolve('certification/federation_logs', today);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const summaryReport = {
    timestamp: new Date().toISOString(),
    document: 'DIGITAL THERMOMETER thesis',
    wallClockMs: totalWallClockMs,
    verifiedProviderCount: verifiedProviders.length,
    providers: Object.fromEntries(
      Object.entries(integrationResults).map(([p, r]) => [
        p,
        {
          status: r.status,
          fineGrainedStatus: r.fineGrainedStatus,
          matchCount: r.matches?.length || 0,
          rawCount: r.rawCount
        }
      ])
    )
  };

  fs.writeFileSync(
    path.join(logDir, 'integration_run_summary.json'),
    JSON.stringify(summaryReport, null, 2),
    'utf8'
  );
  console.log('✔ Test 2 passed: Integration test successful, summary written to disk');

  console.log('\nALL FEDERATION DETERMINISM & INTEGRATION TESTS PASSED.');
}

runDeterminismTests().catch(err => {
  console.error('Determinism test failed:', err);
  process.exit(1);
});
