import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createWorkerMock } = vi.hoisted(() => ({
  createWorkerMock: vi.fn()
}));

vi.mock('tesseract.js', () => ({ createWorker: createWorkerMock }));

import { ocrService } from '../src/services/ocrService';

describe('Tesseract OCR lifecycle', () => {
  beforeEach(() => {
    vi.useRealTimers();
    createWorkerMock.mockReset();
  });

  it('returns recognised text, confidence and words, then terminates worker', async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    const recognize = vi.fn().mockResolvedValue({
      data: {
        text: 'Recognised SEFAES evidence text',
        confidence: 87.4,
        words: [{ text: 'Recognised', confidence: 91 }, { text: 'evidence', confidence: 83 }],
        lines: [{ text: 'Recognised SEFAES evidence text' }]
      }
    });
    createWorkerMock.mockResolvedValue({ recognize, terminate });

    const result = await ocrService.extractText(new Uint8Array([1, 2, 3]));

    expect(result.text).toBe('Recognised SEFAES evidence text');
    expect(result.confidence).toBe(87.4);
    expect(result.wordCount).toBe(2);
    expect(result.words[0].confidence).toBe(91);
    expect(result.lines).toEqual(['Recognised SEFAES evidence text']);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('derives lexical word records when Tesseract omits data.words', async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'HOEOS known phrase 7F3A9C', confidence: 76 }
      }),
      terminate
    });

    const result = await ocrService.extractText(new Uint8Array([1]));
    expect(result.wordCount).toBe(4);
    expect(result.words.map(word => word.text)).toEqual(['HOEOS', 'known', 'phrase', '7F3A9C']);
    expect(result.words.every(word => word.confidence === 76)).toBe(true);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('terminates the worker when recognition throws', async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockRejectedValue(new Error('recognition failed')),
      terminate
    });

    await expect(ocrService.extractText(new Uint8Array([1]))).rejects.toThrow('OCR_WORKER_FAILURE');
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('terminates a worker that resolves after startup timeout', async () => {
    vi.useFakeTimers();
    let resolveWorker!: (worker: any) => void;
    const lateTerminate = vi.fn().mockResolvedValue(undefined);
    const lateWorker = { recognize: vi.fn(), terminate: lateTerminate };
    createWorkerMock.mockImplementation(() => new Promise(resolve => {
      resolveWorker = resolve;
    }));

    const extraction = ocrService.extractText(new Uint8Array([1]), 10);
    const assertion = expect(extraction).rejects.toThrow('OCR_TIMEOUT');
    await vi.advanceTimersByTimeAsync(11);
    await assertion;

    resolveWorker(lateWorker);
    await Promise.resolve();
    await Promise.resolve();
    expect(lateTerminate).toHaveBeenCalledOnce();
  });
});
