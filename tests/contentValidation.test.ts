/**
 * GRADIFI HOEOS G5.7 - RETRIEVED CONTENT VALIDATION TEST SUITE
 * Uses the repository's checked-in PDF fixtures and Vitest assertions.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { contentValidationService } from '../src/services/verify/contentValidationService';
import { SourceRetrievalResult } from '../src/services/verify/types';

function fixturePdf(): ArrayBuffer {
  const bytes = fs.readFileSync(path.resolve(process.cwd(), 'tests/fixtures/ingestion/quantum_federated_learning_paper.pdf'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function retrieval(overrides: Partial<SourceRetrievalResult> = {}): SourceRetrievalResult {
  return {
    sourceUrl: 'https://arxiv.org/pdf/quantum-federated-learning.pdf',
    status: 'SOURCE_RETRIEVED',
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: fixturePdf().byteLength,
    contentBuffer: fixturePdf(),
    retrievedAt: new Date().toISOString(),
    correlationId: 'g57-vitest',
    ...overrides
  };
}

describe('HOEOS G5.7 retrieved content validation boundary', () => {
  it('validates a real checked-in PDF and creates canonical identity', async () => {
    const result = await contentValidationService.validateRetrievedContent(retrieval());
    expect(result.status).toBe('CONTENT_VALID');
    expect(result.documentHash).toBeTruthy();
    expect(result.canonicalDocument).toBeDefined();
    expect(result.canonicalDocument?.stats.wordCount).toBeGreaterThan(0);
    expect(result.extractionMethod).toBe('pdf_stream_extractor');
  });

  it('rejects an empty response body', async () => {
    const result = await contentValidationService.validateRetrievedContent(retrieval({
      contentLength: 0,
      contentBuffer: new ArrayBuffer(0)
    }));
    expect(result.status).toBe('CONTENT_EMPTY');
    expect(result.canonicalDocument).toBeUndefined();
  });

  it('rejects HTML returned instead of a PDF', async () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><html><body><h1>Landing Page</h1></body></html>');
    const result = await contentValidationService.validateRetrievedContent(retrieval({
      contentType: 'text/html',
      contentBuffer: html.buffer,
      contentLength: html.byteLength
    }));
    expect(result.status).toBe('CONTENT_UNSUPPORTED');
    expect(result.errorMessage).toContain('webpage HTML');
  });

  it('fails closed for malformed PDF bytes', async () => {
    const malformed = new TextEncoder().encode('%PDF-1.4 corrupted empty stream without Tj text commands');
    const result = await contentValidationService.validateRetrievedContent(retrieval({
      contentBuffer: malformed.buffer,
      contentLength: malformed.byteLength
    }));
    expect(result.status).toBe('CONTENT_MALFORMED');
    expect(result.errorMessage).toBeTruthy();
  });

  it('rejects unsuccessful source retrieval', async () => {
    const result = await contentValidationService.validateRetrievedContent(retrieval({
      status: 'HTTP_ERROR',
      httpStatus: 404,
      contentBuffer: undefined
    }));
    expect(result.status).toBe('CONTENT_VALIDATION_FAILED');
  });

  it('does not promote content validation into deterministic evidence verification', async () => {
    const result = await contentValidationService.validateRetrievedContent(retrieval());
    expect(result.status).not.toBe('DETERMINISTIC_EVIDENCE_VERIFIED');
    expect((result as any).verifiedMatches).toBeUndefined();
  });
});
