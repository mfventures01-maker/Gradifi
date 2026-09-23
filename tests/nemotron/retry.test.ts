/**
 * GRADIFI VERIFY - NEMOTRON RETRY TEST SUITE
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import assert from 'node:assert';
import { callNvidiaWithRetry } from '../../src/services/verify/server/nemotronServerHandler';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS — ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`FAIL — ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('================================================================');
console.log('HOEOS NEMOTRON RETRY-WITH-BACKOFF TEST SUITE');
console.log('================================================================');

async function runAll() {
  const originalFetch = global.fetch;

  // Test 1 — 503 response triggers retry (mock fetch)
  await runTest('Test 1 — 503 response triggers retry', async () => {
    let callCount = 0;
    (global as any).fetch = async () => {
      callCount++;
      return new Response('Service Unavailable', { status: 503 });
    };

    try {
      await callNvidiaWithRetry('https://example.com/api', { method: 'POST' }, 3);
      assert.fail('Should have thrown error after 3 failed attempts');
    } catch (err: any) {
      assert.strictEqual(callCount, 3, `Expected 3 calls, got ${callCount}`);
      assert.ok(err.message.includes('503'), 'Error should mention 503');
    }
  });

  // Test 2 — 502 response triggers retry (mock fetch)
  await runTest('Test 2 — 502 response triggers retry', async () => {
    let callCount = 0;
    (global as any).fetch = async () => {
      callCount++;
      return new Response('Bad Gateway', { status: 502 });
    };

    try {
      await callNvidiaWithRetry('https://example.com/api', { method: 'POST' }, 3);
      assert.fail('Should have thrown error after 3 failed attempts');
    } catch (err: any) {
      assert.strictEqual(callCount, 3, `Expected 3 calls, got ${callCount}`);
      assert.ok(err.message.includes('502'), 'Error should mention 502');
    }
  });

  // Test 3 — 400 response does NOT retry
  await runTest('Test 3 — 400 response does NOT retry', async () => {
    let callCount = 0;
    (global as any).fetch = async () => {
      callCount++;
      return new Response('Bad Request', { status: 400 });
    };

    const resp = await callNvidiaWithRetry('https://example.com/api', { method: 'POST' }, 3);
    assert.strictEqual(callCount, 1, `Expected exactly 1 call for 400, got ${callCount}`);
    assert.strictEqual(resp.status, 400);
  });

  // Test 4 — Success on second attempt returns that response
  await runTest('Test 4 — Success on second attempt returns that response', async () => {
    let callCount = 0;
    (global as any).fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '[]' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const resp = await callNvidiaWithRetry('https://example.com/api', { method: 'POST' }, 3);
    assert.strictEqual(callCount, 2, `Expected 2 calls before success, got ${callCount}`);
    assert.strictEqual(resp.status, 200);
  });

  global.fetch = originalFetch;

  console.log('================================================================');
  console.log(`TOTAL: ${passed} PASS / ${failed} FAIL`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll();
