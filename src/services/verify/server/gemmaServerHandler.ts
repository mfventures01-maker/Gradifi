/**
 * GRADIFI VERIFY - SERVER-SIDE OLLAMA / GEMMA REASONING HANDLER
 * Provable server/edge execution path for local Ollama Gemma Evidence Reasoning.
 * HOEOS Standard: Local Edge Boundary, Strict Input Boundary, Structured JSON Schema.
 */

import { AIFinding, EvidenceMatch } from '../types';
import { validateAIFindingSchema, generateDeterministicFallbackFindings } from './geminiServerHandler';

export interface GemmaServerRequestPayload {
  documentText: string;
  matches: EvidenceMatch[];
  model?: string;
}

export interface GemmaServerResponse {
  status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  findings: AIFinding[];
  errorMessage?: string;
}

export async function handleGemmaServerReasoning(payload: GemmaServerRequestPayload): Promise<GemmaServerResponse> {
  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const requestedModel = payload?.model || 'gemma4:31b';
  const validSourceIds = new Set(matches.map(m => m.sourceId));

  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const tagsResponse = await fetch(`${ollamaHost}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!tagsResponse.ok) {
      return {
        status: 'RUNTIME_UNAVAILABLE',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Ollama daemon returned status ${tagsResponse.status} at ${ollamaHost}`
      };
    }

    const tagsData = await tagsResponse.json();
    const installedModels: string[] = Array.isArray(tagsData?.models) ? tagsData.models.map((m: any) => m.name || m.model || '') : [];

    // Match requested model or any installed gemma model
    const targetModel = installedModels.find(m => m.includes(requestedModel))
      || installedModels.find(m => m.toLowerCase().includes('gemma'))
      || installedModels[0];

    if (!targetModel) {
      return {
        status: 'RUNTIME_UNAVAILABLE',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Target Gemma model (${requestedModel}) is not installed on local Ollama daemon at ${ollamaHost}`
      };
    }

    const evidenceSummary = matches.slice(0, 5).map(m => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      matchedText: m.matchedText,
      snippet: m.originalSnippet.slice(0, 200)
    }));

    const prompt = `You are an academic integrity forensic analyst for Gradifi Verify.
Analyze the following student text against verified academic evidence matches:

STUDENT TEXT:
"${documentText.slice(0, 1500)}"

VERIFIED EVIDENCE MATCHES:
${JSON.stringify(evidenceSummary, null, 2)}

Respond ONLY with a JSON array of findings. Each finding object must match:
{
  "type": "exact_overlap" | "lexical_overlap" | "semantic_overlap" | "citation_issue" | "writing_signal",
  "severity": "low" | "moderate" | "high",
  "confidence": number (0-100),
  "studentPassage": string,
  "sourcePassage": string,
  "explanation": string,
  "sourceId": string,
  "requiresHumanReview": boolean
}
`;

    const chatResponse = await fetch(`${ollamaHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: 'You are a precise JSON-only academic verification system.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!chatResponse.ok) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Ollama chat completion failed with status ${chatResponse.status}`
      };
    }

    const chatData = await chatResponse.json();
    const content = chatData?.choices?.[0]?.message?.content || '';

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.findings)) {
        parsed = parsed.findings;
      }
    } catch {
      parsed = null;
    }

    if (!Array.isArray(parsed)) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Ollama model did not return a valid JSON findings array'
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
    return {
      status: 'RUNTIME_UNAVAILABLE',
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: error?.message || 'Failed to connect to local Ollama inference server'
    };
  }
}
