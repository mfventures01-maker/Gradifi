import * as fs from 'fs';
import { extractDocx } from './src/services/verify/ingestionAdapters/docxExtractor';
import { segmentDocument } from './src/services/verify/documentNormalizer';

async function main() {
  const docxPath = process.argv[2];
  if (!docxPath) { console.error('USAGE: tsx measure-document.ts <docx-path>'); process.exit(1); }

  const raw = fs.readFileSync(docxPath);
  const bytes = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));

  const extraction = await extractDocx(bytes);
  console.log('EXTRACTED_LENGTH:', extraction.canonicalText.length);
  console.log('CANONICAL_HASH:', extraction.canonicalTextHash);
  console.log('SUCCESS:', extraction.success);

  const seg = segmentDocument(extraction.canonicalText, 'DOC-MEASURE');
  const totalParagraphs = seg.paragraphs.length;
  const totalSentences = seg.paragraphs.reduce((n, p) => n + p.sentences.length, 0);
  const totalPhrases = seg.paragraphs.reduce(
    (n, p) => n + p.sentences.reduce((m, s) => m + s.phrases.length, 0),
    0
  );

  console.log('PARAGRAPHS:', totalParagraphs);
  console.log('SENTENCES:', totalSentences);
  console.log('PHRASES:', totalPhrases);
  console.log('TOKENS:', seg.totalTokens);

  // Distribution: how many sentences per paragraph (to see if segmentation is sane)
  console.log('\nSENTENCE_DISTRIBUTION_PER_PARAGRAPH:');
  seg.paragraphs.forEach((p, i) => {
    if (i < 20) console.log(`  PAR-${String(i+1).padStart(3,'0')}: ${p.sentences.length} sentences, ${p.tokenCount} tokens, ${p.text.length} chars`);
  });
  if (seg.paragraphs.length > 20) console.log(`  ... and ${seg.paragraphs.length - 20} more paragraphs`);

  // Write JSON for the evidence packet
  const out = {
    documentPath: docxPath,
    extractedLength: extraction.canonicalText.length,
    canonicalHash: extraction.canonicalTextHash,
    paragraphs: totalParagraphs,
    sentences: totalSentences,
    phrases: totalPhrases,
    tokens: seg.totalTokens,
    measuredAt: new Date().toISOString()
  };
  fs.writeFileSync(process.env.MEASURE_OUT || 'measurement.json', JSON.stringify(out, null, 2));
  console.log('\nMEASUREMENT_JSON_WRITTEN');
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
