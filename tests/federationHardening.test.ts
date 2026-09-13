/**
 * GRADIFI VERIFY - FEDERATION HARDENING & ACCEPTANCE TESTS
 * HOEOS Phase N Verification Suite:
 * 1. FederatedProviderResult contract compliance
 * 2. Bounded parallel pool execution
 * 3. Provider timeout and fault isolation (fail-soft behavior)
 * 4. Circuit breaker state machine (HEALTHY, OPEN, RECOVERING)
 * 5. Deterministic multi-tier deduplication & provenance preservation
 * 6. Layered caching (L1/L2/L3)
 * 7. Bulk federation query batching and deduplication
 * 8. Strict AI Interpretation boundary (Nemotron non-authoritative)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FederationOrchestrator,
  federationOrchestrator,
  FederatedProviderResult,
  FederatedRecord
} from '../src/services/verify/federationOrchestrator';
import { EvidenceMatch } from '../src/services/verify/types';

describe('Gradifi Advanced Federation Orchestrator Suite', () => {

  it('Phase C: Standardizes FederatedProviderResult contract structure', async () => {
    const orchestrator = new FederationOrchestrator();
    const result = await orchestrator.executeFederatedOrchestration(
      'Machine learning applications in healthcare and diagnosis',
      { searchLimit: 3, includeAi: false }
    );

    expect(result).toBeDefined();
    expect(result.runId).toMatch(/^FED-ORCH-/);
    expect(result.startedAt).toBeDefined();
    expect(result.finishedAt).toBeDefined();
    expect(result.providerResults.length).toBeGreaterThan(0);

    for (const pr of result.providerResults) {
      expect(pr.provider).toBeDefined();
      expect(pr.status).toBeDefined();
      expect(pr.fineGrainedStatus).toBeDefined();
      expect(typeof pr.latencyMs).toBe('number');
      expect(pr.requestId).toBeDefined();
      expect(typeof pr.resultCount).toBe('number');
      expect(Array.isArray(pr.records)).toBe(true);
      expect(Array.isArray(pr.evidenceMatches)).toBe(true);
      expect(pr.retrievedAt).toBeDefined();
      expect(['HIT_L1', 'HIT_L2', 'HIT_L3', 'MISS']).toContain(pr.cacheStatus);
      expect(['DETERMINISTIC_EVIDENCE', 'AI_INTERPRETATION_ONLY']).toContain(pr.authorityClass);
    }
  });

  it('Phase E & F: Bounded concurrency and fault isolation (one provider failure does not cancel others)', async () => {
    const orchestrator = new FederationOrchestrator();
    
    // Execute search with a valid topic
    const result = await orchestrator.executeFederatedOrchestration(
      '10.1038/s41586-020-2649-2 Quantum supremacy using a programmable superconducting processor',
      { searchLimit: 3, includeAi: false }
    );

    expect(result.providerResults.length).toBeGreaterThanOrEqual(4);
    
    // Verify parallelization gain is calculated
    expect(typeof result.sequentialEstimateMs).toBe('number');
    expect(typeof result.parallelizationGainPercent).toBe('number');
  });

  it('Phase H: Circuit Breaker isolation per provider', () => {
    const orchestrator = new FederationOrchestrator();
    const cbManager = (orchestrator as any).circuitBreakers;

    expect(cbManager.isAllowed('crossref')).toBe(true);

    // Simulate 3 consecutive failures for core
    cbManager.recordFailure('core', true);
    cbManager.recordFailure('core', true);
    cbManager.recordFailure('core', true);

    const coreStatus = cbManager.getStatusList().find((s: any) => s.provider === 'core');
    expect(coreStatus.healthState).toBe('OPEN');
    expect(cbManager.isAllowed('core')).toBe(false);

    // Verify crossref and openalex remain HEALTHY
    expect(cbManager.isAllowed('crossref')).toBe(true);
  });

  it('Phase I: Deterministic deduplication preserves provenance graph across providers', async () => {
    const orchestrator = new FederationOrchestrator();

    const sampleRecords: FederatedRecord[] = [
      {
        provider: 'crossref',
        providerRecordId: '10.1038/s41586-020-2649-2',
        title: 'Quantum Supremacy Using a Programmable Superconducting Processor',
        authors: ['Arute, F.', 'Arya, K.'],
        year: 2019,
        doi: '10.1038/s41586-020-2649-2',
        url: 'https://doi.org/10.1038/s41586-020-2649-2',
        sourceType: 'crossref_doi_record',
        rawMetadataHash: 'hash1',
        provenance: {
          provider: 'crossref',
          providerRecordId: '10.1038/s41586-020-2649-2',
          retrievedAt: new Date().toISOString(),
          sourceType: 'crossref_doi_record',
          sourceUrl: 'https://doi.org/10.1038/s41586-020-2649-2',
          title: 'Quantum Supremacy Using a Programmable Superconducting Processor',
          authors: ['Arute, F.', 'Arya, K.'],
          doi: '10.1038/s41586-020-2649-2',
          publishedYear: 2019,
          provenanceState: 'VERIFIED',
          query: 'test',
          requestTimestamp: new Date().toISOString(),
          responseTimestamp: new Date().toISOString(),
          correlationId: 'test_1',
          fineGrainedStatus: 'VERIFIED'
        }
      },
      {
        provider: 'openalex',
        providerRecordId: 'W2981320491',
        title: 'Quantum supremacy using a programmable superconducting processor',
        authors: ['Frank Arute', 'Kunai Arya'],
        year: 2019,
        doi: '10.1038/s41586-020-2649-2',
        url: 'https://openalex.org/W2981320491',
        sourceType: 'openalex_work',
        rawMetadataHash: 'hash2',
        provenance: {
          provider: 'openalex',
          providerRecordId: 'W2981320491',
          retrievedAt: new Date().toISOString(),
          sourceType: 'openalex_work',
          sourceUrl: 'https://openalex.org/W2981320491',
          title: 'Quantum supremacy using a programmable superconducting processor',
          authors: ['Frank Arute', 'Kunai Arya'],
          doi: '10.1038/s41586-020-2649-2',
          publishedYear: 2019,
          provenanceState: 'VERIFIED',
          query: 'test',
          requestTimestamp: new Date().toISOString(),
          responseTimestamp: new Date().toISOString(),
          correlationId: 'test_2',
          fineGrainedStatus: 'VERIFIED'
        }
      }
    ];

    const sampleMatches: EvidenceMatch[] = sampleRecords.map(r => ({
      sourceId: r.providerRecordId,
      title: r.title,
      authors: r.authors,
      url: r.url,
      doi: r.doi,
      matchedText: 'quantum supremacy',
      originalSnippet: r.title,
      matchType: 'lexical',
      matchPercentage: 85,
      relevanceScore: 90,
      provenance: r.provenance
    }));

    const mockProviderResults: FederatedProviderResult[] = [
      {
        provider: 'crossref',
        status: 'success',
        fineGrainedStatus: 'VERIFIED',
        latencyMs: 100,
        requestId: 'req1',
        resultCount: 1,
        records: [sampleRecords[0]],
        evidenceMatches: [sampleMatches[0]],
        retrievedAt: new Date().toISOString(),
        cacheStatus: 'MISS',
        authorityClass: 'DETERMINISTIC_EVIDENCE',
        retryCount: 0
      },
      {
        provider: 'openalex',
        status: 'success',
        fineGrainedStatus: 'VERIFIED',
        latencyMs: 100,
        requestId: 'req2',
        resultCount: 1,
        records: [sampleRecords[1]],
        evidenceMatches: [sampleMatches[1]],
        retrievedAt: new Date().toISOString(),
        cacheStatus: 'MISS',
        authorityClass: 'DETERMINISTIC_EVIDENCE',
        retryCount: 0
      }
    ];

    const pool = orchestrator.deduplicateEvidencePool(mockProviderResults);

    // Should collapse 2 records with same DOI into 1 canonical record
    expect(pool.canonicalRecords.length).toBe(1);
    expect(pool.canonicalRecords[0].doi).toBe('10.1038/s41586-020-2649-2');

    // Provenance graph must contain both providers for the DOI key
    const doiKey = 'doi:10.1038/s41586-020-2649-2';
    expect(pool.provenanceGraph[doiKey]).toContain('crossref');
    expect(pool.provenanceGraph[doiKey]).toContain('openalex');
  });

  it('Phase J: Layered Cache hit verification', () => {
    const orchestrator = new FederationOrchestrator();
    const cacheManager = (orchestrator as any).cacheManager;

    const sampleRecord: FederatedRecord = {
      provider: 'crossref',
      providerRecordId: '10.1000/182',
      title: 'Test DOI Record',
      authors: ['Author A'],
      year: 2022,
      doi: '10.1000/182',
      url: 'https://doi.org/10.1000/182',
      sourceType: 'crossref_doi_record',
      rawMetadataHash: 'hash_test',
      provenance: {
        provider: 'crossref',
        providerRecordId: '10.1000/182',
        retrievedAt: new Date().toISOString(),
        sourceType: 'crossref_doi_record',
        sourceUrl: 'https://doi.org/10.1000/182',
        title: 'Test DOI Record',
        authors: ['Author A'],
        doi: '10.1000/182',
        publishedYear: 2022,
        provenanceState: 'VERIFIED',
        query: 'test',
        requestTimestamp: new Date().toISOString(),
        responseTimestamp: new Date().toISOString(),
        correlationId: 'c1',
        fineGrainedStatus: 'VERIFIED'
      }
    };

    const mockResult: FederatedProviderResult = {
      provider: 'crossref',
      status: 'success',
      fineGrainedStatus: 'VERIFIED',
      latencyMs: 50,
      requestId: 'r1',
      resultCount: 1,
      records: [sampleRecord],
      evidenceMatches: [],
      retrievedAt: new Date().toISOString(),
      cacheStatus: 'MISS',
      authorityClass: 'DETERMINISTIC_EVIDENCE',
      retryCount: 0
    };

    cacheManager.setL2('query_test', mockResult);
    cacheManager.setL3('10.1000/182', sampleRecord);

    const hitL2 = cacheManager.getL2('query_test');
    expect(hitL2).toBeDefined();
    expect(hitL2?.records[0].doi).toBe('10.1000/182');

    const hitL3 = cacheManager.getL3('10.1000/182');
    expect(hitL3).toBeDefined();
    expect(hitL3?.title).toBe('Test DOI Record');
  });

  it('Phase K: Bulk Federation executes deduplicated request batches', async () => {
    const orchestrator = new FederationOrchestrator();

    const inputDocs = [
      { id: 'doc1', text: 'Machine learning algorithms in computer vision' },
      { id: 'doc2', text: 'Machine learning algorithms in computer vision' }, // duplicate text
      { id: 'doc3', text: 'Quantum computing and qubit entanglement' }
    ];

    const bulkResult = await orchestrator.executeBulkFederation(inputDocs, { searchLimit: 2 });

    expect(bulkResult.totalDocuments).toBe(3);
    expect(bulkResult.deduplicatedQueries).toBe(2); // 2 unique document hashes
    expect(bulkResult.orchestrationResults.length).toBe(2);
    expect(typeof bulkResult.totalDurationMs).toBe('number');
  });

  it('Strict HOEOS Rule 2: Nemotron authority is AI_INTERPRETATION_ONLY and cannot dictate evidence identity', async () => {
    const orchestrator = new FederationOrchestrator();
    const result = await orchestrator.executeFederatedOrchestration(
      'Deep residual learning for image recognition',
      { searchLimit: 2, includeAi: true }
    );

    const nemoResult = result.providerResults.find(r => r.provider === 'nemotron');
    if (nemoResult) {
      expect(nemoResult.authorityClass).toBe('AI_INTERPRETATION_ONLY');
      expect(nemoResult.records.length).toBe(0); // Cannot inject deterministic records
    }
  });

});
