import { normalizeText, tokenizeText } from './text-normalizer.util';

/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates normalized string similarity based on Levenshtein edit distance.
 * Returns a deterministic score between 0.0 and 1.0.
 */
export function stringSimilarity(strA: string, strB: string): number {
  const normA = normalizeText(strA);
  const normB = normalizeText(strB);

  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculates token-level Jaccard overlap similarity between two phrases.
 */
export function tokenOverlapSimilarity(strA: string, strB: string): number {
  const tokensA = new Set(tokenizeText(strA));
  const tokensB = new Set(tokenizeText(strB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return intersectionCount / unionCount;
}

export interface MatchScoreResult {
  score: number;
  matchType:
    | 'EXACT_CANONICAL'
    | 'EXACT_ALIAS'
    | 'TOKEN_CONTAINMENT'
    | 'FUZZY_TYPO'
    | 'PARTIAL_MATCH'
    | 'NO_MATCH';
}

/**
 * Deterministic scoring function evaluating a query string against a target candidate term.
 *
 * Scoring Heuristics (0.0 to 1.0):
 * - 1.00: Exact string match (after normalization)
 * - 0.92: Full token containment (query contains all target tokens in correct context or target contains all query tokens with >= 2 tokens)
 * - 0.85 - 0.90: Single edit typo / high edit-distance similarity
 * - 0.50 - 0.70: Generic single-token match or partial token overlap
 * - < 0.50: No significant relevance
 */
export function calculateMatchScore(
  query: string,
  target: string,
  isAlias: boolean = false,
): MatchScoreResult {
  const normQuery = normalizeText(query);
  const normTarget = normalizeText(target);

  if (!normQuery || !normTarget) {
    return { score: 0.0, matchType: 'NO_MATCH' };
  }

  // 1. Exact string match
  if (normQuery === normTarget) {
    return {
      score: 1.0,
      matchType: isAlias ? 'EXACT_ALIAS' : 'EXACT_CANONICAL',
    };
  }

  const queryTokens = tokenizeText(normQuery);
  const targetTokens = tokenizeText(normTarget);

  // 2. Full Token Containment check (e.g. "organic ragi flour" contains all tokens of "ragi flour")
  const allTargetTokensInQuery =
    targetTokens.length > 0 &&
    targetTokens.every((token) => queryTokens.includes(token));

  if (allTargetTokensInQuery) {
    // Highly relevant: The target product phrase is completely contained inside the user's query
    return {
      score: 0.92,
      matchType: 'TOKEN_CONTAINMENT',
    };
  }

  // 3. Typo / Edit Distance check
  // Typo check is valid when lengths are reasonably close (within 2 chars or 25% length)
  const lenDiff = Math.abs(normQuery.length - normTarget.length);
  if (lenDiff <= 3 && Math.min(normQuery.length, normTarget.length) >= 4) {
    const editSim = stringSimilarity(normQuery, normTarget);
    // Distance <= 2 on a word of length >= 6 gives > 0.70 similarity
    if (editSim >= 0.80) {
      return {
        score: Math.min(0.88, Number(editSim.toFixed(2))),
        matchType: 'FUZZY_TYPO',
      };
    }
  }

  // Check per-token typo if token counts match (e.g. "raagi flour" vs "ragi flour")
  if (queryTokens.length === targetTokens.length && queryTokens.length > 1) {
    let allTokensClose = true;
    let totalTokenSim = 0;
    for (let i = 0; i < queryTokens.length; i++) {
      const sim = stringSimilarity(queryTokens[i], targetTokens[i]);
      if (sim < 0.70) {
        allTokensClose = false;
        break;
      }
      totalTokenSim += sim;
    }

    if (allTokensClose) {
      const avgSim = totalTokenSim / queryTokens.length;
      return {
        score: Math.min(0.88, Number((avgSim * 0.90).toFixed(2))),
        matchType: 'FUZZY_TYPO',
      };
    }
  }

  // 4. Partial Token Overlap (e.g. single generic word like "flour" matching "ragi flour")
  const matchingTokens = queryTokens.filter((token) =>
    targetTokens.includes(token),
  );

  if (matchingTokens.length > 0) {
    // For single-word queries (e.g. "flour"), score is modest (0.50) to trigger NEEDS_CONFIRMATION if multiple products match
    const coverage = matchingTokens.length / Math.max(queryTokens.length, targetTokens.length);
    const score = Number((0.45 + coverage * 0.35).toFixed(2)); // Ranges 0.50 to 0.80

    return {
      score,
      matchType: 'PARTIAL_MATCH',
    };
  }

  return { score: 0.0, matchType: 'NO_MATCH' };
}
