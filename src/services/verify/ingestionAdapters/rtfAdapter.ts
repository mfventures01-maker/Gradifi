/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION RTF ADAPTER
 * Deterministically strips RTF control syntax and extracts readable text paragraphs.
 */

import { AdapterExtractionResult } from './pdfAdapter';

export function extractRtfAdapter(rtfContent: string): AdapterExtractionResult {
  if (!rtfContent || !rtfContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'rtf_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['RTF document is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded RTF file is empty.'
      }
    };
  }

  try {
    let clean = rtfContent;

    // Convert RTF paragraph break commands to newlines
    clean = clean.replace(/\\par\b/gi, '\n');
    clean = clean.replace(/\\line\b/gi, '\n');

    // Strip RTF font/color/group control words
    clean = clean.replace(/\\(fonttbl|colortbl|stylesheet|info|generator)[\s\S]*?\}/gi, '');

    // Strip RTF control words (\word123 or \word)
    clean = clean.replace(/\\[a-z0-9-]+\b\s?/gi, '');

    // Strip braces
    clean = clean.replace(/[{}]/g, '');

    // Clean lines
    const text = clean
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');

    if (!text.trim()) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: 'rtf_parser',
        ocrUsed: false,
        ocrStatus: 'NOT_REQUIRED',
        warnings: ['RTF document contains no extractable text.'],
        error: {
          code: 'EMPTY_DOCUMENT',
          message: 'The RTF document contains no extractable text.'
        }
      };
    }

    const words = text.split(/\s+/).filter(Boolean);

    return {
      success: true,
      text,
      wordCount: words.length,
      characterCount: text.length,
      pageCount: Math.max(1, Math.ceil(text.length / 2000)),
      extractionMethod: 'rtf_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: []
    };
  } catch (err: any) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'rtf_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: [err?.message || 'Failed to parse RTF document.'],
      error: {
        code: 'MALFORMED_DOCUMENT',
        message: 'Failed to parse RTF document.'
      }
    };
  }
}
