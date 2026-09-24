/**
 * GRADIFI VERIFY - SERVER-SIDE CROSSREF API HANDLER
 * Provable server/edge execution path for Crossref metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types';
import { enqueue } from '../federation/requestQueue';
import { extractStudentPassage } from './passageExtractor';

export interface CrossrefServerRequestPayload {
  query?: string;
  documentText?: string;
  limit?: number;
}

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export async function handleCrossrefServerSearch(payload: CrossrefServerRequestPayload): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('cr');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'crossref',
      status: 'partial',
      fineGrainedStatus: 'EMPTY_RESULT',
      matches: [],
      rawCount: 0,
      errorMessage: 'Query input is empty',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }

  const query = rawQuery.slice(0, 200);
  const limit = Math.max(1, Math.min(10, typeof payload?.limit === 'number' ? payload.limit : 5));
  const email = process.env.VITE_CROSSREF_EMAIL || process.env.CROSSREF_EMAIL || 'verify@gradifi.org';
  const fetchUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&mailto=${encodeURIComponent(email)}`;

  try {
    return await enqueue<ProviderResult>({
      providerId: 'crossref',
      correlationId,
      url: fetchUrl,
      fn: async () => {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': `GradifiVerify/1.0 (mailto:${email})`
          }
        });

        const responseTimestamp = new Date().toISOString();

        if (!response.ok) {
          return {
            providerId: 'crossref',
            status: response.status === 429 ? 'unavailable' : 'unavailable',
            fineGrainedStatus: response.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
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
          const isbn = Array.isArray(item.ISBN) ? item.ISBN[0] : undefined;
          const originalSnippet = containerTitle ? `${title} (${containerTitle})` : title;
          const studentText = (typeof payload?.documentText === 'string' && payload.documentText.trim()) || rawQuery;
          const passage = extractStudentPassage(studentText, originalSnippet);
          const matchedText = passage ? passage.text : '';

          const match: EvidenceMatch = {
            sourceId: doi ? `doi:${doi}` : `crossref_${item.created?.timestamp || 'record'}`,
            title,
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            url: doi ? `https://doi.org/${doi}` : item.URL || '#',
            doi,
            isbn,
            matchedText,
            matchedTextStart: passage?.start,
            matchedTextEnd: passage?.end,
            originalSnippet,
            matchType: 'citation',
            matchPercentage: 0,
            relevanceScore: 0,
            provenance: {
              provider: 'crossref',
              providerRecordId: doi || item.score?.toString() || '',
              retrievedAt: responseTimestamp,
              sourceType: item.type || 'crossref_work',
              sourceUrl: doi ? `https://doi.org/${doi}` : item.URL || '',
              title,
              authors: authors.length > 0 ? authors : ['Unknown Author'],
              doi,
              isbn,
              publishedYear,
              publisher: item.publisher,
              provenanceState: 'VERIFIED',
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
          providerId: 'crossref',
          status: 'success',
          fineGrainedStatus: matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
          matches,
          rawCount: items.length,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }
    });
  } catch (error: any) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'crossref',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute Crossref API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
