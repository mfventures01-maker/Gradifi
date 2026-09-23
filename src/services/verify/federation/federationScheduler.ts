/**
 * GRADIFI VERIFY - REGULATED FEDERATION SCHEDULER
 * Deterministic orchestration of the five academic source providers.
 * HOEOS Standard: Strict Determinism, Alphabetical Key Order, Independent Provider Concurrency.
 */

import { ProviderResult, EvidenceMatch } from '../types';
import { OpenAlexProvider } from '../providers/openAlexProvider';
import { CrossrefProvider } from '../providers/crossrefProvider';
import { UnpaywallProvider } from '../providers/unpaywallProvider';
import { CoreProvider } from '../providers/coreProvider';
import { GoogleBooksProvider } from '../providers/googleBooksProvider';
import { buildProviderQuery, extractDocumentDoi } from '../queryBuilder';

const openAlex = new OpenAlexProvider();
const crossref = new CrossrefProvider();
const unpaywall = new UnpaywallProvider();
const core = new CoreProvider();
const googleBooks = new GoogleBooksProvider();

/**
 * Executes deterministic regulated federation across the 5 academic providers.
 */
export async function runFederation(
  documentText: string,
  _matchSet?: EvidenceMatch[],
  options?: { limit?: number }
): Promise<Record<string, ProviderResult>> {
  const limit = options?.limit || 5;

  // 1. Build query once deterministically from document body
  const constructedQuery = buildProviderQuery(documentText, 8) || documentText.slice(0, 200);
  const documentDoi = extractDocumentDoi(documentText);
  const doiMatch = documentText.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  const isbnMatch = documentText.match(/97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dX]/i);

  const doiQuery = documentDoi || (doiMatch ? doiMatch[0].replace(/[.;()]+$/, '') : constructedQuery);
  const isbnQuery = isbnMatch ? `isbn:${isbnMatch[0]}` : constructedQuery;

  // 2. Schedule fast concurrent providers
  const crossrefTask = crossref.search({ query: constructedQuery, documentText, limit });
  const googleBooksTask = googleBooks.search({ query: isbnQuery, documentText, limit });
  const unpaywallTask = unpaywall.search({ query: doiQuery, documentText, limit });

  // 3. Schedule OpenAlex with extended timeout allowance
  const openAlexTask = openAlex.search({ query: constructedQuery, documentText, limit });

  // 4. Schedule CORE through serialized queue
  const coreTask = core.search({ query: constructedQuery, documentText, limit });

  // 5. Await all 5 provider results
  const [crRes, gbRes, unRes, oaRes, coreRes] = await Promise.allSettled([
    crossrefTask,
    googleBooksTask,
    unpaywallTask,
    openAlexTask,
    coreTask
  ]);

  const rawMap: Record<string, ProviderResult> = {
    crossref: crRes.status === 'fulfilled' ? crRes.value : {
      providerId: 'crossref',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: (crRes as PromiseRejectedResult).reason?.message || 'Crossref request rejected'
    },
    googlebooks: gbRes.status === 'fulfilled' ? gbRes.value : {
      providerId: 'googlebooks',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: (gbRes as PromiseRejectedResult).reason?.message || 'Google Books request rejected'
    },
    unpaywall: unRes.status === 'fulfilled' ? unRes.value : {
      providerId: 'unpaywall',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: (unRes as PromiseRejectedResult).reason?.message || 'Unpaywall request rejected'
    },
    openalex: oaRes.status === 'fulfilled' ? oaRes.value : {
      providerId: 'openalex',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: (oaRes as PromiseRejectedResult).reason?.message || 'OpenAlex request rejected'
    },
    core: coreRes.status === 'fulfilled' ? coreRes.value : {
      providerId: 'core',
      status: 'error',
      fineGrainedStatus: 'REQUEST_FAILED',
      matches: [],
      errorMessage: (coreRes as PromiseRejectedResult).reason?.message || 'CORE request rejected'
    }
  };

  // 6. Sort results alphabetically by providerId to guarantee strict determinism
  const sortedKeys = Object.keys(rawMap).sort();
  const sortedResultMap: Record<string, ProviderResult> = {};
  for (const key of sortedKeys) {
    sortedResultMap[key] = rawMap[key];
  }

  return sortedResultMap;
}
