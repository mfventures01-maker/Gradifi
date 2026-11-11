import fs from 'node:fs';
import path from 'node:path';
import { ingestDocument } from '../src/services/verify/universalIngestionService';

async function run() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    throw new Error('Pass one or more .jpg, .jpeg, or .png file paths.');
  }

  for (const filePath of paths) {
    const name = path.basename(filePath);
    const ext = path.extname(name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      throw new Error(`Unsupported image test extension: ${ext}`);
    }

    const bytes = fs.readFileSync(filePath);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const first: any = await ingestDocument({ name, mimeType, buffer });
    const second: any = await ingestDocument({ name, mimeType, buffer });

    console.log('\nIMAGE:', name);
    console.log('SUCCESS:', first.success);
    console.log('FORMAT:', first.format);
    console.log('METHOD:', first.extractionMethod);
    console.log('OCR_USED:', first.ocrUsed);
    console.log('OCR_STATUS:', first.ocrStatus);
    console.log('CHARACTERS:', first.characterCount);
    console.log('WORDS:', first.wordCount);
    console.log('CANONICAL_READY:', first.canonicalReady);
    console.log('CANONICAL_MIME:', first.canonicalDocument?.source?.mimeType);
    console.log('CONFIDENCE_WARNINGS:', JSON.stringify(first.warnings));
    console.log('CANONICAL_ID_RUN1:', first.canonicalDocument?.documentId);
    console.log('CANONICAL_ID_RUN2:', second.canonicalDocument?.documentId);
    console.log('TEXT_IDENTICAL:', first.text === second.text);
    console.log('ID_IDENTICAL:', first.canonicalDocument?.documentId === second.canonicalDocument?.documentId);

    if (!first.success || !second.success ||
        !first.ocrUsed || first.ocrStatus !== 'USED' ||
        !first.canonicalReady || !first.canonicalDocument ||
        first.wordCount <= 0 || first.characterCount <= 0 ||
        first.canonicalDocument.source.mimeType !== mimeType ||
        first.text !== second.text ||
        first.canonicalDocument.documentId !== second.canonicalDocument.documentId) {
      throw new Error(`IMAGE_INGESTION_CERTIFICATION_FAILED: ${name}`);
    }
  }

  console.log('\nG2 IMAGE OCR INGESTION: PASS');
}

run().catch(error => {
  console.error('G2_IMAGE_OCR_TEST_ERROR:', error);
  process.exit(1);
});
