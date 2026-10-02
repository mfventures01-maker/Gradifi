/**
 * GRADIFI VERIFY - AI FEDERATION ADAPTER
 * Browser-facing & Edge AI federation adapter calling controlled server boundaries.
 * HOEOS Standard: ZERO client credentials, ZERO secret leakage, Honest AI Status Reporting.
 */

import { AIFinding, EvidenceMatch, ProviderTruthStatus } from './types.js';
import { generateDeterministicFallbackFindings, validateAIFindingSchema } from './server/geminiFindingSchema.js';
import { handleNemotronServerReasoning } from './server/nemotronServerHandler.js';
import { handleGemmaServerReasoning } from './server/gemmaServerHandler.js';

export interface AIFederationResult {
  localAiStatus: 'RUNTIME_AVAILABLE' | 'RUNTIME_UNAVAILABLE';
  gemmaStatus?: ProviderTruthStatus | 'INFERENCE_VERIFIED';
  nemotronStatus: ProviderTruthStatus | 'INFERENCE_VERIFIED';
  geminiStatus: ProviderTruthStatus | 'INFERENCE_VERIFIED';
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
    status: ProviderTruthStatus | 'INFERENCE_VERIFIED';
    findings: AIFinding[];
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const response = await fetch('/api/verify/gemma', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
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
  async runNemotronReasoning(documentText: string, matches: EvidenceMatch[], allowFallback = false): Promise<{
    status: ProviderTruthStatus;
    findings: AIFinding[];
    fallback_used?: boolean;
    fallbackUsed?: boolean;
    fallbackReason?: string;
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const slimMatches = matches.slice(0, 5).map(m => ({
          sourceId: m.sourceId,
          title: m.title,
          authors: m.authors,
          doi: m.doi,
          originalSnippet: (m.originalSnippet || '').slice(0, 500)
        }));

        const response = await fetch('/api/verify/nemotron', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            documentText: documentText.slice(0, 3000),
            matches: slimMatches,
            allowFallback
          })
        });

        if (!response.ok) {
          const status: ProviderTruthStatus = response.status === 401 || response.status === 403
            ? 'AUTHENTICATION_FAILED'
            : (response.status === 504 ? 'TIMEOUT' : 'INFERENCE_FAILED');
          return {
            status,
            findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
            fallback_used: allowFallback,
            fallbackUsed: allowFallback,
            fallbackReason: `HTTP ${response.status}: ${response.statusText}`
          };
        }

        const data = await response.json();
        return {
          status: data.status || 'INFERENCE_FAILED',
          findings: Array.isArray(data.findings) ? data.findings : [],
          fallback_used: Boolean(data.fallback_used ?? data.fallbackUsed),
          fallbackUsed: Boolean(data.fallbackUsed ?? data.fallback_used),
          fallbackReason: data.fallbackReason
        };
      } else {
        return handleNemotronServerReasoning({ documentText, matches, allowFallback });
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out');
      const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('network');
      const status: ProviderTruthStatus = isTimeout ? 'TIMEOUT' : (isNetwork ? 'NETWORK_ERROR' : 'INFERENCE_FAILED');
      return {
        status,
        findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
        fallback_used: allowFallback,
        fallbackUsed: allowFallback,
        fallbackReason: msg
      };
    }
  }

  /**
   * Dispatches Gemini evidence reasoning to controlled server/edge execution boundary.
   */
  async runGeminiReasoning(documentText: string, matches: EvidenceMatch[], allowFallback = false): Promise<{
    status: ProviderTruthStatus;
    findings: AIFinding[];
    fallback_used?: boolean;
    fallbackUsed?: boolean;
    fallbackReason?: string;
  }> {
    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        const slimMatches = matches.slice(0, 5).map(m => ({
          sourceId: m.sourceId,
          title: m.title,
          authors: m.authors,
          doi: m.doi,
          originalSnippet: (m.originalSnippet || '').slice(0, 500)
        }));

        const response = await fetch('/api/verify/gemini', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            documentText: documentText.slice(0, 3000),
            matches: slimMatches,
            allowFallback
          })
        });

        if (!response.ok) {
          const status: ProviderTruthStatus = response.status === 401 || response.status === 403
            ? 'AUTHENTICATION_FAILED'
            : (response.status === 504 ? 'TIMEOUT' : 'INFERENCE_FAILED');
          return {
            status,
            findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
            fallback_used: allowFallback,
            fallbackUsed: allowFallback,
            fallbackReason: `HTTP ${response.status}: ${response.statusText}`
          };
        }

        const data = await response.json();
        return {
          status: data.status || 'RUNTIME_UNAVAILABLE',
          findings: Array.isArray(data.findings) ? data.findings : (allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : []),
          fallback_used: Boolean(data.fallback_used ?? data.fallbackUsed),
          fallbackUsed: Boolean(data.fallbackUsed ?? data.fallback_used),
          fallbackReason: data.fallbackReason
        };
      } else {
        const handlerPath = './server/geminiServerHandler.js';
        const { handleGeminiServerReasoning } = await import(/* @vite-ignore */ handlerPath);
        return handleGeminiServerReasoning({ documentText, matches, allowFallback });
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out');
      const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('network');
      const status: ProviderTruthStatus = isTimeout ? 'TIMEOUT' : (isNetwork ? 'NETWORK_ERROR' : 'INFERENCE_FAILED');
      return {
        status,
        findings: allowFallback ? generateDeterministicFallbackFindings(documentText, matches) : [],
        fallback_used: allowFallback,
        fallbackUsed: allowFallback,
        fallbackReason: msg
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

    const anySuccessfulProvider =
      geminiResult.status === 'VERIFIED' ||
      geminiResult.status === 'EMPTY_RESULT' ||
      nemotronResult.status === 'VERIFIED' ||
      nemotronResult.status === 'EMPTY_RESULT';

    if (findings.length === 0 && !anySuccessfulProvider) {
      findings.push(...generateDeterministicFallbackFindings(documentText, matches));
    }

    // HOEOS Rule 16: Provider federation must NOT create evidence where no deterministic source exists
    const verifiedSourceIds = new Set(matches.map(m => m.sourceId));
    const validatedFindings = findings.map(f => {
      if (matches.length === 0 || (f.sourceId && !verifiedSourceIds.has(f.sourceId))) {
        return {
          ...f,
          requiresHumanReview: true,
          explanation: `[AI_SUGGESTION_WITHOUT_DETERMINISTIC_EVIDENCE] ${f.explanation}`
        };
      }
      return f;
    });

    return {
      localAiStatus,
      gemmaStatus: gemmaResult.status,
      nemotronStatus: nemotronResult.status,
      geminiStatus: geminiResult.status,
      findings: validatedFindings
    };
  }
}
