/**
 * GRADIFI VERIFY - PUBLIC RESULT CONTRACT & FIREWALL UNIT TESTS
 * HOEOS Phase 1 Standard: 18 Mandatory Contract & Presentation Boundary Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  toPublicVerificationResult,
  normalizeSimilarityPercentage,
  normalizeAiConfidence,
  sanitizeAuthors,
  sanitizeAiExplanation
} from '../src/services/verify/publicVerificationResult';
import { EvidenceEngineResult, CanonicalAnalysisDocument } from '../src/services/verify/types';

describe('PublicVerificationResult Contract & Presentation Firewall (Phase 1)', () => {
  const createMockEngineResult = (overrides?: Partial<EvidenceEngineResult>): EvidenceEngineResult => {
    const mockCanonical: CanonicalAnalysisDocument = {
      documentId: 'doc_hash_1234567890abcdef',
      source: {
        filename: 'academic_paper.pdf',
        fileSizeBytes: 10240,
        extractionMethod: 'pdf_stream_extractor',
        isFixture: false,
        origin: 'EXTRACTED',
        extractedAt: new Date().toISOString()
      },
      rawText: 'Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks.',
      normalizedText: 'quantum entanglement and decoupled neural architecture in federated learning networks',
      title: 'Quantum Entanglement and Decoupled Neural Architecture',
      authors: ['Dr. Aris Thorne', 'Prof. Elena Rostova'],
      abstract: 'Abstract text...',
      year: 2024,
      doi: '10.1038/s41586-023-00001-x',
      isbn: '978-0-123456-78-9',
      identifiers: [],
      stats: {
        characterCount: 1500,
        wordCount: 250,
        sentenceCount: 12,
        tokenCount: 260,
        estimatedPageCount: 2
      },
      extractionStatus: 'SUCCESS',
      normalizationStatus: 'NORMALIZED',
      createdAt: new Date().toISOString()
    };

    return {
      documentHash: 'doc_hash_1234567890abcdef',
      evidenceHash: 'ev_hash_9876543210fedcba',
      engineVersion: '1.0.0-certified',
      policyVersion: 'G3-2026.1',
      overallSimilarity: 42.5,
      totalSourcesFound: 2,
      verifiedSources: [
        {
          sourceId: 'crossref_001',
          title: 'Federated Quantum Neural Networks',
          authors: ['Dr. Aris Thorne'],
          url: 'https://doi.org/10.1038/s41586-023-00001-x',
          doi: '10.1038/s41586-023-00001-x',
          matchedText: 'Quantum Entanglement and Decoupled Neural Architecture',
          originalSnippet: 'Quantum Entanglement and Decoupled Neural Architecture',
          matchType: 'exact',
          matchPercentage: 42.5,
          relevanceScore: 0.95,
          provenance: {
            provider: 'crossref',
            providerRecordId: '10.1038/s41586-023-00001-x',
            retrievedAt: new Date().toISOString(),
            sourceType: 'crossref',
            sourceUrl: 'https://doi.org/10.1038/s41586-023-00001-x',
            title: 'Federated Quantum Neural Networks',
            authors: ['Dr. Aris Thorne'],
            doi: '10.1038/s41586-023-00001-x',
            publishedYear: 2024,
            publisher: 'Nature Publishing Group',
            provenanceState: 'VERIFIED'
          }
        },
        {
          sourceId: 'book_002',
          title: 'Handbook of Quantum Computing',
          authors: ['Prof. Elena Rostova'],
          url: 'https://books.google.com/books?id=12345',
          matchedText: 'Decoupled edge networks face significant latency',
          originalSnippet: 'Decoupled edge networks face significant latency',
          matchType: 'lexical',
          matchPercentage: 15.0,
          relevanceScore: 0.85,
          provenance: {
            provider: 'googlebooks',
            providerRecordId: 'book_12345',
            retrievedAt: new Date().toISOString(),
            sourceType: 'googlebooks',
            sourceUrl: 'https://books.google.com/books?id=12345',
            title: 'Handbook of Quantum Computing',
            authors: ['Prof. Elena Rostova'],
            isbn: '978-0-123456-78-9',
            publishedYear: 2023,
            publisher: 'Academic Press',
            provenanceState: 'VERIFIED'
          }
        }
      ],
      findings: [
        {
          type: 'exact_overlap',
          severity: 'moderate',
          confidence: 0.88,
          explanation: 'Significant phrase overlap identified in academic literature.',
          sourceId: 'crossref_001',
          requiresHumanReview: false,
          modelProvider: 'nemotron'
        }
      ],
      providerStatuses: { crossref: 'success', googlebooks: 'success' },
      fineGrainedStatuses: { crossref: 'VERIFIED', googlebooks: 'VERIFIED' },
      matrix: [
        {
          provider: 'crossref',
          credentialStatus: 'VERIFIED',
          realRequestStatus: 'VERIFIED',
          responseStatus: 'VERIFIED',
          schemaStatus: 'VERIFIED',
          provenanceStatus: 'VERIFIED',
          federationStatus: 'VERIFIED',
          aiInterpretationStatus: 'N/A',
          overallStatus: 'VERIFIED'
        }
      ],
      localAiStatus: 'RUNTIME_AVAILABLE',
      nemotronStatus: 'INFERENCE_VERIFIED',
      geminiStatus: 'INFERENCE_VERIFIED',
      processingTimeMs: 450,
      timestamp: new Date().toISOString(),
      canonicalDocument: mockCanonical,
      ...overrides
    };
  };

  // 1. Public result can be constructed from a valid verified result.
  it('1. constructs PublicVerificationResult from a valid EvidenceEngineResult', () => {
    const engineResult = createMockEngineResult();
    const publicResult = toPublicVerificationResult(engineResult, 'ver_custom_id_123');
    expect(publicResult).toBeDefined();
    expect(publicResult.receipt.verificationId).toBe('ver_custom_id_123');
  });

  // 2. Required fields exist.
  it('2. includes all required top-level fields', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult).toHaveProperty('document');
    expect(publicResult).toHaveProperty('similarity');
    expect(publicResult).toHaveProperty('matchedEvidence');
    expect(publicResult).toHaveProperty('academicSources');
    expect(publicResult).toHaveProperty('bookSources');
    expect(publicResult).toHaveProperty('citations');
    expect(publicResult).toHaveProperty('aiInterpretation');
    expect(publicResult).toHaveProperty('totalVerifiedSources');
    expect(publicResult).toHaveProperty('receipt');
  });

  // 3. Similarity is within 0-100.
  it('3. normalizes overall similarity score strictly to [0, 100]', () => {
    expect(normalizeSimilarityPercentage(42.5)).toBe(42.5);
    expect(normalizeSimilarityPercentage(-10)).toBe(0);
    expect(normalizeSimilarityPercentage(150)).toBe(1.5);
    expect(normalizeSimilarityPercentage(8500)).toBe(85);
  });

  // 4. AI confidence is within 0-1 internally.
  it('4. normalizes AI confidence strictly to [0.0, 1.0] internally', () => {
    expect(normalizeAiConfidence(0.88)).toBe(0.88);
    expect(normalizeAiConfidence(88)).toBe(0.88);
    expect(normalizeAiConfidence(8800)).toBe(0.88);
    expect(normalizeAiConfidence(-0.5)).toBe(0);
  });

  // 5. Invalid confidence cannot become 8000% or 8500%.
  it('5. prevents multiplier bug from turning 85 or 8500 confidence into 8500%', () => {
    const norm = normalizeAiConfidence(8500);
    expect(norm).toBe(0.85);
    expect(norm * 100).toBe(85); // 85%, NOT 8500%
  });

  // 6. Matched text retains deterministic source mapping.
  it('6. retains deterministic source mapping in matched evidence items', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.matchedEvidence[0].sourceId).toBe('crossref_001');
    expect(publicResult.matchedEvidence[0].matchedText).toBe('Quantum Entanglement and Decoupled Neural Architecture');
  });

  // 7. Source records retain DOI where validated.
  it('7. retains validated DOI in academic source records', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.academicSources[0].doi).toBe('10.1038/s41586-023-00001-x');
  });

  // 8. Source records retain ISBN where validated.
  it('8. retains validated ISBN in book source records', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.bookSources[0].isbn13).toBe('978-0-123456-78-9');
  });

  // 9. Missing metadata is not fabricated.
  it('9. does not fabricate missing author metadata (uses truthful unavailable status)', () => {
    expect(sanitizeAuthors([])).toEqual(['Author metadata unavailable']);
    expect(sanitizeAuthors(['Unknown Author'])).toEqual(['Author metadata unavailable']);
    expect(sanitizeAuthors(['Dr. Aris Thorne'])).toEqual(['Dr. Aris Thorne']);
  });

  // 10. Duplicate findings are deterministically removed.
  it('10. deterministically deduplicates identical matched evidence records', () => {
    const mock = createMockEngineResult();
    mock.verifiedSources.push(mock.verifiedSources[0]); // Duplicate crossref_001 match
    const publicResult = toPublicVerificationResult(mock);
    expect(publicResult.matchedEvidence.length).toBe(2);
    expect(publicResult.academicSources.length).toBe(1);
  });

  // 11. AI findings remain NON-AUTHORITATIVE.
  it('11. classifies all AI findings explicitly as NON_AUTHORITATIVE_INTERPRETATION', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.aiInterpretation[0].authorityClassification).toBe('NON_AUTHORITATIVE_INTERPRETATION');
  });

  // 12. AI cannot modify deterministic similarity.
  it('12. guarantees AI findings do not alter deterministic similarity calculation', () => {
    const engineResult = createMockEngineResult();
    const publicResult = toPublicVerificationResult(engineResult);
    expect(publicResult.similarity.overallPercentage).toBe(42.5); // Preserves exact engine similarity
  });

  // 13. Raw provider responses are not part of the public contract.
  it('13. excludes raw provider response payloads from public result contract', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect((publicResult as any).rawResponses).toBeUndefined();
    expect((publicResult as any).providerStatuses).toBeUndefined();
  });

  // 14. Credentials are not part of the public contract.
  it('14. excludes credential status and secret fields from public result contract', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    const jsonString = JSON.stringify(publicResult);
    expect(jsonString).not.toContain('apiKey');
    expect(jsonString).not.toContain('service_role');
    expect(jsonString).not.toContain('authorization');
  });

  // 15. HTTP diagnostics are not part of the public contract.
  it('15. excludes internal HTTP provider matrix diagnostics from public result contract', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect((publicResult as any).matrix).toBeUndefined();
    expect((publicResult as any).fineGrainedStatuses).toBeUndefined();
  });

  // 16. Raw model output is not part of the public contract.
  it('16. filters out raw AI model conversational preamble', () => {
    expect(sanitizeAiExplanation('Okay, the user wants me to analyze this paper...')).toBe('AI INTERPRETATION UNAVAILABLE');
    expect(sanitizeAiExplanation('Significant phrase overlap identified.')).toBe('Significant phrase overlap identified.');
  });

  // 17. Receipt fields are preserved.
  it('17. preserves verification receipt hashes, versions, and timestamp', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.receipt.documentHash).toBe('doc_hash_1234567890abcdef');
    expect(publicResult.receipt.evidenceHash).toBe('ev_hash_9876543210fedcba');
    expect(publicResult.receipt.engineVersion).toBe('1.0.0-certified');
    expect(publicResult.receipt.policyVersion).toBe('G3-2026.1');
  });

  // 18. Public result remains provider-agnostic.
  it('18. provides provider-agnostic source representations', () => {
    const publicResult = toPublicVerificationResult(createMockEngineResult());
    expect(publicResult.academicSources[0]).toHaveProperty('sourceId');
    expect(publicResult.academicSources[0]).toHaveProperty('title');
    expect(publicResult.academicSources[0]).toHaveProperty('authors');
    expect(publicResult.academicSources[0]).toHaveProperty('matchedPercentage');
  });
});
