/**
 * GRADIFI VERIFY - GEMMA & GEMINI FINDING SCHEMA VALIDATORS
 * Pure, deterministic schema validation & fallback synthesis for evidence reasoning.
 * HOEOS Standard: Zero Secret Leakage, Browser-Safe, Deterministic.
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
