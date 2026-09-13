/**
 * GRADIFI VERIFY - SERVER-SIDE CORE API HANDLER
 * Provable server/edge execution path for CORE metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types';

export interface CoreServerRequestPayload {
  query?: string;
  limit?: number;
}

function generateCorrelationId(prefix: string): string {
  const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}

export async function handleCoreServerSearch(payload: CoreServerRequestPayload): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('core');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'core',
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

  const apiKey = process.env.CORE_API_KEY;

  if (!apiKey) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'core',
      status: 'unavailable',
      fineGrainedStatus: 'AUTHENTICATION_FAILED',
      matches: [],
      errorMessage: 'CORE_API_KEY server configuration is unavailable',
      errorCode: 'MISSING_SERVER_KEY',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }

  try {
    const fetchUrl = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseTimestamp = new Date().toISOString();

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return {
        providerId: 'core',
        status: isAuthError ? 'error' : 'unavailable',
        fineGrainedStatus: isAuthError ? 'AUTHENTICATION_FAILED' : 'REQUEST_FAILED',
        matches: [],
        errorMessage: `CORE API returned HTTP ${response.status}: ${response.statusText}`,
        errorCode: `HTTP_${response.status}`,
        requestTimestamp,
        responseTimestamp,
        correlationId
      };
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const matches: EvidenceMatch[] = [];

    for (const item of results) {
      const doi = typeof item.doi === 'string' ? item.doi.trim() : undefined;
      const title = typeof item.title === 'string' ? item.title.trim() : 'Untitled CORE Work';
      const authors = Array.isArray(item.authors)
        ? item.authors.map((a: any) => (typeof a === 'string' ? a : a?.name)).filter((n: any): n is string => typeof n === 'string' && n.length > 0)
        : [];
      
      const downloadUrl = item.downloadUrl || item.links?.[0]?.url || (doi ? `https://doi.org/${doi}` : '#');
      const abstractSnippet = typeof item.abstract === 'string' ? item.abstract : title;

      const match: EvidenceMatch = {
        sourceId: item.id ? `core:${item.id}` : `core_${doi || 'record'}`,
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        url: downloadUrl,
        doi,
        matchedText: '',
        originalSnippet: abstractSnippet.slice(0, 300),
        matchType: 'exact',
        matchPercentage: 0,
        relevanceScore: 0,
        provenance: {
          provider: 'core',
          providerRecordId: item.id ? String(item.id) : '',
          retrievedAt: responseTimestamp,
          sourceType: 'core_repository_work',
          sourceUrl: downloadUrl,
          title,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          doi,
          publishedYear: typeof item.yearPublished === 'number' ? item.yearPublished : undefined,
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
      providerId: 'core',
      status: 'success',
      fineGrainedStatus: results.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
      matches,
      rawCount: results.length,
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  } catch (error: any) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'core',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute CORE API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
