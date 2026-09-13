/**
 * GRADIFI VERIFY - DOCUMENT & PDF EXTRACTION UTILITY
 * Accepts .pdf and .txt files, validates type and size, extracts usable text.
 * HOEOS Standard: Truthful extraction, ZERO fake data.
 */

import { createWorker } from 'tesseract.js';

export interface ExtractedDocument {
  filename: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  extractedText: string;
  pageCountEstimate: number;
  extractionMethod: 'text_reader' | 'pdf_stream_extractor' | 'ocr_tesseract';
}

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates file type and size.
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  const nameLower = file.name.toLowerCase();
  const isPdf = nameLower.endsWith('.pdf') || file.type === 'application/pdf';
  const isTxt = nameLower.endsWith('.txt') || file.type === 'text/plain';

  if (!isPdf && !isTxt) {
    return { valid: false, error: 'Invalid file format. Please upload a .pdf or .txt document.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File size exceeds 15MB limit (${formatFileSize(file.size)}).` };
  }

  return { valid: true };
}

/**
 * Extracts raw text from PDF bytes via text stream extraction.
 */
export function extractTextFromPdfStream(arrayBuffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8');
    const rawContent = decoder.decode(new Uint8Array(arrayBuffer));
    
    // Extract text in TJ / Tj operators or parenthesis blocks inside PDF streams
    const textMatches: string[] = [];
    
    // Regex matching parenthesized strings in PDF streams (TJ/Tj commands or literal strings)
    const regex = /\(([^()\r\n]{3,})\)\s*(?:Tj|TJ|\)|\])/g;
    let match;
    while ((match = regex.exec(rawContent)) !== null) {
      let cleaned = match[1]
        .replace(/\\\( /g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .trim();
      
      // Filter out PDF stream syntax noise
      if (cleaned.length > 3 && !/^[0-9A-Fa-f]{8,}$/.test(cleaned) && !/^\/[A-Z]/.test(cleaned)) {
        textMatches.push(cleaned);
      }
    }

    if (textMatches.length > 0 && textMatches.join(' ').length >= 10) {
      return textMatches.join(' ');
    }
  } catch (e) {
    console.warn('PDF stream extraction failed, falling back to OCR:', e);
  }
  return '';
}

/**
 * Primary extraction pipeline for uploaded PDF or text file.
 */
export async function extractDocumentText(
  file: File,
  onProgress?: (progressPercent: number, statusMessage: string) => void
): Promise<ExtractedDocument> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid document');
  }

  const nameLower = file.name.toLowerCase();
  const isTxt = nameLower.endsWith('.txt') || file.type === 'text/plain';

  if (isTxt) {
    onProgress?.(50, 'Reading text document...');
    const text = await file.text();
    onProgress?.(100, 'Text extraction complete');
    
    if (!text.trim()) {
      throw new Error('The uploaded text file is empty.');
    }

    return {
      filename: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      extractedText: text.trim(),
      pageCountEstimate: 1,
      extractionMethod: 'text_reader'
    };
  }

  // Handle PDF files
  onProgress?.(20, 'Inspecting PDF document structure...');
  const arrayBuffer = await file.arrayBuffer();
  
  // Method 1: Fast PDF stream text extraction
  const streamText = extractTextFromPdfStream(arrayBuffer);
  if (streamText.length >= 50) {
    onProgress?.(100, 'PDF text extraction complete');
    return {
      filename: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      extractedText: streamText.trim(),
      pageCountEstimate: Math.max(1, Math.ceil(streamText.length / 2000)),
      extractionMethod: 'pdf_stream_extractor'
    };
  }

  // Method 2: OCR with Tesseract.js for scanned image PDFs
  onProgress?.(40, 'Running Tesseract OCR on PDF document...');
  try {
    const worker = await Promise.race([
      createWorker('eng'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tesseract OCR engine initialization timed out')), 1500))
    ]);
    onProgress?.(60, 'Processing PDF pages with Tesseract OCR...');
    const ret = await worker.recognize(file);
    await worker.terminate();

    onProgress?.(100, 'OCR extraction complete');
    const ocrText = ret.data.text.trim();

    if (!ocrText) {
      throw new Error('Could not extract legible text from this PDF file.');
    }

    const lines = ret.data.blocks
      ? ret.data.blocks.flatMap(b => b.paragraphs.flatMap(p => p.lines))
      : ('lines' in ret.data && Array.isArray((ret.data as { lines?: unknown[] }).lines) ? (ret.data as { lines: unknown[] }).lines : []);
    const lineCount = lines.length;

    return {
      filename: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      extractedText: ocrText,
      pageCountEstimate: Math.max(1, lineCount ? Math.ceil(lineCount / 40) : 1),
      extractionMethod: 'ocr_tesseract'
    };
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to extract text from PDF file.');
  }
}
