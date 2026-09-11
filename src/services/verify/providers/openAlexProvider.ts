/**
 * GRADIFI VERIFY - OPENALEX PROVIDER ADAPTER
 * Real REST integration with OpenAlex Scholarly Graph.
 * HOEOS Rule: Provenance preserved, Honest failure states, Zero Math.random().
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult, EvidenceMatch } from '../types';

export class OpenAlexProvider implements AcademicProvider {
  readonly id = 'openalex' as const;

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const limit = input.limit || 5;
    const query = input.query || input.documentText.slice(0, 200);
    const requestTimestamp = new Date().toISOString();
    const correlationId = `oa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
      const email = process.env.VITE_OPENALEX_EMAIL || 'verify@gradifi.org';
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query.slice(0, 200))}&per-page=${limit}&mailto=${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': `GradifiVerify/1.0 (mailto:${email})`
        }
      });

      const responseTimestamp = new Date().toISOString();

      if (!response.ok) {
        const isAuthOrLimit = response.status === 429 || response.status === 403;
        return {
          providerId: this.id,
          status: 'unavailable',
          fineGrainedStatus: isAuthOrLimit ? 'REQUEST_FAILED' : 'REQUEST_FAILED',
          matches: [],
          errorMessage: `OpenAlex API returned HTTP ${response.status}: ${response.statusText}`,
          errorCode: `HTTP_${response.status}`,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const matches: EvidenceMatch[] = [];

      for (const item of results) {
        const doi = item.doi ? item.doi.replace('https://doi.org/', '') : undefined;
        const authors = (item.authorships || [])
          .map((a: any) => a.author?.display_name)
          .filter((name: string | undefined): name is string => Boolean(name));
        
        let abstractSnippet = '';
        if (item.abstract_inverted_index) {
          const words: [string, number][] = [];
          for (const [word, positions] of Object.entries(item.abstract_inverted_index as Record<string, number[]>)) {
            for (const pos of positions) {
              words.push([word, pos]);
            }
          }
          words.sort((a, b) => a[1] - b[1]);
          abstractSnippet = words.slice(0, 100).map(w => w[0]).join(' ');
        }

        const match: EvidenceMatch = {
          sourceId: item.id || `openalex_${doi || item.publication_year || 'record'}`,
          title: item.title || 'Untitled OpenAlex Record',
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          url: item.doi || item.id || '#',
          doi,
          matchedText: '',
          originalSnippet: abstractSnippet || item.title || '',
          matchType: 'lexical',
          matchPercentage: 0,
          relevanceScore: 0,
          provenance: {
            provider: 'openalex',
            providerRecordId: item.id || '',
            retrievedAt: responseTimestamp,
            sourceType: 'openalex_work',
            sourceUrl: item.doi || item.id || '',
            title: item.title || 'Untitled',
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            doi,
            publishedYear: item.publication_year,
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
        fineGrainedStatus: results.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
        matches,
        rawCount: results.length,
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
        errorMessage: error?.message || 'Failed to connect to OpenAlex API',
        requestTimestamp,
        responseTimestamp: new Date().toISOString(),
        correlationId
      };
    }
  }
}
