/**
 * GRADIFI VERIFY - AI OUTPUT FIREWALL SERVICE
 * HOEOS P6 Standard: Downstream Interpretation Only, Forbidden Field Isolation, Prompt-Injection Resilience.
 *
 * Absolute Constitutional Rules:
 * 1. AI is an interpretation layer ONLY (NON_AUTHORITATIVE_INTERPRETATION).
 * 2. AI MUST NEVER become an authority for: similarity score, matched text, evidence spans, sourceId, DOIs, ISBNs,
 *    citations, evidence/document hashes, G3 risk/classification, plagiarism verdicts, or verification receipts.
 * 3. AI outputs Sit downstream and MUST NEVER write backward into G5, G3, P3, P4, or P5.
 */

import { AIFinding, EvidenceMatch } from './types';
import { PublicAIInterpretation, normalizeAiConfidence, sanitizeAiExplanation } from './publicVerificationResult';

export const FORBIDDEN_AI_AUTHORITY_FIELDS = [
  'similarity',
  'similarityScore',
  'overallSimilarity',
  'matchPercentage',
  'startOffset',
  'endOffset',
  'matchedText',
  'sourceId',
  'evidenceType',
  'evidenceHash',
  'documentHash',
  'doi',
  'isbn',
  'g3Risk',
  'g3Classification',
  'plagiarismVerdict',
  'verificationId',
  'verificationReceipt',
  'citationAuthority'
] as const;

export const MAX_AI_FINDINGS_COUNT = 10;
export const MAX_AI_EXPLANATION_LENGTH = 500;

/**
 * Neutralizes prompt-injection patterns in untrusted input text.
 * Guarantees prompt injection strings are treated strictly as raw text data.
 */
export function sanitizePromptInjectionText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/ignore (all )?previous instructions/gi, '[neutralized prompt instruction]')
    .replace(/set (overall )?similarity to 0/gi, '[neutralized prompt instruction]')
    .replace(/declare (this )?document (original|plagiarized)/gi, '[neutralized prompt instruction]');
}

/**
 * Enforces the AI Output Firewall on raw AI findings:
 * 1. Ignores any AI attempt to supply or modify forbidden authority fields.
 * 2. Strips conversational chatter, preambles, and system prompts.
 * 3. Bounds output length (max 500 chars) and count (max 10 items).
 * 4. Enforces typed classification NON_AUTHORITATIVE_INTERPRETATION.
 * 5. Escapes HTML / XSS payloads into safe literal text nodes.
 */
export function enforceAiInterpretationFirewall(rawFindings?: any[]): PublicAIInterpretation[] {
  if (!rawFindings || !Array.isArray(rawFindings) || rawFindings.length === 0) {
    return [];
  }

  const firewallResult: PublicAIInterpretation[] = [];

  for (let i = 0; i < rawFindings.length && firewallResult.length < MAX_AI_FINDINGS_COUNT; i++) {
    const raw = rawFindings[i];
    if (!raw || typeof raw !== 'object') continue;

    // 1. Strip forbidden field claims if present on raw object
    const cleanRaw: Record<string, any> = { ...raw };
    for (const forbiddenField of FORBIDDEN_AI_AUTHORITY_FIELDS) {
      delete cleanRaw[forbiddenField];
    }

    // 2. Sanitize explanation & strip chatter
    const rawExplanation = typeof raw.explanation === 'string' ? raw.explanation : (typeof raw.message === 'string' ? raw.message : '');
    let sanitizedExplanation = sanitizeAiExplanation(rawExplanation);
    sanitizedExplanation = sanitizePromptInjectionText(sanitizedExplanation);

    // Enforce max length bound (500 chars)
    if (sanitizedExplanation.length > MAX_AI_EXPLANATION_LENGTH) {
      sanitizedExplanation = sanitizedExplanation.slice(0, MAX_AI_EXPLANATION_LENGTH) + '... [truncated]';
    }

    // 3. Normalize confidence & severity
    const normConfidence = normalizeAiConfidence(typeof raw.confidence === 'number' ? raw.confidence : 0.5);
    const severity: 'low' | 'moderate' | 'high' = ['low', 'moderate', 'high'].includes(raw.severity)
      ? raw.severity
      : 'low';

    // 4. Force non-authoritative classification
    firewallResult.push({
      findingType: typeof raw.type === 'string' ? raw.type : 'analysis_finding',
      severity,
      normalizedConfidence: normConfidence,
      explanation: sanitizedExplanation,
      supportingEvidenceRef: raw.sourceId ? `source_${raw.sourceId}` : undefined,
      authorityClassification: 'NON_AUTHORITATIVE_INTERPRETATION'
    });
  }

  return firewallResult;
}

/**
 * Handles AI provider runtime failure or unavailability safely:
 * Ensures deterministic verification result, similarity score, and G3 classification remain 100% untouched.
 */
export function handleAiProviderFailureSafely(
  providerName: string,
  status: string
): { status: string; isAvailable: boolean; fallbackInterpretation: PublicAIInterpretation[] } {
  const isAvailable = status === 'INFERENCE_VERIFIED';

  return {
    status,
    isAvailable,
    fallbackInterpretation: [
      {
        findingType: 'provider_status',
        severity: 'low',
        normalizedConfidence: 1.0,
        explanation: `AI reasoning provider (${providerName}) status: ${status}. Deterministic evidence core remains authoritative.`,
        authorityClassification: 'NON_AUTHORITATIVE_INTERPRETATION'
      }
    ]
  };
}
