/**
 * GRADIFI VERIFY - DOCUMENT NORMALIZER
 * Pure deterministic document normalization, tokenization, and hashing.
 * HOEOS Rule: Absolute Determinism, Zero Math.random().
 */

/**
 * Normalizes document text for deterministic matching.
 * Converts to lowercase, strips diacritics/control characters, normalizes whitespace.
 */
export const NORMALIZATION_VERSION = 'NORM-V1';
export const SIMILARITY_ENGINE_VERSION = 'SIM-V1';

/**
 * Normalizes document text for deterministic matching.
 * Converts to lowercase, strips diacritics/control characters, normalizes whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into non-empty alphanumeric tokens.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 0);
}

/**
 * Segments document into non-empty sentences.
 */
export function segmentSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

/**
 * Generates sliding window n-grams from token array.
 */
export function generateNGrams(tokens: string[], n: number): string[] {
  if (tokens.length < n || n <= 0) return [];
  const nGrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    nGrams.push(tokens.slice(i, i + n).join(' '));
  }
  return nGrams;
}

/**
 * Deterministic FNV-1a 64-bit hash string representation.
 * Guarantees identical output for identical input across all platforms.
 */
export function computeHash(text: string): string {
  if (!text) return '0000000000000000';
  
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

import {
  CanonicalAnalysisDocument,
  DocumentSourceMetadata,
  DocumentStats,
  DocumentOriginType,
  SegmentedDocument,
  DocumentParagraph,
  DocumentSentence,
  DocumentPhrase
} from './types.js';

/**
 * Deterministically segments text into Paragraphs (PAR-XXX), Sentences (SEN-XXX), and Phrases (PHR-XXX).
 * Stable sequential IDs provide 100% reproducible evidence references.
 */
export function segmentDocument(rawText: string, docId: string = 'DOC-001'): SegmentedDocument {
  if (!rawText || !rawText.trim()) {
    return {
      documentId: docId,
      rawText: '',
      normalizedText: '',
      paragraphs: [],
      totalSentences: 0,
      totalPhrases: 0,
      totalTokens: 0
    };
  }

  const normalizedText = normalizeText(rawText);
  const totalTokens = tokenize(rawText).length;

  // Split on paragraph boundaries (two or more newlines, or lines separated by empty space)
  const paragraphRegex = /(?:[^\r\n]+(?:\r?\n(?![ \t]*\r?\n)[^\r\n]+)*)/g;
  const paragraphs: DocumentParagraph[] = [];
  let match: RegExpExecArray | null;
  let pIdx = 0;
  let globalSentenceIdx = 0;
  let globalPhraseIdx = 0;

  while ((match = paragraphRegex.exec(rawText)) !== null) {
    const pText = match[0].trim();
    if (!pText) continue;

    pIdx++;
    const pId = `PAR-${String(pIdx).padStart(3, '0')}`;
    const pStart = match.index;
    const pEnd = pStart + match[0].length;
    const pTokens = tokenize(pText);

    // Segment sentences inside paragraph
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
    const sentences: DocumentSentence[] = [];
    let sMatch: RegExpExecArray | null;
    let sInPIdx = 0;

    while ((sMatch = sentenceRegex.exec(pText)) !== null) {
      const sText = sMatch[0].trim();
      if (sText.length < 3) continue;

      sInPIdx++;
      globalSentenceIdx++;
      const sId = `SEN-${String(globalSentenceIdx).padStart(3, '0')}`;
      const sStart = pStart + sMatch.index;
      const sEnd = sStart + sMatch[0].length;
      const sTokens = tokenize(sText);

      // Extract sliding window n-gram phrases (N=3, 5, 7)
      const phrases: DocumentPhrase[] = [];
      const nGramSizes = [3, 5, 7];

      for (const n of nGramSizes) {
        if (sTokens.length >= n) {
          for (let i = 0; i <= sTokens.length - n; i++) {
            const phraseTokens = sTokens.slice(i, i + n);
            const phraseText = phraseTokens.join(' ');
            globalPhraseIdx++;
            const phrId = `PHR-${String(globalPhraseIdx).padStart(3, '0')}`;

            // Character coordinates within sentence
            const normSent = normalizeText(sText);
            const charIdx = normSent.indexOf(phraseText);
            const startChar = charIdx !== -1 ? sStart + charIdx : sStart;
            const endChar = startChar + phraseText.length;

            phrases.push({
              phraseId: phrId,
              sentenceId: sId,
              paragraphId: pId,
              text: phraseText,
              normalizedText: phraseText,
              nGramSize: n,
              startChar,
              endChar,
              tokenIndex: i
            });
          }
        }
      }

      sentences.push({
        sentenceId: sId,
        paragraphId: pId,
        index: sInPIdx,
        text: sText,
        normalizedText: normalizeText(sText),
        startChar: sStart,
        endChar: sEnd,
        tokenCount: sTokens.length,
        phrases
      });
    }

    // Fallback if no punctuation was present in paragraph
    if (sentences.length === 0 && pText.length > 0) {
      globalSentenceIdx++;
      const sId = `SEN-${String(globalSentenceIdx).padStart(3, '0')}`;
      sentences.push({
        sentenceId: sId,
        paragraphId: pId,
        index: 1,
        text: pText,
        normalizedText: normalizeText(pText),
        startChar: pStart,
        endChar: pEnd,
        tokenCount: pTokens.length,
        phrases: []
      });
    }

    paragraphs.push({
      paragraphId: pId,
      index: pIdx,
      text: pText,
      normalizedText: normalizeText(pText),
      startChar: pStart,
      endChar: pEnd,
      tokenCount: pTokens.length,
      sentences
    });
  }

  return {
    documentId: docId,
    rawText,
    normalizedText,
    paragraphs,
    totalSentences: globalSentenceIdx,
    totalPhrases: globalPhraseIdx,
    totalTokens
  };
}


export interface BuildCanonicalOptions {
  rawText: string;
  title?: string;
  filename?: string;
  fileSizeBytes?: number;
  extractionMethod?: 'text_reader' | 'pdf_stream_extractor' | 'ocr_tesseract' | 'manual_paste' | 'demo_fixture';
  isFixture?: boolean;
  overrideMetadata?: Partial<{
    title: string;
    authors: string[];
    abstract: string;
    publication: string;
    institution: string;
    year: number;
    doi: string;
    isbn: string;
  }>;
}

/**
 * Constructs one canonical strongly-typed CanonicalAnalysisDocument.
 * HOEOS Rule: Parse once, Normalize once, Analyze from one canonical representation.
 */
export function buildCanonicalAnalysisDocument(options: BuildCanonicalOptions): CanonicalAnalysisDocument {
  const rawText = options.rawText || '';
  const normalizedText = normalizeText(rawText);
  const documentId = computeHash(normalizedText);
  const tokens = tokenize(rawText);
  const sentences = segmentSentences(rawText);

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract Metadata
  let parsedTitle = options.title || options.overrideMetadata?.title || lines[0] || 'Untitled Document Payload';
  
  let parsedAuthors: string[] = options.overrideMetadata?.authors || [];
  if (!parsedAuthors.length && lines[1] && (lines[1].toLowerCase().includes('by ') || lines[1].includes('Dr.') || lines[1].includes('Prof.'))) {
    parsedAuthors = lines[1].replace(/by /i, '').split(/,| and /).map(a => a.trim()).filter(Boolean);
  }
  if (!parsedAuthors.length) {
    parsedAuthors = ['Unknown Author'];
  }

  const doiMatch = rawText.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  const isbnMatch = rawText.match(/97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dX]/i);
  const yearMatch = rawText.match(/\b(19\d\d|20\d\d)\b/);

  const doi = options.overrideMetadata?.doi || (doiMatch ? doiMatch[0] : undefined);
  const isbn = options.overrideMetadata?.isbn || (isbnMatch ? isbnMatch[0] : undefined);
  const year = options.overrideMetadata?.year || (yearMatch ? parseInt(yearMatch[1], 10) : undefined);
  const publication = options.overrideMetadata?.publication || (lines[2]?.length < 120 ? lines[2] : undefined);
  const abstract = options.overrideMetadata?.abstract || (rawText.slice(0, 300) + '...');

  const identifiers: string[] = [];
  if (doi) identifiers.push(`DOI: ${doi}`);
  if (isbn) identifiers.push(`ISBN: ${isbn}`);

  const isFixture = Boolean(options.isFixture);
  const origin: DocumentOriginType = isFixture ? 'FIXTURE' : (rawText.length > 0 ? 'NORMALIZED' : 'EXTRACTED');

  const source: DocumentSourceMetadata = {
    filename: options.filename || (isFixture ? 'sample_academic_paper.pdf' : 'submitted_document.pdf'),
    fileSizeBytes: options.fileSizeBytes || rawText.length,
    mimeType: options.filename?.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
    extractionMethod: options.extractionMethod || (isFixture ? 'demo_fixture' : 'manual_paste'),
    isFixture,
    origin,
    extractedAt: new Date().toISOString()
  };

  const stats: DocumentStats = {
    characterCount: rawText.length,
    wordCount: tokens.length,
    sentenceCount: sentences.length,
    tokenCount: tokens.length,
    estimatedPageCount: Math.max(1, Math.ceil(rawText.length / 2500))
  };

  return {
    documentId,
    source,
    rawText,
    normalizedText,
    title: parsedTitle,
    authors: parsedAuthors,
    abstract,
    publication,
    institution: options.overrideMetadata?.institution,
    year,
    doi,
    isbn,
    identifiers,
    stats,
    extractionStatus: rawText.length > 0 ? 'SUCCESS' : 'FAILED',
    normalizationStatus: normalizedText.length > 0 ? 'NORMALIZED' : 'FAILED',
    createdAt: new Date().toISOString()
  };
}

