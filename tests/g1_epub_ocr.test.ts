import { ingestDocument } from '../src/services/verify/universalIngestionService';
import fs from 'fs';

async function run() {
  const fixturePath = 'tests/fixtures/ingestion/image_only.epub';
  const fileBytes = fs.readFileSync(fixturePath);
  const buffer = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength
  );

  const result = await ingestDocument({ name: 'image_only.epub', buffer });

  console.log('SUCCESS:', result.success);
  console.log('EXTRACTION_METHOD:', result.extractionMethod);
  console.log('OCR_USED:', result.ocrUsed);
  console.log('OCR_STATUS:', result.ocrStatus);
  console.log('TEXT_LENGTH:', result.text.length);
  console.log('TEXT_JSON:', JSON.stringify(result.text));

  const normalized = result.text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  console.log('NORMALIZED:', JSON.stringify(normalized));
  console.log('PHRASE_PRESENT:', normalized.includes('HOEOS KNOWN PHRASE 7F3A9C'));

  if (!result.success) {
    console.error('FAIL: success=false');
    process.exit(1);
  }
  if (result.extractionMethod !== 'epub_ocr_tesseract') {
    console.error('FAIL: extractionMethod=' + result.extractionMethod);
    process.exit(1);
  }
  if (!normalized.includes('HOEOS KNOWN PHRASE 7F3A9C')) {
    console.error('FAIL: phrase not recovered');
    process.exit(1);
  }
  console.log('G1 EPUB OCR: PASS');
  process.exit(0);
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
