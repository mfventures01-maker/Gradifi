/**
 * GRADIFI VERIFY - DETERMINISTIC EVIDENCE BRIDGE SERVICE
 * HOEOS G5.9 Standard: Authorized External Evidence Ingestion Chain.
 * Metadata -> Location -> Retrieval -> Validation -> Identity Match -> Deterministic Engine.
 * Zero AI dependency, Strict firewall isolation, Absolute evidence immutability.
 */

import {
  UnpaywallMetadataResult,
  OALocationResolutionResult,
  SourceRetrievalResult,
  ContentValidationResult,
  IdentityCorrespondenceResult,
  EvidenceBridgeChainResult,
  EvidenceMatch,
  EvidenceEngineResult,
  CanonicalAnalysisDocument
} from './types';
import { UnpaywallProvider } from './providers/unpaywallProvider';
import { unpaywallOAResolver } from './unpaywallOAResolver';
import { sourceRetrievalService } from './sourceRetrievalService';
import { contentValidationService } from './contentValidationService';
import { identityCorrespondenceService } from './identityCorrespondenceService';
import { analyzeDocumentEvidence } from './deterministicEngine';

export interface BridgeExecuteOptions {
  fetchImpl?: typeof fetch;
  metadataOverride?: UnpaywallMetadataResult;
}

export class DeterministicEvidenceBridge {
  private unpaywallProvider = new UnpaywallProvider();

  /**
   * Executes the authorized 6-stage HOEOS G5.9 Evidence Chain for an Unpaywall source.
   */
  async executeEvidenceChain(
    doi: string,
    studentDocument: string | CanonicalAnalysisDocument,
    options?: BridgeExecuteOptions
  ): Promise<EvidenceBridgeChainResult> {
    const documentText = typeof studentDocument === 'string' ? studentDocument : studentDocument.rawText;

    // Stage 1: Metadata Retrieval
    const metadataResult: UnpaywallMetadataResult = options?.metadataOverride || 
      await this.unpaywallProvider.fetchMetadata(doi);

    if (!metadataResult || metadataResult.status !== 'METADATA_FOUND') {
      return {
        metadataResult,
        locationResult: { doi, status: 'NO_OA_LOCATION', isBestLocation: false, timestamp: new Date().toISOString(), correlationId: metadataResult?.correlationId || '' },
        retrievalResult: { sourceUrl: '', status: 'RETRIEVAL_FAILED', retrievedAt: new Date().toISOString(), correlationId: '' },
        validationResult: { status: 'CONTENT_VALIDATION_FAILED', validatedAt: new Date().toISOString() },
        identityResult: { status: 'IDENTITY_UNAVAILABLE', matchedBy: 'none', confidenceScore: 0, explanation: 'Metadata stage failed', evaluatedAt: new Date().toISOString() },
        bridgeEligible: false,
        errorMessage: 'Metadata resolution failed'
      };
    }

    // Stage 2: OA Location Resolution (G5.5)
    const locationResult: OALocationResolutionResult = unpaywallOAResolver.resolveLocation(metadataResult);
    if (locationResult.status !== 'OA_LOCATION_FOUND') {
      return {
        metadataResult,
        locationResult,
        retrievalResult: { sourceUrl: '', status: 'RETRIEVAL_FAILED', retrievedAt: new Date().toISOString(), correlationId: locationResult.correlationId },
        validationResult: { status: 'CONTENT_VALIDATION_FAILED', validatedAt: new Date().toISOString() },
        identityResult: { status: 'IDENTITY_UNAVAILABLE', matchedBy: 'none', confidenceScore: 0, explanation: 'Location resolution failed', evaluatedAt: new Date().toISOString() },
        bridgeEligible: false,
        errorMessage: locationResult.errorMessage || 'No candidate OA location resolved'
      };
    }

    // Stage 3: Source HTTP Retrieval (G5.6)
    const retrievalResult: SourceRetrievalResult = await sourceRetrievalService.retrieveSource(
      locationResult,
      { fetchImpl: options?.fetchImpl, expectedContentType: 'pdf' }
    );

    if (retrievalResult.status !== 'SOURCE_RETRIEVED') {
      return {
        metadataResult,
        locationResult,
        retrievalResult,
        validationResult: { status: 'CONTENT_VALIDATION_FAILED', validatedAt: new Date().toISOString() },
        identityResult: { status: 'IDENTITY_UNAVAILABLE', matchedBy: 'none', confidenceScore: 0, explanation: 'Source HTTP retrieval failed', evaluatedAt: new Date().toISOString() },
        bridgeEligible: false,
        errorMessage: retrievalResult.errorMessage || 'Source retrieval failed'
      };
    }

    // Stage 4: Content Validation (G5.7)
    const validationResult: ContentValidationResult = await contentValidationService.validateRetrievedContent(
      retrievalResult,
      { docTitle: metadataResult.title }
    );

    if (validationResult.status !== 'CONTENT_VALID') {
      return {
        metadataResult,
        locationResult,
        retrievalResult,
        validationResult,
        identityResult: { status: 'IDENTITY_UNAVAILABLE', matchedBy: 'none', confidenceScore: 0, explanation: 'Content validation failed', evaluatedAt: new Date().toISOString() },
        bridgeEligible: false,
        errorMessage: validationResult.errorMessage || 'Retrieved content validation failed'
      };
    }

    // Stage 5: Work / Source Identity Correspondence (G5.8)
    const identityResult: IdentityCorrespondenceResult = identityCorrespondenceService.evaluateCorrespondence(
      metadataResult,
      validationResult
    );

    if (identityResult.status !== 'IDENTITY_MATCHED') {
      return {
        metadataResult,
        locationResult,
        retrievalResult,
        validationResult,
        identityResult,
        bridgeEligible: false,
        errorMessage: identityResult.explanation || `Identity correspondence check returned ${identityResult.status}`
      };
    }

    // Stage 6: Candidate Ingestion & Deterministic Evidence Engine Boundary (G5.9)
    const pdfUrl = locationResult.selectedLocation?.urlForPdf || locationResult.selectedLocation?.url || `https://doi.org/${doi}`;
    const candidateSnippet = validationResult.canonicalDocument?.rawText.slice(0, 500) || '';

    const candidateMatch: EvidenceMatch = {
      sourceId: `unpaywall:${metadataResult.doi || doi}`,
      title: metadataResult.title || 'Unpaywall Record',
      authors: metadataResult.authors || ['Unknown Author'],
      url: pdfUrl,
      doi: metadataResult.doi,
      matchedText: '',
      originalSnippet: candidateSnippet,
      matchType: 'citation',
      matchPercentage: 0,
      relevanceScore: 0,
      provenance: {
        provider: 'unpaywall',
        providerRecordId: metadataResult.doi || doi,
        retrievedAt: retrievalResult.retrievedAt,
        sourceType: 'unpaywall_oa_validated_pdf',
        sourceUrl: pdfUrl,
        title: metadataResult.title || 'Unpaywall Record',
        authors: metadataResult.authors || ['Unknown Author'],
        doi: metadataResult.doi,
        publishedYear: metadataResult.publishedYear,
        provenanceState: 'UNVERIFIED',
        requestTimestamp: metadataResult.requestTimestamp,
        responseTimestamp: metadataResult.responseTimestamp,
        correlationId: metadataResult.correlationId,
        fineGrainedStatus: 'EMPTY_RESULT'
      }
    };

    // Evaluate deterministically against student document
    const engineOutput = analyzeDocumentEvidence({
      documentText,
      candidateMatches: [candidateMatch]
    });

    const acceptedMatches = engineOutput.verifiedMatches || [];
    let acceptedEvidenceMatch: EvidenceMatch | undefined;

    if (acceptedMatches.length > 0) {
      acceptedEvidenceMatch = {
        ...acceptedMatches[0],
        provenance: {
          ...acceptedMatches[0].provenance,
          provenanceState: 'VERIFIED',
          fineGrainedStatus: 'VERIFIED'
        }
      };
    }

    const deterministicResult: EvidenceEngineResult = {
      documentHash: engineOutput.documentHash,
      evidenceHash: engineOutput.evidenceHash,
      engineVersion: engineOutput.engineVersion,
      policyVersion: engineOutput.policyVersion,
      overallSimilarity: engineOutput.overallSimilarity,
      totalSourcesFound: engineOutput.totalSourcesEvaluated,
      verifiedSources: acceptedMatches,
      findings: [],
      providerStatuses: { unpaywall: acceptedMatches.length > 0 ? 'success' : 'partial' },
      fineGrainedStatuses: { unpaywall: acceptedMatches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT' },
      matrix: [],
      localAiStatus: 'RUNTIME_UNAVAILABLE',
      nemotronStatus: 'RUNTIME_UNAVAILABLE',
      geminiStatus: 'RUNTIME_UNAVAILABLE',
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    };

    return {
      metadataResult,
      locationResult,
      retrievalResult,
      validationResult,
      identityResult,
      bridgeEligible: true,
      acceptedEvidenceMatch,
      deterministicResult
    };
  }
}

export const deterministicEvidenceBridge = new DeterministicEvidenceBridge();
