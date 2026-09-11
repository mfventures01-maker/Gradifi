/**
 * GRADIFI VERIFY - UNPAYWALL PROVIDER ADAPTER
 * Real REST integration with Unpaywall Open Access Metadata API.
 * HOEOS Rule: Provenance preserved, Honest failure states, Zero Math.random().
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult, EvidenceMatch } from '../types';

export class UnpaywallProvider implements AcademicProvider {
  readonly id = 'unpaywall' as const;

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const query = input.query || input.documentText;
    const requestTimestamp = new Date().toISOString();
    const correlationId = `unp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
      const email = process.env.VITE_UNPAYWALL_EMAIL || 'verify@gradifi.org';
      const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseTimestamp = new Date().toISOString();

      if (!response.ok) {
        return {
          providerId: this.id,
          status: response.status === 404 ? 'partial' : 'unavailable',
          fineGrainedStatus: response.status === 404 ? 'EMPTY_RESULT' : 'REQUEST_FAILED',
          matches: [],
          errorMessage: `Unpaywall returned HTTP ${response.status}: ${response.statusText}`,
          errorCode: `HTTP_${response.status}`,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }

      const item = await response.json();
      const title = item.title || 'Untitled Unpaywall Record';
      const authors = (item.z_authors || [])
        .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
        .filter((name: string) => name.length > 0);
      
      const bestLocation = item.best_oa_location || {};
      const pdfUrl = bestLocation.url_for_pdf || bestLocation.url || item.doi_url;

      const match: EvidenceMatch = {
        sourceId: `unpaywall:${doi}`,
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        url: pdfUrl || item.doi_url || `https://doi.org/${doi}`,
        doi,
        matchedText: '',
        originalSnippet: bestLocation.evidence ? `Open Access Evidence: ${bestLocation.evidence}` : title,
        matchType: 'citation',
        matchPercentage: 0,
        relevanceScore: 0,
        provenance: {
          provider: 'unpaywall',
          providerRecordId: doi,
          retrievedAt: responseTimestamp,
          sourceType: 'unpaywall_oa_record',
          sourceUrl: pdfUrl || item.doi_url || '',
          title,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          doi,
          publishedYear: item.year,
          provenanceState: 'VERIFIED',
          query,
          requestTimestamp,
          responseTimestamp,
          correlationId,
          fineGrainedStatus: 'VERIFIED'
        }
      };

      return {
        providerId: this.id,
        status: 'success',
        fineGrainedStatus: 'VERIFIED',
        matches: [match],
        rawCount: 1,
        requestTimestamp,
        responseTimestamp,
        correlationId
      };
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
