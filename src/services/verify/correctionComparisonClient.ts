import { supabase } from '../../lib/supabase.js';

export interface CorrectionComparison {
  status: 'VALID';
  originalVerificationId: string;
  correctedVerificationId: string;
  originalDocumentHash: string;
  correctedDocumentHash: string;
  originalSimilarity: number;
  correctedSimilarity: number;
  similarityDelta: number;
  originalFindingCount: number;
  correctedFindingCount: number;
  resolvedFindingCount: number;
  remainingFindingCount: number;
  newFindingCount: number;
}

/** Sends only receipt IDs. All evidence retrieval and comparison remain server-side. */
export async function requestCorrectionComparison(
  originalVerificationId: string,
  correctedVerificationId: string
): Promise<CorrectionComparison> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('An authenticated session is required to compare correction receipts.');
  }
  const response = await fetch('/api/verify/compare-correction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ originalVerificationId, correctedVerificationId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.comparison) {
    throw new Error(data.error || 'Trusted correction comparison could not be completed.');
  }
  return data.comparison as CorrectionComparison;
}
