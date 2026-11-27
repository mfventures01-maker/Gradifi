import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGeminiServerReasoning } from '../../src/services/verify/server/geminiServerHandler.js';
import {
  GeminiAgentRequestError,
  handleGeminiEvidenceAgentChat
} from '../../src/services/verify/server/geminiAgentServerHandler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.body?.action === 'agent_chat') {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string'
      ? authorization.match(/^Bearer\s+([^\s]+)$/i)
      : null;
    if (!match) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await handleGeminiEvidenceAgentChat(req.body, match[1]);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof GeminiAgentRequestError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('[verify/gemini] Evidence agent request failed');
      return res.status(500).json({ error: 'Gemini evidence assistant request failed' });
    }
  }

  // Backward-compatible provider-federation request. This path returns advisory
  // AI findings only; deterministic G5 scores and evidence are computed elsewhere.
  try {
    const result = await handleGeminiServerReasoning(req.body);
    return res.status(200).json(result);
  } catch {
    console.error('[verify/gemini] Provider reasoning request failed');
    return res.status(500).json({ error: 'Gemini provider reasoning failed' });
  }
}
