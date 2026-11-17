/**
 * GRADIFI HOEOS G5.9 - DETERMINISTIC EVIDENCE BRIDGE TEST SUITE
 * Uses a checked-in PDF fixture, with mocked external retrieval only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { deterministicEvidenceBridge } from '../src/services/verify/deterministicEvidenceBridge';
import { UnpaywallMetadataResult } from '../src/services/verify/types';

function fixturePdf(): ArrayBuffer {
  const bytes = fs.readFileSync(path.resolve(process.cwd(), 'tests/fixtures/ingestion/quantum_federated_learning_paper.pdf'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function createMockFetch(responses: Record<string, { status: number; contentType?: string; body?: ArrayBuffer | string }>) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const mock = responses[url];
    if (!mock) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    if (mock.contentType) headers.set('content-type', mock.contentType);
    const body = typeof mock.body === 'string'
      ? new TextEncoder().encode(mock.body).buffer
      : mock.body || new ArrayBuffer(0);
    headers.set('content-length', String(body.byteLength));
    return new Response(body, { status: mock.status, headers });
  };
}

const pdfUrl = 'https://arxiv.org/pdf/quantum-federated-learning.pdf';
const studentText = 'Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform computation.';

function metadata(overrides: Partial<UnpaywallMetadataResult> = {}): UnpaywallMetadataResult {
  return {
    providerId: 'unpaywall',
    doi: '10.1038/s41586-023-00001-x',
    status: 'METADATA_FOUND',
    title: 'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks',
    authors: ['Dr. A'],
    bestOALocation: { url: pdfUrl, urlForPdf: pdfUrl, isBest: true },
    requestTimestamp: new Date().toISOString(),
    responseTimestamp: new Date().toISOString(),
    correlationId: 'g59-vitest',
    ...overrides
  };
}

describe('HOEOS G5.9 deterministic evidence bridge', () => {
  it('executes the complete metadata-to-deterministic-engine chain on a valid PDF', async () => {
    const mockFetch = createMockFetch({
      [pdfUrl]: { status: 200, contentType: 'application/pdf', body: fixturePdf() }
    });
    const result = await deterministicEvidenceBridge.executeEvidenceChain(
      metadata().doi!,
      studentText,
      { fetchImpl: mockFetch as any, metadataOverride: metadata() }
    );
    expect(result.bridgeEligible).toBe(true);
    expect(result.metadataResult.status).toBe('METADATA_FOUND');
    expect(result.locationResult.status).toBe('OA_LOCATION_FOUND');
    expect(result.retrievalResult.status).toBe('SOURCE_RETRIEVED');
    expect(result.validationResult.status).toBe('CONTENT_VALID');
    expect(result.identityResult.status).toBe('IDENTITY_MATCHED');
    expect(result.deterministicResult).toBeDefined();
    expect(result.deterministicResult?.documentHash).toBeTruthy();
    expect(result.deterministicResult?.evidenceHash).toBeTruthy();
  });

  it('stops when metadata is missing', async () => {
    const result = await deterministicEvidenceBridge.executeEvidenceChain(
      '10.1038/missing-meta',
      studentText,
      { metadataOverride: metadata({ status: 'METADATA_NOT_FOUND', errorMessage: 'DOI missing' }) }
    );
    expect(result.bridgeEligible).toBe(false);
    expect(result.validationResult.status).toBe('CONTENT_VALIDATION_FAILED');
  });

  it('stops when no open-access location exists', async () => {
    const result = await deterministicEvidenceBridge.executeEvidenceChain(
      '10.1038/no-oa',
      studentText,
      { metadataOverride: metadata({ bestOALocation: undefined, oaLocations: [] }) }
    );
    expect(result.bridgeEligible).toBe(false);
    expect(result.locationResult.status).toBe('NO_OA_LOCATION');
  });

  it('stops when source retrieval returns HTTP 404', async () => {
    const missingUrl = 'https://journal.org/404.pdf';
    const mockFetch = createMockFetch({ [missingUrl]: { status: 404 } });
    const result = await deterministicEvidenceBridge.executeEvidenceChain(
      metadata().doi!,
      studentText,
      {
        fetchImpl: mockFetch as any,
        metadataOverride: metadata({ bestOALocation: { urlForPdf: missingUrl } })
      }
    );
    expect(result.bridgeEligible).toBe(false);
    expect(result.retrievalResult.status).toBe('HTTP_ERROR');
  });

  it('rejects an HTML landing page instead of a PDF', async () => {
    const htmlUrl = 'https://journal.org/html-only.html';
    const mockFetch = createMockFetch({
      [htmlUrl]: { status: 200, contentType: 'text/html', body: '<html><body>Landing Page</body></html>' }
    });
    const result = await deterministicEvidenceBridge.executeEvidenceChain(
      metadata().doi!,
      studentText,
      {
        fetchImpl: mockFetch as any,
        metadataOverride: metadata({ bestOALocation: { urlForPdf: htmlUrl } })
      }
    );
    expect(result.bridgeEligible).toBe(false);
    expect(result.retrievalResult.status).toBe('CONTENT_TYPE_MISMATCH');
  });
});
