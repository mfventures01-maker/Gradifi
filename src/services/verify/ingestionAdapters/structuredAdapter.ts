/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION STRUCTURED DATA ADAPTER
 * Handles CSV, JSON, and XML documents with strict security & deterministic ordering.
 */

import { AdapterExtractionResult } from './pdfAdapter';

export function extractCsvAdapter(csvContent: string): AdapterExtractionResult {
  if (!csvContent || !csvContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'csv_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['CSV file is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded CSV file is empty.'
      }
    };
  }

  // Parse CSV lines preserving quotes
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rowsText: string[] = [];

  for (const line of lines) {
    // Split columns handling simple quotes
    const cells = line
      .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
      .map(c => c.replace(/^"|"$/g, '').trim())
      .filter(Boolean);

    if (cells.length > 0) {
      rowsText.push(cells.join(' '));
    }
  }

  const text = rowsText.join('\n');
  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    pageCount: Math.max(1, Math.ceil(lines.length / 50)),
    extractionMethod: 'csv_parser',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

export function extractJsonAdapter(jsonContent: string): AdapterExtractionResult {
  if (!jsonContent || !jsonContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'json_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['JSON file is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded JSON file is empty.'
      }
    };
  }

  try {
    const parsed = JSON.parse(jsonContent);
    const textLines: string[] = [];

    function extractValues(obj: any) {
      if (typeof obj === 'string') {
        if (obj.trim()) textLines.push(obj.trim());
      } else if (typeof obj === 'number' || typeof obj === 'boolean') {
        textLines.push(String(obj));
      } else if (Array.isArray(obj)) {
        for (const item of obj) {
          extractValues(item);
        }
      } else if (obj && typeof obj === 'object') {
        // Sort keys deterministically
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
          extractValues(obj[key]);
        }
      }
    }

    extractValues(parsed);
    const text = textLines.join('\n');

    if (!text.trim()) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: 'json_parser',
        ocrUsed: false,
        ocrStatus: 'NOT_REQUIRED',
        warnings: ['JSON file contains no textual values.'],
        error: {
          code: 'EMPTY_DOCUMENT',
          message: 'The JSON file contains no extractable textual values.'
        }
      };
    }

    const words = text.split(/\s+/).filter(Boolean);

    return {
      success: true,
      text,
      wordCount: words.length,
      characterCount: text.length,
      pageCount: Math.max(1, Math.ceil(textLines.length / 40)),
      extractionMethod: 'json_parser',
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
      extractionMethod: 'json_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: [err?.message || 'Invalid JSON syntax.'],
      error: {
        code: 'MALFORMED_DOCUMENT',
        message: 'Invalid JSON document syntax.'
      }
    };
  }
}

export function extractXmlAdapter(xmlContent: string): AdapterExtractionResult {
  if (!xmlContent || !xmlContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'xml_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['XML file is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded XML file is empty.'
      }
    };
  }

  // XXE Protection: Check for dangerous DOCTYPE or ENTITY definitions
  if (/<!DOCTYPE|<!ENTITY/i.test(xmlContent)) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'xml_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['XML document contains DTD/ENTITY declarations.'],
      error: {
        code: 'SECURITY_REJECTED',
        message: 'XML files containing DOCTYPE or external entities are rejected for security.'
      }
    };
  }

  // Verify XML tag closing balance basic syntax check
  if ((xmlContent.match(/</g) || []).length !== (xmlContent.match(/>/g) || []).length) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'xml_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['Malformed XML tags detected.'],
      error: {
        code: 'MALFORMED_DOCUMENT',
        message: 'Malformed XML document syntax.'
      }
    };
  }

  try {
    let clean = xmlContent;
    clean = clean.replace(/<\?[^?]+\?>/g, ''); // Remove XML declarations
    clean = clean.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
    clean = clean.replace(/<[^>]+>/g, '\n'); // Convert tags to newlines

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
        extractionMethod: 'xml_parser',
        ocrUsed: false,
        ocrStatus: 'NOT_REQUIRED',
        warnings: ['XML document contains no text content.'],
        error: {
          code: 'EMPTY_DOCUMENT',
          message: 'The XML document contains no extractable text nodes.'
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
      extractionMethod: 'xml_parser',
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
      extractionMethod: 'xml_parser',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: [err?.message || 'Failed to parse XML document.'],
      error: {
        code: 'MALFORMED_DOCUMENT',
        message: 'Failed to parse XML document.'
      }
    };
  }
}
