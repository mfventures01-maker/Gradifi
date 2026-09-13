/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION HTML ADAPTER
 * Deterministically strips tags, script, style, and comments from HTML documents.
 */

import { AdapterExtractionResult } from './pdfAdapter';

export function extractHtmlAdapter(htmlContent: string): AdapterExtractionResult {
  if (!htmlContent || !htmlContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'html_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['HTML document is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded HTML file is empty.'
      }
    };
  }

  try {
    let clean = htmlContent;

    // Remove script and style blocks
    clean = clean.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    clean = clean.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    clean = clean.replace(/<!--[\s\S]*?-->/g, ' ');

    // Convert paragraph/break/header end tags into newlines
    clean = clean.replace(/<\/(p|h[1-6]|li|tr|div|blockquote)>/gi, '\n');
    clean = clean.replace(/<br\s*\/?>/gi, '\n');

    // Strip remaining HTML tags
    clean = clean.replace(/<[^>]+>/g, ' ');

    // Decode standard HTML entities
    clean = clean
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

    // Clean multiple blank lines
    const text = clean
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .join('\n');

    if (!text.trim()) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: 'html_parser',
        ocrUsed: false,
        ocrStatus: 'NOT_REQUIRED',
        warnings: ['HTML file contained no visible body text.'],
        error: {
          code: 'EMPTY_DOCUMENT',
          message: 'The HTML file contained no extractable body text.'
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
      extractionMethod: 'html_parser',
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
      extractionMethod: 'html_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: [err?.message || 'Failed to parse HTML document.'],
      error: {
        code: 'MALFORMED_DOCUMENT',
        message: 'Failed to parse HTML document.'
      }
    };
  }
}
