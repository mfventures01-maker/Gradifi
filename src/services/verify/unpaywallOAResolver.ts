/**
 * GRADIFI VERIFY - UNPAYWALL OA LOCATION RESOLVER SERVICE
 * HOEOS G5.5 Standard: Candidate OA Location Resolution Boundary.
 * Zero URL manufacturing, Zero Math.random(), Deterministic location selection.
 */

import { UnpaywallMetadataResult, UnpaywallOALocation, OALocationResolutionResult } from './types';

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export function isValidUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
    return false;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

export class UnpaywallOAResolver {
  /**
   * Resolves available candidate OA location from Unpaywall metadata result.
   * HOEOS G5.5 Boundary: Candidate location resolution ONLY.
   */
  resolveLocation(metadata: UnpaywallMetadataResult): OALocationResolutionResult {
    const timestamp = new Date().toISOString();
    const correlationId = generateCorrelationId('oa_loc');

    if (!metadata || metadata.status !== 'METADATA_FOUND') {
      return {
        doi: metadata?.doi,
        status: 'NO_OA_LOCATION',
        isBestLocation: false,
        errorMessage: metadata?.errorMessage || 'No Unpaywall metadata found to resolve OA location',
        timestamp,
        correlationId
      };
    }

    const allLocations = Array.isArray(metadata.oaLocations) ? metadata.oaLocations : [];
    if (metadata.bestOALocation && !allLocations.some(l => l.url === metadata.bestOALocation?.url)) {
      allLocations.unshift(metadata.bestOALocation);
    }

    // 1. Inspect best_oa_location first
    if (metadata.bestOALocation) {
      const best = metadata.bestOALocation;
      const targetUrl = best.urlForPdf || best.url || best.urlForLandingPage;

      if (targetUrl) {
        if (!isValidUrl(targetUrl)) {
          return {
            doi: metadata.doi,
            status: 'OA_LOCATION_INVALID',
            allLocations,
            isBestLocation: true,
            errorMessage: `Malformed URL in best_oa_location: ${targetUrl}`,
            timestamp,
            correlationId
          };
        }

        return {
          doi: metadata.doi,
          status: 'OA_LOCATION_FOUND',
          selectedLocation: best,
          allLocations,
          isBestLocation: true,
          timestamp,
          correlationId
        };
      }
    }

    // 2. Fallback deterministically to candidates in oaLocations array
    if (allLocations.length > 0) {
      // Prefer PDF location candidate first
      const pdfCandidate = allLocations.find(l => isValidUrl(l.urlForPdf));
      if (pdfCandidate) {
        return {
          doi: metadata.doi,
          status: 'OA_LOCATION_FOUND',
          selectedLocation: pdfCandidate,
          allLocations,
          isBestLocation: Boolean(pdfCandidate.isBest),
          timestamp,
          correlationId
        };
      }

      // Otherwise any valid URL location
      const anyCandidate = allLocations.find(l => isValidUrl(l.url) || isValidUrl(l.urlForLandingPage));
      if (anyCandidate) {
        return {
          doi: metadata.doi,
          status: 'OA_LOCATION_FOUND',
          selectedLocation: anyCandidate,
          allLocations,
          isBestLocation: Boolean(anyCandidate.isBest),
          timestamp,
          correlationId
        };
      }

      // If location object exists but URL is malformed
      const malformedCandidate = allLocations.find(l => (l.url || l.urlForPdf || l.urlForLandingPage));
      if (malformedCandidate) {
        return {
          doi: metadata.doi,
          status: 'OA_LOCATION_INVALID',
          allLocations,
          isBestLocation: false,
          errorMessage: 'Candidate OA location contains invalid URL format',
          timestamp,
          correlationId
        };
      }
    }

    return {
      doi: metadata.doi,
      status: 'NO_OA_LOCATION',
      allLocations: [],
      isBestLocation: false,
      errorMessage: 'Unpaywall metadata contains zero candidate OA locations',
      timestamp,
      correlationId
    };
  }
}

export const unpaywallOAResolver = new UnpaywallOAResolver();
