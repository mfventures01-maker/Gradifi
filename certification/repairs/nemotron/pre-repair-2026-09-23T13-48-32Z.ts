/**
 * GRADIFI VERIFY - SERVER-SIDE NEMOTRON REASONING HANDLER
 * Provable server/edge execution path for NVIDIA Nemotron Evidence Reasoning.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { AIFinding, EvidenceMatch } from '../types';
import { validateAIFindingSchema, generateDeterministicFallbackFindings } from './geminiServerHandler';

export interface NemotronServerRequestPayload {
  documentText: string;
  matches: EvidenceMatch[];
}

export interface NemotronServerResponse {
  status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  findings: AIFinding[];
  errorMessage?: string;
}

export async function handleNemotronServerReasoning(payload: NemotronServerRequestPayload): Promise<NemotronServerResponse> {
  const documentText = typeof payload?.documentText === 'string' ? payload.documentText : '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map(m => m.sourceId));

  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!nvidiaKey || nvidiaKey.includes('YOUR_')) {
    return {
      status: 'AUTHENTICATION_FAILED',
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: 'NVIDIA_API_KEY server configuration is unavailable'
    };
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

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
    });

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return {
        status: isAuthError ? 'AUTHENTICATION_FAILED' : 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Nemotron returned empty content'
      };
    }

    // Strip optional markdown code block backticks if present
    const cleanedJson = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Nemotron response could not be parsed as JSON'
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Nemotron response was not a JSON array'
      };
    }

    const validatedFindings: AIFinding[] = [];
    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (validated) {
        if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
          validated.sourceId = undefined;
        }
        validated.modelProvider = 'nemotron';
        validatedFindings.push(validated);
      }
    }

    if (validatedFindings.length === 0) {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: 'Nemotron JSON contained no valid findings matching schema'
      };
    }

    return {
      status: 'INFERENCE_VERIFIED',
      findings: validatedFindings
    };
  } catch (error: any) {
    return {
      status: 'INFERENCE_FAILED',
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: error?.message || 'Nemotron server reasoning failed'
    };
  }
}
