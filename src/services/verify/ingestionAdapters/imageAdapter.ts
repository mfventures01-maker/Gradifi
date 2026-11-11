/**
 * GRADIFI VERIFY - IMAGE OCR INGESTION ADAPTER
 * Accepts JPEG/PNG bytes, validates the binary signature, and delegates
 * recognition to the shared Tesseract service.
 */

import { ocrService } from '../../ocrService.js';
import type { AdapterExtractionResult } from './pdfAdapter.js';

const MIN_IMAGE_TEXT_LENGTH = 10;

export async function extractImageAdapter(
  filename: string,
  buffer: ArrayBuffer
): Promise<AdapterExtractionResult> {
  const bytes = new Uint8Array(buffer);
  const isJpeg = bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a;

  if (!isJpeg && !isPng) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'ocr_tesseract',
      ocrUsed: false,
      ocrStatus: 'NOT_AVAILABLE',
      warnings: ['Image signature does not match JPEG or PNG.'],
      error: {
        code: 'INVALID_IMAGE_SIGNATURE',
        message: 'The uploaded image is not a valid JPEG or PNG payload.'
      }
    };
  }

  try {
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
    const result = await ocrService.extractText(
      new Blob([bytes], { type: mimeType })
    );
    const text = result.text.trim();
    const words = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || [];
    const warnings: string[] = [];

    if (result.confidence < 50) {
      warnings.push(`Low OCR confidence: ${result.confidence.toFixed(1)}. Human review required.`);
    } else if (result.confidence < 80) {
      warnings.push(`Moderate OCR confidence: ${result.confidence.toFixed(1)}. Verify extracted fields.`);
    }

    if (text.length < MIN_IMAGE_TEXT_LENGTH || words.length === 0) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: 'ocr_tesseract',
        ocrUsed: true,
        ocrStatus: 'FAILED',
        warnings: [...warnings, 'OCR returned insufficient readable text.'],
        error: {
          code: 'OCR_NO_TEXT',
          message: 'Image OCR did not produce sufficient readable text.'
        }
      };
    }

    return {
      success: true,
      text,
      wordCount: words.length,
      characterCount: text.length,
      extractionMethod: 'ocr_tesseract',
      ocrUsed: true,
      ocrStatus: 'USED',
      warnings
    };
  } catch (error: any) {
    const message = error?.message === 'OCR_TIMEOUT'
      ? 'OCR_TIMEOUT'
      : 'OCR_WORKER_FAILURE';
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'ocr_tesseract',
      ocrUsed: true,
      ocrStatus: 'FAILED',
      warnings: [message],
      error: {
        code: message,
        message: message === 'OCR_TIMEOUT'
          ? 'Image OCR exceeded the configured time limit.'
          : 'Image OCR worker failed.'
      }
    };
  }
}
