/**
 * GRADIFI VERIFY - AI FEDERATION ADAPTER
 * Browser-facing & Edge AI federation adapter calling controlled server boundaries.
 * HOEOS Standard: ZERO client credentials, ZERO secret leakage, Honest AI Status Reporting.
 */

import { AIFinding, EvidenceMatch } from './types';
import { handleGeminiServerReasoning, generateDeterministicFallbackFindings, validateAIFindingSchema } from './server/geminiServerHandler';
import { handleNemotronServerReasoning } from './server/nemotronServerHandler';
import { handleGemmaServerReasoning } from './server/gemmaServerHandler';

export interface AIFederationResult {
  localAiStatus: 'RUNTIME_AVAILABLE' | 'RUNTIME_UNAVAILABLE';
  gemmaStatus?: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  nemotronStatus: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  geminiStatus: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
  findings: AIFinding[];
}

export { validateAIFindingSchema as validateAIFinding, generateDeterministicFallbackFindings };

export class AIFederationService {
  /**
   * Probe local Gemma inference runtime (Ollama at http://localhost:11434).
   * Honestly returns RUNTIME_UNAVAILABLE if local server is unreachable.
   */
  async probeLocalGemma(): Promise<'RUNTIME_AVAILABLE' | 'RUNTIME_UNAVAILABLE'> {
    try {
      const endpoint = 'http://localhost:11434/v1/models';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      return response.ok ? 'RUNTIME_AVAILABLE' : 'RUNTIME_UNAVAILABLE';
    } catch {
      return 'RUNTIME_UNAVAILABLE';
    }
  }

  /**
   * Dispatches local Ollama / Gemma reasoning through the server boundary.
   */
  async runGemmaReasoning(documentText: string, matches: EvidenceMatch[], model = 'gemma4:31b'): Promise<{
    status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
    findings: AIFinding[];
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const response = await fetch('/api/verify/gemma', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ documentText, matches, model })
        });

        if (!response.ok) {
          return {
            status: 'RUNTIME_UNAVAILABLE',
            findings: generateDeterministicFallbackFindings(documentText, matches)
          };
        }

        const data = await response.json();
        return {
          status: data.status || 'RUNTIME_UNAVAILABLE',
          findings: Array.isArray(data.findings) ? data.findings : generateDeterministicFallbackFindings(documentText, matches)
        };
      } else {
        return handleGemmaServerReasoning({ documentText, matches, model });
      }
    } catch {
      return {
        status: 'RUNTIME_UNAVAILABLE',
        findings: generateDeterministicFallbackFindings(documentText, matches)
      };
    }
  }

  /**
   * Dispatches Nemotron reasoning through the server boundary.
   * Browser code contains ZERO secret API keys.
   */
  async runNemotronReasoning(documentText: string, matches: EvidenceMatch[]): Promise<{
    status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
    findings: AIFinding[];
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const response = await fetch('/api/verify/nemotron', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ documentText, matches })
        });

        if (!response.ok) {
          return {
            status: response.status === 401 || response.status === 403 ? 'AUTHENTICATION_FAILED' : 'INFERENCE_FAILED',
            findings: []
          };
        }

        const data = await response.json();
        return {
          status: data.status || 'INFERENCE_FAILED',
          findings: Array.isArray(data.findings) ? data.findings : []
        };
      } else {
        return handleNemotronServerReasoning({ documentText, matches });
      }
    } catch {
      return {
        status: 'INFERENCE_FAILED',
        findings: []
      };
    }
  }

  /**
   * Dispatches Gemini evidence reasoning to controlled server/edge execution boundary.
   */
  async runGeminiReasoning(documentText: string, matches: EvidenceMatch[]): Promise<{
    status: 'INFERENCE_VERIFIED' | 'AUTHENTICATION_FAILED' | 'RUNTIME_UNAVAILABLE' | 'INFERENCE_FAILED';
    findings: AIFinding[];
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const response = await fetch('/api/verify/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ documentText, matches })
        });

        if (!response.ok) {
          return {
            status: response.status === 401 || response.status === 403 ? 'AUTHENTICATION_FAILED' : 'INFERENCE_FAILED',
            findings: generateDeterministicFallbackFindings(documentText, matches)
          };
        }

        const data = await response.json();
        return {
          status: data.status || 'RUNTIME_UNAVAILABLE',
          findings: Array.isArray(data.findings) ? data.findings : generateDeterministicFallbackFindings(documentText, matches)
        };
      } else {
        return handleGeminiServerReasoning({ documentText, matches });
      }
    } catch {
      return {
        status: 'INFERENCE_FAILED',
        findings: generateDeterministicFallbackFindings(documentText, matches)
      };
    }
  }

  /**
   * Execute full AI Federation pipeline.
   */
  async executeFederation(documentText: string, matches: EvidenceMatch[]): Promise<AIFederationResult> {
    const localAiStatus = await this.probeLocalGemma();
    const gemmaResult = localAiStatus === 'RUNTIME_AVAILABLE'
      ? await this.runGemmaReasoning(documentText, matches)
      : { status: 'RUNTIME_UNAVAILABLE' as const, findings: [] };
    const nemotronResult = await this.runNemotronReasoning(documentText, matches);
    const geminiResult = await this.runGeminiReasoning(documentText, matches);

    const findings: AIFinding[] = [];

    if (gemmaResult.findings.length > 0) {
      findings.push(...gemmaResult.findings);
    }
    if (nemotronResult.findings.length > 0) {
      findings.push(...nemotronResult.findings);
    }
    if (geminiResult.findings.length > 0) {
      findings.push(...geminiResult.findings);
    }

    if (findings.length === 0) {
      findings.push(...generateDeterministicFallbackFindings(documentText, matches));
    }

    return {
      localAiStatus,
      gemmaStatus: gemmaResult.status,
      nemotronStatus: nemotronResult.status,
      geminiStatus: geminiResult.status,
      findings
    };
  }
}
