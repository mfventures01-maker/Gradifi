import { describe, expect, it, vi } from 'vitest';
import {
  buildPublicReceiptEnvelope,
  handleTrustedVerifyRun,
  MAX_VERIFY_DOCUMENT_BYTES
} from '../src/services/verify/server/verifyRunServerHandler';

const PRIVATE_TEXT = 'PRIVATE_STUDENT_PASSAGE_MUST_NOT_BE_PERSISTED';

function makeResult(): any {
  return {
    documentHash: 'a'.repeat(64),
    evidenceHash: 'b'.repeat(64),
    engineVersion: 'SIM-V1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: 42.5,
    totalSourcesFound: 1,
    verifiedSources: [{
      sourceId: 'openalex:W123',
      title: 'A Verified Academic Source',
      authors: ['A. Author'],
      url: 'https://example.org/source',
      doi: '10.1000/example',
      matchedText: PRIVATE_TEXT,
      originalSnippet: PRIVATE_TEXT,
      matchType: 'lexical',
      matchPercentage: 42.5,
      provenance: { provider: 'openalex', publishedYear: 2024 }
    }],
    findings: [],
    providerStatuses: {},
    fineGrainedStatuses: {},
    matrix: [],
    localAiStatus: 'RUNTIME_UNAVAILABLE',
    nemotronStatus: 'RUNTIME_UNAVAILABLE',
    geminiStatus: 'RUNTIME_UNAVAILABLE',
    processingTimeMs: 25,
    timestamp: '2026-11-14T10:00:00.000Z',
    canonicalDocument: { rawText: PRIVATE_TEXT },
    similarityAnalysis: {
      analysisType: 'DETERMINISTIC_SIMILARITY',
      sourceDocumentId: 'a'.repeat(64),
      overallSimilarity: 42.5,
      findings: [{
        findingId: 'finding-1',
        sourceDocumentId: 'source-1',
        matchedDocumentId: 'student-1',
        sourceSegment: PRIVATE_TEXT,
        matchedSegment: PRIVATE_TEXT,
        similarityScore: 42.5,
        matchMethod: 'NGRAM',
        provenance: 'DETERMINISTIC'
      }],
      engineVersion: 'SIM-V1',
      policyVersion: 'G3-POLICY-v1',
      deterministic: true,
      warnings: []
    }
  };
}

describe('HOEOS P0 trusted verification run boundary', () => {
  it('rejects empty input before executing the engine', async () => {
    const execute = vi.fn();
    const persist = vi.fn();

    await expect(
      handleTrustedVerifyRun({ documentText: '   ' }, { execute, persist } as any)
    ).rejects.toThrow('DOCUMENT_TEXT_REQUIRED');

    expect(execute).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('rejects documents above the 1 MB canonical text limit', async () => {
    const execute = vi.fn();
    const persist = vi.fn();

    await expect(
      handleTrustedVerifyRun(
        { documentText: 'x'.repeat(MAX_VERIFY_DOCUMENT_BYTES + 1) },
        { execute, persist } as any
      )
    ).rejects.toThrow('DOCUMENT_TOO_LARGE');

    expect(execute).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('persists only server-computed results and metadata-only public evidence', async () => {
    const result = makeResult();
    const execute = vi.fn(async (text: string) => {
      expect(text).toBe('server receives the submitted document');
      return result;
    });
    const persist = vi.fn(async (payload: any) => {
      expect(payload.result).toBe(result);
      expect(JSON.stringify(payload.envelope)).not.toContain(PRIVATE_TEXT);
      return {
        record: { verification_id: 'VRF-AAAAAAAAAAAA' },
        status: 'CREATED' as const
      };
    });

    const response = await handleTrustedVerifyRun(
      { documentText: 'server receives the submitted document' },
      { execute, persist } as any
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(response.result).toBe(result);
    expect(response.persistence).toEqual({
      status: 'CREATED',
      verificationId: 'VRF-AAAAAAAAAAAA'
    });
  });

  it('excludes raw student text and matched passages from public receipt envelope', () => {
    const envelope = buildPublicReceiptEnvelope(makeResult());
    const serialized = JSON.stringify(envelope);

    expect(serialized).not.toContain(PRIVATE_TEXT);
    expect(serialized).toContain('METADATA_ONLY_NO_SUBMITTED_TEXT');
    expect(serialized).toContain('A Verified Academic Source');
    expect(serialized).toContain('DETERMINISTIC_MATCH');
  });

  it('returns the real server result without inventing a receipt when storage is unavailable', async () => {
    const result = makeResult();
    const execute = vi.fn(async () => result);
    const persist = vi.fn(async () => {
      throw new Error('Trusted receipt storage is not configured');
    });

    const response = await handleTrustedVerifyRun(
      { documentText: 'a valid document' },
      { execute, persist } as any
    );

    expect(response.result).toBe(result);
    expect(response.persistence).toEqual({
      status: 'UNAVAILABLE',
      reason: 'RECEIPT_STORAGE_UNAVAILABLE'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
