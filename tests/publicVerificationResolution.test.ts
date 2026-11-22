import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock('../src/lib/supabase.js', () => ({ supabase: { rpc: rpcMock } }));

import { PublicVerificationService } from '../src/services/verify/publicVerificationService.js';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService.js';

describe('G7 public verification resolution contract', () => {
  const documentHash = '8afcff6056b0d9123456789abcdef0123456789abcdef0123456789abcdef012';
  const evidenceHash = '9b0123456789abcd';
  const verificationId = VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash);
  const receipt = {
    verificationId,
    documentHash,
    evidenceHash,
    resultHash: 'a'.repeat(64),
    manifestHash: 'b'.repeat(64),
    engineVersion: 'G5-DETERMINISTIC-v1',
    policyVersion: 'G3-POLICY-v1',
    overallSimilarity: 12.5,
    sourceCount: 2,
    createdAt: '2026-11-20T00:00:00.000Z',
    schemaVersion: 'PUBLIC-RECEIPT-v1',
    correctionOfVerificationId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: receipt, error: null });
  });

  it('validates canonical receipt ID shape', () => {
    expect(PublicVerificationService.validateVerificationIdFormat('VRF-8AFCFF609B01')).toBe(true);
    expect(PublicVerificationService.validateVerificationIdFormat('vrf-8afcff609b01')).toBe(true);
    expect(PublicVerificationService.validateVerificationIdFormat('VRF-SHORT')).toBe(false);
    expect(PublicVerificationService.validateVerificationIdFormat('')).toBe(false);
  });

  it('returns a valid receipt from the allowlisted public RPC', async () => {
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(rpcMock).toHaveBeenCalledWith('lookup_public_verification', {
      p_verification_id: verificationId,
    });
    expect(result.status).toBe('VALID');
    expect(result.record?.verification_id).toBe(verificationId);
    expect(result.record?.document_hash).toBe(documentHash);
  });

  it('returns NOT_FOUND for an ineligible or missing receipt', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('NOT_FOUND');
    expect(result.record).toBeUndefined();
  });

  it('rejects hash/ID mismatch', async () => {
    rpcMock.mockResolvedValue({
      data: { ...receipt, documentHash: '000000000000d9123456789abcdef0123456789abcdef0123456789abcdef012' },
      error: null,
    });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('INTEGRITY_FAILED');
  });

  it('rejects malformed public metadata', async () => {
    rpcMock.mockResolvedValue({
      data: { ...receipt, overallSimilarity: 101 },
      error: null,
    });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('MALFORMED_RECORD');
  });

  it('fails closed when the public RPC is unavailable', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('private database detail') });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('RESOLUTION_ERROR');
    expect(result.errorMessage).not.toContain('private database detail');
  });
});
