/**
 * GRADIFI VERIFY - DOCUMENT NORMALIZER
 * Pure deterministic document normalization, tokenization, and hashing.
 * HOEOS Rule: Absolute Determinism, Zero Math.random().
 */

/**
 * Normalizes document text for deterministic matching.
 * Converts to lowercase, strips diacritics/control characters, normalizes whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into non-empty alphanumeric tokens.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 0);
}

/**
 * Segments document into non-empty sentences.
 */
export function segmentSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

/**
 * Generates sliding window n-grams from token array.
 */
export function generateNGrams(tokens: string[], n: number): string[] {
  if (tokens.length < n || n <= 0) return [];
  const nGrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    nGrams.push(tokens.slice(i, i + n).join(' '));
  }
  return nGrams;
}

/**
 * Deterministic FNV-1a 64-bit hash string representation.
 * Guarantees identical output for identical input across all platforms.
 */
export function computeHash(text: string): string {
  if (!text) return '0000000000000000';
  
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}
