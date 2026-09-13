/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION PDF ADAPTER
 * Delegates to certified pdfExtractor.ts without modifying it.
 * Enforces strict OCR-required failure boundary when text extraction yields 0 words.
 */

import { extractDocumentText, MAX_FILE_SIZE_BYTES } from '../../../utils/pdfExtractor';

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

    if (words.length < 5) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: extracted.extractionMethod,
        ocrUsed: extracted.extractionMethod === 'ocr_tesseract',
        ocrStatus: extracted.extractionMethod === 'ocr_tesseract' ? 'FAILED' : 'NOT_AVAILABLE',
        warnings: ['PDF stream contains no extractable text.'],
        error: {
          code: 'TEXT_EXTRACTION_UNAVAILABLE',
          message: 'Text extraction unavailable. OCR required.'
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
      ocrUsed: extracted.extractionMethod === 'ocr_tesseract',
      ocrStatus: extracted.extractionMethod === 'ocr_tesseract' ? 'USED' : 'NOT_REQUIRED',
      warnings: []
    };
  } catch (err: any) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'pdf_stream_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_AVAILABLE',
      warnings: [err?.message || 'PDF extraction failed.'],
      error: {
        code: 'TEXT_EXTRACTION_UNAVAILABLE',
        message: 'Text extraction unavailable. OCR required.'
      }
    };
  }
}
