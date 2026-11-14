import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Legacy client-authored persistence is intentionally disabled.
 * Verification results must be computed by /api/verify/run before a receipt
 * can be written with server authority.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(410).json({
    code: 'CLIENT_AUTHORED_PERSISTENCE_DISABLED',
    error: 'Client-authored verification persistence is disabled. Submit documentText to /api/verify/run.'
  });
}
