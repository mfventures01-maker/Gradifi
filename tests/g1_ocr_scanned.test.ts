import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

describe('G1 OCR scanned PDF runtime certification', () => {
  it('recovers ground-truth text through the production PDF rasterization -> OCR path', async () => {
    const fixturePath = 'tests/fixtures/ingestion/scanned_page_001.pdf';

    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Scanned PDF fixture missing at ${fixturePath}`);
    }

    const fileBytes = fs.readFileSync(fixturePath);
    const buffer = fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    );

    const result = await ingestDocument({
      name: 'scanned_page_001.pdf',
      buffer,
    });

    console.log('=== G1 OCR RUNTIME ACCEPTANCE ===');
    console.log('SUCCESS:', result.success);
    console.log('EXTRACTION_METHOD:', result.extractionMethod);
    console.log('OCR_USED:', result.ocrUsed);
    console.log('OCR_STATUS:', result.ocrStatus);
    console.log('TEXT_LENGTH:', result.text.length);
    console.log('TEXT_JSON:', JSON.stringify(result.text));

    const normalized = result.text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    console.log('NORMALIZED:', JSON.stringify(normalized));
    console.log('PHRASE_PRESENT:', normalized.includes('HOEOS KNOWN PHRASE 7F3A9C'));

    expect(result.success).toBe(true);
    expect(result.extractionMethod).toBe('ocr_tesseract');
    expect(result.ocrUsed).toBe(true);
    expect(result.ocrStatus).toBe('USED');
    expect(result.text.length).toBeGreaterThan(0);
    expect(normalized).toContain('HOEOS KNOWN PHRASE 7F3A9C');
  }, 120000);
});
