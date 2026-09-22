/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION PDF ADAPTER
 * Delegates to certified pdfExtractor.ts without modifying it.
 * Enforces strict OCR-required failure boundary when text extraction yields 0 words.
 */

import { extractDocumentText, MAX_FILE_SIZE_BYTES, validatePdfExtractedTextQuality } from '../../../utils/pdfExtractor';

export interface AdapterExtractionResult {
  success: boolean;
  text: string;
  wordCount: number;
  characterCount: number;
  pageCount?: number;
  extractionMethod: string;
  ocrUsed: boolean;
  ocrStatus: 'NOT_REQUIRED' | 'NOT_AVAILABLE' | 'USED' | 'FAILED';
  warnings: string[];
  error?: {
    code: string;
    message: string;
  };
}

export async function extractPdfAdapter(
  fileOrBuffer: File | { name: string; buffer: ArrayBuffer }
): Promise<AdapterExtractionResult> {
  const isFileInstance = typeof File !== 'undefined' && fileOrBuffer instanceof File;
  const fileName = isFileInstance ? (fileOrBuffer as File).name : (fileOrBuffer as { name: string }).name;
  const fileSize = isFileInstance ? (fileOrBuffer as File).size : (fileOrBuffer as { buffer: ArrayBuffer }).buffer.byteLength;

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'pdf_stream_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['File size exceeds 15MB limit.'],
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds 15MB limit.'
      }
    };
  }

  try {
    let extractedFile: File;
    if (isFileInstance) {
      extractedFile = fileOrBuffer as File;
    } else {
      const buf = (fileOrBuffer as { buffer: ArrayBuffer }).buffer;
      extractedFile = new File([buf], fileName, { type: 'application/pdf' });
    }

    const extracted = await extractDocumentText(extractedFile);
    const text = extracted.extractedText.trim();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const isOcr = extracted.extractionMethod === 'ocr_tesseract';

    const isValidQuality = isOcr
      ? (words.length >= 1 && text.length >= 10)
      : (words.length >= 5 && validatePdfExtractedTextQuality(text));

    if (!isValidQuality) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: extracted.extractionMethod,
        ocrUsed: isOcr,
        ocrStatus: isOcr ? 'FAILED' : 'NOT_AVAILABLE',
        warnings: ['Text extraction unavailable or failed quality validation.'],
        error: {
          code: 'TEXT_EXTRACTION_UNAVAILABLE',
          message: isOcr
            ? 'OCR extraction failed or yielded insufficient text.'
            : 'Text stream extraction unavailable.'
        }
      };
    }

    return {
      success: true,
      text,
      wordCount: words.length,
      characterCount: text.length,
      pageCount: extracted.pageCountEstimate,
      extractionMethod: extracted.extractionMethod,
      ocrUsed: isOcr,
      ocrStatus: isOcr ? 'USED' : 'NOT_REQUIRED',
      warnings: []
    };
  } catch (err: any) {
    const isOcrError = err?.message?.toLowerCase().includes('ocr') || false;
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: isOcrError ? 'ocr_tesseract' : 'pdf_stream_extractor',
      ocrUsed: isOcrError,
      ocrStatus: isOcrError ? 'FAILED' : 'NOT_AVAILABLE',
      warnings: [err?.message || 'PDF extraction failed.'],
      error: {
        code: 'TEXT_EXTRACTION_UNAVAILABLE',
        message: err?.message || 'Text extraction unavailable.'
      }
    };
  }
}

