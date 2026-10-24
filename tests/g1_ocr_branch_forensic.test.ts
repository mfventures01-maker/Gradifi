import { describe, it } from 'vitest';
import fs from 'fs';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

describe('G1 OCR branch forensic', () => {
  it('prints the exact production extraction result', { timeout: 60000 }, async () => {
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

    console.log('');
    console.log('=== G1 OCR BRANCH FORENSIC ===');
    console.log('SUCCESS:', result.success);
    console.log('METHOD:', result.extractionMethod);
    console.log('OCR_USED:', result.ocrUsed);
    console.log('OCR_STATUS:', result.ocrStatus);
    console.log('TEXT_LENGTH:', result.text.length);
    console.log('WORD_COUNT:', result.wordCount);
    console.log('TEXT_JSON:', JSON.stringify(result.text));
    console.log(
      'KNOWN_PHRASE_PRESENT:',
      result.text.includes('HOEOS_KNOWN_PHRASE_7F3A9C')
    );
    console.log(
      'KNOWN_PHRASE_INDEX:',
      result.text.indexOf('HOEOS_KNOWN_PHRASE_7F3A9C')
    );
    console.log('=== END G1 OCR BRANCH FORENSIC ===');
  });
});
