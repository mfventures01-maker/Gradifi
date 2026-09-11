/**
 * GRADIFI VERIFY - DETERMINISTIC EVIDENCE ENGINE
 * Pure mathematical evidence engine.
 * HOEOS Standard: ZERO Math.random(). Reproducible evidence calculation.
 */

import { EvidenceMatch, ProvenanceState } from './types';
import { normalizeText, tokenize, segmentSentences, generateNGrams, computeHash } from './documentNormalizer';

export interface DeterministicAnalysisInput {
  documentText: string;
  candidateMatches: EvidenceMatch[];
  engineVersion?: string;
  policyVersion?: string;
}

export interface DeterministicEngineOutput {
  documentHash: string;
  evidenceHash: string;
  engineVersion: string;
  policyVersion: string;
  overallSimilarity: number;
  totalSourcesEvaluated: number;
  verifiedMatches: EvidenceMatch[];
}

export const ENGINE_VERSION = '1.0.0-hoeos.run1';
export const POLICY_VERSION = '2026.09-academic-evidence';

/**
 * Calculates exact string / phrase overlap length between student text and snippet.
 */
export function calculateExactPhraseMatch(documentText: string, snippetText: string): { matchedText: string; length: number } {
  const normDoc = normalizeText(documentText);
  const normSnippet = normalizeText(snippetText);

  if (!normDoc || !normSnippet) return { matchedText: '', length: 0 };

  const sentences = segmentSentences(snippetText);
  let bestMatch = '';

  for (const sentence of sentences) {
    const normSentence = normalizeText(sentence);
    if (normSentence.length >= 12 && normDoc.includes(normSentence)) {
      if (normSentence.length > bestMatch.length) {
        bestMatch = sentence;
      }
    }
  }

  return { matchedText: bestMatch, length: bestMatch.length };
}

/**
 * Calculates n-gram overlap percentage (Jaccard token overlap index).
 */
export function calculateNGramOverlap(documentText: string, snippetText: string, n: number = 4): number {
  const docTokens = tokenize(documentText);
  const snippetTokens = tokenize(snippetText);

  if (docTokens.length === 0 || snippetTokens.length === 0) return 0;

  const docNGrams = new Set(generateNGrams(docTokens, n));
  const snippetNGrams = generateNGrams(snippetTokens, n);

  if (docNGrams.size === 0 || snippetNGrams.length === 0) return 0;

  let matchCount = 0;
  for (const ngram of snippetNGrams) {
    if (docNGrams.has(ngram)) {
      matchCount++;
    }
  }

  // Percentage relative to candidate snippet length
  const ratio = (matchCount / snippetNGrams.length) * 100;
  return Math.min(100, Math.round(ratio * 100) / 100);
}

/**
 * Deduplicates source matches canonicalized by DOI or Title + Authors.
 */
export function deduplicateSources(matches: EvidenceMatch[]): EvidenceMatch[] {
  const seen = new Map<string, EvidenceMatch>();

  for (const match of matches) {
    const canonicalKey = match.doi
      ? `doi:${match.doi.toLowerCase().trim()}`
      : `title:${normalizeText(match.title)}|authors:${normalizeText(match.authors.join(','))}`;

    const existing = seen.get(canonicalKey);
    if (!existing) {
      seen.set(canonicalKey, match);
    } else {
      // Keep match with higher match percentage or richer provenance
      if (match.matchPercentage > existing.matchPercentage || (match.provenance.doi && !existing.provenance.doi)) {
        seen.set(canonicalKey, match);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Evaluates candidate matches deterministically against the student document.
 */
export function analyzeDocumentEvidence(input: DeterministicAnalysisInput): DeterministicEngineOutput {
  const engineVersion = input.engineVersion || ENGINE_VERSION;
  const policyVersion = input.policyVersion || POLICY_VERSION;

  const documentHash = computeHash(input.documentText);
  const docTokens = tokenize(input.documentText);

  if (docTokens.length === 0) {
    return {
      documentHash,
      evidenceHash: computeHash(`empty_${documentHash}_${policyVersion}`),
      engineVersion,
      policyVersion,
      overallSimilarity: 0,
      totalSourcesEvaluated: 0,
      verifiedMatches: []
    };
  }

  const evaluatedMatches: EvidenceMatch[] = [];

  for (const candidate of input.candidateMatches) {
    const snippet = candidate.originalSnippet || candidate.title;
    const exactMatch = calculateExactPhraseMatch(input.documentText, snippet);
    const ngramOverlap = calculateNGramOverlap(input.documentText, snippet, 3);

    // Deterministic match percentage formula
    const exactBonus = exactMatch.length > 20 ? 30 : (exactMatch.length > 10 ? 15 : 0);
    const calculatedPercentage = Math.min(100, Math.round((ngramOverlap * 0.7 + exactBonus) * 10) / 10);
    
    // Deterministic relevance score
    const relevanceScore = Math.min(100, Math.round((ngramOverlap * 0.8 + (candidate.doi ? 20 : 10)) * 10) / 10);

    // Provenance state determination
    let provenanceState: ProvenanceState = candidate.provenance.provenanceState || 'PARTIAL';
    if (candidate.doi && calculatedPercentage > 30) {
      provenanceState = 'VERIFIED';
    } else if (calculatedPercentage === 0) {
      provenanceState = 'UNVERIFIED';
    }

    const updatedMatch: EvidenceMatch = {
      ...candidate,
      matchedText: exactMatch.matchedText || (calculatedPercentage > 0 ? snippet.slice(0, 100) : ''),
      matchType: exactMatch.length > 20 ? 'exact' : (calculatedPercentage > 20 ? 'lexical' : 'citation'),
      matchPercentage: calculatedPercentage,
      relevanceScore,
      provenance: {
        ...candidate.provenance,
        provenanceState
      }
    };

    evaluatedMatches.push(updatedMatch);
  }

  // Deduplicate sources
  const uniqueMatches = deduplicateSources(evaluatedMatches);

  // Sort by match percentage descending, then relevance score descending
  uniqueMatches.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
    return b.relevanceScore - a.relevanceScore;
  });

  // Calculate overall document similarity deterministically
  let totalMatchedTokens = 0;
  for (const m of uniqueMatches) {
    if (m.matchPercentage > 10) {
      const matchTokenCount = tokenize(m.matchedText).length;
      totalMatchedTokens += matchTokenCount;
    }
  }

  const overallSimilarity = docTokens.length > 0
    ? Math.min(100, Math.round((totalMatchedTokens / docTokens.length) * 100 * 10) / 10)
    : 0;

  // Compute deterministic evidence hash over canonical source IDs and document hash
  const evidenceKey = uniqueMatches.map(m => m.sourceId).sort().join('|');
  const evidenceHash = computeHash(`${documentHash}:${evidenceKey}:${engineVersion}:${policyVersion}`);

  return {
    documentHash,
    evidenceHash,
    engineVersion,
    policyVersion,
    overallSimilarity,
    totalSourcesEvaluated: input.candidateMatches.length,
    verifiedMatches: uniqueMatches
  };
}
