/**
 * GRADIFI VERIFY - SERVER-SIDE GOOGLE BOOKS API HANDLER
 * Provable server/edge execution path for Google Books Metadata retrieval.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { ProviderResult, EvidenceMatch } from '../types';
import { enqueue } from '../federation/requestQueue';
import { extractStudentPassage } from './passageExtractor';

export interface GoogleBooksServerRequestPayload {
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

export async function handleGoogleBooksServerSearch(payload: GoogleBooksServerRequestPayload): Promise<ProviderResult> {
  const requestTimestamp = new Date().toISOString();
  const correlationId = generateCorrelationId('gb');

  const rawQuery = typeof payload?.query === 'string' ? payload.query.trim() : '';
  if (!rawQuery) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'googlebooks',
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

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  if (!apiKey) {
    const responseTimestamp = new Date().toISOString();
    return {
      providerId: 'googlebooks',
      status: 'unavailable',
      fineGrainedStatus: 'AUTHENTICATION_FAILED',
      matches: [],
      errorMessage: 'GOOGLE_BOOKS_API_KEY server configuration is unavailable',
      errorCode: 'MISSING_SERVER_KEY',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }

  const fetchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&key=${encodeURIComponent(apiKey)}`;

  try {
    return await enqueue<ProviderResult>({
      providerId: 'googlebooks',
      correlationId,
      url: fetchUrl,
      fn: async () => {
        let response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'GradifiVerify/1.0 (https://gradifi.org)'
          }
        });

        if (!response.ok && (response.status === 429 || response.status >= 500)) {
          await new Promise(r => setTimeout(r, 600));
          response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'GradifiVerify/1.0 (https://gradifi.org)'
            }
          });
        }

        const responseTimestamp = new Date().toISOString();

        if (!response.ok) {
          const isAuthError = response.status === 401 || response.status === 403;
          return {
            providerId: 'googlebooks',
            status: isAuthError ? 'error' : 'unavailable',
            fineGrainedStatus: isAuthError ? 'AUTHENTICATION_FAILED' : 'REQUEST_FAILED',
            matches: [],
            errorMessage: `Google Books API returned HTTP ${response.status}: ${response.statusText}`,
            errorCode: `HTTP_${response.status}`,
            requestTimestamp,
            responseTimestamp,
            correlationId
          };
        }

    const data = await response.json();

    if (data?.error) {
      return {
        providerId: 'googlebooks',
        status: 'error',
        fineGrainedStatus: 'AUTHENTICATION_FAILED',
        matches: [],
        errorMessage: data.error.message || 'Google Books API error',
        errorCode: String(data.error.code || 'API_ERROR'),
        requestTimestamp,
        responseTimestamp,
        correlationId
      };
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const matches: EvidenceMatch[] = [];

    for (const item of items) {
      const volumeInfo = item.volumeInfo || {};
      const accessInfo = item.accessInfo || {};
      const id = item.id || `gb_${Date.now()}`;
      const title = volumeInfo.title || 'Untitled Google Books Record';
      const authors = Array.isArray(volumeInfo.authors) ? volumeInfo.authors : ['Unknown Author'];
      const publishedYear = volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.slice(0, 4), 10) : undefined;
      const infoLink = volumeInfo.infoLink || volumeInfo.previewLink || `https://books.google.com/books?id=${id}`;
      const snippet = volumeInfo.description || item.searchInfo?.textSnippet || title;

      // Check industry identifiers for DOI or ISBN
      let isbn: string | undefined;
      let doi: string | undefined;

      if (Array.isArray(volumeInfo.industryIdentifiers)) {
        for (const ident of volumeInfo.industryIdentifiers) {
          if (ident.type === 'ISBN_13' || ident.type === 'ISBN_10') {
            isbn = ident.identifier;
          } else if (ident.type === 'DOI') {
            doi = ident.identifier;
          }
        }
      }

      const originalSnippet = snippet.slice(0, 300);
      const studentText = (typeof payload?.documentText === 'string' && payload.documentText.trim()) || rawQuery;
      const passage = extractStudentPassage(studentText, originalSnippet);
      const matchedText = passage ? passage.text : '';

      const match: EvidenceMatch = {
        sourceId: `gb:${id}`,
        title,
        authors,
        url: infoLink,
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
          provider: 'googlebooks',
          providerRecordId: id,
          retrievedAt: responseTimestamp,
          sourceType: 'google_books_volume',
          sourceUrl: infoLink,
          title,
          authors,
          doi,
          isbn,
          publishedYear: isNaN(publishedYear as number) ? undefined : publishedYear,
          publisher: volumeInfo.publisher,
          pageCount: volumeInfo.pageCount,
          categories: Array.isArray(volumeInfo.categories) ? volumeInfo.categories : undefined,
          language: volumeInfo.language,
          accessInfo: {
            viewability: accessInfo.viewability,
            embeddable: accessInfo.embeddable,
            publicDomain: accessInfo.publicDomain,
            pdfAvailable: accessInfo.pdf?.isAvailable,
            pdfDownloadUrl: accessInfo.pdf?.downloadLink,
            epubAvailable: accessInfo.epub?.isAvailable,
            webReaderLink: accessInfo.webReaderLink
          },
          provenanceState: (doi || isbn) ? 'VERIFIED' : 'PARTIAL',
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
          providerId: 'googlebooks',
          status: 'success',
          fineGrainedStatus: items.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT',
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
      providerId: 'googlebooks',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: error?.message || 'Failed to execute Google Books API request',
      errorCode: 'FETCH_ERROR',
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}
