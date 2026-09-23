/**
 * GRADIFI VERIFY - FEDERATED ACADEMIC EVIDENCE CORE SERVICE
 * Primary orchestrator for Gradifi Verify evidence core.
 * HOEOS Standard: Reproducible evidence, Provider isolation, Provenance transparency.
 */

import {
  EvidenceEngineResult,
  ProviderStatus,
  FineGrainedProviderStatus,
  SourceType,
  EvidenceMatch,
  VerificationMatrixEntry,
  CanonicalAnalysisDocument,
  AnalysisInputContract,
  AnalysisResultEnvelope,
  SimilarityAnalysisResult,
  SimilarityFinding,
  PlagiarismEvidenceResult,
  PlagiarismEvidenceFinding
} from './types';
import { analyzeDocumentEvidence, evaluateDocumentSimilarity, extractSimilarityFindingsFromEvidenceMatches } from './deterministicEngine';
import { buildCanonicalAnalysisDocument } from './documentNormalizer';
import { evaluatePlagiarismEvidence } from './plagiarismPolicy';
import { OpenAlexProvider } from './providers/openAlexProvider';
import { CrossrefProvider } from './providers/crossrefProvider';
import { UnpaywallProvider } from './providers/unpaywallProvider';
import { CoreProvider } from './providers/coreProvider';
import { GoogleBooksProvider } from './providers/googleBooksProvider';
import { AIFederationService } from './aiFederation';

export class VerifyCoreService {
  private openAlex = new OpenAlexProvider();
  private crossref = new CrossrefProvider();
  private unpaywall = new UnpaywallProvider();
  private core = new CoreProvider();
  private googleBooks = new GoogleBooksProvider();
  private aiFederation = new AIFederationService();

  /**
   * Executes a complete federated evidence verification run from a string, CanonicalAnalysisDocument, or AnalysisInputContract.
   */
  async executeVerifyRun(
    input: string | CanonicalAnalysisDocument | AnalysisInputContract,
    options?: { searchLimit?: number }
  ): Promise<EvidenceEngineResult> {
    const startTime = Date.now();
    const limit = options?.searchLimit || 5;

    // Resolve input into canonical document representation
    let canonicalDoc: CanonicalAnalysisDocument;
    if (typeof input === 'string') {
      canonicalDoc = buildCanonicalAnalysisDocument({ rawText: input });
    } else if ('canonicalDocument' in input) {
      canonicalDoc = input.canonicalDocument;
    } else {
      canonicalDoc = input;
    }

    const documentText = canonicalDoc.rawText;

    const providerStatuses: Record<string, ProviderStatus> = {
      openalex: 'unavailable',
      crossref: 'unavailable',
      unpaywall: 'unavailable',
      core: 'unavailable',
      googlebooks: 'unavailable'
    };

    const fineGrainedStatuses: Record<string, FineGrainedProviderStatus> = {
      openalex: 'NOT_TESTED',
      crossref: 'NOT_TESTED',
      unpaywall: 'NOT_TESTED',
      core: 'NOT_TESTED',
      googlebooks: 'NOT_TESTED'
    };

    const rawMatches: EvidenceMatch[] = [];

    // Execute all 5 academic providers independently in parallel
    const [openAlexRes, crossrefRes, unpaywallRes, coreRes, googleBooksRes] = await Promise.allSettled([
      this.openAlex.search({ query: documentText, documentText, limit }),
      this.crossref.search({ query: documentText, documentText, limit }),
      this.unpaywall.search({ query: documentText, documentText, limit }),
      this.core.search({ query: documentText, documentText, limit }),
      this.googleBooks.search({ query: documentText, documentText, limit })
    ]);

    // Process OpenAlex
    if (openAlexRes.status === 'fulfilled') {
      providerStatuses['openalex'] = openAlexRes.value.status;
      fineGrainedStatuses['openalex'] = openAlexRes.value.fineGrainedStatus || (openAlexRes.value.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
      rawMatches.push(...openAlexRes.value.matches);
    } else {
      providerStatuses['openalex'] = 'error';
      fineGrainedStatuses['openalex'] = 'REQUEST_FAILED';
    }

    // Process Crossref
    if (crossrefRes.status === 'fulfilled') {
      providerStatuses['crossref'] = crossrefRes.value.status;
      fineGrainedStatuses['crossref'] = crossrefRes.value.fineGrainedStatus || (crossrefRes.value.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
      rawMatches.push(...crossrefRes.value.matches);
    } else {
      providerStatuses['crossref'] = 'error';
      fineGrainedStatuses['crossref'] = 'REQUEST_FAILED';
    }

    // Process Unpaywall
    if (unpaywallRes.status === 'fulfilled') {
      providerStatuses['unpaywall'] = unpaywallRes.value.status;
      fineGrainedStatuses['unpaywall'] = unpaywallRes.value.fineGrainedStatus || (unpaywallRes.value.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
      rawMatches.push(...unpaywallRes.value.matches);
    } else {
      providerStatuses['unpaywall'] = 'error';
      fineGrainedStatuses['unpaywall'] = 'REQUEST_FAILED';
    }

    // Process CORE
    if (coreRes.status === 'fulfilled') {
      providerStatuses['core'] = coreRes.value.status;
      fineGrainedStatuses['core'] = coreRes.value.fineGrainedStatus || (coreRes.value.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
      rawMatches.push(...coreRes.value.matches);
    } else {
      providerStatuses['core'] = 'error';
      fineGrainedStatuses['core'] = 'REQUEST_FAILED';
    }

    // Process Google Books
    if (googleBooksRes.status === 'fulfilled') {
      providerStatuses['googlebooks'] = googleBooksRes.value.status;
      fineGrainedStatuses['googlebooks'] = googleBooksRes.value.fineGrainedStatus || (googleBooksRes.value.matches.length > 0 ? 'VERIFIED' : 'EMPTY_RESULT');
      rawMatches.push(...googleBooksRes.value.matches);
    } else {
      providerStatuses['googlebooks'] = 'error';
      fineGrainedStatuses['googlebooks'] = 'REQUEST_FAILED';
    }

    // Run Pure Deterministic Evidence Engine
    const engineOutput = analyzeDocumentEvidence({
      documentText,
      candidateMatches: rawMatches
    });

    // Run AI Federation (Nemotron, Gemma, Gemini)
    const aiResult = await this.aiFederation.executeFederation(documentText, engineOutput.verifiedMatches);

    // Derive fine-grained matrix status helper
    const deriveMatrixStatuses = (fineGrainedStatus: FineGrainedProviderStatus) => {
      const realRequestStatus: 'VERIFIED' | 'FAILED' | 'BLOCKED' =
        fineGrainedStatus === 'VERIFIED' || fineGrainedStatus === 'EMPTY_RESULT' || fineGrainedStatus === 'PARTIALLY_VERIFIED'
          ? 'VERIFIED'
          : 'FAILED';
      const responseStatus: 'VERIFIED' | 'EMPTY' | 'FAILED' =
        fineGrainedStatus === 'VERIFIED' || fineGrainedStatus === 'PARTIALLY_VERIFIED'
          ? 'VERIFIED'
          : fineGrainedStatus === 'EMPTY_RESULT'
            ? 'EMPTY'
            : 'FAILED';
      return { realRequestStatus, responseStatus };
    };

    const oaStatuses = deriveMatrixStatuses(fineGrainedStatuses.openalex);
    const crStatuses = deriveMatrixStatuses(fineGrainedStatuses.crossref);
    const unStatuses = deriveMatrixStatuses(fineGrainedStatuses.unpaywall);
    const coreStatuses = deriveMatrixStatuses(fineGrainedStatuses.core);
    const gbStatuses = deriveMatrixStatuses(fineGrainedStatuses.googlebooks);

    // Build Verification Matrix
    const matrix: VerificationMatrixEntry[] = [
      {
        provider: 'openalex',
        credentialStatus: fineGrainedStatuses.openalex === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: oaStatuses.realRequestStatus,
        responseStatus: oaStatuses.responseStatus,
        schemaStatus: fineGrainedStatuses.openalex === 'SCHEMA_FAILED' ? 'FAILED' : 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: 'N/A',
        overallStatus: fineGrainedStatuses.openalex
      },
      {
        provider: 'crossref',
        credentialStatus: fineGrainedStatuses.crossref === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: crStatuses.realRequestStatus,
        responseStatus: crStatuses.responseStatus,
        schemaStatus: fineGrainedStatuses.crossref === 'SCHEMA_FAILED' ? 'FAILED' : 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: 'N/A',
        overallStatus: fineGrainedStatuses.crossref
      },
      {
        provider: 'unpaywall',
        credentialStatus: 'NOT_APPLICABLE',
        realRequestStatus: unStatuses.realRequestStatus,
        responseStatus: unStatuses.responseStatus,
        schemaStatus: fineGrainedStatuses.unpaywall === 'SCHEMA_FAILED' ? 'FAILED' : 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: 'N/A',
        overallStatus: fineGrainedStatuses.unpaywall
      },
      {
        provider: 'core',
        credentialStatus: fineGrainedStatuses.core === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: coreStatuses.realRequestStatus,
        responseStatus: coreStatuses.responseStatus,
        schemaStatus: fineGrainedStatuses.core === 'SCHEMA_FAILED' ? 'FAILED' : 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: 'N/A',
        overallStatus: fineGrainedStatuses.core
      },
      {
        provider: 'googlebooks',
        credentialStatus: fineGrainedStatuses.googlebooks === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: gbStatuses.realRequestStatus,
        responseStatus: gbStatuses.responseStatus,
        schemaStatus: fineGrainedStatuses.googlebooks === 'SCHEMA_FAILED' ? 'FAILED' : 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: 'N/A',
        overallStatus: fineGrainedStatuses.googlebooks
      },
      {
        provider: 'gemini',
        credentialStatus: aiResult.geminiStatus === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: aiResult.geminiStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED',
        responseStatus: aiResult.geminiStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED',
        schemaStatus: 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: aiResult.geminiStatus === 'INFERENCE_VERIFIED'
          ? 'VERIFIED_INFERENCE'
          : (aiResult.geminiStatus === 'AUTHENTICATION_FAILED'
            ? 'AUTHENTICATION_FAILED'
            : (aiResult.geminiStatus === 'INFERENCE_FAILED'
              ? 'INFERENCE_FAILED'
              : 'RUNTIME_UNAVAILABLE')),
        overallStatus: aiResult.geminiStatus as FineGrainedProviderStatus
      },
      {
        provider: 'nemotron',
        credentialStatus: aiResult.nemotronStatus === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'VERIFIED',
        realRequestStatus: aiResult.nemotronStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED',
        responseStatus: aiResult.nemotronStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED',
        schemaStatus: 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: aiResult.nemotronStatus === 'INFERENCE_VERIFIED'
          ? 'VERIFIED_INFERENCE'
          : (aiResult.nemotronStatus === 'AUTHENTICATION_FAILED'
            ? 'AUTHENTICATION_FAILED'
            : (aiResult.nemotronStatus === 'INFERENCE_FAILED'
              ? 'INFERENCE_FAILED'
              : 'RUNTIME_UNAVAILABLE')),
        overallStatus: aiResult.nemotronStatus as FineGrainedProviderStatus
      },
      {
        provider: 'gemma',
        credentialStatus: 'NOT_APPLICABLE',
        realRequestStatus: aiResult.gemmaStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'FAILED',
        responseStatus: aiResult.gemmaStatus === 'INFERENCE_VERIFIED' ? 'VERIFIED' : 'EMPTY',
        schemaStatus: 'VERIFIED',
        provenanceStatus: 'VERIFIED',
        federationStatus: 'VERIFIED',
        aiInterpretationStatus: aiResult.gemmaStatus === 'INFERENCE_VERIFIED'
          ? 'VERIFIED_INFERENCE'
          : (aiResult.gemmaStatus === 'AUTHENTICATION_FAILED'
            ? 'AUTHENTICATION_FAILED'
            : (aiResult.gemmaStatus === 'INFERENCE_FAILED'
              ? 'INFERENCE_FAILED'
              : 'RUNTIME_UNAVAILABLE')),
        overallStatus: (aiResult.gemmaStatus || aiResult.localAiStatus) as FineGrainedProviderStatus
      }
    ];

    const processingTimeMs = Date.now() - startTime;

    // G2 Deterministic Similarity Analysis
    const similarityFindings = extractSimilarityFindingsFromEvidenceMatches(
      documentText,
      canonicalDoc.documentId,
      engineOutput.verifiedMatches
    );

    const similarityAnalysis: SimilarityAnalysisResult = {
      analysisType: 'DETERMINISTIC_SIMILARITY',
      sourceDocumentId: canonicalDoc.documentId,
      overallSimilarity: engineOutput.overallSimilarity,
      findings: similarityFindings,
      engineVersion: engineOutput.engineVersion,
      policyVersion: engineOutput.policyVersion,
      deterministic: true,
      warnings: []
    };

    // G3 Plagiarism Evidence & Policy Evaluation (Consumes G2 Similarity)
    const plagiarismEvidence = evaluatePlagiarismEvidence(similarityAnalysis);

    return {
      documentHash: engineOutput.documentHash,
      evidenceHash: engineOutput.evidenceHash,
      engineVersion: engineOutput.engineVersion,
      policyVersion: engineOutput.policyVersion,
      overallSimilarity: engineOutput.overallSimilarity,
      totalSourcesFound: engineOutput.verifiedMatches.length,
      verifiedSources: engineOutput.verifiedMatches,
      findings: aiResult.findings,
      providerStatuses: providerStatuses as Record<SourceType, ProviderStatus>,
      fineGrainedStatuses,
      matrix,
      localAiStatus: aiResult.localAiStatus,
      nemotronStatus: aiResult.nemotronStatus,
      geminiStatus: aiResult.geminiStatus,
      processingTimeMs,
      timestamp: new Date().toISOString(),
      canonicalDocument: canonicalDoc,
      similarityAnalysis,
      plagiarismEvidence
    };
  }

  /**
   * Executes deterministic similarity analysis comparing two canonical documents directly.
   * HOEOS G2 Standard: Pure deterministic calculation, 0 AI calls, reproducible.
   */
  executeSimilarityAnalysis(
    sourceInput: string | CanonicalAnalysisDocument,
    comparisonInput: string | CanonicalAnalysisDocument
  ): SimilarityAnalysisResult {
    const sourceDoc = typeof sourceInput === 'string'
      ? buildCanonicalAnalysisDocument({ rawText: sourceInput })
      : sourceInput;

    const compDoc = typeof comparisonInput === 'string'
      ? buildCanonicalAnalysisDocument({ rawText: comparisonInput })
      : comparisonInput;

    return evaluateDocumentSimilarity(sourceDoc, compDoc);
  }

  /**
   * Executes deterministic plagiarism evidence policy evaluation over G2 similarity results.
   * HOEOS G3 Standard: Pure evidence policy classification, 0 AI dependency.
   */
  executePlagiarismPolicy(similarityResult: SimilarityAnalysisResult): PlagiarismEvidenceResult {
    return evaluatePlagiarismEvidence(similarityResult);
  }

  /**
   * Executes canonical document analysis producing a standardized AnalysisResultEnvelope.
   * Stable contract for future analysis engines.
   */
  async executeCanonicalAnalysis(inputContract: AnalysisInputContract): Promise<AnalysisResultEnvelope> {
    const startTime = Date.now();
    const deterministicResult = await this.executeVerifyRun(inputContract, {
      searchLimit: inputContract.options?.searchLimit
    });
    const processingTimeMs = Date.now() - startTime;

    // Derive overall status from deterministic result matrix
    const hasVerified = deterministicResult.verifiedSources.length > 0;
    const status = hasVerified ? 'VERIFIED' : 'EMPTY_RESULT';

    return {
      analysisId: `ANL-${deterministicResult.documentHash.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
      documentId: inputContract.canonicalDocument.documentId,
      timestamp: deterministicResult.timestamp,
      engineVersion: deterministicResult.engineVersion,
      policyVersion: deterministicResult.policyVersion,
      status,
      deterministicResult,
      canonicalDocument: inputContract.canonicalDocument,
      processingTimeMs,
      warnings: inputContract.canonicalDocument.source.isFixture
        ? ['DOCUMENT_IS_DEMO_FIXTURE']
        : undefined
    };
  }
}

export const verifyCoreService = new VerifyCoreService();
