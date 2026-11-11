/**
 * GRADIFI / SEFAES - OCR SERVICE
 * Text extraction from images using Tesseract.js
 * Constitutional Law 8: Build Engines, Not Pages
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

export const ocrService = {
  /**
   * Extract text from an image (File, Buffer, or base64 string)
   * Enforces 30-second OCR timeout and guaranteed worker termination.
   * @param imageInput - Image file, buffer, or string URL/base64
   * @param timeoutMs - Max execution time in ms (default 30000ms)
   * @returns Extracted text with confidence scores
   */
  async extractText(imageInput: any, timeoutMs: number = 30000): Promise<OCRResult> {
    let worker: any = null;
    let timeoutTimer: NodeJS.Timeout | null = null;

    try {
      let payload = imageInput;
      if (
        typeof Blob !== 'undefined' &&
        imageInput instanceof Blob &&
        typeof process !== 'undefined' &&
        process.versions?.node
      ) {
        const arrayBuffer = await imageInput.arrayBuffer();
        payload = Buffer.from(arrayBuffer);
      }

      const workerPromise = (async () => {
        worker = await createWorker('eng');
        const { data } = await worker.recognize(payload);
        return data;
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new Error('OCR_TIMEOUT'));
        }, timeoutMs);
      });

      const data: any = await Promise.race([workerPromise, timeoutPromise]);

      const text = typeof data.text === 'string' ? data.text : '';
      const confidence = Number.isFinite(data.confidence) ? data.confidence : 0;
      const tesseractWords = Array.isArray(data.words)
        ? data.words
            .map((word: any) => ({
              text: typeof word?.text === 'string' ? word.text.trim() : '',
              confidence: Number.isFinite(word?.confidence) ? word.confidence : confidence
            }))
            .filter((word: { text: string }) => word.text.length > 0)
        : [];
      // Tesseract.js may return useful text while omitting data.words for some
      // image inputs/runtimes. Derive a transparent lexical count from that
      // exact OCR text instead of reporting a false zero.
      const words = tesseractWords.length > 0
        ? tesseractWords
        : (text.match(/[\\p{L}\\p{N}]+(?:['’.-][\\p{L}\\p{N}]+)*/gu) || [])
            .map((word: string) => ({ text: word, confidence }));

      return {
        text,
        confidence,
        words,
        lines: (data.lines || []).map((line: any) => line.text || ''),
        wordCount: words.length,
        charCount: text.length
      };
    } catch (error: any) {
      console.error('❌ OCR Error:', error?.message || error);
      if (error?.message === 'OCR_TIMEOUT') {
        throw new Error('OCR_TIMEOUT');
      }
      throw new Error('OCR_WORKER_FAILURE');
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore termination errors during cleanup
        }
      }
    }
  },

  /**
   * Extract text from multiple images
   */
  async extractFromPages(images: any[]): Promise<OCRResult[]> {
    const results = await Promise.all(
      images.map(img => this.extractText(img))
    );
    return results;
  },

  /**
   * Clean OCR output
   */
  cleanText(rawText: string): string {
    return rawText
      .replace(/[^\w\s.,!?'"()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Get OCR confidence assessment
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }
};
