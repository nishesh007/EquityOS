/**
 * Sprint 10C.R7 — lightweight fuzzy matcher for the command palette.
 *
 * Pure scoring over short labels/keywords (commands, pages, actions).
 * Company search keeps using lib/company-search — no duplication here.
 */

export interface FuzzyMatch {
  /** 0 (no match) … 100 (exact). */
  score: number;
}

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return index === needle.length;
}

/** Score a query against a primary label. */
export function fuzzyScore(query: string, label: string): number {
  const q = normalize(query);
  const l = normalize(label);
  if (!q) return 1; // empty query matches everything weakly
  if (q === l) return 100;
  if (l.startsWith(q)) return 90;
  if (l.split(" ").some((word) => word.startsWith(q))) return 80;
  if (l.includes(q)) return 70;
  if (q.length >= 2 && isSubsequence(q.replace(/\s+/g, ""), l.replace(/\s+/g, ""))) {
    return 50;
  }
  return 0;
}

/** Best score across a label and its keywords. */
export function fuzzyScoreAll(
  query: string,
  label: string,
  keywords: readonly string[] = []
): number {
  let best = fuzzyScore(query, label);
  for (const keyword of keywords) {
    // Keyword hits rank slightly below identical label hits.
    best = Math.max(best, Math.min(fuzzyScore(query, keyword), 75));
    if (best >= 100) break;
  }
  return best;
}
