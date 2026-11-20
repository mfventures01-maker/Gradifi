import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../src/lib/supabase.js', () => ({
  supabase: { rpc: rpcMock, from: fromMock },
}));

import { PublicVerificationService } from '../src/services/verify/publicVerificationService.js';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService.js';

describe('G7 public receipt RPC privacy boundary', () => {
  const documentHash = '0123456789abcdef';
  const evidenceHash = 'fedcba9876543210';
  const verificationId = VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash);
  const publicDto = {
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
    correctionOfVerificationId: 'VRF-ABCDEF012345',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: publicDto, error: null });
  });

  it('uses the SECURITY DEFINER receipt RPC and never directly selects the table', async () => {
    const result = await new PublicVerificationService().resolveVerification(verificationId);

    expect(rpcMock).toHaveBeenCalledWith('lookup_public_verification', {
      p_verification_id: verificationId,
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.status).toBe('VALID');
    expect(result.record?.correction_of_verification_id).toBe('VRF-ABCDEF012345');
  });

  it('returns only allowlisted metadata and never exposes the private evidence envelope', async () => {
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.record).not.toHaveProperty('evidence_envelope');
    expect(JSON.stringify(result)).not.toContain('canonicalDocument');
    expect(JSON.stringify(result)).not.toContain('rawText');
  });

  it('rejects a receipt whose derived ID does not match its hashes', async () => {
    rpcMock.mockResolvedValue({
      data: { ...publicDto, verificationId: 'VRF-FFFFFFFFFFFF' },
      error: null,
    });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('INTEGRITY_FAILED');
  });

  it('rejects missing result, manifest or schema metadata', async () => {
    rpcMock.mockResolvedValue({
      data: { ...publicDto, resultHash: null },
      error: null,
    });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('MALFORMED_RECORD');
  });

  it('returns NOT_FOUND when the RPC returns no eligible public receipt', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('NOT_FOUND');
  });

  it('fails closed when the RPC reports an error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('permission denied') });
    const result = await new PublicVerificationService().resolveVerification(verificationId);
    expect(result.status).toBe('RESOLUTION_ERROR');
    expect(result.errorMessage).not.toContain('permission denied');
  });

  it('rejects malformed IDs before making any database request', async () => {
    const result = await new PublicVerificationService().resolveVerification('VRF-SHORT');
    expect(result.status).toBe('INVALID_FORMAT');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
