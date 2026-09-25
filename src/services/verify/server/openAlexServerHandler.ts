/**
 * GRADIFI VERIFY - SERVER-SIDE OPENALEX API HANDLER
 * Provable server/edge execution path for OpenAlex metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types';
import { extractStudentPassage } from './passageExtractor';

export interface OpenAlexServerRequestPayload {
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

export async function handleOpenAlexServerSearch(payload: OpenAlexServerRequestPayload): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('oa');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'openalex',
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
  const email = process.env.VITE_OPENALEX_EMAIL || process.env.OPENALEX_EMAIL || 'verify@gradifi.org';
  const apiKey = process.env.OPENALEX_API_KEY || process.env.VITE_OPENALEX_API_KEY;

  try {
    const fetchUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=${encodeURIComponent(email)}${apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': `GradifiVerify/1.0 (mailto:${email})`
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const responseTimestamp = new Date().toISOString();

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      const isRateLimited = response.status === 429;
      return {
        providerId: 'openalex',
        status: isRateLimited || isAuthError ? 'unavailable' : 'error',
        fineGrainedStatus: isAuthError
          ? 'AUTHENTICATION_FAILED'
          : isRateLimited
            ? 'RATE_LIMITED'
            : 'REQUEST_FAILED',
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

      const originalSnippet = abstractSnippet || item.title || '';
      const studentText = (typeof payload?.documentText === 'string' && payload.documentText.trim()) || rawQuery;
      const passage = extractStudentPassage(studentText, originalSnippet);
      const matchedText = passage ? passage.text : '';
      const matchPercentage = (passage && studentText.length > 0)
        ? Math.round((passage.text.length / studentText.length) * 100)
        : 0;
      const matchType = passage
        ? (passage.text === originalSnippet ? 'exact' : 'lexical')
        : 'semantic';

      const match: EvidenceMatch = {
        sourceId: item.id || `openalex_${doi || item.publication_year || 'record'}`,
        title: item.title || 'Untitled OpenAlex Record',
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        url: item.doi || item.id || '#',
        doi,
        matchedText,
        matchedTextStart: passage?.start,
        matchedTextEnd: passage?.end,
        originalSnippet,
        matchType,
        matchPercentage,
        relevanceScore: 0,   // not yet populated — see HOEOS-RELEVANCE
        provenance: {
          provider: 'openalex',
          providerRecordId: item.id || '',
          retrievedAt: responseTimestamp,
          sourceType: 'openalex_work',
          sourceUrl: item.doi || item.id || '',
          title: item.title || 'Untitled OpenAlex Record',
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          doi,
          publishedYear: item.publication_year,
          publisher: item.primary_location?.source?.display_name,
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
      providerId: 'openalex',
      status: 'success',
      fineGrainedStatus: matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
      matches,
      rawCount: results.length,
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  } catch (error: any) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'openalex',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute OpenAlex API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
