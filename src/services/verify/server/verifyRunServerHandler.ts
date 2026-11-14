import { EvidenceEngineResult, AnalysisResultEnvelope } from '../types.js';
import { verifyCoreService } from '../verifyCoreService.js';
import { handlePersistenceServerRequest } from './persistenceServerHandler.js';

export const MAX_VERIFY_DOCUMENT_BYTES = 1_000_000;

export interface TrustedVerifyRunPayload {
  documentText?: unknown;
}

export interface TrustedVerifyRunResponse {
  result: EvidenceEngineResult;
  persistence: {
    status: 'CREATED' | 'IDEMPOTENT_EXISTS' | 'UNAVAILABLE';
    verificationId?: string;
    reason?: 'RECEIPT_STORAGE_UNAVAILABLE';
  };
}

export interface TrustedVerifyRunDependencies {
  execute: (documentText: string) => Promise<EvidenceEngineResult>;
  persist: (payload: {
    result: EvidenceEngineResult;
    envelope: AnalysisResultEnvelope;
  }) => Promise<{
    record: { verification_id: string };
    status: 'CREATED' | 'IDEMPOTENT_EXISTS';
  }>;
}

/**
 * Public receipts retain source metadata and deterministic finding metadata only.
 * Submitted document text, matched student passages, source excerpts and canonical
 * raw text are deliberately excluded from the persisted envelope.
 */
export function buildPublicReceiptEnvelope(result: EvidenceEngineResult): AnalysisResultEnvelope {
  const verifiedSources = (result.verifiedSources || []).map((source) => ({
    sourceId: source.sourceId,
    title: source.title,
    authors: Array.isArray(source.authors) ? source.authors : [],
    year: source.provenance?.publishedYear,
    url: source.url,
    doi: source.doi,
    matchType: source.matchType,
    matchPercentage: source.matchPercentage
  }));

  const findings = (result.similarityAnalysis?.findings || []).map((finding) => ({
    findingId: finding.findingId,
    findingType: 'DETERMINISTIC_MATCH',
    confidence: finding.similarityScore,
    similarity: finding.similarityScore,
    description: `Deterministic ${finding.matchMethod} overlap evidence. Submitted passage text is not retained in the public receipt.`
  }));

  // The persistence contract accepts an AnalysisResultEnvelope-shaped object.
  // This intentionally stores only a public-safe subset, not canonicalDocument.rawText.
  return {
    analysisId: `PUB-${result.documentHash.slice(0, 12)}`,
    documentId: result.documentHash,
    timestamp: result.timestamp,
    engineVersion: result.engineVersion,
    policyVersion: result.policyVersion,
    status: result.verifiedSources?.length ? 'VERIFIED' : 'EMPTY_RESULT',
    deterministicResult: {
      documentHash: result.documentHash,
      evidenceHash: result.evidenceHash,
      engineVersion: result.engineVersion,
      policyVersion: result.policyVersion,
      overallSimilarity: result.overallSimilarity,
      totalSourcesFound: result.totalSourcesFound,
      verifiedSources: [],
      findings: [],
      providerStatuses: {},
      fineGrainedStatuses: {},
      matrix: [],
      localAiStatus: 'RUNTIME_UNAVAILABLE',
      nemotronStatus: 'RUNTIME_UNAVAILABLE',
      geminiStatus: 'RUNTIME_UNAVAILABLE',
      processingTimeMs: result.processingTimeMs,
      timestamp: result.timestamp,
      similarityAnalysis: {
        analysisType: 'DETERMINISTIC_SIMILARITY',
        sourceDocumentId: result.documentHash,
        overallSimilarity: result.overallSimilarity,
        findings: [],
        engineVersion: result.engineVersion,
        policyVersion: result.policyVersion,
        deterministic: true,
        warnings: []
      }
    } as EvidenceEngineResult,
    canonicalDocument: {
      documentId: result.documentHash,
      source: { isFixture: false, origin: 'NORMALIZED', extractedAt: result.timestamp },
      rawText: '',
      normalizedText: '',
      title: 'Private submission',
      authors: [],
      abstract: '',
      identifiers: [],
      stats: { characterCount: 0, wordCount: 0, sentenceCount: 0, tokenCount: 0, estimatedPageCount: 0 },
      extractionStatus: 'SUCCESS',
      normalizationStatus: 'NORMALIZED',
      createdAt: result.timestamp
    },
    processingTimeMs: result.processingTimeMs,
    warnings: ['PUBLIC_RECEIPT_METADATA_ONLY', 'SUBMITTED_DOCUMENT_TEXT_NOT_RETAINED'],
    // Public renderer consumes these sanitized projections.
    ...({
      result: { verifiedSources, similarityAnalysis: { findings } },
      persistedAt: new Date().toISOString(),
      retentionPolicy: 'METADATA_ONLY_NO_SUBMITTED_TEXT'
    } as unknown as Record<string, unknown>)
  } as AnalysisResultEnvelope;
}

export async function handleTrustedVerifyRun(
  payload: TrustedVerifyRunPayload,
  dependencies: TrustedVerifyRunDependencies = {
    execute: (documentText) => verifyCoreService.executeVerifyRun(documentText),
    persist: (p) => handlePersistenceServerRequest(p)
  }
): Promise<TrustedVerifyRunResponse> {
  if (typeof payload?.documentText !== 'string' || payload.documentText.trim().length === 0) {
    throw new Error('DOCUMENT_TEXT_REQUIRED');
  }

  const documentText = payload.documentText;
  const byteLength = new TextEncoder().encode(documentText).byteLength;
  if (byteLength > MAX_VERIFY_DOCUMENT_BYTES) {
    throw new Error('DOCUMENT_TOO_LARGE');
  }

  // Critical trust boundary: the server executes the real Verify engine.
  // No client-supplied score, hash, evidence list or receipt identifier is accepted.
  const result = await dependencies.execute(documentText);
  const envelope = buildPublicReceiptEnvelope(result);

  try {
    const persisted = await dependencies.persist({ result, envelope });
    return {
      result,
      persistence: {
        status: persisted.status,
        verificationId: persisted.record.verification_id
      }
    };
  } catch {
    // A demo can still show the real server-computed result, but it must not
    // display a QR receipt or imply persistence when storage is unavailable.
    return {
      result,
      persistence: {
        status: 'UNAVAILABLE',
        reason: 'RECEIPT_STORAGE_UNAVAILABLE'
      }
    };
  }
}
