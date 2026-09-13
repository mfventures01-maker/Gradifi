/**
 * GRADIFI VERIFY - SOURCE / DOI / ISBN / CITATION PRESENTATION SERVICE
 * HOEOS P5 Standard: Public Attribution, Provenance Transparency, Zero Metadata Fabrication.
 *
 * Semantic Rules:
 * 1. P5 is pure PRESENTATION ONLY. Consumes P1 PublicVerificationResult and P4 MatchedEvidenceSpan.
 * 2. Primary join key is strictly sourceId. Never re-matches text or infers missing source linkage.
 * 3. Metadata fields (DOI, ISBN, Authors) render ONLY when present in the authoritative public contract.
 *    Absent fields return explicit, truthful unavailable states ("DOI unavailable", "ISBN unavailable").
 * 4. Google Books is labeled strictly "Book source" / "Bibliographic source" (never plagiarism authority).
 * 5. All formatting and citation outputs are 100% deterministic (zero Math.random, Date.now, or UUIDs).
 */

import { PublicVerificationResult, PublicAcademicSource, PublicBookSource, PublicCitation, generateCitations } from './publicVerificationResult';
import { MatchedEvidenceSpan } from './matchedTextHighlightingService';

export interface FormattedSourcePresentation {
  sourceId: string;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  journal?: string;
  doi?: string;
  doiUrl?: string;
  isbn?: string;
  isbnFormatted?: string;
  sourceType: 'academic' | 'book' | string;
  sourceTypeLabel: string;
  matchedPercentage: number;
  citation: PublicCitation;
  hasDoi: boolean;
  hasIsbn: boolean;
  hasAuthors: boolean;
  doiDisplay: string;
  isbnDisplay: string;
  authorDisplay: string;
}

/**
 * Validates and formats a DOI string into a navigable HTTPS URL.
 * Returns null if DOI is missing, empty, or invalid.
 */
export function formatDoiUrl(doi?: string): string | null {
  if (!doi || typeof doi !== 'string') return null;
  const cleanDoi = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  if (!cleanDoi || !cleanDoi.startsWith('10.')) return null;
  return `https://doi.org/${cleanDoi}`;
}

/**
 * Validates and formats an ISBN string (ISBN-10 or ISBN-13).
 * Returns clean formatted ISBN if valid, or null if missing/invalid.
 */
export function formatIsbnDisplay(isbn?: string): string | null {
  if (!isbn || typeof isbn !== 'string') return null;
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
    return cleanIsbn;
  }
  return null;
}

/**
 * Deterministically sorts sources by sourceId ASC to guarantee identical ordering.
 */
export function sortSourcesDeterministically<T extends { sourceId: string }>(sources: T[]): T[] {
  return [...sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/**
 * Formats academic sources and book sources from a PublicVerificationResult into FormattedSourcePresentation objects.
 */
export function buildSourcePresentationModel(publicResult: PublicVerificationResult): FormattedSourcePresentation[] {
  if (!publicResult) return [];

  const presentations: FormattedSourcePresentation[] = [];
  const citationMap = new Map<string, PublicCitation>();
  for (const c of publicResult.citations || []) {
    citationMap.set(c.sourceId, c);
  }

  // 1. Process Academic Sources
  for (const academic of publicResult.academicSources || []) {
    const doiUrl = formatDoiUrl(academic.doi);
    const validDoi = doiUrl ? academic.doi?.trim() : undefined;
    const hasAuthors = academic.authors && academic.authors.length > 0 && !academic.authors.includes('Author metadata unavailable');
    
    const citation = citationMap.get(academic.sourceId) || generateCitations(
      academic.sourceId,
      academic.title,
      academic.authors,
      academic.year,
      academic.publisher || academic.journal,
      validDoi
    );

    presentations.push({
      sourceId: academic.sourceId,
      title: academic.title || 'Untitled Academic Source',
      authors: academic.authors || ['Author metadata unavailable'],
      year: academic.year,
      publisher: academic.publisher,
      journal: academic.journal,
      doi: validDoi,
      doiUrl: doiUrl || undefined,
      sourceType: 'academic',
      sourceTypeLabel: 'Academic Source',
      matchedPercentage: academic.matchedPercentage || 0,
      citation,
      hasDoi: !!doiUrl,
      hasIsbn: false,
      hasAuthors,
      doiDisplay: validDoi ? `DOI: ${validDoi}` : 'DOI unavailable',
      isbnDisplay: 'ISBN unavailable',
      authorDisplay: hasAuthors ? academic.authors.join(', ') : 'Author metadata unavailable'
    });
  }

  // 2. Process Book Sources
  for (const book of publicResult.bookSources || []) {
    const rawIsbn = book.isbn13 || book.isbn10;
    const cleanIsbn = formatIsbnDisplay(rawIsbn);
    const hasAuthors = book.authors && book.authors.length > 0 && !book.authors.includes('Author metadata unavailable');

    const citation = citationMap.get(book.sourceId) || generateCitations(
      book.sourceId,
      book.title,
      book.authors,
      book.year,
      book.publisher
    );

    presentations.push({
      sourceId: book.sourceId,
      title: book.title || 'Untitled Book Source',
      authors: book.authors || ['Author metadata unavailable'],
      year: book.year,
      publisher: book.publisher,
      isbn: cleanIsbn || undefined,
      isbnFormatted: cleanIsbn ? (cleanIsbn.length === 13 ? `ISBN-13: ${cleanIsbn}` : `ISBN-10: ${cleanIsbn}`) : undefined,
      sourceType: 'book',
      sourceTypeLabel: 'Book Source (Bibliographic)',
      matchedPercentage: book.matchedPercentage || 0,
      citation,
      hasDoi: false,
      hasIsbn: !!cleanIsbn,
      hasAuthors,
      doiDisplay: 'DOI unavailable',
      isbnDisplay: cleanIsbn ? `ISBN: ${cleanIsbn}` : 'ISBN unavailable',
      authorDisplay: hasAuthors ? book.authors.join(', ') : 'Author metadata unavailable'
    });
  }

  return sortSourcesDeterministically(presentations);
}

/**
 * Filter evidence spans associated with a specific sourceId.
 */
export function getSpansForSource(spans: MatchedEvidenceSpan[], sourceId: string): MatchedEvidenceSpan[] {
  if (!spans || !sourceId) return [];
  return spans.filter(s => s.sourceId === sourceId);
}
