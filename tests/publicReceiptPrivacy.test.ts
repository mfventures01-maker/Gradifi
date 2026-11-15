import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, selectMock, eqMock, maybeSingleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn()
}));

vi.mock('../src/lib/supabase.js', () => ({
  supabase: { from: fromMock }
}));

import { PublicVerificationService } from '../src/services/verify/publicVerificationService.js';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService.js';

describe('public receipt privacy boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const documentHash = '0123456789abcdef';
    const evidenceHash = 'fedcba9876543210';
    const row = {
      verification_id: VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash),
      document_hash: documentHash,
      evidence_hash: evidenceHash,
      engine_version: 'G5-DETERMINISTIC-v1',
      policy_version: 'G3-POLICY-v1',
      overall_similarity: 12.5,
      total_sources_found: 2,
      created_at: '2026-11-16T00:00:00.000Z'
    };
    maybeSingleMock.mockResolvedValue({ data: row, error: null });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });
  });

  it('queries and returns only public receipt metadata, never the private evidence envelope', async () => {
    const documentHash = '0123456789abcdef';
    const evidenceHash = 'fedcba9876543210';
    const id = VerificationPersistenceService.deriveVerificationId(documentHash, evidenceHash);

    const result = await new PublicVerificationService().resolveVerification(id);

    expect(result.status).toBe('VALID');
    expect(selectMock).toHaveBeenCalledWith(
      'verification_id,document_hash,evidence_hash,engine_version,policy_version,overall_similarity,total_sources_found,created_at'
    );
    expect(result.record).not.toHaveProperty('evidence_envelope');
  });
});
