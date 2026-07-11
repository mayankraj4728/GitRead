/**
 * Lightweight fuzzy subsequence matcher with scoring — no dependency.
 * Returns a score (higher = better) and the matched character indices for
 * highlighting, or null if `query` is not a subsequence of `text`.
 */
export interface FuzzyResult {
  score: number;
  indices: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0;
  let score = 0;
  let prevMatch = -2;
  const indices: number[] = [];

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      // Reward consecutive matches and matches at word boundaries.
      if (ti === prevMatch + 1) score += 8;
      else score += 1;
      if (ti === 0 || /[\s/\-_.]/.test(t[ti - 1])) score += 6;
      prevMatch = ti;
      qi++;
    }
  }

  if (qi < q.length) return null;
  // Prefer shorter targets and earlier first match.
  score += Math.max(0, 20 - (indices[0] ?? 0));
  score -= Math.max(0, text.length - q.length) * 0.05;
  return { score, indices };
}

/** Filter + rank a list by a fuzzy query against a key function. */
export function fuzzyRank<T>(
  items: T[],
  query: string,
  key: (item: T) => string,
  limit = 30,
): Array<{ item: T; indices: number[] }> {
  if (!query.trim()) {
    return items.slice(0, limit).map((item) => ({ item, indices: [] }));
  }
  const scored: Array<{ item: T; score: number; indices: number[] }> = [];
  for (const item of items) {
    const res = fuzzyMatch(query, key(item));
    if (res) scored.push({ item, score: res.score, indices: res.indices });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ item, indices }) => ({ item, indices }));
}
