/**
 * GRADIFI VERIFY - PROVIDER QUERY BUILDER
 * Extracts representative body keywords for academic federation search APIs (Crossref, OpenAlex, etc.).
 * HOEOS Standard: Strict Determinism, Structural Heading Filtering, Content-Grounded Retrieval.
 */

const STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 'to', 'a', 'is', 'it', 'this', 'that', 'for', 'on', 'with', 'as', 'by',
  'at', 'an', 'be', 'are', 'was', 'were', 'or', 'from', 'has', 'have', 'had', 'not', 'but', 'they',
  'we', 'you', 'i', 'he', 'she', 'them', 'their', 'his', 'her', 'its', 'our', 'your',
  'which', 'also', 'can', 'will', 'would', 'could', 'should', 'been', 'being', 'having',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'too', 'very', 'only', 'own', 'same', 'so', 'than', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'what', 'who', 'whom', 'these', 'those', 'am',
  'use', 'used', 'using', 'based', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'first', 'second', 'third', 'difficult', 'problem', 'problems', 'encountered',
  'project', 'chapter', 'section', 'page', 'introduction', 'conclusion', 'recommendation',
  'references', 'abstract', 'table', 'figure', 'aim', 'objectives', 'study', 'work', 'paper',
  'report', 'author', 'university', 'department', 'made', 'make', 'makes', 'making', 'many',
  'much', 'well', 'give', 'gives', 'given', 'show', 'shows', 'shown', 'types', 'type',
  'various', 'due', 'high', 'low', 'large', 'small', 'like', 'mercury', 'liquid', 'glass',
  'scale', 'bulb', 'tube', 'change', 'changes', 'point', 'points', 'device', 'devices',
  'output', 'input', 'circuit', 'circuits', 'voltage', 'crystal', 'display'
]);

/**
 * Extract an explicit DOI from document text if present in the header / first page.
 */
export function extractDocumentDoi(documentText: string): string | undefined {
  if (!documentText || typeof documentText !== 'string') return undefined;
  const doiRegex = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/;
  const firstChunk = documentText.slice(0, 3000);
  const match = firstChunk.match(doiRegex);
  return match ? match[1] : undefined;
}

/**
 * Construct a clean, representative keyword query from document body text.
 * Strips headings, chapter titles, table/figure captions, and bibliography.
 */
export function buildProviderQuery(
  documentText: string,
  maxKeywords: number = 8
): string {
  if (!documentText || typeof documentText !== 'string') {
    return '';
  }

  // a. Split into lines and strip structural markers
  const rawLines = documentText.split(/\r?\n/);
  const cleanBodyParagraphs: string[] = [];
  let inReferences = false;
  let currentParagraphLines: string[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentParagraphLines.length > 0) {
        cleanBodyParagraphs.push(currentParagraphLines.join(' '));
        currentParagraphLines = [];
      }
      continue;
    }

    // Check for references / bibliography section start
    if (/^(references|bibliography|works cited|literature cited)\b/i.test(line)) {
      inReferences = true;
      break; // Ignore all text after references marker
    }

    if (inReferences) continue;

    // Filter structural headings:
    // - Chapter headings: "CHAPTER ONE", "Chapter 1", etc.
    if (/^chapter\s+([0-9]+|[a-z]+)/i.test(line)) continue;
    // - Numbered section headings: "1.0", "1.1", "5.1 CONCLUSION", "4.4 PROBLEM ENCOUNTERED"
    if (/^[0-9]+(\.[0-9]+)*\s+[A-Z0-9\s.,:;—\-_()]+/i.test(line)) continue;
    // - All-caps lines that are short or heading-like (e.g. "INTRODUCTION", "AIM AND OBJECTIVES OF THE STUDY")
    if (line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) continue;
    // - Captions: "Figure 1", "Table 2", "Page 3 of 10"
    if (/^(figure|fig\.|table|page)\s+[0-9]+/i.test(line)) continue;

    currentParagraphLines.push(line);
  }

  if (currentParagraphLines.length > 0) {
    cleanBodyParagraphs.push(currentParagraphLines.join(' '));
  }

  // b. Tokenize and count frequencies across distinct paragraphs
  const tokenFreq = new Map<string, number>();
  const tokenParagraphs = new Map<string, Set<number>>();

  cleanBodyParagraphs.forEach((paragraph, pIdx) => {
    const tokens = paragraph
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t) && !/^[0-9]+$/.test(t));

    for (const rawToken of tokens) {
      // Normalize simple plural s (e.g. thermometers -> thermometer, sensors -> sensor)
      const token = rawToken.endsWith('s') && !rawToken.endsWith('ss') && rawToken.length > 4 && !STOPWORDS.has(rawToken.slice(0, -1))
        ? rawToken.slice(0, -1)
        : rawToken;

      if (STOPWORDS.has(token)) continue;

      tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
      if (!tokenParagraphs.has(token)) {
        tokenParagraphs.set(token, new Set());
      }
      tokenParagraphs.get(token)!.add(pIdx);
    }
  });

  // f. Prefer tokens appearing in at least 2 distinct paragraphs if possible
  const minParagraphCount = cleanBodyParagraphs.length >= 3 ? 2 : 1;
  const candidateTokens = Array.from(tokenFreq.entries())
    .filter(([token]) => {
      const pCount = tokenParagraphs.get(token)?.size || 0;
      return pCount >= minParagraphCount;
    });

  // Fallback if too few tokens qualify under 2-paragraph constraint
  const finalCandidates = candidateTokens.length >= maxKeywords
    ? candidateTokens
    : Array.from(tokenFreq.entries());

  // Sort deterministically: frequency descending, then alphabetical ascending for ties
  finalCandidates.sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });

  const topKeywords = finalCandidates.slice(0, maxKeywords).map(entry => entry[0]);
  return topKeywords.join(' ');
}
