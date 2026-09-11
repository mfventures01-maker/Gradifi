/**
 * GRADIFI VERIFY - SERVER-SIDE GEMINI REASONING HANDLER
 * Provable server/edge execution path for Gemini Evidence Reasoning.
 * HOEOS Standard: Structured JSON Schema, Source ID Boundary Enforcement, Server Credentials Only.
 */

import { AIFinding, EvidenceMatch } from '../types';

export interface GeminiServerRequestPayload {
  documentText: string;
  matches: EvidenceMatch[];
}

export interface GeminiServerResponse {
  status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'UNAVAILABLE' | 'INFERENCE_FAILED';
  findings: AIFinding[];
  errorMessage?: string;
}

export function validateAIFindingSchema(raw: any): AIFinding | null {
  if (!raw || typeof raw !== 'object') return null;

  const validTypes = ['exact_overlap', 'lexical_overlap', 'semantic_overlap', 'citation_issue', 'writing_signal'];
  const validSeverities = ['low', 'moderate', 'high'];

  const type = validTypes.includes(raw.type) ? raw.type : 'lexical_overlap';
  const severity = validSeverities.includes(raw.severity) ? raw.severity : 'moderate';
  const confidence = typeof raw.confidence === 'number' && !isNaN(raw.confidence)
    ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
    : 80;

  if (typeof raw.explanation !== 'string' || !raw.explanation.trim()) {
    return null;
  }

  return {
    type: type as AIFinding['type'],
    severity: severity as AIFinding['severity'],
    confidence,
    studentPassage: typeof raw.studentPassage === 'string' && raw.studentPassage.trim() ? raw.studentPassage.trim() : undefined,
    sourcePassage: typeof raw.sourcePassage === 'string' && raw.sourcePassage.trim() ? raw.sourcePassage.trim() : undefined,
    explanation: raw.explanation.trim(),
    sourceId: typeof raw.sourceId === 'string' && raw.sourceId.trim() ? raw.sourceId.trim() : undefined,
    requiresHumanReview: Boolean(raw.requiresHumanReview),
    modelProvider: 'gemini'
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

export async function handleGeminiServerReasoning(payload: GeminiServerRequestPayload): Promise<GeminiServerResponse> {
  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map(m => m.sourceId));

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('MY_GEMINI') || apiKey.startsWith('AQ.')) {
    return {
      status: 'AUTHENTICATION_FAILED',
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: 'GEMINI_API_KEY server configuration is invalid or unconfigured'
    };
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

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
3. Return JSON array of findings adhering strictly to schema.
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
    const parsed = JSON.parse(responseText);

    if (!Array.isArray(parsed)) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Gemini API returned non-array JSON'
      };
    }

    const validatedFindings: AIFinding[] = [];

    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (validated) {
        if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
          validated.sourceId = undefined;
        }
        validatedFindings.push(validated);
      }
    }

    return {
      status: 'INFERENCE_VERIFIED',
      findings: validatedFindings.length > 0 ? validatedFindings : generateDeterministicFallbackFindings(documentText, matches)
    };
  } catch (error: any) {
    const isAuthError = error?.message?.includes('API key not valid') || error?.message?.includes('401') || error?.message?.includes('403');
    return {
      status: isAuthError ? 'AUTHENTICATION_FAILED' : 'INFERENCE_FAILED',
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: error?.message || 'Gemini server reasoning failed'
    };
  }
}
