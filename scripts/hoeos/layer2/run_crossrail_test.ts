import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { ingestDocument } from '../../../src/services/verify/universalIngestionService';
import { verifyCoreService } from '../../../src/services/verify/verifyCoreService';

(async () => {
  const docxPath = process.argv[2];
  const outPath = process.argv[3];
  if (!docxPath || !outPath) { throw new Error('usage: run_crossrail_test.ts <docx> <out.json>'); }

  const buf = fs.readFileSync(docxPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const file = new File([ab], path.basename(docxPath));

  // Step 1: ingest document -> text (real production extraction path)
  const ingestStart = Date.now();
  const ingest = await ingestDocument(file);
  const ingestMs = Date.now() - ingestStart;

  if (!ingest.success || !ingest.text) {
    throw new Error('Ingestion failed: ' + (ingest.error?.message || 'no text'));
  }

  console.log('INGEST_SUCCESS=' + ingest.success);
  console.log('INGEST_EXTRACTION_METHOD=' + (ingest.extractionMethod || ''));
  console.log('INGEST_TEXT_LENGTH=' + ingest.text.length);
  console.log('INGEST_MS=' + ingestMs);

  // Step 2: verify run on extracted text (real production verification path)
  const verifyStart = Date.now();
  const result = await verifyCoreService.executeVerifyRun(ingest.text);
  const verifyMs = Date.now() - verifyStart;

  const out = {
    certification_anchor: 'hoeos-l2-mvp-v1',
    source_commit: '9ee57c353163e58c18459c1c0efb114c9e7456a8',
    evidence_commit: '123e999d61f994360717ccaaed6fdeabc3fc27d1',
    runner_commit: '1545a4ca60b47f86816f2bf0ef30cadad9352e6e',
    runner_hash: '5fa105d7c22615c50e08e385d58183de73e17fc2890c91809582e2617ed08672',
    closure_commit: 'fff552a1ea0698c5a107546a2de17bb2c6354d3b',
    closure_note_hash: 'b03edaedefd561241131a244a7caeec0f808ec714e3e241209db765c6cda0d23',
    input_docx_sha256: createHash('sha256').update(buf).digest('hex'),
    input_docx_filename: path.basename(docxPath),
    input_docx_bytes: buf.length,
    ingest: {
      success: ingest.success,
      extractionMethod: ingest.extractionMethod || null,
      textLength: ingest.text.length,
      elapsedMs: ingestMs
    },
    verify: {
      elapsedMs: verifyMs,
      result
    }
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('WROTE=' + outPath);
  console.log('DOCUMENT_HASH=' + (result.documentHash || ''));
  console.log('EVIDENCE_HASH=' + (result.evidenceHash || ''));
  console.log('OVERALL_SIMILARITY=' + (result.overallSimilarity ?? ''));
  console.log('UNIQUE_MATCHED_COVERAGE=' + (result.uniqueMatchedCoverage ?? ''));
  console.log('HIGHEST_SOURCE_MATCH=' + (result.highestSourceMatch ?? ''));
  console.log('TOTAL_SOURCES_FOUND=' + (result.totalSourcesFound ?? ''));
  console.log('VERIFY_MS=' + verifyMs);
})().catch((e: any) => {
  console.error('ERROR=' + (e?.message ?? String(e)));
  if (e?.stack) console.error(e.stack);
  process.exit(1);
});