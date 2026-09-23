import assert from 'node:assert';
import { RateLimiter, getRateLimiter } from '../../src/services/verify/federation/rateLimiter';
import { PROVIDER_QUOTAS } from '../../src/services/verify/federation/providerQuotas';

console.log('--- HOEOS FEDERATION RATE LIMITER UNIT TESTS ---');

async function runRateLimiterTests() {
  // Test 1: Crossref burst test
  {
    console.log('Test 1: Crossref 5 sequential acquires under burst limit...');
    const limiter = new RateLimiter({
      providerId: 'crossref',
      maxTokens: 5,
      refillRate: 5,
      minIntervalMs: 200
    });

    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    const durationMs = Date.now() - start;
    console.log(`Crossref 5 acquires took: ${durationMs}ms (expected <= 1200ms)`);
    assert.ok(durationMs <= 1200, `Crossref 5 acquires must be fast (<= 1200ms), took ${durationMs}ms`);
    console.log('✔ Test 1 passed: Crossref burst & interval verified');
  }

  // Test 2: CORE rate floor and burst behavior
  {
    console.log('Test 2: CORE burst followed by interval enforcement...');
    const limiter = new RateLimiter({
      providerId: 'core',
      maxTokens: 1,
      refillRate: 0.5,
      minIntervalMs: 2000
    });

    // First acquire is immediate (burst 1)
    const t0 = Date.now();
    await limiter.acquire();
    const firstAcquireDuration = Date.now() - t0;
    console.log(`CORE 1st acquire took: ${firstAcquireDuration}ms (expected < 100ms)`);
    assert.ok(firstAcquireDuration < 100, `CORE first acquire should be immediate, took ${firstAcquireDuration}ms`);

    // Second acquire must wait at least ~2000ms
    const t1 = Date.now();
    await limiter.acquire();
    const secondAcquireDuration = Date.now() - t1;
    console.log(`CORE 2nd acquire took: ${secondAcquireDuration}ms (expected >= 1900ms)`);
    assert.ok(secondAcquireDuration >= 1900, `CORE second acquire must enforce 2s floor, took ${secondAcquireDuration}ms`);
    console.log('✔ Test 2 passed: CORE burst and 2s interval floor verified');
  }

  // Test 3: Multi-acquire scaling check (scaled to 4 acquires to keep test fast while proving rate floor)
  {
    console.log('Test 3: CORE multi-acquire rate floor scaling test...');
    const limiter = new RateLimiter({
      providerId: 'core',
      maxTokens: 1,
      refillRate: 0.5,
      minIntervalMs: 2000
    });

    const start = Date.now();
    const count = 4; // 4 acquires = 3 intervals of 2s = >= 5.7s
    for (let i = 0; i < count; i++) {
      await limiter.acquire();
    }
    const totalMs = Date.now() - start;
    const expectedMinMs = (count - 1) * 1900;
    console.log(`CORE ${count} acquires took: ${totalMs}ms (expected >= ${expectedMinMs}ms)`);
    assert.ok(totalMs >= expectedMinMs, `CORE ${count} acquires took ${totalMs}ms, expected >= ${expectedMinMs}ms`);
    console.log('✔ Test 3 passed: CORE multi-acquire scaling verified');
  }

  // Test 4: Singleton registry
  {
    console.log('Test 4: RateLimiter singleton instance lookup...');
    const l1 = getRateLimiter('openalex');
    const l2 = getRateLimiter('openalex');
    assert.strictEqual(l1, l2, 'getRateLimiter must return singleton instance for provider');
    console.log('✔ Test 4 passed: Singleton pattern verified');
  }

  console.log('ALL RATE LIMITER UNIT TESTS PASSED SUCCESSFULLY.');
}

runRateLimiterTests().catch(err => {
  console.error('RateLimiter test failed:', err);
  process.exit(1);
});
