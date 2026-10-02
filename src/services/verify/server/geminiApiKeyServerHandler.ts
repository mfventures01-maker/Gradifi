/**
 * GRADIFI VERIFY - SERVER-SIDE GEMINI API-KEY REASONING HANDLER
 * Provable server-only execution path for Gemini Evidence Reasoning using Google's API-key authentication.
 * Target Model: gemini-3.5-flash
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage, Provider Truth States.
 */

import { AIFinding, EvidenceMatch, ProviderTruthStatus } from '../types.js';
import {
  validateAIFindingSchema,
  generateDeterministicFallbackFindings,
  GeminiServerRequestPayload,
  GeminiServerResponse
} from './geminiFindingSchema.js';

export type { GeminiServerRequestPayload, GeminiServerResponse };

const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 2;
const BACKOFF_MS = [600];
const PER_ATTEMPT_TIMEOUT_MS = 8000;
const REQUESTED_MODEL = 'gemini-3.5-flash';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${REQUESTED_MODEL}:generateContent`;

const geminiApiKeyResponseCache = new Map<string, { body: GeminiServerResponse; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 20;

function buildCacheKey(documentText: string, matches: EvidenceMatch[]): string {
  return `${REQUESTED_MODEL}::${documentText.slice(0, 100)}::${matches.length}`;
}

export function getGeminiApiKeyCache(key: string): GeminiServerResponse | null {
  const entry = geminiApiKeyResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geminiApiKeyResponseCache.delete(key);
    return null;
  }
  return entry.body;
}

export function setGeminiApiKeyCache(key: string, body: GeminiServerResponse): void {
  geminiApiKeyResponseCache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
  if (geminiApiKeyResponseCache.size > CACHE_MAX_ENTRIES) {
    const firstKey = geminiApiKeyResponseCache.keys().next().value;
    if (firstKey) geminiApiKeyResponseCache.delete(firstKey);
  }
}

export function clearGeminiApiKeyCache(): void {
  geminiApiKeyResponseCache.clear();
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      type: {
        type: 'STRING',
        enum: ['exact_overlap', 'lexical_overlap', 'semantic_overlap', 'citation_issue', 'writing_signal']
      },
      severity: {
        type: 'STRING',
        enum: ['low', 'moderate', 'high']
      },
      confidence: { type: 'INTEGER' },
      studentPassage: { type: 'STRING' },
      sourcePassage: { type: 'STRING' },
      explanation: { type: 'STRING' },
      sourceId: { type: 'STRING' },
      requiresHumanReview: { type: 'BOOLEAN' }
    },
    required: ['type', 'severity', 'confidence', 'explanation', 'requiresHumanReview']
  }
};

/**
 * Deduplicate and sort findings canonically.
 */
function normalizeAndSortFindings(findings: AIFinding[]): AIFinding[] {
  const seen = new Set<string>();
  const unique: AIFinding[] = [];

  for (const f of findings) {
    const sig = `${f.type}::${f.sourceId || ''}::${(f.studentPassage || '').slice(0, 50)}::${(f.sourcePassage || '').slice(0, 50)}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      unique.push(f);
    }
  }

  const severityRank: Record<string, number> = { high: 3, moderate: 2, low: 1 };

  return unique.sort((a, b) => {
    const sDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sDiff !== 0) return sDiff;
    const cDiff = (b.confidence || 0) - (a.confidence || 0);
    if (cDiff !== 0) return cDiff;
    return a.type.localeCompare(b.type);
  });
}

/**
 * Executes a call to the Gemini API endpoint using x-goog-api-key authentication with retry.
 */
async function callGeminiWithRetry(
  apiKey: string,
  payloadBody: unknown,
  maxAttempts = MAX_ATTEMPTS
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(GEMINI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payloadBody),
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
      await new Promise(r => setTimeout(r, BACKOFF_MS[attempt - 1] ?? 500));
    }
  }

  throw lastError ?? new Error('Gemini API request failed');
}

/**
 * Core server-side handler for Gemini API-key reasoning.
 */
export async function handleGeminiApiKeyServerReasoning(
  payload: GeminiServerRequestPayload
): Promise<GeminiServerResponse> {
  const startTime = Date.now();
  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map(m => m.sourceId).filter(Boolean));
  const allowFallback = Boolean(payload?.allowFallback);

  const cacheKey = buildCacheKey(documentText, matches);
  const cached = getGeminiApiKeyCache(cacheKey);
  if (cached) return cached;

  const buildFailure = (
    status: ProviderTruthStatus,
    message: string,
    actualModel?: string
  ): GeminiServerResponse => {
    const latencyMs = Date.now() - startTime;
    return {
      status,
      findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
      fallback_used: allowFallback,
      fallbackUsed: allowFallback,
      fallbackReason: allowFallback ? message : undefined,
      errorMessage: message,
      modelProvider: allowFallback ? 'deterministic_fallback' : 'gemini',
      requestedModel: REQUESTED_MODEL,
      actualModel: actualModel || REQUESTED_MODEL,
      latencyMs
    };
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.includes('YOUR_') || apiKey.length < 10) {
    return buildFailure('AUTHENTICATION_FAILED', 'GEMINI_API_KEY server configuration is missing or invalid');
  }

  try {
    const evidenceSummary = matches.slice(0, 5).map(m => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      doi: m.doi || 'N/A',
      matchPercentage: m.matchPercentage,
      snippet: (m.originalSnippet || '').slice(0, 200)
    }));

    const prompt = `You are an academic integrity forensic analyst for Gradifi Verify.
Analyze the following student text against verified academic evidence:

STUDENT TEXT:
"${documentText.slice(0, 1500)}"

VERIFIED EVIDENCE MATCHES:
${JSON.stringify(evidenceSummary, null, 2)}

INSTRUCTIONS:
1. Synthesize findings strictly based on provided evidence matches.
2. You MUST NOT invent any source ID that is not listed in the provided VERIFIED EVIDENCE MATCHES.
3. Return JSON array of findings adhering strictly to schema. If no overlap, return empty JSON array [].
`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    };

    let response: Response;
    try {
      response = await callGeminiWithRetry(apiKey, requestBody);
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTimeout =
        err?.name === 'TimeoutError' ||
        err?.name === 'AbortError' ||
        msg.includes('timeout') ||
        msg.includes('timed out') ||
        msg.includes('504');
      const isNetwork =
        msg.includes('fetch failed') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('network') ||
        msg.includes('NetworkError');
      const isUnavailable = msg.includes('503') || msg.includes('502') || msg.includes('429');

      if (isTimeout) return buildFailure('TIMEOUT', `Gemini API timed out: ${msg}`);
      if (isNetwork) return buildFailure('NETWORK_ERROR', `Gemini API network error: ${msg}`);
      if (isUnavailable) return buildFailure('RUNTIME_UNAVAILABLE', `Gemini API unavailable: ${msg}`);

      return buildFailure('INFERENCE_FAILED', `Gemini API unreachable after ${MAX_ATTEMPTS} attempts: ${msg}`);
    }

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      const isUnavailable = response.status === 429 || response.status === 503 || response.status === 502;
      const isTimeout = response.status === 504;

      if (isAuthError) {
        return buildFailure('AUTHENTICATION_FAILED', `Gemini API returned HTTP ${response.status}: ${response.statusText}`);
      }
      if (isUnavailable) {
        return buildFailure('RUNTIME_UNAVAILABLE', `Gemini API returned HTTP ${response.status}: ${response.statusText}`);
      }
      if (isTimeout) {
        return buildFailure('TIMEOUT', `Gemini API returned HTTP ${response.status}: ${response.statusText}`);
      }
      return buildFailure('INFERENCE_FAILED', `Gemini API returned HTTP ${response.status}: ${response.statusText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return buildFailure('SCHEMA_INVALID', 'Gemini response could not be parsed as JSON');
    }

    const actualModel = data.modelVersion || REQUESTED_MODEL;
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText.trim()) {
      const result: GeminiServerResponse = {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'gemini',
        requestedModel: REQUESTED_MODEL,
        actualModel,
        latencyMs: Date.now() - startTime
      };
      setGeminiApiKeyCache(cacheKey, result);
      return result;
    }

    let parsed: any;
    try {
      let cleaned = responseText.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return buildFailure('SCHEMA_INVALID', 'Gemini response text is not valid JSON', actualModel);
    }

    if (!Array.isArray(parsed)) {
      return buildFailure('SCHEMA_INVALID', 'Gemini API returned non-array JSON', actualModel);
    }

    if (parsed.length === 0) {
      const result: GeminiServerResponse = {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'gemini',
        requestedModel: REQUESTED_MODEL,
        actualModel,
        latencyMs: Date.now() - startTime
      };
      setGeminiApiKeyCache(cacheKey, result);
      return result;
    }

    let hasSchemaError = false;
    const validatedFindings: AIFinding[] = [];

    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (!validated) {
        hasSchemaError = true;
        continue;
      }

      // Source-ID validation: if a sourceId is present, it MUST exist in the provided verified matches.
      // Unknown sourceId cannot become a valid finding.
      if (validated.sourceId) {
        if (!validSourceIds.has(validated.sourceId)) {
          hasSchemaError = true;
          continue;
        }
      }

      validated.modelProvider = 'gemini';
      validatedFindings.push(validated);
    }

    if (hasSchemaError || validatedFindings.length === 0) {
      return buildFailure(
        'SCHEMA_INVALID',
        'Gemini response contained invalid schema or unverified source IDs',
        actualModel
      );
    }

    const canonicalFindings = normalizeAndSortFindings(validatedFindings);

    const result: GeminiServerResponse = {
      status: 'VERIFIED',
      findings: canonicalFindings,
      fallback_used: false,
      fallbackUsed: false,
      modelProvider: 'gemini',
      requestedModel: REQUESTED_MODEL,
      actualModel,
      latencyMs: Date.now() - startTime
    };

    setGeminiApiKeyCache(cacheKey, result);
    return result;
  } catch (error: any) {
    const msg = error?.message || String(error);
    return buildFailure('INFERENCE_FAILED', msg || 'Gemini API-key reasoning failed');
  }
}
