/**
 * GRADIFI / SEFAES - OCR SERVICE
 * Text extraction from images using Tesseract.js.
 */

import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number }>;
  lines: string[];
  wordCount: number;
  charCount: number;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onLateResolve?: (value: T) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new Error('OCR_TIMEOUT'));
    }, Math.max(1, timeoutMs));

    promise.then(value => {
      if (settled) {
        try { onLateResolve?.(value); } catch { /* best-effort late cleanup */ }
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

export const ocrService = {
  async extractText(imageInput: any, timeoutMs: number = 30000): Promise<OCRResult> {
    let worker: any = null;
    const startedAt = Date.now();

    try {
      let payload = imageInput;
      if (
        typeof Blob !== 'undefined' &&
        imageInput instanceof Blob &&
        typeof process !== 'undefined' &&
        process.versions?.node
      ) {
        payload = Buffer.from(await imageInput.arrayBuffer());
      }

      const workerPromise = Promise.resolve().then(() => createWorker('eng'));
      worker = await withTimeout(workerPromise, timeoutMs, lateWorker => {
        void lateWorker.terminate();
      });

      const remainingMs = timeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) throw new Error('OCR_TIMEOUT');

      const recognition: any = await withTimeout<any>(
        worker.recognize(payload),
        remainingMs
      );
      const data: any = recognition?.data || {};
      const text = typeof data.text === 'string' ? data.text : '';
      const confidence = Number.isFinite(data.confidence)
        ? Math.max(0, Math.min(100, data.confidence))
        : 0;
      const tesseractWords = Array.isArray(data.words)
        ? data.words
            .map((word: any) => ({
              text: typeof word?.text === 'string' ? word.text.trim() : '',
              confidence: Number.isFinite(word?.confidence)
                ? Math.max(0, Math.min(100, word.confidence))
                : confidence
            }))
            .filter((word: { text: string }) => word.text.length > 0)
        : [];
      const words = tesseractWords.length > 0
        ? tesseractWords
        : (text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || [])
            .map((word: string) => ({ text: word, confidence }));

      return {
        text,
        confidence,
        words,
        lines: Array.isArray(data.lines)
          ? data.lines.map((line: any) => typeof line?.text === 'string' ? line.text : '')
          : [],
        wordCount: words.length,
        charCount: text.length
      };
    } catch (error: any) {
      if (error?.message === 'OCR_TIMEOUT') throw new Error('OCR_TIMEOUT');
      throw new Error('OCR_WORKER_FAILURE');
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch { /* cleanup must not mask OCR result */ }
      }
    }
  },

  async extractFromPages(images: any[]): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    for (const image of images) {
      results.push(await this.extractText(image));
    }
    return results;
  },

  cleanText(rawText: string): string {
    return rawText
      .replace(/[^\w\s.,!?'"()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }
};
