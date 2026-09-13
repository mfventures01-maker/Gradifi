/**
 * GRADIFI VERIFY - RETRIEVED CONTENT VALIDATION SERVICE
 * HOEOS G5.7 Standard: Retrieved Content Validation Boundary.
 * Reuses canonical pdfExtractor engine and canonical document normalization.
 */

import { SourceRetrievalResult, ContentValidationResult, ContentValidationStatus, CanonicalAnalysisDocument } from './types';
import { extractTextFromPdfStream, formatFileSize } from '../../utils/pdfExtractor';
import { buildCanonicalAnalysisDocument } from './documentNormalizer';

export class ContentValidationService {
  /**
   * Validates retrieved raw bytes and converts valid content into a CanonicalAnalysisDocument.
   * HOEOS G5.7 Boundary: Validation & Normalization ONLY (does not promote to verified evidence match).
   */
  validateRetrievedContent(
    retrieval: SourceRetrievalResult,
    options?: { docTitle?: string }
  ): ContentValidationResult {
    const validatedAt = new Date().toISOString();

    if (!retrieval || retrieval.status !== 'SOURCE_RETRIEVED' || !retrieval.contentBuffer) {
      return {
        status: 'CONTENT_VALIDATION_FAILED',
        errorMessage: retrieval?.errorMessage || 'Source retrieval was not successful',
        validatedAt
      };
    }

    const buffer = retrieval.contentBuffer;
    if (buffer.byteLength === 0) {
      return {
        status: 'CONTENT_EMPTY',
        errorMessage: 'Retrieved response body is empty (0 bytes)',
        validatedAt
      };
    }

    // Check magic bytes for PDF format
    const headBytes = new Uint8Array(buffer.slice(0, 10));
    const headStr = String.fromCharCode(...headBytes);
    const isPdfMagic = headStr.startsWith('%PDF');

    if (!isPdfMagic) {
      const isHtml = headStr.toLowerCase().includes('<html') || headStr.toLowerCase().includes('<!doc');
      return {
        status: 'CONTENT_UNSUPPORTED',
        errorMessage: isHtml
          ? 'Retrieved content is a webpage HTML landing page, not a scholarly PDF document'
          : 'Retrieved content does not match binary PDF header format (%PDF-)',
        validatedAt
      };
    }

    // Attempt text extraction via canonical PDF extractor engine
    let extractedText = '';
    try {
      extractedText = extractTextFromPdfStream(buffer);
    } catch (err: any) {
      return {
        status: 'CONTENT_MALFORMED',
        errorMessage: err?.message || 'Failed to parse PDF stream syntax',
        validatedAt
      };
    }

    if (!extractedText || !extractedText.trim()) {
      return {
        status: 'CONTENT_MALFORMED',
        errorMessage: 'PDF document structure contains no extractable text elements',
        validatedAt
      };
    }

    // Normalize via canonical document normalizer
    const title = options?.docTitle || retrieval.sourceUrl || 'Retrieved Unpaywall Document';
    const canonicalDocument: CanonicalAnalysisDocument = buildCanonicalAnalysisDocument({
      rawText: extractedText,
      title
    });

    return {
      status: 'CONTENT_VALID',
      extractedText: canonicalDocument.rawText,
      canonicalDocument,
      documentHash: canonicalDocument.documentId,
      extractionMethod: 'pdf_stream_extractor',
      pageCountEstimate: Math.max(1, Math.ceil(canonicalDocument.stats.characterCount / 2000)),
      validatedAt
    };
  }
}

export const contentValidationService = new ContentValidationService();
