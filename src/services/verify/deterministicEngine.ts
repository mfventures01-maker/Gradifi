/**
 * GRADIFI VERIFY - DETERMINISTIC EVIDENCE ENGINE
 * Pure mathematical evidence engine.
 * HOEOS Standard: ZERO Math.random(), 100% reproducible multi-tier evidence calculation.
 */

import {
  EvidenceMatch,
  MatchCharacter,
  AttributionStatus,
  ProvenanceState,
  CanonicalAnalysisDocument,
  SimilarityAnalysisResult,
  SimilarityFinding,
  SimilarityMatchMethod,
  DocumentParagraph,
  DocumentSentence,
  DocumentPhrase,
  SegmentedDocument,
  PhraseMatchEvidence,
  PhraseMatchFlag,
  SentenceMatchEvidence,
  SentenceMatchFlag,
  ParagraphMatchEvidence,
  ParagraphMatchFlag,
  SourceSimilarityReport,
  GlobalSimilarityAggregation
} from './types.js';
import {
  normalizeText,
  tokenize,
  segmentSentences,
  generateNGrams,
  computeHash,
  segmentDocument,
  NORMALIZATION_VERSION,
  SIMILARITY_ENGINE_VERSION
} from './documentNormalizer.js';

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
  overallSimilarity: number; // Unique Matched Coverage %
  uniqueMatchedCoverage: number;
  highestSourceMatch: number;
  totalSourcesEvaluated: number;
  verifiedMatches: EvidenceMatch[];
  aggregation: GlobalSimilarityAggregation;
  reportText: string;
}

export const ENGINE_VERSION = 'SIM-V1';
export const POLICY_VERSION = '2026.09-academic-evidence';

/**
 * Calculates exact string / phrase overlap between student text and snippet.
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

  // Also check candidate snippet directly
  if (!bestMatch && normSnippet.length >= 12 && normDoc.includes(normSnippet)) {
    bestMatch = snippetText;
  }

  return { matchedText: bestMatch, length: bestMatch.length };
}

/**
 * Calculates n-gram overlap percentage (Jaccard token overlap index).
 */
export function calculateNGramOverlap(documentText: string, snippetText: string, n: number = 3): number {
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
      if (match.matchPercentage > existing.matchPercentage || (match.provenance.doi && !existing.provenance.doi)) {
        seen.set(canonicalKey, match);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Deterministically detects phrase matches using sliding n-grams (N=3, 5, 7).
 */
export function detectPhraseMatches(
  sentence: DocumentSentence,
  sourceSnippet: string,
  sourceId: string
): PhraseMatchEvidence[] {
  const phraseMatches: PhraseMatchEvidence[] = [];
  const normSource = normalizeText(sourceSnippet);
  if (!normSource) return phraseMatches;

  for (const phrase of sentence.phrases) {
    if (phrase.normalizedText.length < 10) continue;
    if (normSource.includes(phrase.normalizedText)) {
      const srcIdx = normSource.indexOf(phrase.normalizedText);
      const isExactLarge = phrase.nGramSize >= 5;
      const flag: PhraseMatchFlag = isExactLarge
        ? 'EXACT_PHRASE_MATCH'
        : (phrase.nGramSize >= 4 ? 'HIGH_PHRASE_OVERLAP' : 'SIGNIFICANT_PHRASE_OVERLAP');

      phraseMatches.push({
        phraseId: phrase.phraseId,
        sourceId,
        submittedPhrase: phrase.text,
        sourcePhrase: phrase.text,
        normalizedPhrase: phrase.normalizedText,
        documentLocation: {
          startChar: phrase.startChar,
          endChar: phrase.endChar,
          sentenceId: phrase.sentenceId,
          paragraphId: phrase.paragraphId
        },
        sourceLocation: {
          startChar: srcIdx,
          endChar: srcIdx + phrase.normalizedText.length
        },
        tokenCount: phrase.nGramSize,
        characterCount: phrase.text.length,
        matchPercentage: 100,
        flag,
        algorithmVersion: SIMILARITY_ENGINE_VERSION
      });
    }
  }

  return phraseMatches;
}

/**
 * Deterministically evaluates sentence similarity against a source passage.
 */
export function evaluateSentenceMatch(
  sentence: DocumentSentence,
  sourceSnippet: string,
  sourceId: string
): SentenceMatchEvidence {
  const normSent = normalizeText(sentence.text);
  const normSource = normalizeText(sourceSnippet);

  const matchedPhrases = detectPhraseMatches(sentence, sourceSnippet, sourceId);

  if (!normSent || !normSource) {
    return {
      level: 'sentence',
      documentUnitId: sentence.sentenceId,
      paragraphId: sentence.paragraphId,
      sourceId,
      studentText: sentence.text,
      sourceText: sourceSnippet,
      similarityPercentage: 0,
      matchType: 'lexical_overlap',
      algorithmVersion: SIMILARITY_ENGINE_VERSION,
      documentLocation: { startChar: sentence.startChar, endChar: sentence.endChar },
      matchedPhrases: [],
      flag: 'NO_MATCH'
    };
  }

  let similarityPercentage = 0;
  let matchType: 'exact_match' | 'lexical_overlap' | 'ngram_overlap' = 'lexical_overlap';

  // Exact normalized containment
  if (normSource.includes(normSent)) {
    similarityPercentage = 100;
    matchType = 'exact_match';
  } else {
    // N-gram overlap
    const ngram3 = calculateNGramOverlap(sentence.text, sourceSnippet, 3);
    const ngram2 = calculateNGramOverlap(sentence.text, sourceSnippet, 2);

    // Token intersection ratio
    const sentTokens = tokenize(sentence.text);
    const srcTokens = new Set(tokenize(sourceSnippet));
    let commonTokens = 0;
    for (const t of sentTokens) {
      if (srcTokens.has(t)) commonTokens++;
    }
    const lexicalRatio = sentTokens.length > 0 ? (commonTokens / sentTokens.length) * 100 : 0;

    similarityPercentage = Math.min(100, Math.round((ngram3 * 0.5 + ngram2 * 0.2 + lexicalRatio * 0.3) * 10) / 10);
    matchType = ngram3 > 0 ? 'ngram_overlap' : 'lexical_overlap';
  }

  let flag: SentenceMatchFlag = 'NO_MATCH';
  if (similarityPercentage >= 75) {
    flag = 'HIGH_SIMILARITY_SENTENCE';
  } else if (similarityPercentage >= 40) {
    flag = 'MODERATE_SIMILARITY_SENTENCE';
  } else if (similarityPercentage >= 20) {
    flag = 'LOW_SIMILARITY_SENTENCE';
  }

  return {
    level: 'sentence',
    documentUnitId: sentence.sentenceId,
    paragraphId: sentence.paragraphId,
    sourceId,
    studentText: sentence.text,
    sourceText: sourceSnippet,
    similarityPercentage,
    matchType,
    algorithmVersion: SIMILARITY_ENGINE_VERSION,
    documentLocation: { startChar: sentence.startChar, endChar: sentence.endChar },
    matchedPhrases,
    flag
  };
}

/**
 * Deterministically evaluates paragraph similarity mathematically derived from its sentences & phrases.
 */
export function evaluateParagraphMatch(
  paragraph: DocumentParagraph,
  sentenceMatches: SentenceMatchEvidence[],
  phraseMatches: PhraseMatchEvidence[],
  sourceId: string,
  sourcePassage: string
): ParagraphMatchEvidence {
  const pSentMatches = sentenceMatches.filter(
    s => s.paragraphId === paragraph.paragraphId && s.sourceId === sourceId
  );
  const pPhraseMatches = phraseMatches.filter(
    p => p.documentLocation.paragraphId === paragraph.paragraphId && p.sourceId === sourceId
  );

  let coveredTokens = 0;
  let weightedSimilaritySum = 0;

  for (const s of pSentMatches) {
    const sTokens = tokenize(s.studentText).length;
    if (s.similarityPercentage >= 20) {
      coveredTokens += sTokens;
      weightedSimilaritySum += s.similarityPercentage * sTokens;
    }
  }

  const totalTokens = paragraph.tokenCount || 1;
  const coveragePercentage = Math.min(100, Math.round((coveredTokens / totalTokens) * 1000) / 10);
  const similarityPercentage = coveredTokens > 0
    ? Math.min(100, Math.round((weightedSimilaritySum / coveredTokens) * 10) / 10)
    : 0;

  let flag: ParagraphMatchFlag = 'NO_MATCH';
  if (similarityPercentage >= 60) {
    flag = 'HIGH_SIMILARITY_PARAGRAPH';
  } else if (similarityPercentage >= 30) {
    flag = 'MODERATE_SIMILARITY_PARAGRAPH';
  } else if (similarityPercentage >= 10) {
    flag = 'LOW_SIMILARITY_PARAGRAPH';
  }

  return {
    level: 'paragraph',
    documentUnitId: paragraph.paragraphId,
    sourceId,
    submittedParagraph: paragraph.text,
    sourcePassage,
    similarityPercentage,
    coveragePercentage,
    matchedSentences: pSentMatches,
    matchedPhrases: pPhraseMatches,
    flag,
    algorithmVersion: SIMILARITY_ENGINE_VERSION
  };
}

/**
 * Deterministically generates an audit-ready plaintext Plagiarism & Similarity Report.
 */
export function generateDeterministicPlagiarismReport(
  aggregation: GlobalSimilarityAggregation,
  documentTitle: string = 'Submitted Document Payload'
): string {
  const lines: string[] = [
    '================================================================================',
    'GRADIFI SIMILARITY & PLAGIARISM FORENSIC REPORT',
    '================================================================================',
    `Document:             ${documentTitle}`,
    `Document Hash:        ${aggregation.documentHash}`,
    `Engine Version:       ${aggregation.engineVersion}`,
    `Normalization Ver:    ${aggregation.normalizationVersion}`,
    `Evidence Hash:        ${aggregation.evidenceHash}`,
    `Analysis Timestamp:   ${new Date().toISOString()}`,
    '',
    'OVERALL SUMMARY',
    '--------------------------------------------------------------------------------',
    `Unique Matched Coverage:  ${aggregation.totalDocumentOverlap.toFixed(1)}%`,
    `Highest Source Match:     ${aggregation.highestSourceMatch.toFixed(1)}%`,
    `Sources With Matches:     ${aggregation.totalSourceMatches}`,
    `Paragraphs Flagged:       ${aggregation.totalParagraphMatches}`,
    `Sentences Flagged:        ${aggregation.totalSentenceMatches}`,
    `Phrases Flagged:          ${aggregation.totalPhraseMatches}`,
    '',
    'SOURCE BREAKDOWN',
    '--------------------------------------------------------------------------------'
  ];

  if (aggregation.sourceReports.length === 0) {
    lines.push('  No matching academic sources identified.');
  } else {
    for (const src of aggregation.sourceReports) {
      lines.push(`Source: [${src.sourceId}] ${src.title}`);
      if (src.doi) lines.push(`  DOI:                     ${src.doi}`);
      lines.push(`  Document Coverage:       ${src.documentCoverage.toFixed(1)}%`);
      lines.push(`  Aggregate Source Score:  ${src.aggregateSourceScore.toFixed(1)}%`);
      lines.push(`  Highest Sentence Match:  ${src.highestSentenceMatch.toFixed(1)}%`);
      lines.push(`  Highest Phrase Match:    ${src.highestPhraseMatch.toFixed(1)}%`);
      lines.push(`  Paragraph Matches:       ${src.paragraphMatches}`);
      lines.push(`  Sentence Matches:        ${src.sentenceMatches}`);
      lines.push(`  Phrase Matches:          ${src.phraseMatches}`);
      lines.push('');
    }
  }

  lines.push('PARAGRAPH FLAGS');
  lines.push('--------------------------------------------------------------------------------');
  if (aggregation.paragraphFlags.length === 0) {
    lines.push('  No paragraph flags raised.');
  } else {
    for (const p of aggregation.paragraphFlags) {
      lines.push(`Paragraph: ${p.documentUnitId} [Flag: ${p.flag}]`);
      lines.push(`  Similarity: ${p.similarityPercentage.toFixed(1)}% | Coverage: ${p.coveragePercentage.toFixed(1)}%`);
      lines.push(`  Source ID:  ${p.sourceId}`);
      lines.push(`  Evidence:   "${p.submittedParagraph.slice(0, 140)}..."`);
      lines.push('');
    }
  }

  lines.push('SENTENCE FLAGS');
  lines.push('--------------------------------------------------------------------------------');
  if (aggregation.sentenceFlags.length === 0) {
    lines.push('  No sentence flags raised.');
  } else {
    for (const s of aggregation.sentenceFlags) {
      lines.push(`Sentence: ${s.documentUnitId} [Flag: ${s.flag}]`);
      lines.push(`  Similarity: ${s.similarityPercentage.toFixed(1)}% (${s.matchType})`);
      lines.push(`  Source ID:  ${s.sourceId}`);
      lines.push(`  Student:    "${s.studentText}"`);
      lines.push(`  Source:     "${s.sourceText.slice(0, 120)}..."`);
      lines.push('');
    }
  }

  lines.push('PHRASE FLAGS');
  lines.push('--------------------------------------------------------------------------------');
  if (aggregation.phraseFlags.length === 0) {
    lines.push('  No phrase flags raised.');
  } else {
    for (const phr of aggregation.phraseFlags.slice(0, 15)) {
      lines.push(`Phrase: ${phr.phraseId} [Flag: ${phr.flag}]`);
      lines.push(`  Tokens: ${phr.tokenCount} | Similarity: ${phr.matchPercentage}%`);
      lines.push(`  Source ID: ${phr.sourceId}`);
      lines.push(`  Phrase:    "${phr.submittedPhrase}"`);
      lines.push('');
    }
    if (aggregation.phraseFlags.length > 15) {
      lines.push(`  ... and ${aggregation.phraseFlags.length - 15} additional phrase matches.`);
    }
  }

  lines.push('DETERMINISTIC ENGINE');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`Normalization Version: ${aggregation.normalizationVersion}`);
  lines.push(`Similarity Version:    ${aggregation.engineVersion}`);
  lines.push('Matching Method:       Sliding N-Gram + Exact Phrase + Token Jaccard');
  lines.push('Aggregation Method:    Non-Overlapping Unique Document Token Coverage');
  lines.push(`Evidence Hash:         ${aggregation.evidenceHash}`);
  lines.push('================================================================================');

  return lines.join('\n');
}

/**
 * Core deterministic engine: Evaluates candidate matches against submitted document.
 * Adheres strictly to Section 3-13 of HOEOS Forensic Constitution.
 */
export function analyzeDocumentEvidence(input: DeterministicAnalysisInput): DeterministicEngineOutput {
  const engineVersion = input.engineVersion || ENGINE_VERSION;
  const policyVersion = input.policyVersion || POLICY_VERSION;

  const documentHash = computeHash(input.documentText);
  const segmentedDoc = segmentDocument(input.documentText, `DOC-${documentHash.slice(0, 8)}`);
  const docTokens = tokenize(input.documentText);

  // If document has no tokens, return empty deterministic output
  if (docTokens.length === 0) {
    const emptyHash = computeHash(`empty_${documentHash}_${policyVersion}`);
    const emptyAggregation: GlobalSimilarityAggregation = {
      totalDocumentTokens: 0,
      totalUniqueMatchedTokens: 0,
      totalDocumentOverlap: 0,
      highestSourceMatch: 0,
      totalSourceMatches: 0,
      totalParagraphMatches: 0,
      totalSentenceMatches: 0,
      totalPhraseMatches: 0,
      sourceReports: [],
      paragraphFlags: [],
      sentenceFlags: [],
      phraseFlags: [],
      engineVersion,
      normalizationVersion: NORMALIZATION_VERSION,
      evidenceHash: emptyHash,
      documentHash
    };
    return {
      documentHash,
      evidenceHash: emptyHash,
      engineVersion,
      policyVersion,
      overallSimilarity: 0,
      uniqueMatchedCoverage: 0,
      highestSourceMatch: 0,
      totalSourcesEvaluated: 0,
      verifiedMatches: [],
      aggregation: emptyAggregation,
      reportText: generateDeterministicPlagiarismReport(emptyAggregation)
    };
  }

  // Deduplicate incoming candidate sources first
  const deduplicatedMatches = deduplicateSources(input.candidateMatches);

  const allSentenceEvidence: SentenceMatchEvidence[] = [];
  const allPhraseEvidence: PhraseMatchEvidence[] = [];
  const allParagraphEvidence: ParagraphMatchEvidence[] = [];
  const sourceReports: SourceSimilarityReport[] = [];
  const evaluatedMatches: EvidenceMatch[] = [];

  // Track unique matched token indices across ALL sources for Global Non-Overlapping Coverage
  const globalMatchedTokenIndices = new Set<number>();

  for (const candidate of deduplicatedMatches) {
    const candidateSnippet = candidate.matchedText || candidate.originalSnippet || candidate.title;
    if (!candidateSnippet) continue;

    const sourceSentenceMatches: SentenceMatchEvidence[] = [];
    const sourcePhraseMatches: PhraseMatchEvidence[] = [];
    const sourceMatchedTokenIndices = new Set<number>();

    // Compare each sentence in document against this candidate source
    for (const paragraph of segmentedDoc.paragraphs) {
      for (const sentence of paragraph.sentences) {
        const sentenceMatch = evaluateSentenceMatch(sentence, candidateSnippet, candidate.sourceId);
        sourceSentenceMatches.push(sentenceMatch);
        if (sentenceMatch.flag !== 'NO_MATCH') {
          allSentenceEvidence.push(sentenceMatch);
        }

        const phrases = detectPhraseMatches(sentence, candidateSnippet, candidate.sourceId);
        sourcePhraseMatches.push(...phrases);
        allPhraseEvidence.push(...phrases);

        // Track token coverage for this sentence if matched
        if (sentenceMatch.similarityPercentage >= 20) {
          const sentTokens = tokenize(sentence.text);
          const docTokenOffset = tokenize(input.documentText.slice(0, sentence.startChar)).length;
          for (let i = 0; i < sentTokens.length; i++) {
            const tokenIdx = docTokenOffset + i;
            if (tokenIdx < docTokens.length) {
              sourceMatchedTokenIndices.add(tokenIdx);
              globalMatchedTokenIndices.add(tokenIdx);
            }
          }
        }
      }

      // Paragraph level comparison for this source
      const paragraphMatch = evaluateParagraphMatch(
        paragraph,
        sourceSentenceMatches,
        sourcePhraseMatches,
        candidate.sourceId,
        candidateSnippet
      );
      if (paragraphMatch.flag !== 'NO_MATCH') {
        allParagraphEvidence.push(paragraphMatch);
      }
    }

    // Source-level metrics
    const highestSentenceMatch = sourceSentenceMatches.length > 0
      ? Math.max(...sourceSentenceMatches.map(s => s.similarityPercentage))
      : 0;

    const highestPhraseMatch = sourcePhraseMatches.length > 0
      ? Math.max(...sourcePhraseMatches.map(p => p.matchPercentage))
      : 0;

    const sourceCoverage = docTokens.length > 0
      ? Math.min(100, Math.round((sourceMatchedTokenIndices.size / docTokens.length) * 1000) / 10)
      : 0;

    const paragraphMatchesCount = segmentedDoc.paragraphs.filter(p => {
      const pm = evaluateParagraphMatch(p, sourceSentenceMatches, sourcePhraseMatches, candidate.sourceId, candidateSnippet);
      return pm.flag !== 'NO_MATCH';
    }).length;

    const sentenceMatchesCount = sourceSentenceMatches.filter(s => s.flag !== 'NO_MATCH').length;
    const phraseMatchesCount = sourcePhraseMatches.length;

    // Deterministic aggregate source score
    const aggregateSourceScore = Math.min(
      100,
      Math.round((sourceCoverage * 0.4 + highestSentenceMatch * 0.6) * 10) / 10
    );

    // Provenance State determination
    let provenanceState: ProvenanceState = candidate.provenance.provenanceState || 'PARTIAL';
    if (candidate.doi && (sourceCoverage > 20 || highestSentenceMatch > 50)) {
      provenanceState = 'VERIFIED';
    } else if (sourceCoverage === 0 && highestSentenceMatch === 0) {
      provenanceState = 'UNVERIFIED';
    }

    // Reconstruct EvidenceMatch with derived deterministic values
    const exactMatch = calculateExactPhraseMatch(input.documentText, candidateSnippet);
    const ngramOverlap = calculateNGramOverlap(input.documentText, candidateSnippet, 3) / 100;
    const relevanceScore = Math.min(100, Math.round((sourceCoverage * 0.5 + highestSentenceMatch * 0.5) * 10) / 10);

    // Deterministic match classification.
    // EXACT       — byte-for-byte identical token sequence.
    // NEAR_EXACT  — token overlap >= 90% with same ordering.
    // STRUCTURAL  — same syntactic shape, < 90% token overlap.
    // SEMANTIC    — below structural threshold; retained for AI advisory only.
    let matchCharacter: MatchCharacter;
    if (exactMatch.length > 0 && exactMatch.length === candidateSnippet.length) {
      matchCharacter = 'EXACT';
    } else if (ngramOverlap >= 0.9) {
      matchCharacter = 'NEAR_EXACT';
    } else if (ngramOverlap >= 0.5) {
      matchCharacter = 'STRUCTURAL';
    } else {
      matchCharacter = 'SEMANTIC';
    }

    const updatedMatch: EvidenceMatch = {
      ...candidate,
      matchedText: exactMatch.matchedText || '',
      matchType: exactMatch.length > 20 ? 'exact' : (aggregateSourceScore > 20 ? 'lexical' : 'citation'),
      matchCharacter,
      matchPercentage: aggregateSourceScore,
      relevanceScore,
      provenance: {
        ...candidate.provenance,
        provenanceState
      }
    };

    evaluatedMatches.push(updatedMatch);

    if (aggregateSourceScore > 0 || sourceCoverage > 0 || highestSentenceMatch >= 20) {
      sourceReports.push({
        sourceId: candidate.sourceId,
        title: candidate.title,
        authors: candidate.authors,
        url: candidate.url,
        doi: candidate.doi,
        documentCoverage: sourceCoverage,
        paragraphMatches: paragraphMatchesCount,
        sentenceMatches: sentenceMatchesCount,
        phraseMatches: phraseMatchesCount,
        highestSentenceMatch,
        highestPhraseMatch,
        aggregateSourceScore,
        paragraphEvidence: allParagraphEvidence.filter(p => p.sourceId === candidate.sourceId),
        sentenceEvidence: sourceSentenceMatches.filter(s => s.flag !== 'NO_MATCH'),
        phraseEvidence: sourcePhraseMatches
      });
    }
  }

  // Sort source reports descending by aggregateSourceScore
  sourceReports.sort((a, b) => b.aggregateSourceScore - a.aggregateSourceScore);

  // Global Non-Overlapping Coverage: Unique matched tokens across ALL sources
  const totalUniqueMatchedTokens = globalMatchedTokenIndices.size;
  const totalDocumentTokens = docTokens.length;
  const uniqueMatchedCoverage = totalDocumentTokens > 0
    ? Math.min(100, Math.round((totalUniqueMatchedTokens / totalDocumentTokens) * 1000) / 10)
    : 0;

  const highestSourceMatch = sourceReports.length > 0
    ? Math.max(...sourceReports.map(s => s.aggregateSourceScore))
    : 0;

  // Filter and deduplicate flags
  const paragraphFlags = allParagraphEvidence
    .filter(p => p.flag !== 'NO_MATCH')
    .sort((a, b) => b.similarityPercentage - a.similarityPercentage);

  const sentenceFlags = allSentenceEvidence
    .filter(s => s.flag !== 'NO_MATCH')
    .sort((a, b) => b.similarityPercentage - a.similarityPercentage);

  const phraseFlags = allPhraseEvidence
    .sort((a, b) => b.tokenCount - a.tokenCount);

  // Compute deterministic evidence hash over sorted sources, unique matched tokens, and versions
  const sourceKeysSorted = sourceReports.map(s => `${s.sourceId}:${s.documentCoverage.toFixed(1)}`).sort().join('|');
  const evidenceHash = computeHash(`${documentHash}:${sourceKeysSorted}:${totalUniqueMatchedTokens}:${engineVersion}:${policyVersion}`);

  // Build Global Similarity Aggregation
  const aggregation: GlobalSimilarityAggregation = {
    totalDocumentTokens,
    totalUniqueMatchedTokens,
    totalDocumentOverlap: uniqueMatchedCoverage,
    highestSourceMatch,
    totalSourceMatches: sourceReports.length,
    totalParagraphMatches: new Set(paragraphFlags.map(p => p.documentUnitId)).size,
    totalSentenceMatches: new Set(sentenceFlags.map(s => s.documentUnitId)).size,
    totalPhraseMatches: phraseFlags.length,
    sourceReports,
    paragraphFlags,
    sentenceFlags,
    phraseFlags,
    engineVersion,
    normalizationVersion: NORMALIZATION_VERSION,
    evidenceHash,
    documentHash
  };

  const reportText = generateDeterministicPlagiarismReport(aggregation);

  // Sort evaluated matches by matchPercentage descending
  evaluatedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return {
    documentHash,
    evidenceHash,
    engineVersion,
    policyVersion,
    overallSimilarity: uniqueMatchedCoverage,
    uniqueMatchedCoverage,
    highestSourceMatch,
    totalSourcesEvaluated: input.candidateMatches.length,
    verifiedMatches: evaluatedMatches,
    aggregation,
    reportText
  };
}

/**
 * Evaluates deterministic similarity between two canonical documents directly.
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

  // Treat comparison document as candidate source
  const candidateMatch: EvidenceMatch = {
    sourceId: comparisonDoc.documentId,
    title: comparisonDoc.title || 'Comparison Document',
    authors: comparisonDoc.authors || ['Unknown Author'],
    url: '',
    matchedText: compText,
    originalSnippet: compText,
    matchType: 'exact',
    matchPercentage: 0,
    relevanceScore: 0,
    provenance: {
      provider: 'openalex',
      providerRecordId: comparisonDoc.documentId,
      retrievedAt: new Date().toISOString(),
      sourceType: 'document',
      sourceUrl: '',
      title: comparisonDoc.title,
      authors: comparisonDoc.authors,
      provenanceState: 'VERIFIED'
    }
  };

  const engineOutput = analyzeDocumentEvidence({
    documentText: sourceText,
    candidateMatches: [candidateMatch],
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION
  });

  // Convert sentence & phrase flags into explainable SimilarityFinding items
  for (const s of engineOutput.aggregation.sentenceFlags) {
    const findingId = computeHash(`${sourceDoc.documentId}:${comparisonDoc.documentId}:SEN:${s.documentUnitId}:${s.similarityPercentage}`);
    findings.push({
      findingId,
      sourceDocumentId: sourceDoc.documentId,
      matchedDocumentId: comparisonDoc.documentId,
      sourceSegment: s.studentText,
      matchedSegment: s.sourceText.slice(0, 200),
      similarityScore: s.similarityPercentage,
      matchMethod: s.matchType === 'exact_match' ? 'EXACT_PHRASE' : (s.matchType === 'ngram_overlap' ? 'NGRAM' : 'TOKEN_OVERLAP'),
      sourceStart: s.documentLocation.startChar,
      sourceEnd: s.documentLocation.endChar,
      provenance: 'DETERMINISTIC'
    });
  }

  findings.sort((a, b) => {
    if ((a.sourceStart ?? 0) !== (b.sourceStart ?? 0)) return (a.sourceStart ?? 0) - (b.sourceStart ?? 0);
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
    return a.findingId.localeCompare(b.findingId);
  });

  return {
    analysisType: 'DETERMINISTIC_SIMILARITY',
    sourceDocumentId: sourceDoc.documentId,
    matchedDocumentId: comparisonDoc.documentId,
    overallSimilarity: engineOutput.overallSimilarity,
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
  matches: EvidenceMatch[],
  aggregation?: GlobalSimilarityAggregation
): SimilarityFinding[] {
  const findings: SimilarityFinding[] = [];

  // If aggregation has sentence flags, prioritize them for complete structural traceability
  if (aggregation && aggregation.sentenceFlags.length > 0) {
    for (const s of aggregation.sentenceFlags) {
      const matchMethod: SimilarityMatchMethod = s.matchType === 'exact_match'
        ? 'EXACT_PHRASE'
        : (s.matchType === 'ngram_overlap' ? 'NGRAM' : 'TOKEN_OVERLAP');

      const findingId = computeHash(
        `${documentHash}:${s.sourceId}:${s.documentUnitId}:${s.similarityPercentage}`
      );

      findings.push({
        findingId,
        sourceDocumentId: documentHash,
        matchedDocumentId: s.sourceId,
        sourceSegment: s.studentText,
        matchedSegment: s.sourceText.slice(0, 200),
        similarityScore: s.similarityPercentage,
        matchMethod,
        sourceStart: s.documentLocation.startChar,
        sourceEnd: s.documentLocation.endChar,
        provenance: 'DETERMINISTIC'
      });
    }

    findings.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
      return a.findingId.localeCompare(b.findingId);
    });

    return findings;
  }

  // Fallback extraction from raw matches
  for (const match of matches) {
    if (match.matchPercentage <= 0) continue;

    const lookupSnippet = match.matchedText || match.originalSnippet || match.title;
    if (!lookupSnippet) continue;

    const normDoc = normalizeText(documentText);
    const normSnippet = normalizeText(lookupSnippet);
    if (!normSnippet) continue;

    let srcIdx = normDoc.indexOf(normSnippet);
    let matchedPassageText = lookupSnippet;
    let sourceSegmentText = '';
    let matchMethod: SimilarityMatchMethod = 'TOKEN_OVERLAP';

    if (srcIdx !== -1) {
      sourceSegmentText = lookupSnippet;
      if (match.matchType === 'exact' || (normSnippet.length >= 12 && normDoc.includes(normSnippet))) {
        matchMethod = 'EXACT_PHRASE';
      } else {
        matchMethod = 'NGRAM';
      }
    } else {
      const sentences = segmentSentences(lookupSnippet);
      for (const sent of sentences) {
        const normSent = normalizeText(sent);
        if (normSent.length >= 12) {
          const idx = normDoc.indexOf(normSent);
          if (idx !== -1) {
            srcIdx = idx;
            matchedPassageText = sent;
            sourceSegmentText = sent;
            matchMethod = 'NGRAM';
            break;
          }
        }
      }
    }

    if (srcIdx === -1) {
      findings.push({
        findingId: computeHash(`${documentHash}:${match.sourceId}:LEXICAL:${match.matchPercentage}`),
        sourceDocumentId: documentHash,
        matchedDocumentId: match.sourceId,
        sourceSegment: (match.originalSnippet || lookupSnippet).slice(0, 200),
        matchedSegment: '',
        similarityScore: match.matchPercentage,
        matchMethod: 'TOKEN_OVERLAP',
        sourceStart: undefined,
        sourceEnd: undefined,
        provenance: 'DETERMINISTIC'
      });
      continue;
    }

    const findingId = computeHash(
      `${documentHash}:${match.sourceId}:${matchMethod}:${match.matchPercentage}:${lookupSnippet.slice(0, 20)}`
    );

    findings.push({
      findingId,
      sourceDocumentId: documentHash,
      matchedDocumentId: match.sourceId,
      sourceSegment: sourceSegmentText || matchedPassageText,
      matchedSegment: lookupSnippet.slice(0, 150),
      similarityScore: match.matchPercentage,
      matchMethod,
      sourceStart: srcIdx,
      sourceEnd: srcIdx + lookupSnippet.length,
      provenance: 'DETERMINISTIC'
    });
  }

  findings.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
    return a.findingId.localeCompare(b.findingId);
  });

  return findings;
}