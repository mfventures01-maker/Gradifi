/**
 * GRADIFI VERIFY - FEDERATED ACADEMIC EVIDENCE CORE
 * Standardized Types & Contracts (HOEOS Compliant)
 */

export type SourceType =
  | 'openalex'
  | 'crossref'
  | 'unpaywall'
  | 'core'
  | 'googlebooks'
  | 'nemotron'
  | 'gemma'
  | 'gemini';

export type ProviderStatus = 'success' | 'partial' | 'unavailable' | 'error';

export type FineGrainedProviderStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'AUTHENTICATION_FAILED'
  | 'REQUEST_FAILED'
  | 'SCHEMA_FAILED'
  | 'EMPTY_RESULT'
  | 'RATE_LIMITED'
  | 'INFERENCE_VERIFIED'
  | 'INFERENCE_FAILED'
  | 'RUNTIME_AVAILABLE'
  | 'RUNTIME_UNAVAILABLE'
  | 'NOT_TESTED';

export type ProvenanceState = 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'CONFLICT';

export interface ProviderProvenance {
  provider: SourceType;
  providerRecordId: string;
  retrievedAt: string;
  sourceType: string;
  sourceUrl: string;
  title: string;
  authors: string[];
  doi?: string;
  isbn?: string;
  publishedYear?: number;
  publisher?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  accessInfo?: {
    viewability?: string;
    embeddable?: boolean;
    publicDomain?: boolean;
    pdfAvailable?: boolean;
    pdfDownloadUrl?: string;
    epubAvailable?: boolean;
    webReaderLink?: string;
  };
  provenanceState: ProvenanceState;
  query?: string;
  requestTimestamp?: string;
  responseTimestamp?: string;
  correlationId?: string;
  fineGrainedStatus?: FineGrainedProviderStatus;
  errorCode?: string;
}

export interface ProviderSearchInput {
  query: string;
  documentText: string;
  limit?: number;
}

export interface EvidenceMatch {
  sourceId: string;
  title: string;
  authors: string[];
  url: string;
  doi?: string;
  isbn?: string;
  matchedText: string;
  originalSnippet: string;
  matchType: 'exact' | 'lexical' | 'semantic' | 'citation';
  matchPercentage: number;
  relevanceScore: number;
  provenance: ProviderProvenance;
}

export interface ProviderResult {
  providerId: SourceType;
  status: ProviderStatus;
  fineGrainedStatus?: FineGrainedProviderStatus;
  matches: EvidenceMatch[];
  errorMessage?: string;
  errorCode?: string;
  rawCount?: number;
  requestTimestamp?: string;
  responseTimestamp?: string;
  correlationId?: string;
}

export interface AIFinding {
  type: 'exact_overlap' | 'lexical_overlap' | 'semantic_overlap' | 'citation_issue' | 'writing_signal';
  severity: 'low' | 'moderate' | 'high';
  confidence: number;
  studentPassage?: string;
  sourcePassage?: string;
  explanation: string;
  sourceId?: string;
  requiresHumanReview: boolean;
  modelProvider?: 'nemotron' | 'gemini' | 'gemma' | 'deterministic_fallback';
}

export interface AcademicProvider {
  readonly id: SourceType;
  search(input: ProviderSearchInput): Promise<ProviderResult>;
}

export interface VerificationMatrixEntry {
  provider: SourceType;
  credentialStatus: 'VERIFIED' | 'AUTHENTICATION_FAILED' | 'NOT_TESTED' | 'NOT_APPLICABLE';
  realRequestStatus: 'VERIFIED' | 'FAILED' | 'BLOCKED';
  responseStatus: 'VERIFIED' | 'EMPTY' | 'FAILED';
  schemaStatus: 'VERIFIED' | 'FAILED';
  provenanceStatus: 'VERIFIED' | 'FAILED';
  federationStatus: 'VERIFIED' | 'FAILED';
  aiInterpretationStatus: 'VERIFIED_INFERENCE' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED' | 'N/A';
  overallStatus: FineGrainedProviderStatus;
  query?: string;
}

export interface EvidenceEngineResult {
  documentHash: string;
  evidenceHash: string;
  engineVersion: string;
  policyVersion: string;
  overallSimilarity: number;
  totalSourcesFound: number;
  verifiedSources: EvidenceMatch[];
  findings: AIFinding[];
  providerStatuses: Record<string, ProviderStatus>;
  fineGrainedStatuses: Record<string, FineGrainedProviderStatus>;
  matrix: VerificationMatrixEntry[];
  localAiStatus: 'RUNTIME_AVAILABLE' | 'RUNTIME_UNAVAILABLE';
  nemotronStatus: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  geminiStatus: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  processingTimeMs: number;
  timestamp: string;
  canonicalDocument?: CanonicalAnalysisDocument;
  similarityAnalysis?: SimilarityAnalysisResult;
  plagiarismEvidence?: PlagiarismEvidenceResult;
  constructedQuery?: string;
}

/**
 * GRADIFI HOEOS G3 - PLAGIARISM EVIDENCE & POLICY CONTRACT
 */
export type PlagiarismRiskLevel =
  | 'NO_EVIDENCE'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'CRITICAL'
  | 'HUMAN_REVIEW_REQUIRED';

export interface PlagiarismEvidenceFinding {
  findingId: string;
  similarityFindingId: string;
  sourceDocumentId: string;
  matchedDocumentId: string;
  sourceSegment: string;
  matchedSegment: string;
  similarityScore: number;
  evidenceType: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP';
  policySignificance: 'LOW' | 'MODERATE' | 'HIGH';
  provenance: 'DETERMINISTIC';
}

export interface PlagiarismEvidenceResult {
  analysisType: 'PLAGIARISM_EVIDENCE';
  sourceDocumentId: string;
  matchedDocumentId?: string;
  similarityResult: SimilarityAnalysisResult;
  riskLevel: PlagiarismRiskLevel;
  evidenceCount: number;
  exactPhraseCount: number;
  ngramFindingCount: number;
  tokenOverlapFindingCount: number;
  evidenceCoveragePercent: number;
  findings: PlagiarismEvidenceFinding[];
  policyVersion: string;
  deterministic: true;
  requiresHumanReview: boolean;
  warnings: string[];
}

/**
 * GRADIFI HOEOS G2 - DETERMINISTIC SIMILARITY & EXPLAINABLE MATCH CONTRACT
 */
export type SimilarityMatchMethod = 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP';

export interface SimilarityFinding {
  findingId: string;
  sourceDocumentId: string;
  matchedDocumentId: string;
  sourceSegment: string;
  matchedSegment: string;
  similarityScore: number;
  matchMethod: SimilarityMatchMethod;
  sourceStart?: number;
  sourceEnd?: number;
  matchedStart?: number;
  matchedEnd?: number;
  provenance: 'DETERMINISTIC';
}

export interface SimilarityAnalysisResult {
  analysisType: 'DETERMINISTIC_SIMILARITY';
  sourceDocumentId: string;
  matchedDocumentId?: string;
  overallSimilarity: number;
  findings: SimilarityFinding[];
  engineVersion: string;
  policyVersion: string;
  deterministic: true;
  warnings: string[];
}

/**
 * GRADIFI HOEOS G1 - CANONICAL DOCUMENT ANALYSIS CONTRACT
 */
export type DocumentOriginType = 'EXTRACTED' | 'NORMALIZED' | 'INFERRED' | 'FIXTURE';

export interface DocumentSourceMetadata {
  filename?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  extractionMethod?: 'text_reader' | 'pdf_stream_extractor' | 'ocr_tesseract' | 'manual_paste' | 'demo_fixture';
  isFixture: boolean;
  origin: DocumentOriginType;
  extractedAt: string;
}

export interface DocumentStats {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  tokenCount: number;
  estimatedPageCount: number;
}

export interface CanonicalAnalysisDocument {
  documentId: string; // Deterministic FNV-1a hash over normalized text
  source: DocumentSourceMetadata;
  rawText: string;
  normalizedText: string;
  title: string;
  authors: string[];
  abstract: string;
  publication?: string;
  institution?: string;
  year?: number;
  doi?: string;
  isbn?: string;
  identifiers: string[];
  stats: DocumentStats;
  extractionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  normalizationStatus: 'NORMALIZED' | 'PARTIAL' | 'FAILED';
  createdAt: string;
}

export interface AnalysisInputContract {
  canonicalDocument: CanonicalAnalysisDocument;
  options?: {
    searchLimit?: number;
    includeAiFederation?: boolean;
    policyVersion?: string;
  };
}

export interface AnalysisResultEnvelope {
  analysisId: string;
  documentId: string;
  timestamp: string;
  engineVersion: string;
  policyVersion: string;
  status: FineGrainedProviderStatus | 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'FAILED';
  deterministicResult: EvidenceEngineResult;
  canonicalDocument: CanonicalAnalysisDocument;
  processingTimeMs: number;
  warnings?: string[];
}

/**
 * GRADIFI HOEOS G5.2 - BULK PDF INGESTION CONTRACT TYPES
 */
export type IngestionStatus =
  | 'QUEUED'
  | 'VALIDATING'
  | 'EXTRACTING'
  | 'COMPLETED'
  | 'FAILED';

export interface BulkIngestionItem {
  ingestionId: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  status: IngestionStatus;
  extractionMethod?: 'text_reader' | 'pdf_stream_extractor' | 'ocr_tesseract';
  documentHash?: string;
  canonicalDocument?: CanonicalAnalysisDocument;
  error?: string;
  extractedTextLength?: number;
}

export interface BulkIngestionBatch {
  batchId: string;
  createdAt: string;
  total: number;
  completed: number;
  failed: number;
  queued: number;
  inProgress: number;
  items: BulkIngestionItem[];
  processingTimeMs: number;
}

/**
 * GRADIFI HOEOS G5.4 - UNPAYWALL METADATA CONTRACT TYPES
 */
export interface UnpaywallOALocation {
  url?: string;
  urlForPdf?: string;
  urlForLandingPage?: string;
  evidence?: string;
  license?: string;
  version?: string;
  isBest?: boolean;
}

export interface UnpaywallMetadataResult {
  providerId: 'unpaywall';
  doi?: string;
  status: 'METADATA_FOUND' | 'METADATA_NOT_FOUND' | 'REQUEST_FAILED';
  title?: string;
  authors?: string[];
  publishedYear?: number;
  publisher?: string;
  journalName?: string;
  isOA?: boolean;
  oaStatus?: string;
  bestOALocation?: UnpaywallOALocation;
  oaLocations?: UnpaywallOALocation[];
  errorMessage?: string;
  requestTimestamp: string;
  responseTimestamp: string;
  correlationId: string;
}

/**
 * GRADIFI HOEOS G5.5 - OA LOCATION RESOLUTION TYPES
 */
export type OALocationStatus =
  | 'NO_OA_LOCATION'
  | 'OA_LOCATION_FOUND'
  | 'OA_LOCATION_INVALID';

export interface OALocationResolutionResult {
  doi?: string;
  status: OALocationStatus;
  selectedLocation?: UnpaywallOALocation;
  allLocations?: UnpaywallOALocation[];
  isBestLocation: boolean;
  errorMessage?: string;
  timestamp: string;
  correlationId: string;
}

/**
 * GRADIFI HOEOS G5.6 - SOURCE RETRIEVAL TYPES
 */
export type SourceRetrievalStatus =
  | 'SOURCE_RETRIEVED'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'CONTENT_TYPE_MISMATCH'
  | 'EMPTY_RESPONSE'
  | 'RETRIEVAL_FAILED';

export interface SourceRetrievalResult {
  sourceUrl: string;
  status: SourceRetrievalStatus;
  httpStatus?: number;
  contentType?: string;
  contentLength?: number;
  contentBuffer?: ArrayBuffer;
  retrievedAt: string;
  errorMessage?: string;
  correlationId: string;
}

/**
 * GRADIFI HOEOS G5.7 - RETRIEVED CONTENT VALIDATION TYPES
 */
export type ContentValidationStatus =
  | 'CONTENT_VALID'
  | 'CONTENT_EMPTY'
  | 'CONTENT_MALFORMED'
  | 'CONTENT_UNSUPPORTED'
  | 'CONTENT_VALIDATION_FAILED';

export interface ContentValidationResult {
  status: ContentValidationStatus;
  extractedText?: string;
  canonicalDocument?: CanonicalAnalysisDocument;
  documentHash?: string;
  extractionMethod?: string;
  pageCountEstimate?: number;
  errorMessage?: string;
  validatedAt: string;
}

/**
 * GRADIFI HOEOS G5.8 - SOURCE / WORK IDENTITY CORRESPONDENCE TYPES
 */
export type IdentityCorrespondenceStatus =
  | 'IDENTITY_MATCHED'
  | 'IDENTITY_MISMATCH'
  | 'IDENTITY_INCONCLUSIVE'
  | 'IDENTITY_UNAVAILABLE';

export interface IdentityCorrespondenceResult {
  status: IdentityCorrespondenceStatus;
  matchedBy: 'doi_exact' | 'isbn_exact' | 'title_author_correspondence' | 'none';
  claimedDoi?: string;
  extractedDoi?: string;
  claimedTitle?: string;
  extractedTitle?: string;
  confidenceScore: number;
  explanation: string;
  evaluatedAt: string;
}

/**
 * GRADIFI HOEOS G5.9 - DETERMINISTIC EVIDENCE BRIDGE TYPES
 */
export interface EvidenceBridgeChainResult {
  metadataResult: UnpaywallMetadataResult;
  locationResult: OALocationResolutionResult;
  retrievalResult: SourceRetrievalResult;
  validationResult: ContentValidationResult;
  identityResult: IdentityCorrespondenceResult;
  bridgeEligible: boolean;
  acceptedEvidenceMatch?: EvidenceMatch;
  deterministicResult?: EvidenceEngineResult;
  errorMessage?: string;
}


