/**
 * GRADIFI VERIFY - CROSSREF PROVIDER ADAPTER
 * Real REST integration with Crossref Metadata API.
 * HOEOS Rule: Provenance preserved, Honest failure states, Zero Math.random().
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult, EvidenceMatch } from '../types';

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export class CrossrefProvider implements AcademicProvider {
  readonly id = 'crossref' as const;

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const limit = input.limit || 5;
    const query = input.query || input.documentText.slice(0, 200);
    const requestTimestamp = new Date().toISOString();
    const correlationId = generateCorrelationId('cr');

    if (!query.trim()) {
      return {
        providerId: this.id,
        status: 'partial',
        fineGrainedStatus: 'EMPTY_RESULT',
        matches: [],
        rawCount: 0,
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
      const email = getEnvVar('VITE_CROSSREF_EMAIL') || getEnvVar('CROSSREF_EMAIL') || 'verify@gradifi.org';
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query.slice(0, 200))}&rows=${limit}&mailto=${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': `GradifiVerify/1.0 (mailto:${email})`
        }
      });

      const responseTimestamp = new Date().toISOString();

      if (!response.ok) {
        return {
          providerId: this.id,
          status: 'unavailable',
          fineGrainedStatus: 'REQUEST_FAILED',
          matches: [],
          errorMessage: `Crossref API returned HTTP ${response.status}: ${response.statusText}`,
          errorCode: `HTTP_${response.status}`,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }

      const data = await response.json();
      const items = data.message?.items || [];
      const matches: EvidenceMatch[] = [];

      for (const item of items) {
        const doi = item.DOI;
        const title = item.title?.[0] || 'Untitled Crossref Record';
        const authors = (item.author || [])
          .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
          .filter((name: string) => name.length > 0);
        const containerTitle = item['container-title']?.[0] || '';
        const publishedYear = item.published?.['date-parts']?.[0]?.[0];

        const match: EvidenceMatch = {
          sourceId: doi ? `doi:${doi}` : `crossref_${item.created?.timestamp || 'record'}`,
          title,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          url: doi ? `https://doi.org/${doi}` : item.URL || '#',
          doi,
          matchedText: '',
          originalSnippet: containerTitle ? `${title} (${containerTitle})` : title,
          matchType: 'citation',
          matchPercentage: 0,
          relevanceScore: 0,
          provenance: {
            provider: 'crossref',
            providerRecordId: doi || item.score?.toString() || '',
            retrievedAt: responseTimestamp,
            sourceType: 'crossref_doi_record',
            sourceUrl: doi ? `https://doi.org/${doi}` : item.URL || '',
            title,
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            doi,
            publishedYear,
            provenanceState: doi ? 'VERIFIED' : 'PARTIAL',
            query,
            requestTimestamp,
            responseTimestamp,
            correlationId,
            fineGrainedStatus: 'VERIFIED'
          }
        };

        matches.push(match);
      }

      return {
        providerId: this.id,
        status: 'success',
        fineGrainedStatus: items.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
        matches,
        rawCount: items.length,
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
        errorMessage: error?.message || 'Failed to connect to Crossref API',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }
  }
}
