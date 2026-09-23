/**
 * GRADIFI VERIFY - REGULATED PROVIDER RATE LIMITER
 * Token-bucket rate limiter with continuous refill and mandatory minimum interval floors.
 * HOEOS Standard: Strict Upstream Concurrency & Quota Enforcement.
 */

import { RateLimiterConfig } from '../types';
import { getProviderQuota } from './providerQuotas';

export interface RateLimiterConfigInternal {
  providerId: string;
  maxTokens: number;         // burst capacity
  refillRate: number;        // tokens per second
  minIntervalMs: number;     // hard floor between calls
}

export class RateLimiter {
  private providerId: string;
  private maxTokens: number;
  private refillRate: number;
  private minIntervalMs: number;
  private tokens: number;
  private lastRefillMs: number;
  private lastAcquireMs: number = 0;
  private queueTail: Promise<void> = Promise.resolve();

  constructor(config: RateLimiterConfigInternal) {
    this.providerId = config.providerId;
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.minIntervalMs = config.minIntervalMs;
    this.tokens = config.maxTokens;
    this.lastRefillMs = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillMs) / 1000;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSec * this.refillRate);
      this.lastRefillMs = now;
    }
  }

  /**
   * Blocks until a token is available AND at least minIntervalMs has elapsed since last acquire.
   * Serializes requests across callers to guarantee strict FIFO order and interval preservation.
   */
  async acquire(): Promise<void> {
    const acquireTask = async () => {
      while (true) {
        this.refill();
        const now = Date.now();
        const timeSinceLastAcquire = now - this.lastAcquireMs;
        const intervalRemaining = this.minIntervalMs - timeSinceLastAcquire;

        if (this.tokens >= 1 && intervalRemaining <= 0) {
          this.tokens -= 1;
          this.lastAcquireMs = Date.now();
          return;
        }

        // Calculate needed wait time
        let waitMs = 10;
        if (this.tokens < 1) {
          const tokenWait = Math.ceil(((1 - this.tokens) / this.refillRate) * 1000);
          waitMs = Math.max(waitMs, tokenWait);
        }
        if (intervalRemaining > 0) {
          waitMs = Math.max(waitMs, intervalRemaining);
        }

        await new Promise(resolve => setTimeout(resolve, Math.max(10, waitMs)));
      }
    };

    // Chain onto the promise queue to ensure orderly, serialized acquisition
    const currentWait = this.queueTail.then(acquireTask);
    this.queueTail = currentWait.catch(() => {});
    return currentWait;
  }

  /**
   * Returns current internal state snapshot.
   */
  state(): { tokens: number; lastRefillMs: number } {
    this.refill();
    return {
      tokens: Number(this.tokens.toFixed(3)),
      lastRefillMs: this.lastRefillMs
    };
  }

  /**
   * Reset limiter to initial state (for testing purposes).
   */
  reset(tokens?: number): void {
    this.tokens = tokens !== undefined ? tokens : this.maxTokens;
    this.lastRefillMs = Date.now();
    this.lastAcquireMs = 0;
    this.queueTail = Promise.resolve();
  }
}

const rateLimiterRegistry = new Map<string, RateLimiter>();

/**
 * Returns the singleton RateLimiter instance for a provider.
 */
export function getRateLimiter(providerId: string): RateLimiter {
  const normalizedId = providerId.toLowerCase();
  let limiter = rateLimiterRegistry.get(normalizedId);
  if (!limiter) {
    const quota = getProviderQuota(normalizedId);
    limiter = new RateLimiter({
      providerId: normalizedId,
      maxTokens: quota.maxTokens,
      refillRate: quota.refillRate,
      minIntervalMs: quota.minIntervalMs
    });
    rateLimiterRegistry.set(normalizedId, limiter);
  }
  return limiter;
}
