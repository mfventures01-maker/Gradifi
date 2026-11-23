import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeVerifyRun, executeGranularSimilarityAnalysis, buildCanonicalAnalysisDocument } = vi.hoisted(() => ({
  executeVerifyRun: vi.fn(),
  executeGranularSimilarityAnalysis: vi.fn(),
  buildCanonicalAnalysisDocument: vi.fn((input: { rawText: string }) => ({
    rawText: input.rawText,
    extractionStatus: 'SUCCESS',
  })),
}));

vi.mock('../src/services/verify/verifyCoreService.js', () => ({
  verifyCoreService: { executeVerifyRun, executeGranularSimilarityAnalysis },
}));
vi.mock('../src/services/verify/documentNormalizer.js', () => ({
  buildCanonicalAnalysisDocument,
}));

import handler from '../api/verify/run.js';

function mockResponse() {
  const response: any = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
}

describe('server-enforced public trial execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://sefaes.example';
    process.env.SUPABASE_ANON_KEY = 'public-anon-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      checksRemaining: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    executeVerifyRun.mockResolvedValue({ overallSimilarity: 10 });
    executeGranularSimilarityAnalysis.mockResolvedValue({ findings: [] });
  });

  it('consumes the trial token before invoking the real verification service', async () => {
    const order: string[] = [];
    (globalThis.fetch as any).mockImplementation(async () => {
      order.push('consume');
      return new Response(JSON.stringify({ success: true, checksRemaining: 2 }), { status: 200 });
    });
    executeVerifyRun.mockImplementation(async () => {
      order.push('g5');
      return { overallSimilarity: 10 };
    });

    const res = mockResponse();
    await handler({
      method: 'POST',
      body: { mode: 'verify', trialToken: 'x'.repeat(43), documentText: 'document text' },
    } as any, res as any);

    expect(order).toEqual(['consume', 'g5']);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.checksRemaining).toBe(2);
  });

  it('does not invoke G5 when the trial token is exhausted', async () => {
    (globalThis.fetch as any).mockResolvedValue(new Response(JSON.stringify({
      success: false,
      code: 'TRIAL_EXHAUSTED_OR_EXPIRED',
    }), { status: 429 }));

    const res = mockResponse();
    await handler({
      method: 'POST',
      body: { mode: 'verify', trialToken: 'x'.repeat(43), documentText: 'document text' },
    } as any, res as any);

    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('TRIAL_EXHAUSTED_OR_EXPIRED');
    expect(executeVerifyRun).not.toHaveBeenCalled();
  });

  it('charges a trial check for direct document comparison too', async () => {
    const res = mockResponse();
    await handler({
      method: 'POST',
      body: {
        mode: 'compare',
        trialToken: 'x'.repeat(43),
        studentText: 'student text',
        sourceText: 'source text',
      },
    } as any, res as any);

    expect(buildCanonicalAnalysisDocument).toHaveBeenCalledTimes(2);
    expect(executeGranularSimilarityAnalysis).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });
});
