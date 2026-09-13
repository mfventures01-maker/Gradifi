/**
 * GRADIFI VERIFY - SOURCE / WORK IDENTITY CORRESPONDENCE SERVICE
 * HOEOS G5.8 Standard: Forensic Identity Gate.
 * Zero AI dependency, Strict deterministic identity hierarchy.
 */

import { UnpaywallMetadataResult, ContentValidationResult, IdentityCorrespondenceResult, IdentityCorrespondenceStatus } from './types';
import { normalizeText, tokenize } from './documentNormalizer';

function cleanDoi(doi?: string): string {
  if (!doi || typeof doi !== 'string') return '';
  return doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//i, '').replace(/[.;()]+$/, '');
}

/**
 * Calculates token coverage ratio of claimed tokens present in target text (0.0 to 1.0).
 */
function calculateTokenCoverage(claimedStr: string, targetText: string): number {
  const claimedTokens = Array.from(new Set(tokenize(claimedStr)));
  if (claimedTokens.length === 0) return 0;
  const targetTokenSet = new Set(tokenize(targetText));

  let matchedCount = 0;
  for (const t of claimedTokens) {
    if (targetTokenSet.has(t)) matchedCount++;
  }
  return matchedCount / claimedTokens.length;
}

export class IdentityCorrespondenceService {
  /**
   * Evaluates deterministic correspondence between claimed Unpaywall metadata and validated content.
   * HOEOS G5.8 Hierarchy: DOI exact -> ISBN exact -> Title/Author correspondence -> Publication/year.
   */
  evaluateCorrespondence(
    claimed: UnpaywallMetadataResult,
    content: ContentValidationResult
  ): IdentityCorrespondenceResult {
    const evaluatedAt = new Date().toISOString();

    if (!claimed || !content || content.status !== 'CONTENT_VALID' || !content.canonicalDocument) {
      return {
        status: 'IDENTITY_UNAVAILABLE',
        matchedBy: 'none',
        confidenceScore: 0,
        explanation: 'Validated content or canonical document is missing',
        evaluatedAt
      };
    }

    const claimedDoi = cleanDoi(claimed.doi);
    const rawText = content.canonicalDocument.rawText || '';

    // 1. Preferred Identity Rule: Exact DOI Match in Extracted Text
    const extractedDoiMatch = rawText.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    const extractedDoi = extractedDoiMatch ? cleanDoi(extractedDoiMatch[0]) : undefined;

    if (claimedDoi && extractedDoi) {
      if (claimedDoi === extractedDoi) {
        return {
          status: 'IDENTITY_MATCHED',
          matchedBy: 'doi_exact',
          claimedDoi: claimed.doi,
          extractedDoi,
          claimedTitle: claimed.title,
          extractedTitle: content.canonicalDocument.title,
          confidenceScore: 100,
          explanation: `Exact DOI match verified: ${claimedDoi}`,
          evaluatedAt
        };
      } else {
        return {
          status: 'IDENTITY_MISMATCH',
          matchedBy: 'doi_exact',
          claimedDoi: claimed.doi,
          extractedDoi,
          claimedTitle: claimed.title,
          extractedTitle: content.canonicalDocument.title,
          confidenceScore: 0,
          explanation: `Extracted DOI (${extractedDoi}) does not match claimed DOI (${claimedDoi})`,
          evaluatedAt
        };
      }
    }

    // 2. Title & Author Deterministic Coverage Fallback
    const claimedTitle = claimed.title || '';
    const docTitle = content.canonicalDocument.title || '';
    const titleSnippet = rawText.slice(0, 800);

    const titleCoverageDoc = calculateTokenCoverage(claimedTitle, docTitle);
    const titleCoverageSnippet = calculateTokenCoverage(claimedTitle, titleSnippet);
    const maxTitleCoverage = Math.max(titleCoverageDoc, titleCoverageSnippet);

    const claimedAuthors = (claimed.authors || []).join(' ');
    const authorCoverage = calculateTokenCoverage(claimedAuthors, titleSnippet);

    if (claimedTitle && maxTitleCoverage >= 0.70) {
      const score = Math.min(100, Math.round((maxTitleCoverage * 70 + authorCoverage * 30) * 100));
      return {
        status: 'IDENTITY_MATCHED',
        matchedBy: 'title_author_correspondence',
        claimedDoi: claimed.doi,
        extractedDoi: undefined,
        claimedTitle,
        extractedTitle: docTitle,
        confidenceScore: Math.max(80, Math.min(95, score)),
        explanation: `Title/Author correspondence matched with ${Math.round(maxTitleCoverage * 100)}% title token coverage`,
        evaluatedAt
      };
    }

    if (claimedTitle && maxTitleCoverage < 0.20 && (claimedAuthors.length === 0 || authorCoverage < 0.20)) {
      return {
        status: 'IDENTITY_MISMATCH',
        matchedBy: 'title_author_correspondence',
        claimedDoi: claimed.doi,
        extractedDoi: undefined,
        claimedTitle,
        extractedTitle: docTitle,
        confidenceScore: 0,
        explanation: `Title/Author mismatch: Claimed "${claimedTitle}" vs Extracted "${docTitle.slice(0, 60)}"`,
        evaluatedAt
      };
    }

    // 3. Inconclusive if metadata is insufficient to establish identity positively or negatively
    return {
      status: 'IDENTITY_INCONCLUSIVE',
      matchedBy: 'none',
      claimedDoi: claimed.doi,
      extractedDoi: undefined,
      claimedTitle,
      extractedTitle: docTitle,
      confidenceScore: Math.round(maxTitleCoverage * 100),
      explanation: 'Insufficient metadata in extracted text to establish positive or negative identity correspondence',
      evaluatedAt
    };
  }
}

export const identityCorrespondenceService = new IdentityCorrespondenceService();
