import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGemmaServerReasoning } from '../../src/services/verify/server/gemmaServerHandler';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await handleGemmaServerReasoning(req.body);
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
