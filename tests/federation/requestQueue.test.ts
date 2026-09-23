import assert from 'node:assert';
import { enqueue, FederationQueueError } from '../../src/services/verify/federation/requestQueue';
import { getRateLimiter } from '../../src/services/verify/federation/rateLimiter';

console.log('--- HOEOS FEDERATION REQUEST QUEUE UNIT TESTS ---');

async function runRequestQueueTests() {
  // Reset limiters for clean test runs
  getRateLimiter('test_immediate').reset();
  getRateLimiter('test_429').reset();
  getRateLimiter('test_500').reset();
  getRateLimiter('test_budget').reset();

  // Test 1: Immediate success (not retried)
  {
    console.log('Test 1: Request succeeding immediately is not retried...');
    let callCount = 0;
    const result = await enqueue({
      providerId: 'test_immediate',
      correlationId: 'corr_test_1',
      fn: async () => {
        callCount++;
        return { status: 'success', matches: [{ sourceId: 'src_1' }] };
      }
    });

    assert.strictEqual(callCount, 1, 'Should only be called once');
    assert.strictEqual(result.status, 'success');
    console.log('✔ Test 1 passed: Immediate success clean execution');
  }

  // Test 2: Request returning 429 is retried and succeeds on retry
  {
    console.log('Test 2: Request returning 429 is retried...');
    let callCount = 0;
    const retryHistory: number[] = [];

    const result = await enqueue({
      providerId: 'test_429',
      correlationId: 'corr_test_2',
      onRetry: (attempt, err) => {
        retryHistory.push(attempt);
      },
      fn: async () => {
        callCount++;
        if (callCount === 1) {
          return { status: 'unavailable', errorCode: 'HTTP_429', errorMessage: 'Rate limit exceeded' };
        }
        return { status: 'success', matches: [{ sourceId: 'src_2' }] };
      }
    });

    assert.strictEqual(callCount, 2, 'Should be retried once after 429');
    assert.strictEqual(retryHistory.length, 1);
    assert.strictEqual(retryHistory[0], 1);
    assert.strictEqual(result.status, 'success');
    console.log('✔ Test 2 passed: 429 rate limit backoff retry succeeded');
  }

  // Test 3: Request throwing HTTP 500 error is retried and succeeds on retry
  {
    console.log('Test 3: Request throwing HTTP 500 error is retried...');
    let callCount = 0;
    const retryHistory: number[] = [];

    const result = await enqueue({
      providerId: 'test_500',
      correlationId: 'corr_test_3',
      onRetry: (attempt, err) => {
        retryHistory.push(attempt);
      },
      fn: async () => {
        callCount++;
        if (callCount < 3) {
          const err = new Error('500 Internal Server Error');
          (err as any).status = 500;
          throw err;
        }
        return { status: 'success', matches: [{ sourceId: 'src_3' }] };
      }
    });

    assert.strictEqual(callCount, 3, 'Should be retried twice after 500');
    assert.strictEqual(retryHistory.length, 2);
    assert.strictEqual(result.status, 'success');
    console.log('✔ Test 3 passed: 500 server error backoff retry succeeded');
  }

  // Test 4: Request exceeding total budget fails with structured error
  {
    console.log('Test 4: Request exceeding total budget fails with structured FederationQueueError...');
    let threw = false;

    try {
      await enqueue({
        providerId: 'test_budget',
        correlationId: 'corr_test_4',
        totalBudgetMs: 300, // Small budget
        fn: async () => {
          // Throws 503 so it attempts retry, but retry delay will exceed 300ms budget
          const err = new Error('503 Service Unavailable');
          (err as any).status = 503;
          throw err;
        }
      });
    } catch (err: any) {
      threw = true;
      assert.ok(err instanceof FederationQueueError, 'Must throw FederationQueueError on budget exhaustion');
      assert.strictEqual(err.providerId, 'test_budget');
      assert.strictEqual(err.correlationId, 'corr_test_4');
      assert.ok(err.message.includes('budget'));
      console.log('Caught structured budget error as expected:', err.message);
    }

    assert.ok(threw, 'Should throw error when total budget is exceeded');
    console.log('✔ Test 4 passed: Total budget exhaustion handled gracefully');
  }

  console.log('ALL REQUEST QUEUE UNIT TESTS PASSED SUCCESSFULLY.');
}

runRequestQueueTests().catch(err => {
  console.error('RequestQueue test failed:', err);
  process.exit(1);
});
