import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleNemotronServerReasoning } from '../../src/services/verify/server/nemotronServerHandler';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await handleNemotronServerReasoning(req.body);
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
