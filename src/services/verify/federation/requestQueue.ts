/**
 * GRADIFI VERIFY - REGULATED PROVIDER REQUEST QUEUE
 * Per-provider serialized execution with backoff, retry semantics, and bounded budgets.
 * HOEOS Standard: Concurrency Isolation, Fault Containment, Quota Protection.
 */

import { getRateLimiter } from './rateLimiter';
import { logProviderCall } from './providerLogger';
import { ProviderResult } from '../types';

export interface QueuedRequest<T> {
  providerId: string;
  correlationId: string;
  fn: () => Promise<T>;
  onRetry?: (attempt: number, err: unknown) => void;
  url?: string;
  timeoutMs?: number;
  totalBudgetMs?: number;
}

export class FederationQueueError extends Error {
  public providerId: string;
  public correlationId: string;
  public attempts: number;
  public durationMs: number;
  public lastError?: any;

  constructor(message: string, providerId: string, correlationId: string, attempts: number, durationMs: number, lastError?: any) {
    super(message);
    this.name = 'FederationQueueError';
    this.providerId = providerId;
    this.correlationId = correlationId;
    this.attempts = attempts;
    this.durationMs = durationMs;
    this.lastError = lastError;
  }
}

// Backoff delays in milliseconds for attempts 2, 3, 4
const RETRY_BACKOFF_MS = [0, 500, 2000, 5000];
const MAX_ATTEMPTS = 4;
const DEFAULT_PER_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_TOTAL_BUDGET_MS = 120000;

// Per-provider serialization queues
const providerQueues = new Map<string, Promise<any>>();

function isRetryableError(err: any): boolean {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;

  const status = err.status || err.statusCode || err.httpStatus;
  if (status === 429 || (typeof status === 'number' && status >= 500 && status < 600)) {
    return true;
  }

  const msg = String(err.message || err.errorMessage || err.errorCode || '');
  if (msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
    return true;
  }
  if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed') || msg.includes('FETCH_ERROR') || msg.includes('network') || msg.includes('TIMEOUT')) {
    return true;
  }

  // Non-retryable
  if (msg.includes('401') || msg.includes('403') || msg.includes('400') || msg.includes('404') || msg.includes('AUTHENTICATION_FAILED') || msg.includes('MISSING_SERVER_KEY')) {
    return false;
  }

  return false;
}

function isRetryableResult(res: any): boolean {
  if (!res || typeof res !== 'object') return false;
  const provRes = res as ProviderResult;

  if (provRes.fineGrainedStatus === 'AUTHENTICATION_FAILED') return false;
  if (provRes.status === 'success' || provRes.fineGrainedStatus === 'EMPTY_RESULT' || provRes.fineGrainedStatus === 'VERIFIED') return false;

  const code = provRes.errorCode || '';
  const msg = provRes.errorMessage || '';

  if (code === 'HTTP_429' || code.includes('500') || code.includes('502') || code.includes('503') || code.includes('504') || code === 'FETCH_ERROR' || code === 'TIMEOUT') {
    return true;
  }

  if (msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('fetch failed') || msg.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Enqueues and executes a request under provider rate-limiting and retry policy.
 */
export async function enqueue<T>(req: QueuedRequest<T>): Promise<T> {
  const providerId = req.providerId.toLowerCase();
  const limiter = getRateLimiter(providerId);
  const totalBudgetMs = req.totalBudgetMs || DEFAULT_TOTAL_BUDGET_MS;
  const timeoutMs = req.timeoutMs || (providerId === 'openalex' ? 45000 : DEFAULT_PER_REQUEST_TIMEOUT_MS);
  const overallStartTime = Date.now();

  const executeTask = async (): Promise<T> => {
    let attempt = 0;
    let lastError: any = null;

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      const attemptStartTime = Date.now();
      const elapsedTotal = Date.now() - overallStartTime;

      if (elapsedTotal >= totalBudgetMs) {
        const queueErr = new FederationQueueError(
          `Total budget of ${totalBudgetMs}ms exceeded for provider '${providerId}'`,
          providerId,
          req.correlationId,
          attempt,
          elapsedTotal,
          lastError
        );

        await logProviderCall({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: Date.now() - attemptStartTime,
          outcome: 'TIMEOUT',
          errorCode: 'TOTAL_BUDGET_EXCEEDED',
          errorMessage: queueErr.message
        });

        throw queueErr;
      }

      // 1. Wait for backoff if this is a retry
      if (attempt > 1) {
        const backoffMs = RETRY_BACKOFF_MS[attempt - 1] || 5000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      // 2. Acquire token and interval floor from Rate Limiter
      await limiter.acquire();

      // 3. Execute with per-request timeout
      let attemptResult: T | undefined;
      let attemptError: any = null;

      try {
        let timer: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const err = new Error(`Request timeout of ${timeoutMs}ms exceeded`);
            err.name = 'TimeoutError';
            reject(err);
          }, timeoutMs);
        });

        attemptResult = await Promise.race([req.fn(), timeoutPromise]);
        clearTimeout(timer);
      } catch (err: any) {
        attemptError = err;
      }

      const attemptDurationMs = Date.now() - attemptStartTime;

      // Check if attempt resulted in retryable error or retryable ProviderResult
      if (attemptError) {
        lastError = attemptError;
        const retryable = isRetryableError(attemptError);

        if (retryable && attempt < MAX_ATTEMPTS) {
          if (req.onRetry) req.onRetry(attempt, attemptError);

          await logProviderCall({
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
            providerId,
            url: req.url || `https://${providerId}.api`,
            attempt,
            durationMs: attemptDurationMs,
            outcome: 'RETRY',
            errorCode: attemptError.name || 'REQUEST_ERROR',
            errorMessage: attemptError.message
          });

          continue; // Trigger next attempt
        }

        // Final failure
        await logProviderCall({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: attemptDurationMs,
          outcome: attemptError.name === 'TimeoutError' ? 'TIMEOUT' : 'FAILED',
          errorCode: attemptError.name || 'REQUEST_FAILED',
          errorMessage: attemptError.message
        });

        throw attemptError;
      }

      // Inspect returned result payload
      if (isRetryableResult(attemptResult)) {
        const provRes = attemptResult as unknown as ProviderResult;
        lastError = provRes;

        if (attempt < MAX_ATTEMPTS) {
          if (req.onRetry) req.onRetry(attempt, provRes);

          await logProviderCall({
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
            providerId,
            url: req.url || `https://${providerId}.api`,
            attempt,
            durationMs: attemptDurationMs,
            outcome: 'RETRY',
            errorCode: provRes.errorCode || 'RETRYABLE_STATUS',
            errorMessage: provRes.errorMessage,
            matchesReturned: provRes.matches?.length || 0,
            fineGrainedStatus: provRes.fineGrainedStatus
          });

          continue; // Trigger next attempt
        }

        // Exhausted retries with provider error result
        await logProviderCall({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: attemptDurationMs,
          outcome: 'FAILED',
          errorCode: provRes.errorCode || 'REQUEST_FAILED',
          errorMessage: provRes.errorMessage,
          matchesReturned: provRes.matches?.length || 0,
          fineGrainedStatus: provRes.fineGrainedStatus
        });

        return attemptResult!;
      }

      // Success / clean non-retryable response
      const provRes = attemptResult as unknown as ProviderResult;
      await logProviderCall({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        providerId,
        url: req.url || `https://${providerId}.api`,
        attempt,
        durationMs: attemptDurationMs,
        outcome: 'SUCCESS',
        matchesReturned: provRes?.matches?.length || 0,
        fineGrainedStatus: provRes?.fineGrainedStatus || 'VERIFIED'
      });

      return attemptResult!;
    }

    const exhaustedErr = new FederationQueueError(
      `Max retries (${MAX_ATTEMPTS}) exceeded for provider '${providerId}'`,
      providerId,
      req.correlationId,
      attempt,
      Date.now() - overallStartTime,
      lastError
    );
    throw exhaustedErr;
  };

  // Serialize executions per provider to prevent concurrent quota race conditions
  const prevQueue = providerQueues.get(providerId) || Promise.resolve();
  const currentTask = prevQueue.then(executeTask, executeTask);
  providerQueues.set(providerId, currentTask.catch(() => {}));

  return currentTask;
}
