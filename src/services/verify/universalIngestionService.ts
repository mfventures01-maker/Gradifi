/**
 * GRADIFI VERIFY - UNIVERSAL DOCUMENT INGESTION SERVICE
 * HOEOS Phase 2 Standard: 17-Format Detection, Deterministic Adapters & Canonical Convergence.
 */

import { CanonicalAnalysisDocument } from './types';
import { buildCanonicalAnalysisDocument } from './documentNormalizer';
import { extractPdfAdapter } from './ingestionAdapters/pdfAdapter';
import { extractTextAdapter } from './ingestionAdapters/textAdapter';
import { extractHtmlAdapter } from './ingestionAdapters/htmlAdapter';
import { extractRtfAdapter } from './ingestionAdapters/rtfAdapter';
import { extractCsvAdapter, extractJsonAdapter, extractXmlAdapter } from './ingestionAdapters/structuredAdapter';
import { extractDocxText, extractOdtText, extractEpubText, extractPptxText, extractXlsxText } from './ingestionAdapters/officeZipAdapter';
import { extractLegacyBinaryAdapter } from './ingestionAdapters/legacyBinaryAdapter';
import { MAX_FILE_SIZE_BYTES } from '../../utils/pdfExtractor';

export type SupportedFormat =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'rtf'
  | 'odt'
  | 'txt'
  | 'epub'
  | 'html'
  | 'htm'
  | 'md'
  | 'ppt'
  | 'pptx'
  | 'xls'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'xml';

export const G1_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const G1_MAX_CANONICAL_TEXT_BYTES = 1 * 1024 * 1024; // 1MB

export interface DocumentIngestionResult {
  success: boolean;
  filename: string;
  mimeType: string;
  extension: string;
  format: SupportedFormat | 'unknown';
  extractionMethod: string;
  text: string;
  wordCount: number;
  characterCount: number;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  chapterCount?: number;
  ocrUsed: boolean;
  ocrStatus: 'NOT_REQUIRED' | 'NOT_AVAILABLE' | 'USED' | 'FAILED';
  processingTimeMs?: number;
  warnings: string[];
  error?: {
    code: string;
    message: string;
  };
  canonicalReady: boolean;
  canonicalDocument?: CanonicalAnalysisDocument;
}

/**
 * Detects format deterministically from filename extension and MIME type.
 */
export function detectFileFormat(filename: string, mimeType?: string): SupportedFormat | 'unknown' {
  if (!filename || typeof filename !== 'string') return 'unknown';
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const formatMap: Record<string, SupportedFormat> = {
    pdf: 'pdf',
    doc: 'doc',
    docx: 'docx',
    rtf: 'rtf',
    odt: 'odt',
    txt: 'txt',
    epub: 'epub',
    html: 'html',
    htm: 'htm',
    md: 'md',
    markdown: 'md',
    ppt: 'ppt',
    pptx: 'pptx',
    xls: 'xls',
    xlsx: 'xlsx',
    csv: 'csv',
    json: 'json',
    xml: 'xml'
  };

  if (formatMap[ext]) {
    return formatMap[ext];
  }

  if (mimeType) {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('wordprocessingml')) return 'docx';
    if (mimeType.includes('msword')) return 'doc';
    if (mimeType.includes('rtf')) return 'rtf';
    if (mimeType.includes('opendocument.text')) return 'odt';
    if (mimeType.includes('epub')) return 'epub';
    if (mimeType.includes('html')) return 'html';
    if (mimeType.includes('presentationml')) return 'pptx';
    if (mimeType.includes('spreadsheetml')) return 'xlsx';
    if (mimeType.includes('csv')) return 'csv';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('xml')) return 'xml';
    if (mimeType.includes('text/plain')) return 'txt';
  }

  return 'unknown';
}

/**
 * Normalizes input payload into string or ArrayBuffer for parsing.
 */
export async function getFilePayload(
  fileOrInput: File | { name: string; text?: string; buffer?: ArrayBuffer; mimeType?: string }
): Promise<{ filename: string; mimeType: string; size: number; text?: string; buffer?: ArrayBuffer }> {
  const isFileInstance = typeof File !== 'undefined' && fileOrInput instanceof File;
  
  if (isFileInstance) {
    const file = fileOrInput as File;
    return {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      text: file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.html') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.xml') || file.name.endsWith('.rtf')
        ? await file.text()
        : undefined,
      buffer: await file.arrayBuffer()
    };
  }

  const obj = fileOrInput as { name: string; text?: string; buffer?: ArrayBuffer; mimeType?: string };
  const buf = obj.buffer || (obj.text ? new TextEncoder().encode(obj.text).buffer : new ArrayBuffer(0));
  return {
    filename: obj.name,
    mimeType: obj.mimeType || 'application/octet-stream',
    size: buf.byteLength,
    text: obj.text,
    buffer: buf
  };
}

/**
 * Universal Document Ingestion Dispatch Pipeline.
 */
export async function ingestDocument(
  fileOrInput: File | { name: string; text?: string; buffer?: ArrayBuffer; mimeType?: string }
): Promise<DocumentIngestionResult> {
  const startTime = Date.now();
  const payload = await getFilePayload(fileOrInput);
  const ext = payload.filename.split('.').pop()?.toLowerCase() || '';
  const format = detectFileFormat(payload.filename, payload.mimeType);

  // Security Gate 1: Check File Size
  if (payload.size > G1_MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      filename: payload.filename,
      mimeType: payload.mimeType,
      extension: ext,
      format,
      extractionMethod: 'universal_ingestion',
      text: '',
      wordCount: 0,
      characterCount: 0,
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      processingTimeMs: Date.now() - startTime,
      warnings: ['File exceeds maximum allowed size (50MB).'],
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed 50MB limit.'
      },
      canonicalReady: false
    };
  }

  // Security Gate 2: Check Unknown / Unsupported Format
  if (format === 'unknown') {
    return {
      success: false,
      filename: payload.filename,
      mimeType: payload.mimeType,
      extension: ext,
      format: 'unknown',
      extractionMethod: 'universal_ingestion',
      text: '',
      wordCount: 0,
      characterCount: 0,
      ocrUsed: false,
      ocrStatus: 'NOT_REQUIRED',
      processingTimeMs: Date.now() - startTime,
      warnings: ['Unsupported document format.'],
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format .${ext}. Please upload a supported document.`
      },
      canonicalReady: false
    };
  }

  // Format Adapters Dispatch
  let adapterResult: any;

  switch (format) {
    case 'pdf': {
      if (typeof File !== 'undefined' && fileOrInput instanceof File) {
        adapterResult = await extractPdfAdapter(fileOrInput as File);
      } else {
        adapterResult = await extractPdfAdapter({ name: payload.filename, buffer: payload.buffer || new ArrayBuffer(0) });
      }
      break;
    }
    case 'txt':
    case 'md': {
      const rawText = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractTextAdapter(rawText, format);
      break;
    }
    case 'html':
    case 'htm': {
      const rawHtml = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractHtmlAdapter(rawHtml);
      break;
    }
    case 'rtf': {
      const rawRtf = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractRtfAdapter(rawRtf);
      break;
    }
    case 'csv': {
      const rawCsv = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractCsvAdapter(rawCsv);
      break;
    }
    case 'json': {
      const rawJson = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractJsonAdapter(rawJson);
      break;
    }
    case 'xml': {
      const rawXml = payload.text || (payload.buffer ? new TextDecoder('utf-8').decode(payload.buffer) : '');
      adapterResult = extractXmlAdapter(rawXml);
      break;
    }
    case 'docx': {
      const buf = payload.buffer || (payload.text ? new TextEncoder().encode(payload.text).buffer : new ArrayBuffer(0));
      adapterResult = await extractDocxText(buf);
      break;
    }
    case 'odt': {
      const buf = payload.buffer || (payload.text ? new TextEncoder().encode(payload.text).buffer : new ArrayBuffer(0));
      adapterResult = await extractOdtText(buf);
      break;
    }
    case 'epub': {
      const buf = payload.buffer || (payload.text ? new TextEncoder().encode(payload.text).buffer : new ArrayBuffer(0));
      adapterResult = await extractEpubText(buf);
      break;
    }
    case 'pptx': {
      const buf = payload.buffer || (payload.text ? new TextEncoder().encode(payload.text).buffer : new ArrayBuffer(0));
      adapterResult = await extractPptxText(buf);
      break;
    }
    case 'xlsx': {
      const buf = payload.buffer || (payload.text ? new TextEncoder().encode(payload.text).buffer : new ArrayBuffer(0));
      adapterResult = await extractXlsxText(buf);
      break;
    }
    case 'doc':
    case 'ppt':
    case 'xls': {
      adapterResult = extractLegacyBinaryAdapter(format, payload.filename);
      break;
    }
    default: {
      adapterResult = {
        success: false,
        text: '',
        wordCount: 0,
        characterCount: 0,
        extractionMethod: 'universal_ingestion',
        ocrUsed: false,
        ocrStatus: 'NOT_REQUIRED',
        warnings: ['Unsupported format'],
        error: { code: 'UNSUPPORTED_FORMAT', message: `Format .${ext} is unsupported.` }
      };
    }
  }

  // Security Gate 3: Check Canonical Text Payload Limit (1MB)
  if (adapterResult.success && adapterResult.text && new TextEncoder().encode(adapterResult.text).length > G1_MAX_CANONICAL_TEXT_BYTES) {
    return {
      success: false,
      filename: payload.filename,
      mimeType: payload.mimeType,
      extension: ext,
      format,
      extractionMethod: adapterResult.extractionMethod,
      text: '',
      wordCount: 0,
      characterCount: 0,
      ocrUsed: adapterResult.ocrUsed || false,
      ocrStatus: adapterResult.ocrStatus || 'NOT_REQUIRED',
      processingTimeMs: Date.now() - startTime,
      warnings: ['Extracted canonical text exceeds maximum 1MB payload limit.'],
      error: {
        code: 'TEXT_SIZE_EXCEEDED',
        message: 'Canonical text payload exceeds maximum 1MB limit.'
      },
      canonicalReady: false
    };
  }

  // Canonical Convergence
  let canonicalDocument: CanonicalAnalysisDocument | undefined = undefined;
  let canonicalReady = false;

  if (adapterResult.success && adapterResult.text) {
    canonicalDocument = buildCanonicalAnalysisDocument({
      rawText: adapterResult.text,
      filename: payload.filename,
      fileSizeBytes: payload.size,
      extractionMethod: adapterResult.extractionMethod as any
    });
    canonicalReady = true;
  }

  return {
    success: adapterResult.success,
    filename: payload.filename,
    mimeType: payload.mimeType,
    extension: ext,
    format,
    extractionMethod: adapterResult.extractionMethod,
    text: adapterResult.text,
    wordCount: adapterResult.wordCount,
    characterCount: adapterResult.characterCount,
    pageCount: adapterResult.pageCount,
    slideCount: adapterResult.slideCount,
    sheetCount: adapterResult.sheetCount,
    chapterCount: adapterResult.chapterCount,
    ocrUsed: adapterResult.ocrUsed,
    ocrStatus: adapterResult.ocrStatus,
    processingTimeMs: Date.now() - startTime,
    warnings: adapterResult.warnings,
    error: adapterResult.error,
    canonicalReady,
    canonicalDocument
  };
}

/**
 * Converts any successful DocumentIngestionResult to CanonicalAnalysisDocument.
 */
export function convertToCanonicalDocument(result: DocumentIngestionResult): CanonicalAnalysisDocument {
  if (result.canonicalDocument) {
    return result.canonicalDocument;
  }
  return buildCanonicalAnalysisDocument({
    rawText: result.text || '',
    filename: result.filename,
    fileSizeBytes: result.characterCount,
    extractionMethod: result.extractionMethod as any
  });
}
