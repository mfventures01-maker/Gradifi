/**
 * GRADIFI VERIFY - DOCUMENT NORMALIZER
 * Pure deterministic document normalization, tokenization, and hashing.
 * HOEOS Rule: Absolute Determinism, Zero Math.random().
 */

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

import { CanonicalAnalysisDocument, DocumentSourceMetadata, DocumentStats, DocumentOriginType } from './types';

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

