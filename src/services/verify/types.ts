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
  publishedYear?: number;
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
  aiInterpretationStatus: 'VERIFIED_INFERENCE' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'N/A';
  overallStatus: FineGrainedProviderStatus;
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
}
