import fs from 'fs';
import path from 'path';
import { extractDocx } from '../src/services/verify/ingestionAdapters/docxExtractor';

const DOCX_PATH = 'C:\\Users\\faith\\Downloads\\Berewa Holmes Barbar CW CROSSRAIL ELIZABETH LINE.docx';

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
  const logDir = 'C:\\Projects\\Gradifi-evidence';
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `docx-diagnostic-${stamp}.log`);

  const lines: string[] = [];
  const log = (s: string) => { lines.push(s); console.log(s); };

  log(`DOCX_PATH=${DOCX_PATH}`);
  if (!fs.existsSync(DOCX_PATH)) {
    log(`FILE_MISSING=true`);
    fs.writeFileSync(logPath, lines.join('\n'), 'utf-8');
    process.exit(1);
  }

  const buf = fs.readFileSync(DOCX_PATH);
  log(`DOCX_BYTES=${buf.length}`);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const u8 = new Uint8Array(ab);

  log('');
  log('=== INVOKING extractDocx ===');
  let res: any;
  try {
    res = await extractDocx(u8);
  } catch (e: any) {
    log(`THREW=${e?.message ?? String(e)}`);
    if (e?.stack) log(e.stack);
    fs.writeFileSync(logPath, lines.join('\n'), 'utf-8');
    process.exit(1);
  }

  log('');
  log('=== RESULT SHAPE ===');
  log(`KEYS=${Object.keys(res).join(', ')}`);
  log(`success=${res.success}`);
  log(`text_length=${res.text?.length ?? 'undefined'}`);
  log(`segments_length=${res.segments?.length ?? 'undefined'}`);
  log(`warnings_count=${res.warnings?.length ?? 'undefined'}`);
  log(`error=${res.error ? JSON.stringify(res.error) : 'undefined'}`);

  if (res.error) {
    log('');
    log('=== EXTRACTION FAILURE ===');
    log(`CODE=${res.error.code}`);
    log(`MESSAGE=${res.error.message}`);
    if (res.error.details) log(`DETAILS=${JSON.stringify(res.error.details)}`);
  }

  if (Array.isArray(res.warnings) && res.warnings.length > 0) {
    log('');
    log('=== WARNINGS ===');
    for (const w of res.warnings) {
      log(`- ${w.code}: ${w.message}${w.xmlPath ? ' @ ' + w.xmlPath : ''}`);
    }
  }

  if (typeof res.text === 'string' && res.text.length > 0) {
    log('');
    log('=== TEXT PREVIEW (first 1000 chars) ===');
    log(JSON.stringify(res.text.substring(0, 1000)));

    log('');
    log('=== TEXT TAIL (last 500 chars) ===');
    log(JSON.stringify(res.text.substring(Math.max(0, res.text.length - 500))));

    log('');
    log('=== FORENSIC MARKERS ===');
    log(`contains_7004SOM=${res.text.includes('7004SOM')}`);
    log(`contains_Data_Dash=${res.text.includes('Data-')}`);
    log(`contains_single_D_line=${/^D$/m.test(res.text)}`);
    log(`contains_riven_line=${/^riven /m.test(res.text)}`);
    log(`contains_Unknown_Author=${res.text.includes('Unknown Author')}`);
    log(`line_count=${res.text.split('\n').length}`);
    const lines_with_1_char = res.text.split('\n').filter((l: string) => l.trim().length === 1).length;
    log(`lines_with_1_char=${lines_with_1_char}`);
    const avg_line_length = res.text.split('\n').reduce((a: number, l: string) => a + l.length, 0) / res.text.split('\n').length;
    log(`avg_line_length=${avg_line_length.toFixed(1)}`);
  }

  if (Array.isArray(res.segments) && res.segments.length > 0) {
    log('');
    log('=== FIRST 20 SEGMENTS ===');
    const kinds: Record<string, number> = {};
    for (const s of res.segments) {
      kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    }
    log('SEGMENT_KIND_COUNTS=' + JSON.stringify(kinds));
    log('');
    for (const s of res.segments.slice(0, 20)) {
      log(`kind=${s.kind} text=${JSON.stringify(String(s.text || '').substring(0, 60))} paragraphOrdinal=${s.paragraphOrdinal}`);
    }
  }

  fs.writeFileSync(logPath, lines.join('\n'), 'utf-8');
  log('');
  log(`LOG_WRITTEN=${logPath}`);
})().catch((e) => {
  console.error('FATAL=' + (e?.message ?? String(e)));
  process.exit(1);
});