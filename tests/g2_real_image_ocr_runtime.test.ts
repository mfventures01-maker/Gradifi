import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { ingestDocument } from '../src/services/verify/universalIngestionService.js';
import { createWorker } from 'tesseract.js';

const phrase = 'GRADIFI G2 CANONICAL EVIDENCE TEST 7F3A9C';
const width = 2400;
const height = 600;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, width, height);
ctx.fillStyle = '#111111';
ctx.font = 'bold 64px Arial';
const phraseWidth = ctx.measureText(phrase).width;
const phraseFontSize = phraseWidth > width - 160
  ? Math.floor(64 * ((width - 160) / phraseWidth))
  : 64;
ctx.font = `bold ${phraseFontSize}px Arial`;
ctx.textBaseline = 'middle';
ctx.textAlign = 'center';
ctx.fillText(phrase, width / 2, 210, width - 160);
ctx.font = '36px Arial';
ctx.fillText('Repeatable image ingestion certification fixture', width / 2, 360, width - 160);

const fixtures = [
  { name: 'g2-runtime-fixture.png', mimeType: 'image/png', bytes: canvas.toBuffer('image/png') },
  { name: 'g2-runtime-fixture.jpg', mimeType: 'image/jpeg', bytes: canvas.toBuffer('image/jpeg', 95) }
];

const report: any[] = [];
for (const fixture of fixtures) {
  const signatureValid = fixture.mimeType === 'image/png'
    ? fixture.bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : fixture.bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (!signatureValid) throw new Error(`Generated fixture has invalid signature: ${fixture.name}`);

  const buffer = fixture.bytes.buffer.slice(
    fixture.bytes.byteOffset,
    fixture.bytes.byteOffset + fixture.bytes.byteLength
  ) as ArrayBuffer;

  // Probe Tesseract directly first, so failures can be localized to image decoding,
  // recognition, or the application adapter. This is diagnostic, not a substitute
  // for the production-path assertions below.
  let directProbe: any = { attempted: false };
  let diagnosticWorker: any;
  try {
    diagnosticWorker = await createWorker('eng');
    const raw: any = await diagnosticWorker.recognize(fixture.bytes);
    directProbe = {
      attempted: true,
      text: raw?.data?.text || '',
      confidence: raw?.data?.confidence ?? null,
      wordCount: Array.isArray(raw?.data?.words) ? raw.data.words.length : null
    };
  } catch (error: any) {
    directProbe = { attempted: true, error: String(error?.message || error) };
  } finally {
    if (diagnosticWorker) {
      try { await diagnosticWorker.terminate(); } catch { /* diagnostic cleanup */ }
    }
  }

  // Execute the actual universal ingestion path twice, with real Tesseract.js.
  const first: any = await ingestDocument({ name: fixture.name, mimeType: fixture.mimeType, buffer });
  const second: any = await ingestDocument({ name: fixture.name, mimeType: fixture.mimeType, buffer });
  const normalizedExpected = phrase.toLowerCase();
  const normalizedActual = String(first.canonicalDocument?.normalizedText || '');

  const item = {
    filename: fixture.name,
    mimeType: fixture.mimeType,
    byteLength: fixture.bytes.byteLength,
    inputSha256: await sha256(fixture.bytes),
    signatureValid,
    directProbe,
    first: summarize(first),
    second: summarize(second),
    expectedPhrase: phrase,
    phraseRecovered: normalizedActual.includes(normalizedExpected),
    textRepeatable: first.text === second.text,
    canonicalIdRepeatable: first.canonicalDocument?.documentId === second.canonicalDocument?.documentId,
    normalizedTextRepeatable: first.canonicalDocument?.normalizedText === second.canonicalDocument?.normalizedText
  };
  report.push(item);
  fs.writeFileSync(path.join(process.cwd(), 'g2-image-ocr-runtime-report.json'), JSON.stringify({
    certification: 'G2_REAL_IMAGE_OCR_RUNTIME',
    status: 'IN_PROGRESS',
    fixtures: report
  }, null, 2));

  if (!first.success || !second.success || !first.ocrUsed ||
      first.ocrStatus !== 'USED' || !first.canonicalReady ||
      !first.canonicalDocument || first.wordCount <= 0 ||
      !item.phraseRecovered || !item.textRepeatable ||
      !item.canonicalIdRepeatable || !item.normalizedTextRepeatable) {
    throw new Error(`REAL_IMAGE_OCR_CERTIFICATION_FAILED: ${fixture.name}: ${JSON.stringify(item)}`);
  }
}

const output = path.join(process.cwd(), 'g2-image-ocr-runtime-report.json');
fs.writeFileSync(output, JSON.stringify({
  certification: 'G2_REAL_IMAGE_OCR_RUNTIME',
  status: 'PASS',
  engine: 'Tesseract.js production service',
  execution: 'universalIngestionService.ingestDocument',
  fixtures: report
}, null, 2));
console.log(JSON.stringify({ status: 'PASS', report: output, fixtures: report }, null, 2));

function summarize(result: any) {
  return {
    success: result.success,
    extractionMethod: result.extractionMethod,
    ocrUsed: result.ocrUsed,
    ocrStatus: result.ocrStatus,
    characterCount: result.characterCount,
    wordCount: result.wordCount,
    confidenceWarnings: result.warnings,
    extractedText: result.text,
    normalizedText: result.canonicalDocument?.normalizedText,
    canonicalDocumentId: result.canonicalDocument?.documentId,
    canonicalMime: result.canonicalDocument?.source?.mimeType
  };
}

async function sha256(bytes: Buffer): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}
