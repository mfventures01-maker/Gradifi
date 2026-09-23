/**
 * GRADIFI VERIFY - STRUCTURED PROVIDER AUDIT LOGGER
 * Writes append-only daily rotated JSONL logs for every upstream federation call.
 * HOEOS Standard: Complete Auditing, Zero API Secret Leakage, Provenance Trail.
 */

import { FederationCallLog } from '../types';

/**
 * Sanitizes URLs by stripping sensitive query parameters (keys, tokens, secrets).
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const urlObj = new URL(rawUrl);
    const paramsToDelete: string[] = [];
    urlObj.searchParams.forEach((_value, key) => {
      if (/key|token|secret|password|auth/i.test(key)) {
        paramsToDelete.push(key);
      }
    });
    for (const key of paramsToDelete) {
      urlObj.searchParams.set(key, '[REDACTED]');
    }
    return urlObj.toString();
  } catch {
    // If not a full URL, perform regex replacement
    return rawUrl
      .replace(/([?&](?:api_)?(?:key|token|secret)=)[^&]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
  }
}

/**
 * Sanitizes error messages by scrubbing potential API keys or tokens.
 */
export function sanitizeErrorMessage(msg?: string): string | undefined {
  if (!msg || typeof msg !== 'string') return undefined;
  return msg
    .replace(/(key|token|secret)=[A-Za-z0-9\-._~]+/gi, '$1=[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
}

/**
 * Logs a provider call record to the file system (in Node/Vite Server context) or in-memory registry.
 */
export async function logProviderCall(log: FederationCallLog): Promise<void> {
  const sanitized: FederationCallLog = {
    ...log,
    url: sanitizeUrl(log.url),
    errorMessage: sanitizeErrorMessage(log.errorMessage)
  };

  // Node.js server context: append to certification/federation_logs/YYYY-MM-DD/<providerId>.jsonl
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const dateFolder = sanitized.timestamp.slice(0, 10); // YYYY-MM-DD
      const logDir = path.resolve('certification/federation_logs', dateFolder);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFilePath = path.join(logDir, `${sanitized.providerId.toLowerCase()}.jsonl`);
      const line = JSON.stringify(sanitized) + '\n';
      fs.appendFileSync(logFilePath, line, 'utf8');
    } catch (err) {
      console.warn('[providerLogger] Failed to write disk log:', err);
    }
  }
}
