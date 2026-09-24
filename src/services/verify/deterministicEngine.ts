/**
 * GRADIFI VERIFY - DETERMINISTIC EVIDENCE ENGINE
 * Pure mathematical evidence engine.
 * HOEOS Standard: ZERO Math.random(). Reproducible evidence calculation.
 */

import { EvidenceMatch, ProvenanceState, CanonicalAnalysisDocument, SimilarityAnalysisResult, SimilarityFinding, SimilarityMatchMethod } from './types';
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
      matchedText: exactMatch.matchedText || '',
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

/**
 * Evaluates deterministic similarity between two canonical documents.
 * Produces explainable, evidence-backed SimilarityFinding items.
 * HOEOS G2 Standard: ZERO AI dependency, ZERO Math.random(), 100% reproducible.
 */
export function evaluateDocumentSimilarity(
  sourceDoc: CanonicalAnalysisDocument,
  comparisonDoc: CanonicalAnalysisDocument
): SimilarityAnalysisResult {
  const sourceText = sourceDoc.rawText || '';
  const compText = comparisonDoc.rawText || '';
  const findings: SimilarityFinding[] = [];
  const warnings: string[] = [];

  if (!sourceText.trim() || !compText.trim()) {
    return {
      analysisType: 'DETERMINISTIC_SIMILARITY',
      sourceDocumentId: sourceDoc.documentId,
      matchedDocumentId: comparisonDoc.documentId,
      overallSimilarity: 0,
      findings: [],
      engineVersion: ENGINE_VERSION,
      policyVersion: POLICY_VERSION,
      deterministic: true,
      warnings: ['One or both input documents are empty']
    };
  }

  const compSentences = segmentSentences(compText);
  const matchedSourceIndices = new Set<number>();

  // 1. Exact Phrase Matching Strategy
  for (const sentence of compSentences) {
    if (sentence.length < 12) continue;
    const sourceIdx = sourceText.indexOf(sentence);
    const compIdx = compText.indexOf(sentence);

    if (sourceIdx !== -1 && compIdx !== -1) {
      const sourceStart = sourceIdx;
      const sourceEnd = sourceIdx + sentence.length;
      const matchedStart = compIdx;
      const matchedEnd = compIdx + sentence.length;

      // Deterministic finding identity
      const findingId = computeHash(`${sourceDoc.documentId}:${comparisonDoc.documentId}:EXACT:${sourceStart}:${sentence.slice(0, 30)}`);

      findings.push({
        findingId,
        sourceDocumentId: sourceDoc.documentId,
        matchedDocumentId: comparisonDoc.documentId,
        sourceSegment: sentence,
        matchedSegment: sentence,
        similarityScore: 100,
        matchMethod: 'EXACT_PHRASE',
        sourceStart,
        sourceEnd,
        matchedStart,
        matchedEnd,
        provenance: 'DETERMINISTIC'
      });

      matchedSourceIndices.add(sourceIdx);
    }
  }

  // 2. Sliding N-Gram Phrase Matching Strategy (n=4 tokens)
  const sourceTokens = tokenize(sourceText);
  const compTokens = tokenize(compText);
  const sourceNGrams = generateNGrams(sourceTokens, 4);
  const compNGramsSet = new Set(generateNGrams(compTokens, 4));

  const seenNGramPhrases = new Set<string>();

  for (const ngram of sourceNGrams) {
    if (compNGramsSet.has(ngram) && !seenNGramPhrases.has(ngram)) {
      seenNGramPhrases.add(ngram);
      
      // Verify exact presence in raw text
      const srcMatchIdx = sourceText.toLowerCase().indexOf(ngram);
      const compMatchIdx = compText.toLowerCase().indexOf(ngram);

      if (srcMatchIdx !== -1 && compMatchIdx !== -1) {
        const sourceSegment = sourceText.slice(srcMatchIdx, srcMatchIdx + ngram.length);
        const matchedSegment = compText.slice(compMatchIdx, compMatchIdx + ngram.length);

        // Skip if already covered by exact phrase finding
        const isCovered = findings.some(f => f.matchMethod === 'EXACT_PHRASE' && f.sourceSegment.toLowerCase().includes(ngram));
        if (!isCovered) {
          const findingId = computeHash(`${sourceDoc.documentId}:${comparisonDoc.documentId}:NGRAM:${srcMatchIdx}:${ngram}`);
          
          findings.push({
            findingId,
            sourceDocumentId: sourceDoc.documentId,
            matchedDocumentId: comparisonDoc.documentId,
            sourceSegment: sourceSegment || ngram,
            matchedSegment: matchedSegment || ngram,
            similarityScore: Math.min(100, Math.round(calculateNGramOverlap(sourceText, compText, 3))),
            matchMethod: 'NGRAM',
            sourceStart: srcMatchIdx,
            sourceEnd: srcMatchIdx + ngram.length,
            matchedStart: compMatchIdx,
            matchedEnd: compMatchIdx + ngram.length,
            provenance: 'DETERMINISTIC'
          });
        }
      }
    }
  }

  // Sort findings deterministically by sourceStart ascending, then similarityScore descending, then findingId ascending
  findings.sort((a, b) => {
    if ((a.sourceStart ?? 0) !== (b.sourceStart ?? 0)) return (a.sourceStart ?? 0) - (b.sourceStart ?? 0);
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
    return a.findingId.localeCompare(b.findingId);
  });

  // Calculate overall similarity score using token overlap ratio
  const docNGramOverlap = calculateNGramOverlap(sourceText, compText, 3);
  const exactMatchBonus = findings.some(f => f.matchMethod === 'EXACT_PHRASE') ? 20 : 0;
  const overallSimilarity = Math.min(100, Math.round((docNGramOverlap * 0.8 + exactMatchBonus) * 10) / 10);

  return {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: sourceDoc.documentId,
    matchedDocumentId: comparisonDoc.documentId,
    overallSimilarity,
    findings,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    deterministic: true,
    warnings
  };
}

/**
 * Extracts explainable SimilarityFinding items from evaluated candidate evidence matches.
 */
export function extractSimilarityFindingsFromEvidenceMatches(
  documentText: string,
  documentHash: string,
  matches: EvidenceMatch[]
): SimilarityFinding[] {
  const findings: SimilarityFinding[] = [];

  for (const match of matches) {
    if (match.matchPercentage <= 0) continue;
    // Prefer the student-side passage if the federation layer provided one.
    // Fall back to the source-side snippet only for lookup purposes; it is
    // never used as `sourceSegment`.
    const lookupSnippet = match.matchedText || match.originalSnippet || match.title;
    if (!lookupSnippet) continue;

    const normDoc = normalizeText(documentText);
    const normSnippet = normalizeText(lookupSnippet);
    if (!normSnippet) continue;

    const srcIdx = normDoc.indexOf(normSnippet);

    // Only emit a finding if the student's document actually contains the
    // matched snippet. Otherwise the marker layer cannot render it and the
    // correction panel would reference text the student never wrote.
    if (srcIdx === -1) continue;

    let matchMethod: SimilarityMatchMethod = 'TOKEN_OVERLAP';
    if (
      match.matchType === 'exact' ||
      (normSnippet.length >= 12 && normDoc.includes(normSnippet))
    ) {
      matchMethod = 'EXACT_PHRASE';
    } else if (
      match.matchType === 'lexical' ||
      calculateNGramOverlap(documentText, lookupSnippet, 3) > 20
    ) {
      matchMethod = 'NGRAM';
    }

    const findingId = computeHash(
      `${documentHash}:${match.sourceId}:${matchMethod}:${match.matchPercentage}:${lookupSnippet.slice(0, 20)}`
    );

    findings.push({
      findingId,
      sourceDocumentId: documentHash,
      matchedDocumentId: match.sourceId,
      sourceSegment: documentText.slice(srcIdx, srcIdx + lookupSnippet.length),
      matchedSegment: lookupSnippet.slice(0, 150),
      similarityScore: match.matchPercentage,
      matchMethod,
      sourceStart: srcIdx,
      sourceEnd: srcIdx + lookupSnippet.length,
      provenance: 'DETERMINISTIC'
    });
  }

  // Sort findings deterministically
  findings.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
    return a.findingId.localeCompare(b.findingId);
  });

  return findings;
}

