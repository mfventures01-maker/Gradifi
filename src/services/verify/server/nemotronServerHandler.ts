/**
 * GRADIFI VERIFY - SERVER-SIDE NEMOTRON REASONING HANDLER
 * Provable server/edge execution path for NVIDIA Nemotron Evidence Reasoning.
 * HOEOS Standard: Server-Only Credentials, Strict Input Boundary, Zero Secret Leakage.
 */

import { AIFinding, EvidenceMatch } from '../types';

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

  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!nvidiaKey || nvidiaKey.includes('YOUR_')) {
    return {
      status: 'RUNTIME_UNAVAILABLE',
      findings: [],
      errorMessage: 'NVIDIA_API_KEY server configuration is unavailable'
    };
  }

  try {
    const evidenceSummary = matches.slice(0, 3).map(m => ({
      title: m.title,
      authors: m.authors,
      snippet: m.originalSnippet.slice(0, 150)
    }));

    const prompt = `Analyze this text for academic evidence overlap: "${documentText.slice(0, 800)}". Matches: ${JSON.stringify(evidenceSummary)}`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaKey}`
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250
      })
    });

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return {
        status: isAuthError ? 'AUTHENTICATION_FAILED' : 'INFERENCE_FAILED',
        findings: [],
        errorMessage: `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      return {
        status: 'INFERENCE_FAILED',
        findings: [],
        errorMessage: 'Nemotron returned empty content'
      };
    }

    const nemotronFinding: AIFinding = {
      type: 'semantic_overlap',
      severity: 'moderate',
      confidence: 85,
      explanation: `Nemotron Cloud AI Analysis: ${content.trim().slice(0, 200)}`,
      requiresHumanReview: true,
      modelProvider: 'nemotron'
    };

    return {
      status: 'INFERENCE_VERIFIED',
      findings: [nemotronFinding]
    };
  } catch (error: any) {
    return {
      status: 'INFERENCE_FAILED',
      findings: [],
      errorMessage: error?.message || 'Nemotron server reasoning failed'
    };
  }
}
