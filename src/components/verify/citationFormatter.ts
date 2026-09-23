/**
 * GRADIFI VERIFY - CITATION FORMATTER
 * Deterministic multi-format academic citation generator.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import { EvidenceMatch } from '../../services/verify/types';

export type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard';

/**
 * Formats an EvidenceMatch into a standardized academic citation string.
 * Deterministic: same match + same format -> identical string.
 */
export function formatCitation(
  match: EvidenceMatch,
  format: CitationFormat
): string {
  if (!match) return '';

  // Extract and sanitize authors
  const rawAuthors = (match.authors && match.authors.length > 0)
    ? match.authors
    : (match.provenance?.authors && match.provenance.authors.length > 0)
      ? match.provenance.authors
      : [];

  const cleanAuthors = rawAuthors
    .map(a => typeof a === 'string' ? a.trim() : '')
    .filter(a => a.length > 0 && !/^unknown author$/i.test(a) && a !== 'Author metadata unavailable');

  const authorsStr = cleanAuthors.length > 0
    ? cleanAuthors.join(', ')
    : 'Author metadata unavailable';

  // Extract year
  const year = match.provenance?.publishedYear;
  const yearStr = (year && !isNaN(year)) ? String(year) : 'n.d.';

  // Extract title
  const title = (match.title || match.provenance?.title || 'Untitled Document').trim();

  // Extract publisher or journal
  const publisher = (match.provenance?.publisher || '').trim();

  // Extract DOI / ISBN
  const rawDoi = (match.doi || match.provenance?.doi || '').trim();
  const cleanDoi = rawDoi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
  const doiUrl = cleanDoi.length > 0 ? (cleanDoi.startsWith('http') ? cleanDoi : `https://doi.org/${cleanDoi}`) : '';

  const rawIsbn = (match.isbn || match.provenance?.isbn || '').trim();

  switch (format) {
    case 'APA': {
      let citation = `${authorsStr}. (${yearStr}). ${title}.`;
      if (publisher) {
        citation += ` ${publisher}.`;
      }
      if (doiUrl) {
        citation += ` ${doiUrl}`;
      } else if (rawIsbn) {
        citation += ` ISBN: ${rawIsbn}.`;
      }
      return citation;
    }

    case 'MLA': {
      let citation = `${authorsStr}. "${title}."`;
      if (publisher) {
        citation += ` ${publisher}, ${yearStr}.`;
      } else {
        citation += ` ${yearStr}.`;
      }
      if (doiUrl) {
        citation += ` ${doiUrl}.`;
      } else if (rawIsbn) {
        citation += ` ISBN: ${rawIsbn}.`;
      }
      return citation;
    }

    case 'Chicago': {
      let citation = `${authorsStr}. "${title}."`;
      if (publisher) {
        citation += ` ${publisher} (${yearStr}).`;
      } else {
        citation += ` (${yearStr}).`;
      }
      if (doiUrl) {
        citation += ` ${doiUrl}.`;
      } else if (rawIsbn) {
        citation += ` ISBN: ${rawIsbn}.`;
      }
      return citation;
    }

    case 'Harvard': {
      let citation = `${authorsStr} (${yearStr}) '${title}'`;
      if (publisher) {
        citation += `, ${publisher}.`;
      } else {
        citation += `.`;
      }
      if (doiUrl) {
        citation += ` Available at: ${doiUrl}.`;
      } else if (rawIsbn) {
        citation += ` ISBN: ${rawIsbn}.`;
      }
      return citation;
    }

    default:
      return `${authorsStr}. (${yearStr}). ${title}.`;
  }
}
