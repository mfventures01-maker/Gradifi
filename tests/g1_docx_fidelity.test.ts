/**
 * G1 DOCX Fidelity Test Contract
 *
 * Requirements:
 * - Portable fixture path resolution via G1_DOCX_FIXTURE_PATH or default repository fixture.
 * - Fails closed with actionable error if required fixture is missing (never silently skipped).
 * - Validates DOCX package integrity (PKZIP magic bytes).
 * - Verifies canonical-ready document output with > 35,000 extracted characters.
 * - Verifies known word boundary preservation (no fragmentation).
 * - Verifies deterministic canonical text and hash generation across repeated runs.
 * - Verifies error propagation on corrupted and invalid input.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ingestDocument } from '../src/services/verify/universalIngestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const EXPECTED_FIXTURE_SHA256 =
  '6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C';

export const DEFAULT_G1_FIXTURE_PATH = resolve(
  __dirname,
  'fixtures',
  'g1',
  'DIGITAL_THERMOMETER_real.docx',
);

export const G1_FIXTURE_PATH = process.env.G1_DOCX_FIXTURE_PATH
  ? resolve(process.env.G1_DOCX_FIXTURE_PATH.trim())
  : DEFAULT_G1_FIXTURE_PATH;

describe('G1 DOCX Ingestion Fidelity & Contract Certification', () => {
  let fixtureBuffer: ArrayBuffer;
  let fixtureSha256: string;
  let isDefaultFixture: boolean;

  beforeAll(() => {
    // 1. Verify fixture existence (fails closed, never silently skips)
    if (!existsSync(G1_FIXTURE_PATH)) {
      throw new Error(
        `[G1 FIXTURE MISSING] Required DOCX fixture not found at "${G1_FIXTURE_PATH}". ` +
          `Set G1_DOCX_FIXTURE_PATH or ensure the default fixture exists at "${DEFAULT_G1_FIXTURE_PATH}".`,
      );
    }

    const rawBuffer = readFileSync(G1_FIXTURE_PATH);

    // 2. Verify valid DOCX package structure (PKZIP magic header: 0x50, 0x4B, 0x03, 0x04)
    if (
      rawBuffer.length < 4 ||
      rawBuffer[0] !== 0x50 ||
      rawBuffer[1] !== 0x4b ||
      rawBuffer[2] !== 0x03 ||
      rawBuffer[3] !== 0x04
    ) {
      throw new Error(
        `[G1 FIXTURE INVALID] File at "${G1_FIXTURE_PATH}" is not a valid PKZIP/DOCX package (invalid magic header).`,
      );
    }

    // 3. Compute SHA-256 for audit and provenance verification
    fixtureSha256 = createHash('sha256').update(rawBuffer).digest('hex').toUpperCase();
    isDefaultFixture = G1_FIXTURE_PATH === DEFAULT_G1_FIXTURE_PATH;

    // Convert to ArrayBuffer
    fixtureBuffer = rawBuffer.buffer.slice(
      rawBuffer.byteOffset,
      rawBuffer.byteOffset + rawBuffer.byteLength,
    ) as ArrayBuffer;
  });

  const ingestFixture = () =>
    ingestDocument({
      name: 'DIGITAL_THERMOMETER_real.docx',
      buffer: fixtureBuffer,
    });

  it('validates fixture package integrity and known identity', () => {
    expect(fixtureBuffer.byteLength).toBeGreaterThan(0);
    if (isDefaultFixture) {
      expect(fixtureSha256).toBe(EXPECTED_FIXTURE_SHA256);
    }
  });

  it('ingestDocument returns a canonical-ready document', async () => {
    const result = await ingestFixture();
    expect(result.success).toBe(true);
    expect(result.canonicalReady).toBe(true);
    expect(result.canonicalDocument).toBeDefined();
    expect(result.extractionMethod).toBe('docx_xml_extractor');
    expect(result.format).toBe('docx');
    expect(result.extension).toBe('docx');
  });

  it('extracts more than 35,000 characters of canonical text', async () => {
    const result = await ingestFixture();
    const text =
      (result.canonicalDocument && result.canonicalDocument.rawText) ||
      result.text ||
      '';
    expect(text.length).toBeGreaterThan(35_000);
    expect(result.characterCount).toBeGreaterThan(35_000);
    expect(result.wordCount).toBeGreaterThan(5_000);
  });

  it('preserves known word boundaries without fragmentation', async () => {
    const result = await ingestFixture();
    const text =
      (result.canonicalDocument && result.canonicalDocument.rawText) ||
      result.text ||
      '';

    expect(text).toContain('Thermometer');
    expect(text).toContain('digital thermometer');
    expect(text).toContain('19th century');

    // Negative assertions: boundary fragmentation check
    expect(text).not.toContain('T\nhermometer');
    expect(text).not.toContain('thermo\nmeters');
    expect(text).not.toContain('19\nth');
  });

  it('extracts expected document domain terminology', async () => {
    const result = await ingestFixture();
    const text =
      (result.canonicalDocument && result.canonicalDocument.rawText) ||
      result.text ||
      '';

    expect(text.toLowerCase()).toContain('temperature');
    expect(text.toLowerCase()).toContain('sensor');
    expect(text.toLowerCase()).toContain('accuracy');
    expect(text.toLowerCase()).toContain('clinical');
  });

  it('produces identical canonical text and deterministic hash across repeated ingestion', async () => {
    const first = await ingestFixture();
    const second = await ingestFixture();

    const firstText = first.canonicalDocument?.rawText ?? '';
    const secondText = second.canonicalDocument?.rawText ?? '';
    expect(firstText).toBeTruthy();
    expect(firstText).toBe(secondText);

    const firstNorm = first.canonicalDocument?.normalizedText ?? '';
    const secondNorm = second.canonicalDocument?.normalizedText ?? '';
    expect(firstNorm).toBeTruthy();
    expect(firstNorm).toBe(secondNorm);

    const firstDocId = first.canonicalDocument?.documentId ?? '';
    const secondDocId = second.canonicalDocument?.documentId ?? '';
    expect(firstDocId).toBeTruthy();
    expect(firstDocId).toBe(secondDocId);
  });

  describe('Invalid and Corrupted DOCX Handling', () => {
    it('gracefully rejects corrupted non-zip binary buffer with typed error', async () => {
      const corruptedBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]).buffer;
      const result = await ingestDocument({
        name: 'corrupted.docx',
        buffer: corruptedBuffer,
      });

      expect(result.success).toBe(false);
      expect(result.canonicalReady).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('gracefully rejects empty buffer with typed error', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await ingestDocument({
        name: 'empty.docx',
        buffer: emptyBuffer,
      });

      expect(result.success).toBe(false);
      expect(result.canonicalReady).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
