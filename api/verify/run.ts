import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTrustedVerifyRun } from '../../runtime/src/services/verify/server/verifyRunServerHandler.js';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 8;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

function requestIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : '';
  return firstForwarded || req.socket.remoteAddress || 'unknown';
}

function allowRequest(ip: string, now = Date.now()): boolean {
  const current = requestBuckets.get(ip);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }

  if (current.count >= RATE_LIMIT_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!allowRequest(requestIp(req))) {
    return res.status(429).json({
      code: 'VERIFY_RATE_LIMITED',
      error: 'Verification request limit reached. Please wait one minute and try again.'
    });
  }

  try {
    const response = await handleTrustedVerifyRun(req.body || {});
    return res.status(200).json(response);
  } catch (error: any) {
    const code = error?.message === 'DOCUMENT_TOO_LARGE'
      ? 'DOCUMENT_TOO_LARGE'
      : error?.message === 'DOCUMENT_TEXT_REQUIRED'
        ? 'DOCUMENT_TEXT_REQUIRED'
        : 'VERIFY_RUN_FAILED';
    const status = code === 'DOCUMENT_TOO_LARGE' ? 413 : code === 'DOCUMENT_TEXT_REQUIRED' ? 400 : 500;

    return res.status(status).json({
      code,
      error: code === 'DOCUMENT_TOO_LARGE'
        ? 'Document text exceeds the 1 MB verification limit.'
        : code === 'DOCUMENT_TEXT_REQUIRED'
          ? 'A non-empty documentText field is required.'
          : 'Server-side verification could not be completed.'
    });
  }
}
