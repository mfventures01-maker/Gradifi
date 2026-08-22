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
   * @param imageInput - Image file, buffer, or string URL/base64
   * @returns Extracted text with confidence scores
   */
  async extractText(imageInput: any): Promise<OCRResult> {
    try {
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(imageInput);
      await worker.terminate();

      return {
        text: data.text || '',
        confidence: data.confidence || 0,
        words: (data.words || []).map((w: any) => ({ text: w.text || '', confidence: w.confidence || 0 })),
        lines: (data.lines || []).map((l: any) => l.text || ''),
        wordCount: data.words?.length || 0,
        charCount: data.text?.length || 0
      };
    } catch (error) {
      console.error('❌ OCR Error:', error);
      throw new Error('Failed to extract text from image. Please ensure the image is clear and contains readable text.');
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
