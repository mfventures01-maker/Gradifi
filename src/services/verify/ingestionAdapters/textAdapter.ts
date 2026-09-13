/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION TEXT & MARKDOWN ADAPTER
 * Handles deterministic text & markdown extraction.
 */

import { AdapterExtractionResult } from './pdfAdapter';

export function extractTextAdapter(rawContent: string, format: 'txt' | 'md'): AdapterExtractionResult {
  if (!rawContent || !rawContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: `${format}_text_reader`,
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['File is empty or contains only whitespace.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded file is empty.'
      }
    };
  }

  let text = rawContent.trim();
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (format === 'md') {
    // Strip markdown formatting symbols for canonical text comparison while preserving words
    text = text
      .replace(/^#+\s+/gm, '') // Strip headings markers
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Strip bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // Strip italics
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip links keeping anchor text
      .replace(/`{1,3}[^`]*`{1,3}/g, match => match.replace(/`/g, '')) // Strip inline code backticks
      .trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: `${format}_text_reader`,
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}
