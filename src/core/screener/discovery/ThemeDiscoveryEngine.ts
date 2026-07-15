/**
 * Theme Discovery Engine — detect active market themes (Sprint 9D.R6).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  DISCOVERY_EMPTY,
  THEME_IDS,
  THEME_LABELS,
  THEME_MATCHERS,
  emptyDiscoveryResult,
  normalizeThemeCard,
  type DiscoveryCandidate,
  type ThemeCard,
  type ThemeId,
} from "./DiscoveryPresentationModels";
import { composeDiscoveryScoreFactors } from "./IdeaRankingEngine";

function haystack(candidate: DiscoveryCandidate): string {
  const parts = [
    candidate.sector,
    candidate.industry,
    ...(candidate.tags ?? []),
    ...(candidate.themeTags ?? []),
  ];
  return parts
    .map((p) => safeScreenText(p, "").toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function matchThemes(candidate: DiscoveryCandidate): ThemeId[] {
  const text = haystack(candidate);
  if (!text) return [];
  const matched: ThemeId[] = [];
  for (const themeId of THEME_IDS) {
    const needles = THEME_MATCHERS[themeId];
    if (needles.some((n) => text.includes(n.toLowerCase()))) {
      matched.push(themeId);
    }
  }
  return matched;
}

export function discoverThemes(
  candidates: DiscoveryCandidate[]
): ThemeCard[] {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [
      normalizeThemeCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.noActiveThemes,
      }),
    ];
  }

  const buckets = new Map<
    ThemeId,
    { scores: number[]; tickers: string[]; sectors: Set<string> }
  >();

  for (const candidate of candidates) {
    const themes = matchThemes(candidate);
    if (themes.length === 0) continue;
    const factors = composeDiscoveryScoreFactors(candidate);
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    const sector = safeScreenText(candidate.sector, "—");
    for (const themeId of themes) {
      const bucket = buckets.get(themeId) ?? {
        scores: [],
        tickers: [],
        sectors: new Set<string>(),
      };
      bucket.scores.push(factors.overallDiscoveryScore);
      if (ticker) bucket.tickers.push(ticker);
      if (sector && sector !== "—") bucket.sectors.add(sector);
      buckets.set(themeId, bucket);
    }
  }

  if (buckets.size === 0) {
    return [
      normalizeThemeCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.noActiveThemes,
      }),
    ];
  }

  const cards: ThemeCard[] = [];
  for (const themeId of THEME_IDS) {
    const bucket = buckets.get(themeId);
    if (!bucket) continue;
    const avg =
      bucket.scores.reduce((a, b) => a + b, 0) /
      Math.max(1, bucket.scores.length);
    const rankedLeaders = [...bucket.tickers]
      .map((t, i) => ({ t, s: bucket.scores[i] ?? 0 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.t);
    const uniqueLeaders = [...new Set(rankedLeaders)].slice(0, 5);

    cards.push(
      normalizeThemeCard({
        themeId,
        label: THEME_LABELS[themeId],
        strength: safeScreenNumber(avg, 0),
        candidateCount: bucket.scores.length,
        leaders: uniqueLeaders,
        sectors: [...bucket.sectors],
        empty: false,
        emptyMessage: DISCOVERY_EMPTY.noActiveThemes,
      })
    );
  }

  return cards.sort((a, b) => b.strength - a.strength);
}

/** Convenience — empty discovery shell when themes missing. */
export function emptyThemeDiscoveryResult() {
  return emptyDiscoveryResult(DISCOVERY_EMPTY.noActiveThemes);
}

export class ThemeDiscoveryEngine {
  discover(candidates: DiscoveryCandidate[]): ThemeCard[] {
    try {
      return discoverThemes(candidates);
    } catch {
      return [
        normalizeThemeCard({
          empty: true,
          emptyMessage: DISCOVERY_EMPTY.noActiveThemes,
        }),
      ];
    }
  }

  match(candidate: DiscoveryCandidate): ThemeId[] {
    return matchThemes(candidate);
  }
}
