/**
 * GRADIFI VERIFY - SOURCE RETRIEVAL SERVICE
 * HOEOS G5.6 Standard: Actual HTTP Source Retrieval Boundary.
 * Zero secret leakage, Honest HTTP/Content-Type responses, Zero Math.random().
 */

import { OALocationResolutionResult, SourceRetrievalResult, SourceRetrievalStatus, UnpaywallOALocation } from './types';

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export interface RetrievalOptions {
  fetchImpl?: typeof fetch;
  expectedContentType?: 'pdf' | 'any';
  timeoutMs?: number;
}

export class SourceRetrievalService {
  /**
   * Performs actual HTTP retrieval of an OA location candidate.
   * HOEOS G5.6 Boundary: HTTP Retrieval ONLY (does not validate internal content or claim evidence verification).
   */
  async retrieveSource(
    locationInput: OALocationResolutionResult | UnpaywallOALocation | string,
    options?: RetrievalOptions
  ): Promise<SourceRetrievalResult> {
    const retrievedAt = new Date().toISOString();
    const correlationId = generateCorrelationId('src_ret');
    const fetchFunc = options?.fetchImpl || (typeof fetch !== 'undefined' ? fetch : undefined);

    let targetUrl: string | undefined;
    if (typeof locationInput === 'string') {
      targetUrl = locationInput;
    } else if ('selectedLocation' in locationInput) {
      const loc = locationInput.selectedLocation;
      targetUrl = loc?.urlForPdf || loc?.url || loc?.urlForLandingPage;
    } else if ('url' in locationInput || 'urlForPdf' in locationInput) {
      targetUrl = locationInput.urlForPdf || locationInput.url || locationInput.urlForLandingPage;
    }

    if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
      return {
        sourceUrl: targetUrl || '',
        status: 'RETRIEVAL_FAILED',
        retrievedAt,
        errorMessage: 'Missing or invalid candidate OA location URL',
        correlationId
      };
    }

    const cleanedUrl = targetUrl.trim();

    if (!fetchFunc) {
      return {
        sourceUrl: cleanedUrl,
        status: 'NETWORK_ERROR',
        retrievedAt,
        errorMessage: 'Global fetch interface is unavailable',
        correlationId
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs || 8000);

      const response = await fetchFunc(cleanedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf, text/html, application/xhtml+xml, */*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const httpStatus = response.status;
      const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
      const contentLengthHeader = response.headers?.get?.('content-length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

      if (!response.ok) {
        return {
          sourceUrl: cleanedUrl,
          status: 'HTTP_ERROR',
          httpStatus,
          contentType: contentType || undefined,
          retrievedAt,
          errorMessage: `HTTP ${httpStatus} ${response.statusText || ''}`.trim(),
          correlationId
        };
      }

      const buffer = await response.arrayBuffer();

      if (!buffer || buffer.byteLength === 0) {
        return {
          sourceUrl: cleanedUrl,
          status: 'EMPTY_RESPONSE',
          httpStatus,
          contentType: contentType || undefined,
          contentLength: 0,
          retrievedAt,
          errorMessage: 'HTTP response body is empty (0 bytes)',
          correlationId
        };
      }

      // Check Content-Type expectation if specified
      if (options?.expectedContentType === 'pdf') {
        const isPdfHeader = contentType.includes('application/pdf');
        // Check magic bytes for PDF: %PDF
        const bytes = new Uint8Array(buffer.slice(0, 5));
        const magicHeader = String.fromCharCode(...bytes);
        const isPdfMagic = magicHeader.startsWith('%PDF');

        if (!isPdfHeader && !isPdfMagic) {
          return {
            sourceUrl: cleanedUrl,
            status: 'CONTENT_TYPE_MISMATCH',
            httpStatus,
            contentType,
            contentLength: buffer.byteLength,
            contentBuffer: buffer,
            retrievedAt,
            errorMessage: `Expected application/pdf but received ${contentType || 'non-PDF content'}`,
            correlationId
          };
        }
      }

      return {
        sourceUrl: cleanedUrl,
        status: 'SOURCE_RETRIEVED',
        httpStatus,
        contentType: contentType || 'application/octet-stream',
        contentLength: buffer.byteLength,
        contentBuffer: buffer,
        retrievedAt,
        correlationId
      };

    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        sourceUrl: cleanedUrl,
        status: 'NETWORK_ERROR',
        retrievedAt,
        errorMessage: isAbort ? 'Request timed out' : (err?.message || 'Network fetch error'),
        correlationId
      };
    }
  }
}

export const sourceRetrievalService = new SourceRetrievalService();
