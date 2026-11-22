import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock('../src/lib/supabase.js', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import { executePublicTrialVerification } from '../src/services/verify/publicTrialService.js';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('public trial client contract', () => {
  let storage: MemoryStorage;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new MemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        trialToken: 't'.repeat(43),
        checksRemaining: 3,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });
  });

  it('starts a trial, sends the opaque token to the server gate and stores remaining checks', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: { overallSimilarity: 12.5 },
      checksRemaining: 2,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await executePublicTrialVerification<{ overallSimilarity: number }>({
      mode: 'verify',
      documentText: 'A real document text payload.',
    });

    expect(invokeMock).toHaveBeenCalledWith('trial', { body: { action: 'start' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.trialToken).toBe('t'.repeat(43));
    expect(request.mode).toBe('verify');
    expect(result.result.overallSimilarity).toBe(12.5);
    expect(result.checksRemaining).toBe(2);
    expect(storage.getItem('gradifi.public-trial.v1')).toContain('"checksRemaining":2');
  });

  it('reuses a valid tab-scoped token instead of starting another session', async () => {
    storage.setItem('gradifi.public-trial.v1', JSON.stringify({
      trialToken: 'r'.repeat(43),
      checksRemaining: 2,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: { ok: true },
      checksRemaining: 1,
    }), { status: 200 }));

    await executePublicTrialVerification({ mode: 'verify', documentText: 'document' });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).trialToken).toBe('r'.repeat(43));
  });

  it('clears an exhausted token and fails closed', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      success: false,
      code: 'TRIAL_EXHAUSTED_OR_EXPIRED',
      message: 'Trial exhausted.',
    }), { status: 429 }));

    await expect(executePublicTrialVerification({
      mode: 'verify',
      documentText: 'document',
    })).rejects.toThrow('Trial exhausted.');

    expect(storage.getItem('gradifi.public-trial.v1')).toBeNull();
  });
});
