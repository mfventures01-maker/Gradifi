import { beforeEach, describe, expect, it, vi } from 'vitest';

const { extractTextMock } = vi.hoisted(() => ({
  extractTextMock: vi.fn()
}));

vi.mock('../src/services/ocrService.js', () => ({
  ocrService: { extractText: extractTextMock }
}));

import { ingestDocument, detectFileFormat } from '../src/services/verify/universalIngestionService.js';

function arrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('G2 JPEG/PNG universal OCR ingestion', () => {
  beforeEach(() => extractTextMock.mockReset());

  it.each([
    ['sample.jpg', 'image/jpeg', [0xff, 0xd8, 0xff, 0x00]],
    ['sample.jpeg', 'image/jpeg', [0xff, 0xd8, 0xff, 0x00]],
    ['sample.png', 'image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]
  ])('routes %s through Tesseract and canonical convergence', async (name, mimeType, signature) => {
    extractTextMock.mockResolvedValue({
      text: 'SEFAES document identity verification evidence',
      confidence: 91,
      words: [],
      lines: [],
      wordCount: 5,
      charCount: 47
    });

    const result = await ingestDocument({
      name,
      mimeType,
      buffer: arrayBuffer(signature)
    });

    expect(result.success).toBe(true);
    expect(result.format).toBe(name.endsWith('.png') ? 'png' : name.endsWith('.jpeg') ? 'jpeg' : 'jpg');
    expect(result.extractionMethod).toBe('ocr_tesseract');
    expect(result.ocrUsed).toBe(true);
    expect(result.ocrStatus).toBe('USED');
    expect(result.canonicalReady).toBe(true);
    expect(result.canonicalDocument?.source.mimeType).toBe(mimeType);
    expect(result.canonicalDocument?.documentId).toBeTruthy();
    expect(extractTextMock).toHaveBeenCalledOnce();
  });

  it('infers image MIME from extension when caller omits MIME', async () => {
    extractTextMock.mockResolvedValue({
      text: 'A sufficiently long recognised document phrase',
      confidence: 88,
      words: [],
      lines: [],
      wordCount: 6,
      charCount: 47
    });
    const result = await ingestDocument({
      name: 'inferred.png',
      buffer: arrayBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    });
    expect(result.success).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.canonicalDocument?.source.mimeType).toBe('image/png');
  });

  it('rejects mismatched bytes before invoking OCR', async () => {
    const result = await ingestDocument({
      name: 'fake.jpg',
      buffer: arrayBuffer([0x00, 0x01, 0x02])
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_IMAGE_SIGNATURE');
    expect(result.ocrUsed).toBe(false);
    expect(extractTextMock).not.toHaveBeenCalled();
  });

  it('fails closed when OCR returns insufficient text', async () => {
    extractTextMock.mockResolvedValue({
      text: 'tiny',
      confidence: 99,
      words: [],
      lines: [],
      wordCount: 1,
      charCount: 4
    });
    const result = await ingestDocument({
      name: 'blank.png',
      buffer: arrayBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('OCR_NO_TEXT');
    expect(result.ocrUsed).toBe(true);
    expect(result.canonicalReady).toBe(false);
  });

  it.each([
    [92, []],
    [65, ['Moderate OCR confidence: 65.0. Verify extracted fields.']],
    [35, ['Low OCR confidence: 35.0. Human review required.']]
  ])('preserves confidence policy at %i', async (confidence, expectedWarnings) => {
    extractTextMock.mockResolvedValue({
      text: 'Recognised document content with enough readable characters',
      confidence,
      words: [],
      lines: [],
      wordCount: 8,
      charCount: 58
    });
    const result = await ingestDocument({
      name: 'confidence.jpg',
      buffer: arrayBuffer([0xff, 0xd8, 0xff])
    });
    expect(result.success).toBe(true);
    expect(result.warnings).toEqual(expectedWarnings);
  });

  it('detects image formats from MIME when extension is absent or unknown', () => {
    expect(detectFileFormat('scan.unknown', 'image/jpeg')).toBe('jpg');
    expect(detectFileFormat('scan.unknown', 'image/png')).toBe('png');
  });
});
