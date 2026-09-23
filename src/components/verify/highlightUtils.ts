/**
 * GRADIFI VERIFY - DETERMINISTIC HIGHLIGHT UTILITIES
 * Pure functions for deterministic plagiarism/similarity marker calculation.
 * HOEOS Standard: Absolute Determinism, Provenance Transparency, Zero Secret Leakage.
 */

import { SimilarityFinding, EvidenceMatch } from '../../services/verify/types';

export interface HighlightSegment {
  text: string;
  findingId?: string;
  method?: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP';
  start?: number;
  end?: number;
}

const METHOD_PRECEDENCE: Record<string, number> = {
  EXACT_PHRASE: 3,
  NGRAM: 2,
  TOKEN_OVERLAP: 1,
};

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Maps similarity match method to deterministic Tailwind color classes.
 */
export function methodToClass(
  method?: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP' | string
): string {
  switch (method) {
    case 'EXACT_PHRASE':
      return 'bg-red-500/30 border-red-500/50';
    case 'NGRAM':
      return 'bg-orange-500/30 border-orange-500/50';
    case 'TOKEN_OVERLAP':
    default:
      return 'bg-yellow-500/30 border-yellow-500/50';
  }
}

/**
 * Returns only findings whose matchedDocumentId maps to an EvidenceMatch with provenance.provenanceState === 'VERIFIED'.
 * Preserves input order.
 */
export function filterVerifiedFindings(
  findings: SimilarityFinding[],
  matches: EvidenceMatch[]
): SimilarityFinding[] {
  if (!findings || findings.length === 0) return [];
  if (!matches || matches.length === 0) return [];

  const verifiedSourceIds = new Set<string>();
  for (const match of matches) {
    if (match?.provenance?.provenanceState === 'VERIFIED' && match.sourceId) {
      verifiedSourceIds.add(match.sourceId);
    }
  }

  return findings.filter(
    (finding) => finding && verifiedSourceIds.has(finding.matchedDocumentId)
  );
}

interface MergedRange {
  start: number;
  end: number;
  method: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP';
  findingId: string;
}

function resolveStrongerMethod(
  m1: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP' | undefined,
  m2: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP' | undefined
): 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP' {
  const p1 = (m1 && METHOD_PRECEDENCE[m1]) || 1;
  const p2 = (m2 && METHOD_PRECEDENCE[m2]) || 1;
  return p1 >= p2 ? (m1 || 'TOKEN_OVERLAP') : (m2 || 'TOKEN_OVERLAP');
}

/**
 * Locates candidate segment in document text when offsets are not pre-indexed.
 */
function locateSegmentOffsets(
  text: string,
  segment: string
): { start: number; end: number } | null {
  if (!text || !segment) return null;

  // 1. Direct match
  const directIdx = text.indexOf(segment);
  if (directIdx !== -1) {
    return { start: directIdx, end: directIdx + segment.length };
  }

  // 2. Case-insensitive direct match
  const lowerText = text.toLowerCase();
  const lowerSeg = segment.toLowerCase();
  const caseIdx = lowerText.indexOf(lowerSeg);
  if (caseIdx !== -1) {
    return { start: caseIdx, end: caseIdx + segment.length };
  }

  // 3. Sliding phrase window (find longest subphrase >= 2 words)
  const words = segment.split(/\s+/).filter((w) => w.length > 0);
  for (let windowSize = words.length; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const sub = words.slice(i, i + windowSize).join(' ');
      if (sub.length < 5) continue;
      const subIdx = lowerText.indexOf(sub.toLowerCase());
      if (subIdx !== -1) {
        return { start: subIdx, end: subIdx + sub.length };
      }
    }
  }

  return null;
}

interface ResolvedFinding {
  start: number;
  end: number;
  findingId: string;
  method: 'EXACT_PHRASE' | 'NGRAM' | 'TOKEN_OVERLAP';
  sourceSegment?: string;
}

/**
 * Calculates deterministic highlight segments for canonical document text given similarity findings.
 */
export function applyHighlights(
  text: string,
  findings: SimilarityFinding[]
): HighlightSegment[] {
  if (typeof text !== 'string') return [];
  if (text.length === 0) return [];
  if (!findings || findings.length === 0) {
    return [{ text, start: 0, end: text.length }];
  }

  // R1: Validate findings and resolve offsets
  const validFindings: ResolvedFinding[] = [];
  for (const f of findings) {
    if (!f) continue;
    let start = f.sourceStart;
    let end = f.sourceEnd;

    // If offsets are not provided, resolve from text
    if ((start === undefined || end === undefined) && f.sourceSegment) {
      const loc = locateSegmentOffsets(text, f.sourceSegment);
      if (loc) {
        start = loc.start;
        end = loc.end;
      }
    }

    if (start === undefined || end === undefined || start < 0 || end <= start) {
      continue;
    }
    if (end > text.length) {
      continue;
    }
    if (f.sourceStart !== undefined && f.sourceEnd !== undefined && f.sourceSegment !== undefined && f.sourceSegment !== null) {
      const sliceText = text.slice(start, end);
      if (normalizeWhitespace(sliceText) !== normalizeWhitespace(f.sourceSegment)) {
        continue;
      }
    }

    validFindings.push({
      start,
      end,
      findingId: f.findingId,
      method: (f.matchMethod as any) || 'TOKEN_OVERLAP',
      sourceSegment: f.sourceSegment,
    });
  }

  if (validFindings.length === 0) {
    return [{ text, start: 0, end: text.length }];
  }

  // R2: Sort by sourceStart ascending, then sourceEnd descending
  validFindings.sort((a, b) => {
    const startDiff = a.start - b.start;
    if (startDiff !== 0) return startDiff;
    return b.end - a.end;
  });

  // R3: Merge overlapping or touching ranges
  const merged: MergedRange[] = [];
  for (const f of validFindings) {
    const current: MergedRange = {
      start: f.start,
      end: f.end,
      method: f.method,
      findingId: f.findingId,
    };

    if (merged.length === 0) {
      merged.push(current);
    } else {
      const last = merged[merged.length - 1];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
        last.method = resolveStrongerMethod(last.method, current.method);
      } else {
        merged.push(current);
      }
    }
  }

  // R4: Walk text emitting plain segments for gaps and highlighted segments for ranges
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({
        text: text.slice(cursor, range.start),
        start: cursor,
        end: range.start,
      });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      findingId: range.findingId,
      method: range.method,
      start: range.start,
      end: range.end,
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
    });
  }

  // R5: Return in document order
  return segments;
}
