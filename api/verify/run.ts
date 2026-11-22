import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCoreService } from '../../src/services/verify/verifyCoreService.js';
import { buildCanonicalAnalysisDocument } from '../../src/services/verify/documentNormalizer.js';

const MAX_TEXT_LENGTH = 1_000_000;

function errorResponse(res: VercelResponse, status: number, code: string, message: string, checksRemaining?: number) {
  return res.status(status).json({
    success: false,
    code,
    message,
    ...(Number.isInteger(checksRemaining) ? { checksRemaining } : {}),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  }

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const trialToken = typeof body.trialToken === 'string' ? body.trialToken : '';
  const mode = body.mode;

  if (trialToken.length < 40 || trialToken.length > 100) {
    return errorResponse(res, 400, 'INVALID_TRIAL_TOKEN', 'A valid public trial token is required.');
  }

  if (mode === 'verify') {
    if (typeof body.documentText !== 'string' || !body.documentText.trim() || body.documentText.length > MAX_TEXT_LENGTH) {
      return errorResponse(res, 400, 'INVALID_DOCUMENT_TEXT', 'Document text is required and must be within the supported size limit.');
    }
  } else if (mode === 'compare') {
    if (
      typeof body.studentText !== 'string' ||
      typeof body.sourceText !== 'string' ||
      !body.studentText.trim() ||
      !body.sourceText.trim() ||
      body.studentText.length > MAX_TEXT_LENGTH / 2 ||
      body.sourceText.length > MAX_TEXT_LENGTH / 2
    ) {
      return errorResponse(res, 400, 'INVALID_COMPARISON_INPUT', 'Both comparison documents are required and must be within the supported size limit.');
    }
  } else {
    return errorResponse(res, 400, 'INVALID_VERIFICATION_MODE', 'Unsupported public verification mode.');
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) {
    return errorResponse(res, 503, 'TRIAL_GATE_CONFIGURATION_MISSING', 'Public trial verification is temporarily unavailable.');
  }

  let consumePayload: Record<string, unknown>;
  try {
    const consumeResponse = await fetch(`${supabaseUrl}/functions/v1/trial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ action: 'consume', trialToken }),
    });
    consumePayload = await consumeResponse.json().catch(() => ({}));
    if (!consumeResponse.ok || consumePayload.success !== true) {
      const code = typeof consumePayload.code === 'string' ? consumePayload.code : 'TRIAL_CONSUMPTION_UNAVAILABLE';
      const status = code === 'TRIAL_EXHAUSTED_OR_EXPIRED' ? 429
        : code === 'INVALID_TRIAL_TOKEN' ? 400
        : 503;
      return errorResponse(
        res,
        status,
        code,
        code === 'TRIAL_EXHAUSTED_OR_EXPIRED'
          ? 'Your free-trial checks have been used or the trial session has expired.'
          : 'The public trial authorization could not be confirmed.'
      );
    }
  } catch {
    return errorResponse(res, 503, 'TRIAL_CONSUMPTION_UNAVAILABLE', 'The public trial authorization service is unavailable.');
  }

  const checksRemaining = Number.isInteger(consumePayload.checksRemaining)
    ? Number(consumePayload.checksRemaining)
    : 0;

  try {
    if (mode === 'verify') {
      const result = await verifyCoreService.executeVerifyRun(body.documentText as string);
      return res.status(200).json({ success: true, result, checksRemaining });
    }

    const studentDoc = buildCanonicalAnalysisDocument({ rawText: body.studentText as string });
    const sourceDoc = buildCanonicalAnalysisDocument({ rawText: body.sourceText as string });
    if (studentDoc.extractionStatus !== 'SUCCESS' || sourceDoc.extractionStatus !== 'SUCCESS') {
      return errorResponse(res, 422, 'CANONICALIZATION_FAILED', 'The comparison documents could not be canonicalized.', checksRemaining);
    }
    const result = await verifyCoreService.executeGranularSimilarityAnalysis(studentDoc, sourceDoc);
    return res.status(200).json({ success: true, result, checksRemaining });
  } catch (error) {
    // The trial check is intentionally consumed before execution to prevent
    // expensive retries from bypassing the server-side usage limit.
    console.error('[verify/run] Public trial verification failed after token consumption.');
    return errorResponse(
      res,
      502,
      'VERIFICATION_EXECUTION_FAILED',
      'The verification attempt was consumed, but the verification engine could not complete the request.',
      checksRemaining
    );
  }
}
