/**
 * GRADIFI VERIFY - UNIVERSAL INGESTION OFFICE & ARCHIVE ADAPTER
 * Deterministically extracts XML content streams from DOCX, ODT, EPUB, PPTX, and XLSX packages.
 */

import { AdapterExtractionResult } from './pdfAdapter';

/**
 * Extracts plain text from XML elements in Office Open XML / OpenDocument streams.
 */
export function extractTextFromXmlElements(xmlContent: string, elementTagNames: string[]): string[] {
  const textNodes: string[] = [];
  
  for (const tag of elementTagNames) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(xmlContent)) !== null) {
      // Strip nested tags
      const clean = match[1].replace(/<[^>]+>/g, '').trim();
      if (clean) {
        textNodes.push(clean);
      }
    }
  }

  return textNodes;
}

/**
 * Extracts DOCX document.xml or text payload.
 */
export function extractDocxText(xmlOrRawContent: string): AdapterExtractionResult {
  if (!xmlOrRawContent || !xmlOrRawContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'docx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['DOCX document is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded DOCX document is empty.'
      }
    };
  }

  // Extract <w:t> tags
  const nodes = extractTextFromXmlElements(xmlOrRawContent, ['w:t', 'w:p']);
  let text = nodes.join('\n');

  if (!text.trim()) {
    // Fallback: If raw text without tags was passed
    text = xmlOrRawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (!text.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'docx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['DOCX file contains no extractable text.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The DOCX file contains no extractable text.'
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
    extractionMethod: 'docx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts ODT content.xml.
 */
export function extractOdtText(xmlOrRawContent: string): AdapterExtractionResult {
  if (!xmlOrRawContent || !xmlOrRawContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'odt_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['ODT document is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded ODT document is empty.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlOrRawContent, ['text:p', 'text:h']);
  let text = nodes.join('\n');

  if (!text.trim()) {
    text = xmlOrRawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: 'odt_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts EPUB text content.
 */
export function extractEpubText(epubContent: string): AdapterExtractionResult {
  if (!epubContent || !epubContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'epub_xhtml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['EPUB file is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded EPUB file is empty.'
      }
    };
  }

  let text = epubContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|h[1-6]|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    chapterCount: 1,
    pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    extractionMethod: 'epub_xhtml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts PPTX slides.
 */
export function extractPptxText(xmlOrRawContent: string): AdapterExtractionResult {
  if (!xmlOrRawContent || !xmlOrRawContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'pptx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['PPTX presentation is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded PPTX presentation is empty.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlOrRawContent, ['a:t', 'p:txBody']);
  let text = nodes.join('\n');

  if (!text.trim()) {
    text = xmlOrRawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    slideCount: 1,
    extractionMethod: 'pptx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}

/**
 * Extracts XLSX worksheets.
 */
export function extractXlsxText(xmlOrRawContent: string): AdapterExtractionResult {
  if (!xmlOrRawContent || !xmlOrRawContent.trim()) {
    return {
      success: false,
      text: '',
      wordCount: 0,
      characterCount: 0,
      extractionMethod: 'xlsx_xml_extractor',
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      warnings: ['XLSX spreadsheet is empty.'],
      error: {
        code: 'EMPTY_DOCUMENT',
        message: 'The uploaded XLSX spreadsheet is empty.'
      }
    };
  }

  const nodes = extractTextFromXmlElements(xmlOrRawContent, ['t', 'v']);
  let text = nodes.join(' ');

  if (!text.trim()) {
    text = xmlOrRawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const words = text.split(/\s+/).filter(Boolean);

  return {
    success: true,
    text,
    wordCount: words.length,
    characterCount: text.length,
    sheetCount: 1,
    extractionMethod: 'xlsx_xml_extractor',
    ocrUsed: false,
    ocrStatus: 'NOT_REQUIRED',
    warnings: []
  };
}
