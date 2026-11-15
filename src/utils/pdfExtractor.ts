/**
 * GRADIFI VERIFY - DOCUMENT & PDF EXTRACTION UTILITY
 * Accepts .pdf and .txt files, validates type and size, extracts usable text.
 * HOEOS Standard: Truthful extraction, ZERO fake data.
 */

import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

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
 * Rigorous text quality validation to prevent binary/corrupted PDF stream garbage from passing.
 * Enforces fail-closed HOEOS Gate 1 requirements:
 * 1. printableRatio >= 0.70
 * 2. U+FFFD replacement character contamination check (< 0.5%)
 * 3. Control-character contamination check (ASCII 0-8, 11-12, 14-31)
 * 4. Legible word count >= 5 (real alphanumeric words, not hex or stream syntax)
 * 5. Minimum text length >= 50
 */
export function validatePdfExtractedTextQuality(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 50) return false;

  // 1. Check U+FFFD replacement character contamination
  const ufffdMatches = clean.match(/\uFFFD/g);
  const ufffdCount = ufffdMatches ? ufffdMatches.length : 0;
  if (ufffdCount > 0 && (ufffdCount / clean.length) > 0.005) {
    return false;
  }

  // 2. Check control characters (ASCII 0-8, 11-12, 14-31)
  const controlMatches = clean.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  const controlCount = controlMatches ? controlMatches.length : 0;
  if (controlCount > 0 && (controlCount / clean.length) > 0.01) {
    return false;
  }

  // 3. Check printable character ratio (ASCII 32-126 + \n + \r + \t + Unicode letters/accents)
  let printableCount = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (
      (code >= 32 && code <= 126) ||
      code === 10 || code === 13 || code === 9 ||
      (code >= 160 && code !== 0xFFFD)
    ) {
      printableCount++;
    }
  }

  const printableRatio = printableCount / clean.length;
  if (printableRatio < 0.70) {
    return false;
  }

  // 4. Validate meaningful word count (words with at least 2 consecutive alphabetic/numeric chars)
  const words = clean.split(/\s+/).filter(Boolean);
  const legibleWords = words.filter(w => /[a-zA-Z0-9]{2,}/.test(w) && !/^[0-9A-Fa-f]{8,}$/.test(w));

  if (legibleWords.length < 5) {
    return false;
  }

  // 5. Check ratio of legible words to total words
  if (words.length > 0 && (legibleWords.length / words.length) < 0.40) {
    return false;
  }

  return true;
}

/**
 * Extracts text from a PDF with PDF.js structural parsing in both browser and
 * Node runtimes. The byte-level regex fallback is deliberately removed:
 * PDF bytes are not UTF-8 text, and regex matches are not trustworthy evidence.
 *
 * An empty result is a fail-closed signal to the caller, which may then use the
 * existing rasterization/OCR path for image-only PDFs.
 */
export async function extractTextFromPdfStream(arrayBuffer: ArrayBuffer): Promise<string> {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength === 0) {
    return '';
  }

  let loadingTask: any = null;
  let pdfDoc: any = null;

  try {
    // PDF.js uses its configured worker in browsers. In Node it selects its
    // Node-compatible worker implementation; do not force a browser URL.
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }

    const data = new Uint8Array(arrayBuffer.slice(0));
    loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
    });
    pdfDoc = await loadingTask.promise;

    const textParts: string[] = [];
    const maxPages = Math.min(pdfDoc.numPages, 25);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => typeof item?.str === 'string' ? item.str : '')
        .filter((part: string) => part.length > 0)
        .join(' ')
        .trim();

      if (pageText) textParts.push(pageText);
    }

    const combined = textParts.join('\n\n').trim();
    return combined.length >= 50 && validatePdfExtractedTextQuality(combined)
      ? combined
      : '';
  } catch {
    // Do not decode PDF bytes as UTF-8 or accept regex-derived pseudo-text.
    // The caller owns the OCR fallback and final unavailable-text verdict.
    return '';
  } finally {
    try {
      if (pdfDoc) await pdfDoc.destroy();
      else if (loadingTask) await loadingTask.destroy();
    } catch {
      // Cleanup must not replace the extraction verdict.
    }
  }
}

import { ocrService } from '../services/ocrService.js';

/**
 * Helper to extract JPEG image streams (/Filter /DCTDecode) from raw PDF bytes.
 */
export function extractJpegImagesFromPdf(arrayBuffer: ArrayBuffer): Uint8Array[] {
  const bytes = new Uint8Array(arrayBuffer);
  const images: Uint8Array[] = [];
  let pos = 0;

  while (pos < bytes.length - 3) {
    if (bytes[pos] === 0xFF && bytes[pos + 1] === 0xD8 && bytes[pos + 2] === 0xFF) {
      const start = pos;
      pos += 2;
      let foundEnd = false;
      while (pos < bytes.length - 1) {
        if (bytes[pos] === 0xFF && bytes[pos + 1] === 0xD9) {
          const end = pos + 2;
          const imageBytes = bytes.subarray(start, end);
          if (imageBytes.length > 2048) {
            images.push(imageBytes);
          }
          pos = end;
          foundEnd = true;
          break;
        }
        pos++;
      }
      if (!foundEnd) break;
    } else {
      pos++;
    }
  }

  return images;
}

/**
 * Renders PDF pages to PNG raster image payloads (image/png) for OCR processing.
 * Works in both browser environment (HTMLCanvasElement) and Node.js environment (@napi-rs/canvas).
 */
export async function renderPdfPagesToRasterImages(arrayBuffer: ArrayBuffer): Promise<Uint8Array[]> {
  const images: Uint8Array[] = [];
  try {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
    const pdfDoc = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= Math.min(pdfDoc.numPages, 5); pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      let canvas: any;
      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
      } else {
        const canvasPkg = '@napi-rs/canvas';
        const { createCanvas } = await import(/* @vite-ignore */ canvasPkg);
        canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      }

      const context = canvas.getContext('2d');
      if (context) {
        if ('fillStyle' in context) {
          context.fillStyle = 'white';
          context.fillRect(0, 0, viewport.width, viewport.height);
        }
        await page.render({ canvas: canvas as any, canvasContext: context as any, viewport }).promise;

        let imageBytes: Uint8Array;
        if (typeof canvas.toBuffer === 'function') {
          imageBytes = new Uint8Array(canvas.toBuffer('image/png'));
        } else if (typeof canvas.toDataURL === 'function') {
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          const binaryStr = atob(base64);
          imageBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            imageBytes[i] = binaryStr.charCodeAt(i);
          }
        } else {
          continue;
        }

        if (imageBytes && imageBytes.length > 0) {
          images.push(imageBytes);
        }
      }
    }
  } catch (err) {
    console.warn('PDF page rasterization failed:', err);
  }
  return images;
}

/**
 * Primary extraction pipeline for uploaded PDF or text file.
 * Handles text-native PDFs via stream parsing and scanned/image PDFs via Tesseract OCR fallback.
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

  // Method 1: Fast PDF stream text extraction for text-native PDFs
  const streamText = await extractTextFromPdfStream(arrayBuffer);
  if (streamText.length >= 50 && validatePdfExtractedTextQuality(streamText)) {
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

  // Method 2: OCR Fallback for scanned / image-only PDFs
  onProgress?.(40, 'Text stream unavailable. Rasterizing PDF pages for Tesseract OCR...');
  let ocrAttempted = false;
  try {
    let rasterImages = extractJpegImagesFromPdf(arrayBuffer);
    if (rasterImages.length === 0) {
      rasterImages = await renderPdfPagesToRasterImages(arrayBuffer);
    }

    let ocrText = '';
    let pageEstimate = 1;

    if (rasterImages.length > 0) {
      ocrAttempted = true;
      onProgress?.(60, `Extracted ${rasterImages.length} raster image payload(s). Running Tesseract OCR...`);
      const ocrResults = await Promise.all(
        rasterImages.slice(0, 5).map(imgBytes => {
          const isJpeg = imgBytes[0] === 0xFF && imgBytes[1] === 0xD8;
          const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
          return ocrService.extractText(new Blob([imgBytes], { type: mimeType }));
        })
      );
      ocrText = ocrResults.map(r => r.text).join('\n\n').trim();
      pageEstimate = rasterImages.length;
    }

    if (ocrText && ocrText.length >= 10) {
      onProgress?.(100, 'OCR text extraction complete');
      return {
        filename: file.name,
        fileSizeFormatted: formatFileSize(file.size),
        fileSizeBytes: file.size,
        extractedText: ocrText,
        pageCountEstimate: pageEstimate,
        extractionMethod: 'ocr_tesseract'
      };
    }

    if (ocrAttempted) {
      throw new Error('OCR_NO_TEXT');
    }
  } catch (ocrErr: any) {
    console.warn('OCR extraction fallback failed:', ocrErr);
    if (!ocrAttempted) {
      throw new Error('PDF_RASTERIZATION_FAILURE');
    }
    const failureCode = ocrErr?.message === 'OCR_TIMEOUT'
      ? 'OCR_TIMEOUT'
      : ocrErr?.message === 'OCR_NO_TEXT'
        ? 'OCR_NO_TEXT'
        : 'OCR_WORKER_FAILURE';
    throw new Error(failureCode);
  }

  // No structural text and no OCR attempt: do not mislabel this as an OCR failure.
  throw new Error('TEXT_EXTRACTION_UNAVAILABLE');
}


