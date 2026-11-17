import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePersistenceServerRequest, PersistenceRequestError } from '../../src/services/verify/server/persistenceServerHandler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;
  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await handlePersistenceServerRequest(req.body, match[1]);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof PersistenceRequestError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    // Do not return database/provider internals or submitted document content.
    console.error('[verify/persist] Trusted persistence failed', error);
    return res.status(500).json({ error: 'Verification persistence failed' });
  }
}
