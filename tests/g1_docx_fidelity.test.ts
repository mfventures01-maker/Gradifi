/**
 * G1 DOCX Fidelity Regression Test
 *
 * The full-size source fixture is intentionally external to the repository.
 * Set G1_DOCX_FIXTURE_PATH to its location on the machine running this suite.
 * When it is not supplied, Vitest reports these checks as skipped, never passed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { ingestDocument } from '../src/services/verify/universalIngestionService.js';

const FIXTURE =
  process.env.G1_DOCX_FIXTURE_PATH ??
  'C:/Users/faith/Downloads/DIGITAL THERMOMETER real.docx';

const fixtureAvailable = existsSync(FIXTURE);
let fixtureBuffer: ArrayBuffer;

describe.skipIf(!fixtureAvailable)('G1 DOCX ingestion fidelity', () => {
  beforeAll(() => {
    const buffer = readFileSync(FIXTURE);
    fixtureBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
  });

  const ingest = () =>
    ingestDocument({
      name: 'DIGITAL THERMOMETER real.docx',
      buffer: fixtureBuffer,
    });

  it('returns a canonical-ready document', async () => {
    const result = await ingest();
    expect(result.success).toBe(true);
    expect(result.canonicalReady).toBe(true);
    expect(result.canonicalDocument).toBeTruthy();
  });

  it('extracts more than 35,000 characters of canonical text', async () => {
    const result = await ingest();
    const text =
      (result.canonicalDocument && result.canonicalDocument.rawText) ||
      result.text ||
      '';
    expect(text.length).toBeGreaterThan(35_000);
  });

  it('preserves known word boundaries without fragmentation', async () => {
    const result = await ingest();
    const text =
      (result.canonicalDocument && result.canonicalDocument.rawText) ||
      result.text ||
      '';

    expect(text).toContain('Thermometer');
    expect(text).toContain('digital thermometer');
    expect(text).toContain('19th century');
    expect(text).not.toContain('T\nhermometer');
    expect(text).not.toContain('thermo\nmeters');
    expect(text).not.toContain('19\nth');
  });

  it('produces identical canonical text across repeated ingestion', async () => {
    const first = await ingest();
    const second = await ingest();
    const firstText = first.canonicalDocument?.rawText ?? '';
    const secondText = second.canonicalDocument?.rawText ?? '';

    expect(firstText).toBe(secondText);
  });
});
