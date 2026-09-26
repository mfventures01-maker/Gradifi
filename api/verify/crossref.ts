import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCrossrefServerSearch } from '../../src/services/verify/server/crossrefServerHandler';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await handleCrossrefServerSearch(req.body);
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
