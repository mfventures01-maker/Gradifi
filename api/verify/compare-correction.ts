import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  handleCorrectionComparisonRequest,
  CorrectionComparisonRequestError
} from '../../src/services/verify/server/correctionComparisonServerHandler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\\s+([^\\s]+)$/i)
    : null;
  if (!match) return res.status(401).json({ error: 'Authentication required' });

  try {
    const comparison = await handleCorrectionComparisonRequest(req.body, match[1]);
    return res.status(200).json({ comparison });
  } catch (error) {
    if (error instanceof CorrectionComparisonRequestError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('[verify/compare-correction] Trusted comparison failed', error);
    return res.status(500).json({ error: 'Correction comparison failed' });
  }
}
