// scratch/test_ingestion_pipeline.ts
//
// Ingestion-only determinism test.
// For each fixture: run the adapter 5 times, SHA-256 the
// extracted text, compare. Classifies per fixture:
//   DETERMINISTIC — 5/5 identical SHA-256 and character count
//   UNSTABLE      — any SHA-256 or character count mismatch
//   NO_FIXTURE    — path does not exist
//   THREW         — adapter threw
//
// No providers. No federation. No Supabase. No receipts.

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

import {
  extractDocxText,
  extractOdtText,
  extractEpubText,
  extractPptxText,
  extractXlsxText,
} from '../src/services/verify/ingestionAdapters/officeZipAdapter';
import { extractPdfAdapter } from '../src/services/verify/ingestionAdapters/pdfAdapter';

const RUNS = 5;

type Adapter =
  | 'docx'
  | 'odt'
  | 'epub'
  | 'pptx'
  | 'xlsx'
  | 'pdf'
  | 'txt';

interface Fixture {
  label: string;
  path: string;
  adapter: Adapter;
}

const fixtures: Fixture[] = [
  {
    label: 'DOCX - thermometer (285 KB)',
    path: 'C:\\Users\\faith\\Downloads\\DIGITAL THERMOMETER real.docx',
    adapter: 'docx',
  },
  {
    label: 'DOCX - joystick (793 KB)',
    path: 'C:\\Users\\faith\\Downloads\\Design and Construction of a Joystick-Controlled Industrial automation System.docx',
    adapter: 'docx',
  },
  {
    label: 'DOCX - dark activated (812 KB)',
    path: 'C:\\Users\\faith\\Downloads\\DARK_ACTIVATED_SYSTEM_EXPANDED.docx',
    adapter: 'docx',
  },
  {
    label: 'TXT - overlap demo (1.7 KB)',
    path: 'C:\\Users\\faith\\Downloads\\OVERLAP_DEMO_DOC.txt',
    adapter: 'txt',
  },
  {
    label: 'MD - manifest (1.5 KB)',
    path: 'C:\\Users\\faith\\Downloads\\HOEOS_Reproduction_Kit_v2\\MANIFEST.md',
    adapter: 'txt',
  },
  {
    label: 'PDF - CARSS registry (3.2 KB)',
    path: 'C:\\Users\\faith\\Downloads\\CARSS_API_Registry_v2_Freeze.pdf',
    adapter: 'pdf',
  },
  {
    label: 'PPTX - presentation (5.7 MB)',
    path: 'C:\\Users\\faith\\Documents\\Presentation1 AMINATION.pptx',
    adapter: 'pptx',
  },
  {
    label: 'XLSX - QA discrepancy (14 KB)',
    path: 'C:\\Users\\faith\\Downloads\\CargoTrace_Free_Ship_Shore_QA_Discrepancy_Checker.xlsx',
    adapter: 'xlsx',
  },
  {
    label: 'EPUB - no fixture',
    path: 'C:\\Users\\faith\\Downloads\\__no_epub_fixture__.epub',
    adapter: 'epub',
  },
  {
    label: 'ODT - no fixture',
    path: 'C:\\Users\\faith\\Downloads\\__no_odt_fixture__.odt',
    adapter: 'odt',
  },
  {
    label: 'RTF - no fixture',
    path: 'C:\\Users\\faith\\Downloads\\__no_rtf_fixture__.rtf',
    adapter: 'txt',
  },
];

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

interface ExtractResult {
  success: boolean;
  text?: string;
  wordCount?: number;
  characterCount?: number;
  extractionMethod?: string;
  error?: any;
}

async function extract(
  adapter: Adapter,
  bytes: Buffer,
  fileName: string
): Promise<ExtractResult> {
  const buf = new Uint8Array(bytes);

  switch (adapter) {
    case 'docx':
      return await extractDocxText(buf);
    case 'odt':
      return await extractOdtText(buf);
    case 'epub':
      return await extractEpubText(buf);
    case 'pptx':
      return await extractPptxText(buf);
    case 'xlsx':
      return await extractXlsxText(buf);
    case 'pdf':
      // pdfAdapter accepts a File or { name, buffer }
      return await extractPdfAdapter({
        name: fileName,
        buffer: bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ),
      } as any);
    case 'txt': {
      const text = bytes.toString('utf8');
      return {
        success: true,
        text,
        characterCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        extractionMethod: 'txt_text_reader',
      };
    }
  }
}

async function testFixture(f: Fixture) {
  console.log(`\n========================================`);
  console.log(`FIXTURE: ${f.label}`);
  console.log(`ADAPTER: ${f.adapter}`);
  console.log(`PATH:    ${f.path}`);
  console.log(`========================================`);

  if (!existsSync(f.path)) {
    console.log('  NO_FIXTURE — path does not exist');
    return { label: f.label, classification: 'NO_FIXTURE' as const };
  }

  const bytes = readFileSync(f.path);
  const fileName = f.path.split('\\').pop() ?? 'unknown';
  console.log(`  File size: ${bytes.length} bytes`);

  const hashes: string[] = [];
  const charCounts: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`  run ${i + 1}/${RUNS}...`);
    try {
      const result = await extract(f.adapter, bytes, fileName);
      if (!result.success) {
        console.log(` FAILED: ${result.error?.message ?? 'unknown'}`);
        return { label: f.label, classification: 'THREW' as const };
      }
      const text = result.text ?? '';
      const hash = sha256(text);
      hashes.push(hash);
      charCounts.push(text.length);
      console.log(` chars=${text.length} sha=${hash.slice(0, 16)}...`);
    } catch (err: any) {
      console.log(` THREW: ${err?.message ?? err}`);
      return { label: f.label, classification: 'THREW' as const };
    }
  }

  const allSame = hashes.every(h => h === hashes[0]);
  const allCharsSame = charCounts.every(c => c === charCounts[0]);
  const classification = allSame && allCharsSame ? 'DETERMINISTIC' : 'UNSTABLE';

  console.log('');
  console.log(`  Distinct SHA-256 values: ${new Set(hashes).size}`);
  console.log(`  Distinct char counts:    ${new Set(charCounts).size}`);
  console.log(`  Classification: ${classification}`);

  return { label: f.label, classification: classification as 'DETERMINISTIC' | 'UNSTABLE' };
}

(async () => {
  const results: any[] = [];

  for (const f of fixtures) {
    results.push(await testFixture(f));
  }

  console.log(`\n========================================`);
  console.log('SUMMARY');
  console.log('========================================');

  for (const r of results) {
    console.log(`  ${r.label.padEnd(40)} ${r.classification}`);
  }

  const deterministic = results.filter(r => r.classification === 'DETERMINISTIC').length;
  const unstable = results.filter(r => r.classification === 'UNSTABLE').length;
  const noFixture = results.filter(r => r.classification === 'NO_FIXTURE').length;
  const threw = results.filter(r => r.classification === 'THREW').length;

  console.log(`\n  DETERMINISTIC: ${deterministic}`);
  console.log(`  UNSTABLE:      ${unstable}`);
  console.log(`  NO_FIXTURE:    ${noFixture}`);
  console.log(`  THREW:         ${threw}`);

  process.exit(unstable > 0 || threw > 0 ? 1 : 0);
})();