/**
 * GRADIFI VERIFY - PROVIDER PASSAGE EXTRACTOR
 * Locates the passage in the student's document that overlaps with a source snippet.
 * HOEOS Standard: 100% Deterministic, Exact Raw Offsets, Zero Randomness.
 */

export interface StudentPassage {
  text: string;
  start: number;
  end: number;
}

export interface PassageExtractorOptions {
  windowTokens?: number;
  minScore?: number;
}

interface RawToken {
  normalized: string;
  start: number;
  end: number;
}

function tokenizeWithOffsets(text: string): RawToken[] {
  const tokens: RawToken[] = [];
  const regex = /[^\s\p{P}]+|\S/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const normalized = raw.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (normalized.length > 0) {
      tokens.push({
        normalized,
        start: match.index,
        end: match.index + raw.length
      });
    }
  }

  return tokens;
}

function extractSnippetTokens(snippet: string): Set<string> {
  const set = new Set<string>();
  const regex = /[^\s\p{P}]+|\S/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(snippet)) !== null) {
    const normalized = match[0].toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (normalized.length > 0) {
      set.add(normalized);
    }
  }

  return set;
}

/**
 * Locates the passage in the student's document that overlaps with the source snippet.
 *
 * Strategy (deterministic):
 *   1. Check for exact substring match (raw or case-insensitive).
 *   2. Slide a window of N tokens over the student document and score each window
 *      against the snippet tokens by Jaccard overlap.
 *   3. Return the window with the highest score, provided it exceeds minScore.
 *   4. Return null if no window exceeds the threshold.
 */
export function extractStudentPassage(
  studentText: string,
  sourceSnippet: string,
  options?: PassageExtractorOptions
): StudentPassage | null {
  if (!studentText || !sourceSnippet) return null;

  const trimmedSnippet = sourceSnippet.trim();
  if (!trimmedSnippet) return null;

  // 1. Exact raw substring shortcut
  const rawIdx = studentText.indexOf(trimmedSnippet);
  if (rawIdx !== -1) {
    return {
      text: studentText.slice(rawIdx, rawIdx + trimmedSnippet.length),
      start: rawIdx,
      end: rawIdx + trimmedSnippet.length
    };
  }

  // 2. Exact case-insensitive substring shortcut
  const lowerDoc = studentText.toLowerCase();
  const lowerSnippet = trimmedSnippet.toLowerCase();
  const lowerIdx = lowerDoc.indexOf(lowerSnippet);
  if (lowerIdx !== -1) {
    return {
      text: studentText.slice(lowerIdx, lowerIdx + trimmedSnippet.length),
      start: lowerIdx,
      end: lowerIdx + trimmedSnippet.length
    };
  }

  // 3. Tokenized sliding window Jaccard overlap
  const windowTokens = options?.windowTokens ?? 12;
  const minScore = options?.minScore ?? 0.25;

  const docTokens = tokenizeWithOffsets(studentText);
  if (docTokens.length === 0) return null;

  const snippetTokenSet = extractSnippetTokens(sourceSnippet);
  if (snippetTokenSet.size === 0) return null;

  let bestScore = 0;
  let bestStart = -1;
  let bestEnd = -1;

  const effectiveWindow = Math.min(windowTokens, docTokens.length);

  for (let i = 0; i <= docTokens.length - effectiveWindow; i++) {
    const windowSlice = docTokens.slice(i, i + effectiveWindow);
    const windowTokenSet = new Set<string>();

    for (const t of windowSlice) {
      windowTokenSet.add(t.normalized);
    }

    let intersection = 0;
    for (const token of windowTokenSet) {
      if (snippetTokenSet.has(token)) {
        intersection++;
      }
    }

    if (intersection === 0) continue;

    const union = snippetTokenSet.size + windowTokenSet.size - intersection;
    const score = union > 0 ? intersection / union : 0;

    if (score > bestScore) {
      bestScore = score;
      bestStart = windowSlice[0].start;
      bestEnd = windowSlice[windowSlice.length - 1].end;
    }
  }

  if (bestScore >= minScore && bestStart !== -1 && bestEnd !== -1) {
    return {
      text: studentText.slice(bestStart, bestEnd),
      start: bestStart,
      end: bestEnd
    };
  }

  return null;
}
