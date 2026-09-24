/**
 * GRADIFI VERIFY - UNPAYWALL PROVIDER ADAPTER
 * Real REST integration with Unpaywall Open Access Metadata API.
 * HOEOS Rule: Provenance preserved, Honest failure states, Zero Math.random().
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult, EvidenceMatch, UnpaywallMetadataResult, UnpaywallOALocation } from '../types';
import { handleUnpaywallServerSearch } from '../server/unpaywallServerHandler';

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export class UnpaywallProvider implements AcademicProvider {
  readonly id = 'unpaywall' as const;

  /**
   * Fetches typed Unpaywall metadata result contract for a given DOI.
   * HOEOS G5.4 Standard: Candidate evidence metadata boundary only (no automatic similarity assumption).
   */
  async fetchMetadata(doi: string): Promise<UnpaywallMetadataResult> {
    const requestTimestamp = new Date().toISOString();
    const correlationId = generateCorrelationId('unp_meta');
    const cleanedDoi = (doi || '').trim().replace(/^https?:\/\/doi\.org\//i, '').replace(/[.;()]+$/, '');

    if (!cleanedDoi || !/^10\.\d{4,9}\//i.test(cleanedDoi)) {
      return {
        providerId: 'unpaywall',
        doi: cleanedDoi || doi,
        status: 'METADATA_NOT_FOUND',
        errorMessage: 'Invalid or missing DOI format',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }

    try {
      const getEnvVar = (key: string) => {
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
        try {
          return (import.meta as any)?.env?.[key];
        } catch {
          return undefined;
        }
      };
      const email = getEnvVar('VITE_UNPAYWALL_EMAIL') || getEnvVar('UNPAYWALL_EMAIL') || 'verify@gradifi.org';
      const url = `https://api.unpaywall.org/v2/${encodeURIComponent(cleanedDoi)}?email=${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' }
      });
      const responseTimestamp = new Date().toISOString();

      if (!response.ok) {
        return {
          providerId: 'unpaywall',
          doi: cleanedDoi,
          status: response.status === 404 ? 'METADATA_NOT_FOUND' : 'REQUEST_FAILED',
          errorMessage: `Unpaywall API returned HTTP ${response.status}: ${response.statusText}`,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }

      const item = await response.json();
      const title = item.title || undefined;
      const authors = (item.z_authors || [])
        .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
        .filter((name: string) => name.length > 0);

      const mapLocation = (loc: any): UnpaywallOALocation => ({
        url: loc.url,
        urlForPdf: loc.url_for_pdf,
        urlForLandingPage: loc.url_for_landing_page,
        evidence: loc.evidence,
        license: loc.license,
        version: loc.version,
        isBest: loc.is_best
      });

      const bestOALocation = item.best_oa_location ? mapLocation(item.best_oa_location) : undefined;
      const oaLocations = Array.isArray(item.oa_locations) ? item.oa_locations.map(mapLocation) : undefined;

      return {
        providerId: 'unpaywall',
        doi: cleanedDoi,
        status: 'METADATA_FOUND',
        title,
        authors: authors.length > 0 ? authors : undefined,
        publishedYear: item.year || undefined,
        publisher: item.publisher || undefined,
        journalName: item.journal_name || undefined,
        isOA: Boolean(item.is_oa),
        oaStatus: item.oa_status || undefined,
        bestOALocation,
        oaLocations,
        requestTimestamp,
        responseTimestamp,
        correlationId
      };
    } catch (error: any) {
      return {
        providerId: 'unpaywall',
        doi: cleanedDoi,
        status: 'REQUEST_FAILED',
        errorMessage: error?.message || 'Network request failed',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }
  }

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const limit = input.limit || 5;
    const query = input.query || input.documentText;
    const requestTimestamp = new Date().toISOString();
    const correlationId = generateCorrelationId('unp');

    const doiMatch = query.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    
    if (!doiMatch) {
      return {
        providerId: this.id,
        status: 'partial',
        fineGrainedStatus: 'EMPTY_RESULT',
        matches: [],
        rawCount: 0,
        errorMessage: 'No DOI detected in query for Unpaywall direct resolution',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }

    const doi = doiMatch[0].replace(/[.;()]+$/, '');

    try {
      const isBrowser = typeof window !== 'undefined';
      if (isBrowser) {
        const response = await fetch('/api/verify/unpaywall', {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query: doi, limit })
        });

        if (response.ok) {
          return await response.json();
        }
      }

      return handleUnpaywallServerSearch({ query: doi, limit });
    } catch (error: any) {
      return {
        providerId: this.id,
        status: 'error',
        fineGrainedStatus: 'REQUEST_FAILED',
        matches: [],
        errorMessage: error?.message || 'Failed to connect to Unpaywall API',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }
  }
}
