/**
 * GRADIFI VERIFY - PUBLIC RESULT CONTRACT & PRESENTATION FIREWALL
 * HOEOS Phase 1 Standard: Provider-Agnostic Canonical Boundary, Zero Secret/Diagnostic Leakage.
 */

import { EvidenceEngineResult, EvidenceMatch, AIFinding, PlagiarismRiskLevel } from './types';
import { enforceAiInterpretationFirewall } from './aiOutputFirewallService';

export interface PublicDocumentMetadata {
  title: string;
  authors: string[];
  year?: number;
  wordCount: number;
  characterCount: number;
  filename?: string;
  doi?: string;
  isbn?: string;
}

export interface PublicSimilarityScore {
  overallPercentage: number; // Strictly 0 - 100
  riskLevel: PlagiarismRiskLevel;
}

export interface PublicMatchedEvidence {
  matchId: string;
  matchedText: string;
  startOffset?: number;
  endOffset?: number;
  matchType: 'exact' | 'lexical' | 'semantic' | 'citation';
  similarityContribution: number;
  sourceId: string;
  evidenceId?: string;
}

export interface PublicAcademicSource {
  sourceId: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  sourceType: string;
  matchedPercentage: number;
}

export interface PublicBookSource {
  sourceId: string;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  isbn10?: string;
  isbn13?: string;
  url?: string;
  matchedPercentage: number;
}

export interface PublicCitation {
  sourceId: string;
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
}

export interface PublicAIInterpretation {
  findingType: string;
  severity: 'low' | 'moderate' | 'high';
  normalizedConfidence: number; // Strictly 0.0 - 1.0 internally
  explanation: string;
  supportingEvidenceRef?: string;
  authorityClassification: 'NON_AUTHORITATIVE_INTERPRETATION';
}

export interface PublicVerificationReceipt {
  verificationId: string;
  documentHash: string;
  evidenceHash: string;
  engineVersion: string;
  policyVersion: string;
  timestamp: string;
}

export interface PublicVerificationResult {
  document: PublicDocumentMetadata;
  similarity: PublicSimilarityScore;
  matchedEvidence: PublicMatchedEvidence[];
  academicSources: PublicAcademicSource[];
  bookSources: PublicBookSource[];
  citations: PublicCitation[];
  aiInterpretation: PublicAIInterpretation[];
  totalVerifiedSources: number;
  receipt: PublicVerificationReceipt;
}

/**
 * Normalizes similarity score to strictly [0, 100].
 */
export function normalizeSimilarityPercentage(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  // Handle multiplier bug if score > 100 (e.g. 8000 -> 80)
  let normalized = score;
  if (normalized > 100) {
    while (normalized > 100) {
      normalized /= 100;
    }
  }
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

/**
 * Normalizes AI confidence score to strictly [0.0, 1.0].
 */
export function normalizeAiConfidence(confidence: number): number {
  if (typeof confidence !== 'number' || isNaN(confidence)) return 0;
  let norm = confidence;
  if (norm > 1.0) {
    if (norm <= 100) {
      norm /= 100;
    } else {
      while (norm > 1.0) {
        norm /= 100;
      }
    }
  }
  return Math.max(0, Math.min(1.0, Math.round(norm * 100) / 100));
}

/**
 * Sanitizes author lists to eliminate misleading placeholders like "Unknown Author".
 */
export function sanitizeAuthors(authors?: string[]): string[] {
  if (!authors || !Array.isArray(authors) || authors.length === 0) {
    return ['Author metadata unavailable'];
  }
  const filtered = authors
    .map(a => a.trim())
    .filter(a => a.length > 0 && !/^unknown author$/i.test(a));
  return filtered.length > 0 ? filtered : ['Author metadata unavailable'];
}

/**
 * Generates canonical academic citations.
 */
export function generateCitations(sourceId: string, title: string, authors: string[], year?: number, publisher?: string, doi?: string): PublicCitation {
  const authorText = authors.length > 0 ? authors.join(', ') : 'Author metadata unavailable';
  const yearText = year ? `(${year})` : '(n.d.)';
  const doiText = doi ? ` https://doi.org/${doi}` : '';
  const pubText = publisher ? ` ${publisher}.` : '';

  return {
    sourceId,
    apa: `${authorText} ${yearText}. ${title}.${pubText}${doiText}`,
    mla: `${authorText}. "${title}." ${publisher || 'N.p.'}, ${year || 'n.d.'}.${doiText}`,
    chicago: `${authorText}. "${title}." ${publisher ? publisher + ', ' : ''}${year || 'n.d.'}.${doiText}`,
    harvard: `${authorText} ${yearText} '${title}', ${publisher || 'N.p.'}.${doiText}`
  };
}

/**
 * Sanitizes raw AI text output to remove conversational preamble (e.g. "Okay, the user wants me to analyze...").
 */
export function sanitizeAiExplanation(explanation: string): string {
  if (!explanation || typeof explanation !== 'string') {
    return 'AI INTERPRETATION UNAVAILABLE';
  }
  // Check for conversational markers
  if (
    /^(okay|sure|here is|let me|the user wants|i will|as an ai|based on the input)/i.test(explanation.trim()) ||
    explanation.includes('Okay,') ||
    explanation.includes('the user wants me to')
  ) {
    return 'AI INTERPRETATION UNAVAILABLE';
  }
  return explanation.trim();
}

/**
 * Transforms an internal EvidenceEngineResult into a sanitized, canonical PublicVerificationResult.
 */
export function toPublicVerificationResult(
  engineResult: EvidenceEngineResult,
  customVerificationId?: string
): PublicVerificationResult {
  const canonicalDoc = engineResult.canonicalDocument;
  
  // 1. Document Metadata Normalization
  const document: PublicDocumentMetadata = {
    title: canonicalDoc?.title || 'Untitled Document',
    authors: sanitizeAuthors(canonicalDoc?.authors),
    year: canonicalDoc?.year,
    wordCount: canonicalDoc?.stats?.wordCount || 0,
    characterCount: canonicalDoc?.stats?.characterCount || 0,
    filename: canonicalDoc?.source?.filename,
    doi: canonicalDoc?.doi,
    isbn: canonicalDoc?.isbn
  };

  // 2. Similarity Normalization
  const overallPercentage = normalizeSimilarityPercentage(engineResult.overallSimilarity);
  const riskLevel: PlagiarismRiskLevel = engineResult.plagiarismEvidence?.riskLevel || (
    overallPercentage > 75 ? 'HIGH' : (overallPercentage > 35 ? 'MODERATE' : (overallPercentage > 5 ? 'LOW' : 'NO_EVIDENCE'))
  );

  const similarity: PublicSimilarityScore = {
    overallPercentage,
    riskLevel
  };

  // 3. Matched Evidence Deduplication & Mapping
  const rawMatches = engineResult.verifiedSources || [];
  const matchedEvidence: PublicMatchedEvidence[] = [];
  const seenMatchKeys = new Set<string>();

  for (let i = 0; i < rawMatches.length; i++) {
    const match = rawMatches[i];
    const matchKey = `${match.sourceId}_${match.matchedText}`;
    if (seenMatchKeys.has(matchKey)) continue;
    seenMatchKeys.add(matchKey);

    matchedEvidence.push({
      matchId: `match_${i + 1}_${match.sourceId}`,
      matchedText: match.matchedText || match.originalSnippet || '',
      matchType: match.matchType || 'lexical',
      similarityContribution: normalizeSimilarityPercentage(match.matchPercentage || 0),
      sourceId: match.sourceId,
      evidenceId: `ev_${engineResult.evidenceHash.slice(0, 8)}_${i + 1}`
    });
  }

  // 4. Academic & Book Sources Normalization
  const academicSources: PublicAcademicSource[] = [];
  const bookSources: PublicBookSource[] = [];
  const citations: PublicCitation[] = [];
  const seenSourceIds = new Set<string>();

  for (const match of rawMatches) {
    if (seenSourceIds.has(match.sourceId)) continue;
    seenSourceIds.add(match.sourceId);

    const prov = match.provenance;
    const authors = sanitizeAuthors(match.authors || (prov?.authors));
    const title = match.title || prov?.title || 'Untitled Academic Source';
    const rawIsbn = prov?.isbn || match.isbn;
    const cleanIsbn = rawIsbn ? rawIsbn.replace(/[^0-9X]/gi, '') : '';

    if (match.sourceId.includes('book') || match.sourceId.includes('isbn') || rawIsbn) {
      bookSources.push({
        sourceId: match.sourceId,
        title,
        authors,
        year: prov?.publishedYear,
        publisher: prov?.publisher,
        isbn10: cleanIsbn.length === 10 ? rawIsbn : undefined,
        isbn13: cleanIsbn.length === 13 ? rawIsbn : undefined,
        url: match.url || prov?.sourceUrl,
        matchedPercentage: normalizeSimilarityPercentage(match.matchPercentage || 0)
      });
    } else {
      academicSources.push({
        sourceId: match.sourceId,
        title,
        authors,
        year: prov?.publishedYear,
        journal: prov?.publisher,
        publisher: prov?.publisher,
        doi: match.doi || prov?.doi,
        url: match.url || prov?.sourceUrl,
        sourceType: prov?.sourceType || match.sourceId,
        matchedPercentage: normalizeSimilarityPercentage(match.matchPercentage || 0)
      });
    }

    citations.push(generateCitations(
      match.sourceId,
      title,
      authors,
      prov?.publishedYear,
      prov?.publisher,
      match.doi || prov?.doi
    ));
  }

  // 5. AI Interpretation Firewall & Normalization
  const rawFindings = engineResult.findings || [];
  const aiInterpretation: PublicAIInterpretation[] = enforceAiInterpretationFirewall(rawFindings);

  // 6. Verification Receipt
  const receipt: PublicVerificationReceipt = {
    verificationId: customVerificationId || `ver_${engineResult.documentHash.slice(0, 12)}`,
    documentHash: engineResult.documentHash,
    evidenceHash: engineResult.evidenceHash,
    engineVersion: engineResult.engineVersion || '1.0.0-certified',
    policyVersion: engineResult.policyVersion || 'G3-2026.1',
    timestamp: engineResult.timestamp
  };

  return {
    document,
    similarity,
    matchedEvidence,
    academicSources,
    bookSources,
    citations,
    aiInterpretation,
    totalVerifiedSources: academicSources.length + bookSources.length,
    receipt
  };
}
