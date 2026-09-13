/**
 * GRADIFI VERIFY - MATCHED-TEXT HIGHLIGHTING & VISUAL EVIDENCE SERVICE
 * HOEOS P4 Standard: Pure Deterministic Visual Evidence Rendering, XSS Safety, Canonical Text Round-Trip Invariant.
 *
 * Core Invariant: stripHighlightingMarkup(renderHighlightedHtml(text, spans)) === canonicalText
 * Terminology Standard: "Matched text", "Similarity evidence", "Evidence span" (NEVER "PLAGIARIZED")
 */

import { EvidenceMatch, SimilarityFinding } from './types';
import { findTextSpans, verifyOffsetSlice } from './canonicalTextOffsetService';

export interface MatchedEvidenceSpan {
  spanId: string;
  startOffset: number; // Inclusive
  endOffset: number;   // Exclusive
  matchedText: string;
  sourceId: string;
  matchType: 'exact' | 'lexical' | 'semantic' | 'citation';
  similarityScore?: number;
  requiresHumanReview?: boolean;
}

export interface RenderedSegment {
  text: string;           // Raw canonical substring
  escapedText: string;    // HTML-escaped substring
  isMatch: boolean;
  spans: MatchedEvidenceSpan[];
  startOffset: number;
  endOffset: number;
}

/**
 * Escapes raw document text for safe HTML rendering to prevent XSS injection.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescapes HTML entities back to raw canonical characters.
 */
export function unescapeHtml(htmlText: string): string {
  if (!htmlText) return '';
  return htmlText
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Resolves matched evidence spans from EvidenceMatch items and SimilarityFinding items against canonical document text.
 * Strictly validates 0 <= start <= end <= canonicalText.length and text slice equality.
 */
export function resolveMatchedEvidenceSpans(
  canonicalText: string,
  verifiedSources: EvidenceMatch[],
  similarityFindings?: SimilarityFinding[]
): MatchedEvidenceSpan[] {
  if (!canonicalText || !canonicalText.trim()) return [];

  const rawSpans: MatchedEvidenceSpan[] = [];
  const seenSpanKeys = new Set<string>();

  // 1. Resolve spans from verified evidence matches
  for (let i = 0; i < (verifiedSources || []).length; i++) {
    const match = verifiedSources[i];
    const phrase = match.matchedText || match.originalSnippet;
    if (!phrase || !phrase.trim()) continue;

    // Use P3 findTextSpans primitive to locate exact character occurrences
    const locatedSpans = findTextSpans(canonicalText, phrase, { sourceId: match.sourceId, caseSensitive: true });

    for (const loc of locatedSpans) {
      const isValid = verifyOffsetSlice(canonicalText, {
        startOffset: loc.startOffset,
        endOffset: loc.endOffset,
        text: loc.matchedText
      });

      if (!isValid) {
        console.warn(`[P4] INVALID_EVIDENCE_SPAN excluded: ${loc.spanId}`);
        continue;
      }

      const key = `${match.sourceId}_${loc.startOffset}_${loc.endOffset}`;
      if (seenSpanKeys.has(key)) continue;
      seenSpanKeys.add(key);

      rawSpans.push({
        spanId: loc.spanId,
        startOffset: loc.startOffset,
        endOffset: loc.endOffset,
        matchedText: loc.matchedText,
        sourceId: match.sourceId,
        matchType: match.matchType || 'lexical',
        similarityScore: match.matchPercentage
      });
    }
  }

  // 2. Resolve spans from deterministic similarity findings if available
  if (similarityFindings && similarityFindings.length > 0) {
    for (const finding of similarityFindings) {
      if (
        typeof finding.sourceStart === 'number' &&
        typeof finding.sourceEnd === 'number' &&
        finding.sourceStart >= 0 &&
        finding.sourceEnd <= canonicalText.length &&
        finding.sourceStart < finding.sourceEnd
      ) {
        const textSlice = canonicalText.slice(finding.sourceStart, finding.sourceEnd);
        const key = `${finding.matchedDocumentId}_${finding.sourceStart}_${finding.sourceEnd}`;

        if (!seenSpanKeys.has(key)) {
          seenSpanKeys.add(key);
          const matchType = finding.matchMethod === 'EXACT_PHRASE' ? 'exact' : 'lexical';

          rawSpans.push({
            spanId: finding.findingId,
            startOffset: finding.sourceStart,
            endOffset: finding.sourceEnd,
            matchedText: textSlice,
            sourceId: finding.matchedDocumentId,
            matchType,
            similarityScore: finding.similarityScore
          });
        }
      }
    }
  }

  // Sort spans deterministically: startOffset ASC, then endOffset ASC, then spanId ASC
  rawSpans.sort((a, b) => {
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    if (a.endOffset !== b.endOffset) return a.endOffset - b.endOffset;
    return a.spanId.localeCompare(b.spanId);
  });

  return rawSpans;
}

/**
 * Flattens overlapping and adjacent evidence spans into non-overlapping contiguous RenderedSegment items.
 * Guarantees every canonical character appears in the segment array EXACTLY ONCE.
 */
export function buildRenderedSegments(
  canonicalText: string,
  spans: MatchedEvidenceSpan[]
): RenderedSegment[] {
  if (!canonicalText) return [];
  if (!spans || spans.length === 0) {
    return [{
      text: canonicalText,
      escapedText: escapeHtml(canonicalText),
      isMatch: false,
      spans: [],
      startOffset: 0,
      endOffset: canonicalText.length
    }];
  }

  // 1. Collect boundary split points
  const pointsSet = new Set<number>([0, canonicalText.length]);
  for (const span of spans) {
    const validStart = Math.max(0, Math.min(canonicalText.length, span.startOffset));
    const validEnd = Math.max(0, Math.min(canonicalText.length, span.endOffset));
    if (validStart < validEnd) {
      pointsSet.add(validStart);
      pointsSet.add(validEnd);
    }
  }

  const points = Array.from(pointsSet).sort((a, b) => a - b);
  const segments: RenderedSegment[] = [];

  // 2. Build non-overlapping contiguous slice segments
  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    const segText = canonicalText.slice(segStart, segEnd);

    // Find all covering spans for this exact character interval
    const activeSpans = spans.filter(s => s.startOffset <= segStart && s.endOffset >= segEnd);
    const isMatch = activeSpans.length > 0;

    segments.push({
      text: segText,
      escapedText: escapeHtml(segText),
      isMatch,
      spans: activeSpans,
      startOffset: segStart,
      endOffset: segEnd
    });
  }

  return segments;
}

/**
 * Renders XSS-safe HTML string wrapped in <mark> tags for visual evidence highlighting.
 */
export function renderHighlightedHtml(
  canonicalText: string,
  spans: MatchedEvidenceSpan[]
): string {
  const segments = buildRenderedSegments(canonicalText, spans);
  const htmlParts: string[] = [];

  for (const seg of segments) {
    if (!seg.isMatch) {
      htmlParts.push(seg.escapedText);
    } else {
      const primarySpan = seg.spans[0];
      const sourceId = primarySpan ? primarySpan.sourceId : 'matched_source';
      const matchType = primarySpan ? primarySpan.matchType : 'lexical';

      htmlParts.push(
        `<mark class="gradifi-evidence-highlight bg-blue-500/20 text-blue-300 border-b border-blue-400/60 px-0.5 py-0.2 rounded-xs font-semibold cursor-pointer" data-source-id="${escapeHtml(sourceId)}" data-match-type="${matchType}" title="Matched text evidence from ${escapeHtml(sourceId)}">${seg.escapedText}</mark>`
      );
    }
  }

  return htmlParts.join('');
}

/**
 * Strips highlight markup tags (<mark ...> and </mark>) and decodes HTML entities to recover canonical text.
 * Core Invariant: stripHighlightingMarkup(renderHighlightedHtml(text, spans)) === canonicalText
 */
export function stripHighlightingMarkup(renderedHtml: string): string {
  if (!renderedHtml) return '';
  // Strip <mark ...> and </mark>
  const strippedTags = renderedHtml.replace(/<mark[^>]*>/g, '').replace(/<\/mark>/g, '');
  return unescapeHtml(strippedTags);
}
