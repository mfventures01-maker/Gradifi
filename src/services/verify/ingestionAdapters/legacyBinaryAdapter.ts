/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION LEGACY BINARY ADAPTER
 * Handles legacy binary Office formats (.doc, .ppt, .xls).
 * Truthfully returns UNSUPPORTED_FORMAT for binary OLE2 structures requiring DOCX/PPTX/XLSX conversion.
 */

import { AdapterExtractionResult } from './pdfAdapter';

export function extractLegacyBinaryAdapter(format: 'doc' | 'ppt' | 'xls', filename: string): AdapterExtractionResult {
  const targetExt = format === 'doc' ? 'DOCX' : (format === 'ppt' ? 'PPTX' : 'XLSX');

  return {
    success: false,
    text: '',
    wordCount: 0,
    characterCount: 0,
    extractionMethod: `legacy_${format}_adapter`,
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: [`Legacy binary .${format} format requires conversion to .${targetExt.toLowerCase()}.`],
    error: {
      code: 'UNSUPPORTED_FORMAT',
      message: `Legacy binary .${format} format is not directly supported. Please convert ${filename} to .${targetExt.toLowerCase()} or PDF.`
    }
  };
}
