/**
 * Utility for clean, deterministic text normalization.
 */

/**
 * Normalizes input text:
 * 1. Trims leading & trailing whitespace
 * 2. Normalizes Unicode characters (NFKD) and strips diacritics
 * 3. Converts to lowercase
 * 4. Strips special/irrelevant punctuation, replacing with spaces
 * 5. Collapses multiple spaces into single space
 */
export function normalizeText(text?: string | null): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Tokenizes a string into an array of distinct normalized words.
 */
export function tokenizeText(text?: string | null): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter((token) => token.length > 0);
}
