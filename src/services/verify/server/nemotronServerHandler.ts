/**
 * GRADIFI VERIFY - SERVER-SIDE NEMOTRON REASONING HANDLER
 * Provable server/edge execution path for NVIDIA Nemotron Evidence Reasoning.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { AIFinding, EvidenceMatch, ProviderTruthStatus } from '../types.js';
import { validateAIFindingSchema, generateDeterministicFallbackFindings } from './geminiServerHandler.js';

export interface NemotronServerRequestPayload {
  documentText: string;
  matches: EvidenceMatch[];
  allowFallback?: boolean;
}

export interface NemotronServerResponse {
  status: ProviderTruthStatus;
  findings: AIFinding[];
  fallback_used: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
  errorMessage?: string;
  modelProvider?: string;
}

const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);

// Retry budget must fit inside Vercel's 30-second serverless gateway.
// Worst case: 8s + 0.5s + 8s = 16.5s, well under the edge timeout.
const MAX_ATTEMPTS = 2;
const BACKOFF_MS = [500];
const PER_ATTEMPT_TIMEOUT_MS = 8000;

const nemotronResponseCache = new Map<string, { body: NemotronServerResponse; expiresAt: number }>();
const NEMOTRON_CACHE_TTL_MS = 60_000;
const NEMOTRON_CACHE_MAX = 20;

function nemotronCacheKey(documentText: string, matches: EvidenceMatch[]): string {
  return `${documentText.slice(0, 100)}::${matches.length}`;
}

function getNemotronCache(key: string): NemotronServerResponse | null {
  const entry = nemotronResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    nemotronResponseCache.delete(key);
    return null;
  }
  return entry.body;
}

function setNemotronCache(key: string, body: NemotronServerResponse): void {
  nemotronResponseCache.set(key, { body, expiresAt: Date.now() + NEMOTRON_CACHE_TTL_MS });
  if (nemotronResponseCache.size > NEMOTRON_CACHE_MAX) {
    const firstKey = nemotronResponseCache.keys().next().value;
    if (firstKey) nemotronResponseCache.delete(firstKey);
  }
}

export async function callNvidiaWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = MAX_ATTEMPTS
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS)
      });
      if (!RETRIABLE_STATUSES.has(resp.status)) {
        return resp;
      }
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      await new Promise(r =>
        setTimeout(r, BACKOFF_MS[attempt - 1] ?? 500)
      );
    }
  }
  throw lastError ?? new Error('NVIDIA request failed');
}

export async function handleNemotronServerReasoning(payload: NemotronServerRequestPayload): Promise<NemotronServerResponse> {
  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map(m => m.sourceId));
  const allowFallback = Boolean(payload?.allowFallback);

  const cacheKey = nemotronCacheKey(documentText, matches);
  const cached = getNemotronCache(cacheKey);
  if (cached) return cached;

  const buildFailure = (status: ProviderTruthStatus, message: string): NemotronServerResponse => ({
    status,
    findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
    fallback_used: allowFallback,
    fallbackUsed: allowFallback,
    fallbackReason: allowFallback ? message : undefined,
    errorMessage: message,
    modelProvider: allowFallback ? 'deterministic_fallback' : 'nemotron'
  });

  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!nvidiaKey || nvidiaKey.includes('YOUR_')) {
    return buildFailure('AUTHENTICATION_FAILED', 'NVIDIA_API_KEY server configuration is unavailable');
  }

  try {
    const evidenceSummary = matches.slice(0, 3).map(m => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      snippet: m.originalSnippet.slice(0, 150)
    }));

    const prompt = `You are an academic integrity forensic analyst. Analyze this text for academic evidence overlap:
STUDENT TEXT: "${documentText.slice(0, 800)}"
VERIFIED EVIDENCE MATCHES: ${JSON.stringify(evidenceSummary)}

CRITICAL: You MUST respond ONLY with a raw JSON array matching this exact schema:
[
  {
    "type": "exact_overlap|lexical_overlap|semantic_overlap|citation_issue|writing_signal",
    "severity": "low|moderate|high",
    "confidence": 85,
    "studentPassage": "exact passage from student text",
    "sourcePassage": "exact passage from source",
    "explanation": "clear analytical explanation",
    "sourceId": "sourceId from matches if applicable",
    "requiresHumanReview": true
  }
]
Do NOT wrap in markdown backticks. Do NOT include any intro or outro text. Output ONLY valid JSON.`;

    let response: Response;
    try {
      response = await callNvidiaWithRetry(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nvidiaKey}`
          },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-super-120b-a12b',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.2
          })
        }
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out') || msg.includes('504');
      const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('network') || msg.includes('NetworkError');
      const isUnavailable = msg.includes('503') || msg.includes('502') || msg.includes('429');

      if (isTimeout) return buildFailure('TIMEOUT', `NVIDIA API timed out: ${msg}`);
      if (isNetwork) return buildFailure('NETWORK_ERROR', `NVIDIA API network error: ${msg}`);
      if (isUnavailable) return buildFailure('RUNTIME_UNAVAILABLE', `NVIDIA API unavailable: ${msg}`);

      return buildFailure('INFERENCE_FAILED', `NVIDIA API unreachable after ${MAX_ATTEMPTS} attempts: ${msg}`);
    }

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      const isUnavailable = response.status === 429 || response.status === 503 || response.status === 502;
      const isTimeout = response.status === 504;

      if (isAuthError) {
        return buildFailure('AUTHENTICATION_FAILED', `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`);
      }
      if (isUnavailable) {
        return buildFailure('RUNTIME_UNAVAILABLE', `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`);
      }
      if (isTimeout) {
        return buildFailure('TIMEOUT', `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`);
      }
      return buildFailure('INFERENCE_FAILED', `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return buildFailure('INFERENCE_FAILED', 'Nemotron response could not be parsed as JSON');
    }

    const content = data.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      return {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'nemotron'
      };
    }

    // Strip the Nemotron <think> reasoning block before JSON extraction.
    // Handles both complete and truncated (missing </think>) cases.
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*$/gi, '').trim();
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Extract the JSON array explicitly if present.
    const arrayMatch = cleanedContent.match(/\[[\s\S]*\]/);
    const cleanedJson = arrayMatch ? arrayMatch[0] : cleanedContent;

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      return buildFailure('INFERENCE_FAILED', 'Nemotron response could not be parsed as JSON');
    }

    if (!Array.isArray(parsed)) {
      return buildFailure('INFERENCE_FAILED', 'Nemotron response was not a JSON array');
    }

    if (parsed.length === 0) {
      const result: NemotronServerResponse = {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'nemotron'
      };
      setNemotronCache(cacheKey, result);
      return result;
    }

    let hasSchemaError = false;
    const validatedFindings: AIFinding[] = [];
    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (validated) {
        if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
          validated.sourceId = undefined;
        }
        validated.modelProvider = 'nemotron';
        validatedFindings.push(validated);
      } else {
        hasSchemaError = true;
      }
    }

    if (hasSchemaError || validatedFindings.length === 0) {
      return buildFailure('SCHEMA_INVALID', 'Nemotron JSON contained no valid findings matching schema');
    }

    const result: NemotronServerResponse = {
      status: 'VERIFIED',
      findings: validatedFindings,
      fallback_used: false,
      fallbackUsed: false,
      modelProvider: 'nemotron'
    };
    setNemotronCache(cacheKey, result);
    return result;
  } catch (error: any) {
    const msg = error?.message || String(error);
    const status = error?.status || error?.statusCode || error?.response?.status;
    const isAuthError = status === 401 || status === 403 || msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('AUTHENTICATION_FAILED');
    const isTimeout = status === 504 || error?.name === 'TimeoutError' || error?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out') || msg.includes('504');
    const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('network') || msg.includes('NetworkError');
    const isUnavailable = status === 503 || status === 502 || status === 429 || msg.includes('503') || msg.includes('502') || msg.includes('429');

    if (isAuthError) return buildFailure('AUTHENTICATION_FAILED', msg);
    if (isTimeout) return buildFailure('TIMEOUT', msg);
    if (isNetwork) return buildFailure('NETWORK_ERROR', msg);
    if (isUnavailable) return buildFailure('RUNTIME_UNAVAILABLE', msg);

    return buildFailure('INFERENCE_FAILED', msg || 'Nemotron server reasoning failed');
  }
}
