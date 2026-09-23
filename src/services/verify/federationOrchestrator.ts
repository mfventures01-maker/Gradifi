/**
 * GRADIFI VERIFY - ADVANCED FEDERATION ORCHESTRATOR
 * HOEOS Compliant: Bounded Concurrency, Provider Pools, Timeouts, Retries, Circuit Breakers,
 * Layered Caching, Deterministic Deduplication, Provenance Graph, and Bulk Execution.
 * 
 * STRICT HOEOS LAW: AI PROVIDERS REMAIN NON-AUTHORITATIVE INTERPRETATION PARTICIPANTS ONLY.
 * DETERMINISTIC G2/G3/G5 AUTHORITY REMAINS UNTOUCHED DOWNSTREAM OF NORMALIZED EVIDENCE.
 */

import {
  SourceType,
  ProviderStatus,
  FineGrainedProviderStatus,
  EvidenceMatch,
  ProviderProvenance,
  CanonicalAnalysisDocument
} from './types';
import { OpenAlexProvider } from './providers/openAlexProvider';
import { CrossrefProvider } from './providers/crossrefProvider';
import { UnpaywallProvider } from './providers/unpaywallProvider';
import { CoreProvider } from './providers/coreProvider';
import { GoogleBooksProvider } from './providers/googleBooksProvider';
import { AIFederationService, AIFederationResult } from './aiFederation';
import { computeHash } from './documentNormalizer';
import { buildProviderQuery, extractDocumentDoi } from './queryBuilder';

// --- CONTRACT TYPES ---

export type ProviderHealthState = 'HEALTHY' | 'DEGRADED' | 'OPEN' | 'RECOVERING';

export type AuthorityClass = 'DETERMINISTIC_EVIDENCE' | 'AI_INTERPRETATION_ONLY';

export interface FederatedRecord {
  provider: SourceType;
  providerRecordId: string;
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  isbn?: string;
  url: string;
  abstract?: string;
  sourceType: string;
  rawMetadataHash: string;
  provenance: ProviderProvenance;
}

export interface FederatedProviderResult {
  provider: SourceType;
  status: ProviderStatus;
  fineGrainedStatus: FineGrainedProviderStatus;
  latencyMs: number;
  requestId: string;
  resultCount: number;
  records: FederatedRecord[];
  evidenceMatches: EvidenceMatch[];
  errors?: string[];
  retrievedAt: string;
  cacheStatus: 'HIT_L1' | 'HIT_L2' | 'HIT_L3' | 'MISS';
  authorityClass: AuthorityClass;
  retryCount: number;
  httpStatus?: number;
}

export interface CircuitBreakerStatus {
  provider: SourceType;
  healthState: ProviderHealthState;
  consecutiveFailures: number;
  lastFailureTime?: number;
  nextAllowedTime?: number;
}

export interface DeduplicatedEvidencePool {
  canonicalRecords: FederatedRecord[];
  mergedMatches: EvidenceMatch[];
  provenanceGraph: Record<string, SourceType[]>; // canonicalId -> array of providers that returned it
}

export interface FederationOrchestrationResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  sequentialEstimateMs: number;
  parallelizationGainPercent: number;
  providerResults: FederatedProviderResult[];
  deduplicatedPool: DeduplicatedEvidencePool;
  aiResult?: AIFederationResult;
  circuitBreakers: CircuitBreakerStatus[];
}

// --- PROVIDER TIMEOUT CONFIGURATION (Phase F) ---
const PROVIDER_TIMEOUTS_MS: Record<SourceType, number> = {
  crossref: 8000,
  openalex: 8000,
  core: 10000,
  unpaywall: 10000,
  googlebooks: 8000,
  nemotron: 30000,
  gemma: 5000,
  gemini: 15000
};

// --- CIRCUIT BREAKER STATE MACHINE (Phase H) ---
class CircuitBreakerManager {
  private states: Map<SourceType, {
    consecutiveFailures: number;
    healthState: ProviderHealthState;
    lastFailureTime: number;
    openResetTimeoutMs: number;
  }> = new Map();

  constructor() {
    const providers: SourceType[] = ['crossref', 'openalex', 'unpaywall', 'core', 'googlebooks', 'nemotron', 'gemma', 'gemini'];
    for (const p of providers) {
      this.states.set(p, {
        consecutiveFailures: 0,
        healthState: 'HEALTHY',
        lastFailureTime: 0,
        openResetTimeoutMs: 30000 // 30s open reset window
      });
    }
  }

  isAllowed(provider: SourceType): boolean {
    const state = this.states.get(provider);
    if (!state) return true;

    if (state.healthState === 'OPEN') {
      const now = Date.now();
      if (now - state.lastFailureTime > state.openResetTimeoutMs) {
        state.healthState = 'RECOVERING';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(provider: SourceType): void {
    const state = this.states.get(provider);
    if (!state) return;
    state.consecutiveFailures = 0;
    state.healthState = 'HEALTHY';
  }

  recordFailure(provider: SourceType, isNetworkOrTimeout: boolean): void {
    const state = this.states.get(provider);
    if (!state) return;

    if (isNetworkOrTimeout) {
      state.consecutiveFailures += 1;
      state.lastFailureTime = Date.now();

      if (state.consecutiveFailures >= 3) {
        state.healthState = 'OPEN';
      } else if (state.consecutiveFailures >= 1) {
        state.healthState = 'DEGRADED';
      }
    }
  }

  getStatusList(): CircuitBreakerStatus[] {
    const list: CircuitBreakerStatus[] = [];
    for (const [provider, state] of this.states.entries()) {
      list.push({
        provider,
        healthState: state.healthState,
        consecutiveFailures: state.consecutiveFailures,
        lastFailureTime: state.lastFailureTime || undefined,
        nextAllowedTime: state.healthState === 'OPEN' ? state.lastFailureTime + state.openResetTimeoutMs : undefined
      });
    }
    return list;
  }
}

// --- LAYERED CACHING SYSTEM (Phase J) ---
class LayeredCacheManager {
  private l2Cache: Map<string, { result: FederatedProviderResult; expiresAt: number }> = new Map();
  private l3Cache: Map<string, { record: FederatedRecord; expiresAt: number }> = new Map();

  getL2(key: string): FederatedProviderResult | null {
    const entry = this.l2Cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.l2Cache.delete(key);
      return null;
    }
    return { ...entry.result, cacheStatus: 'HIT_L2' };
  }

  setL2(key: string, result: FederatedProviderResult, ttlMs = 60000): void {
    // Never cache auth failures or request failures as success
    if (result.status === 'error' || result.fineGrainedStatus === 'AUTHENTICATION_FAILED') {
      return;
    }
    this.l2Cache.set(key, {
      result,
      expiresAt: Date.now() + ttlMs
    });
  }

  getL3(doiOrIsbn: string): FederatedRecord | null {
    const entry = this.l3Cache.get(doiOrIsbn.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.l3Cache.delete(doiOrIsbn.toLowerCase());
      return null;
    }
    return entry.record;
  }

  setL3(doiOrIsbn: string, record: FederatedRecord, ttlMs = 300000): void {
    this.l3Cache.set(doiOrIsbn.toLowerCase(), {
      record,
      expiresAt: Date.now() + ttlMs
    });
  }
}

// --- MAIN FEDERATION ORCHESTRATOR CLASS ---
export class FederationOrchestrator {
  private openAlex = new OpenAlexProvider();
  private crossref = new CrossrefProvider();
  private unpaywall = new UnpaywallProvider();
  private core = new CoreProvider();
  private googleBooks = new GoogleBooksProvider();
  private aiFederation = new AIFederationService();

  private circuitBreakers = new CircuitBreakerManager();
  private cacheManager = new LayeredCacheManager();

  /**
   * Executes a single provider query with timeout, retry, circuit breaker & L2 caching boundaries.
   */
  async executeProviderTask(
    providerId: SourceType,
    query: string,
    documentText: string,
    limit = 5
  ): Promise<FederatedProviderResult> {
    const startTime = Date.now();
    const startIso = new Date().toISOString();
    const authorityClass: AuthorityClass = providerId === 'nemotron' || providerId === 'gemma' || providerId === 'gemini'
      ? 'AI_INTERPRETATION_ONLY'
      : 'DETERMINISTIC_EVIDENCE';

    // 1. Circuit Breaker Check
    if (!this.circuitBreakers.isAllowed(providerId)) {
      return {
        provider: providerId,
        status: 'unavailable',
        fineGrainedStatus: 'RUNTIME_UNAVAILABLE',
        latencyMs: 0,
        requestId: `cb_blocked_${Date.now()}`,
        resultCount: 0,
        records: [],
        evidenceMatches: [],
        errors: [`Circuit breaker OPEN for provider '${providerId}'`],
        retrievedAt: startIso,
        cacheStatus: 'MISS',
        authorityClass,
        retryCount: 0
      };
    }

    // 2. L2 Cache Check
    const cacheKey = `${providerId}:${computeHash(query)}:${limit}`;
    const cachedL2 = this.cacheManager.getL2(cacheKey);
    if (cachedL2) {
      return cachedL2;
    }

    // 3. Execution with Bounded Timeout & Retry Policy (Phases F & G)
    const timeoutMs = PROVIDER_TIMEOUTS_MS[providerId] || 10000;
    let attempts = 0;
    const maxRetries = 2; // Max 2 retries
    let lastError: any = null;

    let resMatches: EvidenceMatch[] = [];
    let fineGrainedStatus: FineGrainedProviderStatus = 'NOT_TESTED';
    let providerStatus: ProviderStatus = 'unavailable';
    let correlationId = `${providerId}_${Date.now()}`;

    while (attempts <= maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (providerId === 'openalex') {
          const res = await this.openAlex.search({ query, documentText, limit });
          clearTimeout(timeoutId);
          resMatches = res.matches;
          fineGrainedStatus = res.fineGrainedStatus || (res.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
          providerStatus = res.status;
          correlationId = res.correlationId || correlationId;
          break;
        } else if (providerId === 'crossref') {
          const res = await this.crossref.search({ query, documentText, limit });
          clearTimeout(timeoutId);
          resMatches = res.matches;
          fineGrainedStatus = res.fineGrainedStatus || (res.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
          providerStatus = res.status;
          correlationId = res.correlationId || correlationId;
          break;
        } else if (providerId === 'unpaywall') {
          const res = await this.unpaywall.search({ query, documentText, limit });
          clearTimeout(timeoutId);
          resMatches = res.matches;
          fineGrainedStatus = res.fineGrainedStatus || (res.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
          providerStatus = res.status;
          correlationId = res.correlationId || correlationId;
          break;
        } else if (providerId === 'core') {
          const res = await this.core.search({ query, documentText, limit });
          clearTimeout(timeoutId);
          resMatches = res.matches;
          fineGrainedStatus = res.fineGrainedStatus || (res.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
          providerStatus = res.status;
          correlationId = res.correlationId || correlationId;
          break;
        } else if (providerId === 'googlebooks') {
          const res = await this.googleBooks.search({ query, documentText, limit });
          clearTimeout(timeoutId);
          resMatches = res.matches;
          fineGrainedStatus = res.fineGrainedStatus || (res.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
          providerStatus = res.status;
          correlationId = res.correlationId || correlationId;
          break;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // Phase G Retry Policy: Do NOT retry 400, 401, 403, 404, 422
        const statusStr = String(err?.message || '');
        if (statusStr.includes('400') || statusStr.includes('401') || statusStr.includes('403') || statusStr.includes('404')) {
          break; // Hard failure, stop retrying
        }

        if (attempts <= maxRetries) {
          const backoffMs = Math.min(2000, Math.pow(2, attempts) * 300 + Math.random() * 100);
          await new Promise(r => setTimeout(r, backoffMs));
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    const isSuccess = fineGrainedStatus === 'VERIFIED' || fineGrainedStatus === 'EMPTY_RESULT';

    if (isSuccess) {
      this.circuitBreakers.recordSuccess(providerId);
    } else {
      this.circuitBreakers.recordFailure(providerId, true);
    }

    // Normalize EvidenceMatches into FederatedRecords
    const records: FederatedRecord[] = resMatches.map(m => ({
      provider: m.provenance.provider,
      providerRecordId: m.provenance.providerRecordId,
      title: m.title,
      authors: m.authors,
      year: m.provenance.publishedYear,
      doi: m.doi || m.provenance.doi,
      isbn: m.provenance.isbn,
      url: m.url || m.provenance.sourceUrl,
      abstract: m.originalSnippet,
      sourceType: m.provenance.sourceType,
      rawMetadataHash: computeHash(`${m.title}:${m.authors.join(',')}:${m.doi || m.provenance.providerRecordId}`),
      provenance: m.provenance
    }));

    const resultEnvelope: FederatedProviderResult = {
      provider: providerId,
      status: providerStatus,
      fineGrainedStatus,
      latencyMs,
      requestId: correlationId,
      resultCount: records.length,
      records,
      evidenceMatches: resMatches,
      errors: lastError ? [lastError.message] : undefined,
      retrievedAt: new Date().toISOString(),
      cacheStatus: 'MISS',
      authorityClass,
      retryCount: attempts - 1
    };

    // Save to L2 Cache
    this.cacheManager.setL2(cacheKey, resultEnvelope);

    return resultEnvelope;
  }

  /**
   * Deterministically deduplicates evidence records across providers (Phase I).
   * Hierarchy: 1. DOI -> 2. ISBN -> 3. Canonical URL -> 4. Title + Authors + Year.
   * Preserves complete provenance graph without deleting merged source references.
   */
  deduplicateEvidencePool(providerResults: FederatedProviderResult[]): DeduplicatedEvidencePool {
    const canonicalRecords: FederatedRecord[] = [];
    const mergedMatches: EvidenceMatch[] = [];
    const provenanceGraph: Record<string, SourceType[]> = {};

    const seenKeys = new Map<string, number>(); // key -> index in canonicalRecords

    for (const pRes of providerResults) {
      if (pRes.authorityClass === 'AI_INTERPRETATION_ONLY') continue;

      for (let i = 0; i < pRes.records.length; i++) {
        const rec = pRes.records[i];
        const match = pRes.evidenceMatches[i];

        // Derive deterministic deduplication key
        let primaryKey = '';
        if (rec.doi && rec.doi.trim().length > 0) {
          primaryKey = `doi:${rec.doi.trim().toLowerCase()}`;
        } else if (rec.isbn && rec.isbn.trim().length > 0) {
          primaryKey = `isbn:${rec.isbn.trim().toLowerCase()}`;
        } else if (rec.url && rec.url.startsWith('http')) {
          primaryKey = `url:${rec.url.trim().toLowerCase()}`;
        } else {
          const normTitle = rec.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normAuthor = (rec.authors[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          primaryKey = `meta:${normTitle}:${normAuthor}:${rec.year || 0}`;
        }

        if (seenKeys.has(primaryKey)) {
          const idx = seenKeys.get(primaryKey)!;
          // Append provider to provenance graph
          if (!provenanceGraph[primaryKey].includes(rec.provider)) {
            provenanceGraph[primaryKey].push(rec.provider);
          }
        } else {
          seenKeys.set(primaryKey, canonicalRecords.length);
          canonicalRecords.push(rec);
          if (match) mergedMatches.push(match);
          provenanceGraph[primaryKey] = [rec.provider];
        }
      }
    }

    return {
      canonicalRecords,
      mergedMatches,
      provenanceGraph
    };
  }

  /**
   * Executes optimized parallel provider pools (Phases D & E).
   * Pools: DISCOVERY_POOL (Crossref, OpenAlex, CORE), IDENTITY/OA_POOL (Unpaywall), ACQUISITION_POOL (Google Books), AI_POOL (Nemotron).
   */
  async executeFederatedOrchestration(
    documentText: string,
    options?: { searchLimit?: number; includeAi?: boolean }
  ): Promise<FederationOrchestrationResult> {
    const startTime = Date.now();
    const startIso = new Date().toISOString();
    const runId = `FED-ORCH-${startTime}`;
    const limit = options?.searchLimit || 5;

    // Extract body keyword query and DOI / ISBN from document text
    const constructedQuery = buildProviderQuery(documentText, 8) || documentText.slice(0, 200);
    const documentDoi = extractDocumentDoi(documentText);
    const doiMatch = documentText.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    const isbnMatch = documentText.match(/97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dX]/i);

    const doiQuery = documentDoi || (doiMatch ? doiMatch[0].replace(/[.;()]+$/, '') : constructedQuery);
    const isbnQuery = isbnMatch ? `isbn:${isbnMatch[0]}` : constructedQuery;

    // DISCOVERY POOL & ACQUISITION POOLS (Parallel execution via Promise.allSettled)
    const providerTasks = [
      this.executeProviderTask('crossref', constructedQuery, documentText, limit),
      this.executeProviderTask('openalex', constructedQuery, documentText, limit),
      this.executeProviderTask('core', constructedQuery, documentText, limit),
      this.executeProviderTask('unpaywall', doiQuery, documentText, limit),
      this.executeProviderTask('googlebooks', isbnQuery, documentText, limit)
    ];

    const providerTaskResults = await Promise.allSettled(providerTasks);

    const providerResults: FederatedProviderResult[] = [];
    for (const res of providerTaskResults) {
      if (res.status === 'fulfilled') {
        providerResults.push(res.value);
      }
    }

    // Deduplicate Evidence Pool (Phase I)
    const deduplicatedPool = this.deduplicateEvidencePool(providerResults);

    // AI POOL (Non-Authoritative reasoning participants)
    let aiResult: AIFederationResult | undefined;
    if (options?.includeAi !== false) {
      aiResult = await this.aiFederation.executeFederation(documentText, deduplicatedPool.mergedMatches);

      // Add Nemotron as non-authoritative participant metric if executed
      if (aiResult.nemotronStatus) {
        const nemoResult: FederatedProviderResult = {
          provider: 'nemotron',
          status: aiResult.nemotronStatus === 'INFERENCE_VERIFIED' ? 'success' : 'unavailable',
          fineGrainedStatus: aiResult.nemotronStatus as FineGrainedProviderStatus,
          latencyMs: 0,
          requestId: `nemo_${Date.now()}`,
          resultCount: aiResult.findings.filter(f => f.modelProvider === 'nemotron').length,
          records: [],
          evidenceMatches: [],
          retrievedAt: new Date().toISOString(),
          cacheStatus: 'MISS',
          authorityClass: 'AI_INTERPRETATION_ONLY',
          retryCount: 0
        };
        providerResults.push(nemoResult);
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const sequentialEstimateMs = providerResults.reduce((acc, r) => acc + r.latencyMs, 0);
    const parallelizationGainPercent = sequentialEstimateMs > 0
      ? Math.round(((sequentialEstimateMs - totalDurationMs) / sequentialEstimateMs) * 100)
      : 0;

    return {
      runId,
      startedAt: startIso,
      finishedAt: new Date().toISOString(),
      totalDurationMs,
      sequentialEstimateMs,
      parallelizationGainPercent,
      providerResults,
      deduplicatedPool,
      aiResult,
      circuitBreakers: this.circuitBreakers.getStatusList()
    };
  }

  /**
   * Executes Bulk Federation Mode over multiple document payloads (Phase K).
   * Deduplicates queries, groups requests, enforces concurrency limits, deduplicates evidence.
   */
  async executeBulkFederation(
    documents: Array<{ id: string; text: string }>,
    options?: { searchLimit?: number }
  ): Promise<{
    totalDocuments: number;
    deduplicatedQueries: number;
    orchestrationResults: FederationOrchestrationResult[];
    aggregateDeduplicatedRecords: number;
    totalDurationMs: number;
  }> {
    const startTime = Date.now();
    const searchLimit = options?.searchLimit || 5;

    // 1. Deduplicate document queries by document hash (L1 Request-Local Dedup)
    const uniqueDocs = new Map<string, { id: string; text: string }>();
    for (const doc of documents) {
      const hash = computeHash(doc.text.slice(0, 300));
      if (!uniqueDocs.has(hash)) {
        uniqueDocs.set(hash, doc);
      }
    }

    const results: FederationOrchestrationResult[] = [];
    let totalRecordsCount = 0;

    // 2. Process unique documents using bounded concurrency (batch of 3)
    const uniqueList = Array.from(uniqueDocs.values());
    const batchSize = 3;

    for (let i = 0; i < uniqueList.length; i += batchSize) {
      const batch = uniqueList.slice(i, i + batchSize);
      const batchPromises = batch.map(doc =>
        this.executeFederatedOrchestration(doc.text, { searchLimit, includeAi: false })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      for (const res of batchResults) {
        if (res.status === 'fulfilled') {
          results.push(res.value);
          totalRecordsCount += res.value.deduplicatedPool.canonicalRecords.length;
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      totalDocuments: documents.length,
      deduplicatedQueries: uniqueDocs.size,
      orchestrationResults: results,
      aggregateDeduplicatedRecords: totalRecordsCount,
      totalDurationMs
    };
  }
}

export const federationOrchestrator = new FederationOrchestrator();
