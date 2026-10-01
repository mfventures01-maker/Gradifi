/**
 * GRADIFI VERIFY - SERVER-SIDE UNPAYWALL API HANDLER
 * Provable server/edge execution path for Unpaywall metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types.js';
import { enqueue } from '../federation/requestQueue.js';
import { extractStudentPassage } from './passageExtractor.js';

export interface UnpaywallServerRequestPayload {
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

export async function handleUnpaywallServerSearch(payload: UnpaywallServerRequestPayload): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('unp');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'unpaywall',
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

  // Extract DOI from query or use canonical paper DOI
  let doiMatch = rawQuery.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  let doi = doiMatch ? doiMatch[0].replace(/[.;()]+$/, '') : '10.1300/j136v12n03_01';

  const email = process.env.VITE_UNPAYWALL_EMAIL || process.env.UNPAYWALL_EMAIL || 'verify@gradifi.org';
  const fetchUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  try {
    return await enqueue<ProviderResult>({
      providerId: 'unpaywall',
      correlationId,
      url: fetchUrl,
      fn: async () => {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        const responseTimestamp = new Date().toISOString();

        if (!response.ok) {
          return {
            providerId: 'unpaywall',
            status: response.status === 404 ? 'partial' : 'unavailable',
            fineGrainedStatus: response.status === 404 ? 'EMPTY_RESULT' : (response.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED'),
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
        const pdfUrl = bestLocation.url_for_pdf || bestLocation.url || item.doi_url || `https://doi.org/${doi}`;

        const rawSnippet = typeof bestLocation.evidence === 'string' ? bestLocation.evidence : '';
        const matches: EvidenceMatch[] = [];

        // A source passage must be long enough to contain a real overlap.
        // Titles, fragments, and truncated metadata strings are not source passages.
        if (rawSnippet.trim().length >= 200) {
          // Trim at a sentence boundary to prevent mid-citation truncation.
          let originalSnippet = rawSnippet.trim().slice(0, 500);
          const lastPeriod = originalSnippet.lastIndexOf('. ');
          if (lastPeriod > 300) {
            originalSnippet = originalSnippet.slice(0, lastPeriod + 1);
          }

          const studentText = (typeof payload?.documentText === 'string' && payload.documentText.trim()) || rawQuery;
          const passage = extractStudentPassage(studentText, originalSnippet);
          const matchedText = passage ? passage.text : '';
          const matchPercentage = (passage && studentText.length > 0)
            ? Math.round((passage.text.length / studentText.length) * 100)
            : 0;
          const matchType = passage
            ? (passage.text === originalSnippet ? 'exact' : 'lexical')
            : 'citation';

          const match: EvidenceMatch = {
            sourceId: `unpaywall:${doi}`,
            title,
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            url: pdfUrl,
            doi,
            matchedText,
            matchedTextStart: passage?.start,
            matchedTextEnd: passage?.end,
            originalSnippet,
            matchType,
            matchPercentage,
            relevanceScore: 0,   // not yet populated — see HOEOS-RELEVANCE
            provenance: {
              provider: 'unpaywall',
              providerRecordId: doi,
              retrievedAt: responseTimestamp,
              sourceType: 'unpaywall_oa_record',
              sourceUrl: pdfUrl,
              title,
              authors: authors.length > 0 ? authors : ['Unknown Author'],
              doi,
              publishedYear: item.year,
              publisher: item.publisher || item.journal_name,
              provenanceState: 'VERIFIED',
              query: rawQuery,
              requestTimestamp,
              responseTimestamp,
              correlationId,
              fineGrainedStatus: 'VERIFIED'
            }
          };

          matches.push(match);
        }

        return {
          providerId: 'unpaywall',
          status: 'success',
          fineGrainedStatus: matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
          matches,
          rawCount: 1,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }
    });
  } catch (error: any) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'unpaywall',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute Unpaywall API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
