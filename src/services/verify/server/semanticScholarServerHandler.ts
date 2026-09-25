/**
 * GRADIFI VERIFY - SERVER-SIDE SEMANTIC SCHOLAR API HANDLER
 * Provable server/edge execution path for Semantic Scholar metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types';
import { enqueue } from '../federation/requestQueue';
import { extractStudentPassage } from './passageExtractor';

export interface SemanticScholarServerRequestPayload {
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

export async function handleSemanticScholarServerSearch(
  payload: SemanticScholarServerRequestPayload
): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('s2');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'semanticscholar',
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

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (!apiKey) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'semanticscholar',
      status: 'unavailable',
      fineGrainedStatus: 'AUTHENTICATION_FAILED',
      matches: [],
      errorMessage: 'SEMANTIC_SCHOLAR_API_KEY server configuration is unavailable',
      errorCode: 'MISSING_SERVER_KEY',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }

  const fetchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,year,authors,externalIds,openAccessPdf,citationCount`;

  try {
    return await enqueue<ProviderResult>({
      providerId: 'semanticscholar',
      correlationId,
      url: fetchUrl,
      fn: async () => {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json',
            'User-Agent': 'GradifiVerify/1.0'
          }
        });

        const responseTimestamp = new Date().toISOString();

        if (!response.ok) {
          const isAuthError = response.status === 401 || response.status === 403;
          const isRateLimited = response.status === 429;
          return {
            providerId: 'semanticscholar',
            status: isRateLimited || isAuthError ? 'unavailable' : 'error',
            fineGrainedStatus: isAuthError
              ? 'AUTHENTICATION_FAILED'
              : isRateLimited
                ? 'RATE_LIMITED'
                : 'REQUEST_FAILED',
            matches: [],
            errorMessage: `Semantic Scholar API returned HTTP ${response.status}: ${response.statusText}`,
            errorCode: `HTTP_${response.status}`,
            requestTimestamp,
            responseTimestamp,
            correlationId
          };
        }

        const data = await response.json();
        const results = Array.isArray(data?.data) ? data.data : [];
        const matches: EvidenceMatch[] = [];

        for (const paper of results) {
          const paperId = paper.paperId || '';
          const title = typeof paper.title === 'string' ? paper.title.trim() : 'Untitled Semantic Scholar Paper';
          const authors = Array.isArray(paper.authors)
            ? paper.authors.map((a: any) => a?.name).filter((n: any): n is string => typeof n === 'string' && n.length > 0)
            : [];
          
          const doi = paper.externalIds?.DOI;
          const isbn = paper.externalIds?.ISBN;
          const url = paper.openAccessPdf?.url || (paperId ? `https://www.semanticscholar.org/paper/${paperId}` : '#');
          const originalSnippet = (typeof paper.abstract === 'string' && paper.abstract.trim() ? paper.abstract : title).slice(0, 300);

          const studentText = (typeof payload?.documentText === 'string' && payload.documentText.trim()) || rawQuery;
          const passage = extractStudentPassage(studentText, originalSnippet);
          const matchedText = passage ? passage.text : '';
          const matchPercentage = (passage && studentText.length > 0)
            ? Math.round((passage.text.length / studentText.length) * 100)
            : 0;
          const matchType = passage
            ? (passage.text === originalSnippet ? 'exact' : 'lexical')
            : 'lexical';

          const match: EvidenceMatch = {
            sourceId: paperId ? `s2:${paperId}` : `s2_${doi || 'record'}`,
            title,
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            url,
            doi,
            isbn,
            matchedText,
            matchedTextStart: passage?.start,
            matchedTextEnd: passage?.end,
            originalSnippet,
            matchType,
            matchPercentage,
            relevanceScore: 0,   // not yet populated — see HOEOS-RELEVANCE
            provenance: {
              provider: 'semanticscholar',
              providerRecordId: paperId,
              retrievedAt: responseTimestamp,
              sourceType: 'semantic_scholar_paper',
              sourceUrl: url,
              title,
              authors: authors.length > 0 ? authors : ['Unknown Author'],
              doi,
              isbn,
              publishedYear: typeof paper.year === 'number' ? paper.year : undefined,
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
          providerId: 'semanticscholar',
          status: 'success',
          fineGrainedStatus: matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
          matches,
          rawCount: results.length,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }
    });
  } catch (error: any) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'semanticscholar',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute Semantic Scholar API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
