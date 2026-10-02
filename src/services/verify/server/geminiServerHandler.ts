/**
 * GRADIFI VERIFY - SERVER-SIDE GEMINI REASONING HANDLER
 * Provable server/edge execution path for Gemini Evidence Reasoning.
 * HOEOS Standard: Structured JSON Schema, Source ID Boundary Enforcement, Explicit Provider Truth States.
 */

import { AIFinding, EvidenceMatch, ProviderTruthStatus } from '../types.js';

export interface GeminiServerRequestPayload {
  documentText: string;
  matches: EvidenceMatch[];
  allowFallback?: boolean;
}

export interface GeminiServerResponse {
  status: ProviderTruthStatus;
  findings: AIFinding[];
  fallback_used: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
  errorMessage?: string;
  modelProvider?: string;
  requestedModel?: string;
  actualModel?: string;
  latencyMs?: number;
}

export function validateAIFindingSchema(raw: any): AIFinding | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const validTypes = ['exact_overlap', 'lexical_overlap', 'semantic_overlap', 'citation_issue', 'writing_signal'];
  const validSeverities = ['low', 'moderate', 'high'];

  if (!validTypes.includes(raw.type)) {
    return null;
  }

  if (!validSeverities.includes(raw.severity)) {
    return null;
  }

  if (typeof raw.explanation !== 'string' || !raw.explanation.trim()) {
    return null;
  }

  const confidence = typeof raw.confidence === 'number' && !isNaN(raw.confidence)
    ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
    : 80;

  return {
    type: raw.type as AIFinding['type'],
    severity: raw.severity as AIFinding['severity'],
    confidence,
    studentPassage: typeof raw.studentPassage === 'string' && raw.studentPassage.trim() ? raw.studentPassage.trim() : undefined,
    sourcePassage: typeof raw.sourcePassage === 'string' && raw.sourcePassage.trim() ? raw.sourcePassage.trim() : undefined,
    explanation: raw.explanation.trim(),
    sourceId: typeof raw.sourceId === 'string' && raw.sourceId.trim() ? raw.sourceId.trim() : undefined,
    requiresHumanReview: Boolean(raw.requiresHumanReview),
    modelProvider: typeof raw.modelProvider === 'string' ? raw.modelProvider : 'gemini'
  };
}

export function generateDeterministicFallbackFindings(documentText: string, matches: EvidenceMatch[]): AIFinding[] {
  const findings: AIFinding[] = [];

  for (const match of matches) {
    if (match.matchPercentage > 25) {
      findings.push({
        type: match.matchType === 'exact' ? 'exact_overlap' : 'lexical_overlap',
        severity: match.matchPercentage > 50 ? 'high' : 'moderate',
        confidence: Math.min(95, Math.max(70, match.matchPercentage + 20)),
        studentPassage: match.matchedText || documentText.slice(0, 150),
        sourcePassage: match.originalSnippet.slice(0, 150),
        explanation: `Substantial textual overlap detected with "${match.title}" (DOI: ${match.doi || 'N/A'}). Verification required.`,
        sourceId: match.sourceId,
        requiresHumanReview: true,
        modelProvider: 'deterministic_fallback'
      });
    } else if (match.matchPercentage > 10) {
      findings.push({
        type: 'citation_issue',
        severity: 'low',
        confidence: 80,
        studentPassage: match.matchedText || undefined,
        sourcePassage: match.originalSnippet.slice(0, 150),
        explanation: `Possible uncredited paraphrase or reference matching "${match.title}".`,
        sourceId: match.sourceId,
        requiresHumanReview: false,
        modelProvider: 'deterministic_fallback'
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      type: 'writing_signal',
      severity: 'low',
      confidence: 90,
      explanation: 'No significant academic overlap detected. Document appears original based on federated database search.',
      requiresHumanReview: false,
      modelProvider: 'deterministic_fallback'
    });
  }

  return findings;
}

const geminiResponseCache = new Map<string, { body: GeminiServerResponse; expiresAt: number }>();
const GEMINI_CACHE_TTL_MS = 60_000;
const GEMINI_CACHE_MAX = 20;

function geminiCacheKey(documentText: string, matches: EvidenceMatch[]): string {
  return `${documentText.slice(0, 100)}::${matches.length}`;
}

function getGeminiCache(key: string): GeminiServerResponse | null {
  const entry = geminiResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geminiResponseCache.delete(key);
    return null;
  }
  return entry.body;
}

function setGeminiCache(key: string, body: GeminiServerResponse): void {
  geminiResponseCache.set(key, { body, expiresAt: Date.now() + GEMINI_CACHE_TTL_MS });
  if (geminiResponseCache.size > GEMINI_CACHE_MAX) {
    const firstKey = geminiResponseCache.keys().next().value;
    if (firstKey) geminiResponseCache.delete(firstKey);
  }
}

export async function handleGeminiServerReasoning(payload: GeminiServerRequestPayload): Promise<GeminiServerResponse> {
  // Delegate to API-key adapter when server-side GEMINI_API_KEY is present
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_')) {
    const handlerPath = './geminiApiKeyServerHandler.js';
    const { handleGeminiApiKeyServerReasoning } = await import(/* @vite-ignore */ handlerPath);
    return handleGeminiApiKeyServerReasoning(payload);
  }

  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map(m => m.sourceId));
  const allowFallback = Boolean(payload?.allowFallback);

  const cacheKey = geminiCacheKey(documentText, matches);
  const cached = getGeminiCache(cacheKey);
  if (cached) return cached;

  const buildFailure = (status: ProviderTruthStatus, message: string): GeminiServerResponse => ({
    status,
    findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
    fallback_used: allowFallback,
    fallbackUsed: allowFallback,
    fallbackReason: allowFallback ? message : undefined,
    errorMessage: message,
    modelProvider: allowFallback ? 'deterministic_fallback' : 'gemini'
  });

  // Single-credential resolution: GEMINI_SERVICE_ACCOUNT_JSON only.
  // The value may be raw JSON or base64-encoded JSON.
  const rawServiceAccount = process.env.GEMINI_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount || rawServiceAccount.includes('MY_GEMINI')) {
    return buildFailure('AUTHENTICATION_FAILED', 'GEMINI_SERVICE_ACCOUNT_JSON is not configured');
  }

  let jsonText = rawServiceAccount.trim();
  if (!jsonText.startsWith('{')) {
    try {
      jsonText = Buffer.from(jsonText, 'base64').toString('utf-8');
    } catch {
      return buildFailure('AUTHENTICATION_FAILED', 'GEMINI_SERVICE_ACCOUNT_JSON could not be base64-decoded');
    }
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(jsonText);
  } catch {
    return buildFailure('AUTHENTICATION_FAILED', 'GEMINI_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({
      enterprise: true,
      project: credentials.project_id as string,
      location: 'global',
      googleAuthOptions: {
        credentials,
      },
    });

    const evidenceSummary = matches.slice(0, 5).map(m => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      doi: m.doi || 'N/A',
      matchPercentage: m.matchPercentage,
      snippet: m.originalSnippet.slice(0, 200)
    }));

    const prompt = `
You are an academic integrity forensic analyst for Gradifi Verify.
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

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['exact_overlap', 'lexical_overlap', 'semantic_overlap', 'citation_issue', 'writing_signal']
          },
          severity: {
            type: Type.STRING,
            enum: ['low', 'moderate', 'high']
          },
          confidence: { type: Type.INTEGER },
          studentPassage: { type: Type.STRING },
          sourcePassage: { type: Type.STRING },
          explanation: { type: Type.STRING },
          sourceId: { type: Type.STRING },
          requiresHumanReview: { type: Type.BOOLEAN }
        },
        required: ['type', 'severity', 'confidence', 'explanation', 'requiresHumanReview']
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const responseText = response.text || '';
    if (!responseText.trim()) {
      const result: GeminiServerResponse = {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'gemini'
      };
      setGeminiCache(cacheKey, result);
      return result;
    }

    let parsed: any;
    try {
      let cleaned = responseText.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return buildFailure('INFERENCE_FAILED', 'Gemini response could not be parsed as JSON');
    }

    if (!Array.isArray(parsed)) {
      return buildFailure('INFERENCE_FAILED', 'Gemini API returned non-array JSON');
    }

    if (parsed.length === 0) {
      const result: GeminiServerResponse = {
        status: 'EMPTY_RESULT',
        findings: [],
        fallback_used: false,
        fallbackUsed: false,
        modelProvider: 'gemini'
      };
      setGeminiCache(cacheKey, result);
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
        validated.modelProvider = 'gemini';
        validatedFindings.push(validated);
      } else {
        hasSchemaError = true;
      }
    }

    if (hasSchemaError || validatedFindings.length === 0) {
      return buildFailure('SCHEMA_INVALID', 'Gemini response contained no structurally valid findings matching schema');
    }

    const result: GeminiServerResponse = {
      status: 'VERIFIED',
      findings: validatedFindings,
      fallback_used: false,
      fallbackUsed: false,
      modelProvider: 'gemini'
    };
    setGeminiCache(cacheKey, result);
    return result;
  } catch (error: any) {
    const msg = error?.message || String(error);
    const status = error?.status || error?.statusCode || error?.response?.status;
    const isAuthError = status === 401 || status === 403 || msg.includes('API key not valid') || msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('PERMISSION_DENIED');
    const isTimeout = status === 504 || error?.name === 'TimeoutError' || error?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out') || msg.includes('504');
    const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('network') || msg.includes('NetworkError');
    const isUnavailable = status === 503 || status === 429 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');

    if (isAuthError) return buildFailure('AUTHENTICATION_FAILED', msg);
    if (isTimeout) return buildFailure('TIMEOUT', msg);
    if (isNetwork) return buildFailure('NETWORK_ERROR', msg);
    if (isUnavailable) return buildFailure('RUNTIME_UNAVAILABLE', msg);

    return buildFailure('INFERENCE_FAILED', msg || 'Gemini server reasoning failed');
  }
}
