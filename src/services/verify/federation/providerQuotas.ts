/**
 * GRADIFI VERIFY - REGULATED PROVIDER QUOTAS AND CALIBRATION
 * Upstream API limits and rate calibration (2026-09 Standard).
 * Single source of truth for federation concurrency & throughput parameters.
 */

import { SourceType, ProviderQuota } from '../types';

export const PROVIDER_QUOTAS: Record<string, ProviderQuota> = {
  core: {
    providerId: 'core',
    maxTokens: 1,
    refillRate: 0.5,     // 0.5 tokens/sec (1 token every 2000ms)
    minIntervalMs: 2000  // Strict 2s floor between calls
  },
  crossref: {
    providerId: 'crossref',
    maxTokens: 5,
    refillRate: 5,       // 5 tokens/sec
    minIntervalMs: 200   // 200ms floor
  },
  googlebooks: {
    providerId: 'googlebooks',
    maxTokens: 2,
    refillRate: 1,       // 1 token/sec
    minIntervalMs: 1000  // 1000ms floor
  },
  openalex: {
    providerId: 'openalex',
    maxTokens: 5,
    refillRate: 5,       // 5 tokens/sec
    minIntervalMs: 150   // 150ms floor
  },
  unpaywall: {
    providerId: 'unpaywall',
    maxTokens: 2,
    refillRate: 2,       // 2 tokens/sec
    minIntervalMs: 500   // 500ms floor
  }
};

export function getProviderQuota(providerId: string): ProviderQuota {
  const quota = PROVIDER_QUOTAS[providerId];
  if (quota) {
    return quota;
  }
  // Safe default fallback
  return {
    providerId: providerId as SourceType,
    maxTokens: 2,
    refillRate: 1,
    minIntervalMs: 1000
  };
}
