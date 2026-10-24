import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

describe('G1 Complete OCR Runtime Forensics', () => {
  it('captures the complete production ingestion result', async () => {

    const fixturePath = 'tests/fixtures/ingestion/scanned_page_001.pdf';

    const bytes = fs.readFileSync(fixturePath);

    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );

    const result = await ingestDocument({
      name: 'scanned_page_001.pdf',
      buffer
    });

    console.log('=== G1 COMPLETE RUNTIME RESULT ===');
    console.log('SUCCESS:', result.success);
    console.log('METHOD:', result.extractionMethod);
    console.log('OCR_USED:', result.ocrUsed);
    console.log('OCR_STATUS:', result.ocrStatus);
    console.log('TEXT_LENGTH:', result.text.length);
    console.log('TEXT_JSON:', JSON.stringify(result.text));
    console.log(
      'KNOWN_PHRASE:',
      result.text.includes('HOEOS_KNOWN_PHRASE_7F3A9C')
    );

    console.log(
      'KNOWN_PHRASE_INDEX:',
      result.text.indexOf('HOEOS_KNOWN_PHRASE_7F3A9C')
    );

    expect(result).toBeDefined();
  });
}, 30000);
