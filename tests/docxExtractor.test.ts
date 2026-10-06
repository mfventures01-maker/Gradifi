/**
 * G5-M03 PHASE 4 TEST HARNESS
 *
 * Loads the fixture manifest and exercises extractDocx from
 * src/services/verify/ingestionAdapters/docxExtractor.ts.
 *
 * The module does not exist yet. On first run this file will fail on
 * the import. That failure is the EXPECTED BEFORE state for G5-M03.
 * When the module is implemented (Phase 5), the import resolves and
 * the assertions below execute.
 *
 * This file is a test artifact. It is NOT imported by production code.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractDocx } from '../src/services/verify/ingestionAdapters/docxExtractor';

import * as builders from './fixtures/docx/builders';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, 'fixtures', 'docx');

type ValidFixture = {
  id: string;
  source: 'real' | 'builder';
  file?: string;
  builder?: string;
  expect: {
    success: true;
    warningsContains?: string[];
    canonicalTextContains?: string[];
    canonicalTextExcludes?: string[];
  };
};

type AdversarialFixture = {
  id: string;
  source: 'real' | 'builder';
  file?: string;
  builder?: string;
  expect: {
    success: false;
    errorCode: string;
  };
};

const manifest = JSON.parse(
  readFileSync(join(FIXTURE_ROOT, 'manifest.json'), 'utf-8'),
) as {
  valid: ValidFixture[];
  adversarial: AdversarialFixture[];
};

function loadFixtureBytes(f: { source: string; file?: string; builder?: string }): Uint8Array {
  if (f.source === 'real') {
    if (!f.file) throw new Error('real fixture requires file');
    return new Uint8Array(readFileSync(join(FIXTURE_ROOT, f.file)));
  }
  if (f.source === 'builder') {
    if (!f.builder) throw new Error('builder fixture requires builder');
    const fn = (builders as Record<string, () => Uint8Array>)[f.builder];
    if (!fn) throw new Error(`builder not found: ${f.builder}`);
    return fn();
  }
  throw new Error(`unknown fixture source: ${f.source}`);
}

describe('G5-M03 DOCX extractor contract', () => {
  describe('valid fixtures (F-series)', () => {
    for (const f of manifest.valid) {
      it(`${f.id} - ${f.builder ?? f.file}`, async () => {
        const bytes = loadFixtureBytes(f);
        const result = await extractDocx(bytes);

        expect(result.success).toBe(true);
        if (f.expect.warningsContains) {
          const codes = result.warnings.map((w) => w.code);
          for (const code of f.expect.warningsContains) {
            expect(codes).toContain(code);
          }
        }
        if (f.expect.canonicalTextContains) {
          for (const s of f.expect.canonicalTextContains) {
            expect(result.canonicalText).toContain(s);
          }
        }
        if (f.expect.canonicalTextExcludes) {
          for (const s of f.expect.canonicalTextExcludes) {
            expect(result.canonicalText).not.toContain(s);
          }
        }
      });
    }
  });

  describe('adversarial fixtures (A-series)', () => {
    for (const f of manifest.adversarial) {
      it(`${f.id} - ${f.builder ?? f.file}`, async () => {
        const bytes = loadFixtureBytes(f);
        const result = await extractDocx(bytes);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(f.expect.errorCode);
      });
    }
  });

  describe('determinism', () => {
    it('F02 processed twice produces identical canonicalTextHash', async () => {
      const bytes = builders.buildF02XmlSpace();
      const a = await extractDocx(bytes);
      const b = await extractDocx(bytes);
      expect(a.canonicalTextHash).toBe(b.canonicalTextHash);
      expect(a.canonicalText).toBe(b.canonicalText);
      expect(JSON.stringify(a.segments)).toBe(JSON.stringify(b.segments));
      expect(JSON.stringify(a.warnings)).toBe(JSON.stringify(b.warnings));
    });
  });
});
