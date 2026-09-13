/**
 * GRADIFI VERIFY - CANONICAL TEXT & CHARACTER OFFSET SERVICE
 * HOEOS P3 Standard: Pure Deterministic Positional Coordinate System & Match Span primitives.
 *
 * Offset Convention: Half-open interval [startOffset, endOffset)
 * Invariant: canonicalText.slice(startOffset, endOffset) === span.text
 * Character Unit: UTF-16 code units (JavaScript String index)
 */

export interface CanonicalTextSegment {
  segmentId: string;
  startOffset: number; // Inclusive
  endOffset: number;   // Exclusive
  text: string;
  type: 'paragraph' | 'sentence' | 'word';
}

export interface CanonicalWordSpan {
  word: string;
  startOffset: number;
  endOffset: number;
}

export interface CanonicalTextDocument {
  text: string;
  characterCount: number;
  wordCount: number;
  normalizationVersion: string;
  segments: CanonicalTextSegment[];
  wordSpans: CanonicalWordSpan[];
}

export interface MatchTextSpan {
  spanId: string;
  sourceId?: string;
  matchedText: string;
  startOffset: number; // Inclusive
  endOffset: number;   // Exclusive
  occurrenceIndex: number;
  matchType?: 'exact' | 'lexical' | 'semantic' | 'citation';
}

export interface FindSpansOptions {
  sourceId?: string;
  caseSensitive?: boolean;
  maxMatches?: number;
}

/**
 * Validates the core offset slice invariant.
 */
export function verifyOffsetSlice(
  canonicalText: string,
  span: { startOffset: number; endOffset: number; text: string }
): boolean {
  if (
    span.startOffset < 0 ||
    span.endOffset < span.startOffset ||
    span.endOffset > canonicalText.length
  ) {
    return false;
  }
  return canonicalText.slice(span.startOffset, span.endOffset) === span.text;
}

/**
 * Extracts word spans with exact UTF-16 start & end offsets.
 */
export function extractWordSpans(text: string): CanonicalWordSpan[] {
  if (!text) return [];
  const wordSpans: CanonicalWordSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const startOffset = match.index;
    const endOffset = startOffset + word.length;
    wordSpans.push({
      word,
      startOffset,
      endOffset
    });
  }

  return wordSpans;
}

/**
 * Builds a CanonicalTextDocument establishing paragraph, sentence, and word offsets.
 */
export function buildCanonicalTextDocument(canonicalText: string): CanonicalTextDocument {
  if (!canonicalText || !canonicalText.trim()) {
    return {
      text: '',
      characterCount: 0,
      wordCount: 0,
      normalizationVersion: 'P3-2026.1',
      segments: [],
      wordSpans: []
    };
  }

  // Standardize line endings to LF
  const text = canonicalText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const segments: CanonicalTextSegment[] = [];

  // 1. Paragraph Segmentation
  const paragraphRegex = /[^\n]+/g;
  let paraMatch: RegExpExecArray | null;
  let paraIndex = 0;

  while ((paraMatch = paragraphRegex.exec(text)) !== null) {
    const paraText = paraMatch[0];
    const paraStart = paraMatch.index;
    const paraEnd = paraStart + paraText.length;

    segments.push({
      segmentId: `seg_p_${paraIndex++}`,
      startOffset: paraStart,
      endOffset: paraEnd,
      text: paraText,
      type: 'paragraph'
    });

    // 2. Sentence Segmentation within Paragraph
    const sentenceRegex = /[^.!?]+[.!?]*/g;
    let sentMatch: RegExpExecArray | null;
    let sentIndex = 0;

    while ((sentMatch = sentenceRegex.exec(paraText)) !== null) {
      const sentText = sentMatch[0].trim();
      if (sentText.length > 3) {
        const sentRelativeStart = sentMatch.index + (sentMatch[0].indexOf(sentText));
        const sentStart = paraStart + sentRelativeStart;
        const sentEnd = sentStart + sentText.length;

        segments.push({
          segmentId: `seg_s_${paraIndex - 1}_${sentIndex++}`,
          startOffset: sentStart,
          endOffset: sentEnd,
          text: sentText,
          type: 'sentence'
        });
      }
    }
  }

  const wordSpans = extractWordSpans(text);

  return {
    text,
    characterCount: text.length,
    wordCount: wordSpans.length,
    normalizationVersion: 'P3-2026.1',
    segments,
    wordSpans
  };
}

/**
 * Pure deterministic match span primitive locating all occurrences of searchPhrase in canonicalText.
 */
export function findTextSpans(
  canonicalText: string,
  searchPhrase: string,
  options?: FindSpansOptions
): MatchTextSpan[] {
  if (!canonicalText || !searchPhrase || !searchPhrase.trim()) {
    return [];
  }

  const matches: MatchTextSpan[] = [];
  const maxMatches = options?.maxMatches || 1000;
  const caseSensitive = options?.caseSensitive ?? true;

  const targetText = caseSensitive ? canonicalText : canonicalText.toLowerCase();
  const query = caseSensitive ? searchPhrase : searchPhrase.toLowerCase();

  let occurrenceIndex = 0;
  let pos = targetText.indexOf(query);

  while (pos !== -1 && matches.length < maxMatches) {
    const startOffset = pos;
    const endOffset = startOffset + searchPhrase.length;
    const actualText = canonicalText.slice(startOffset, endOffset);

    matches.push({
      spanId: `span_${options?.sourceId || 'src'}_${startOffset}_${endOffset}_${occurrenceIndex}`,
      sourceId: options?.sourceId,
      matchedText: actualText,
      startOffset,
      endOffset,
      occurrenceIndex
    });

    occurrenceIndex++;
    pos = targetText.indexOf(query, pos + 1); // Advance position for repeated/overlapping match search
  }

  return matches;
}
