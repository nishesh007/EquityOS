/**
 * Watchlist Recommendation Engine — AI suggestions (Sprint 10B.R2).
 * Reuses metric bags; no duplicated scoring engines.
 */

import { searchWatchlists } from "../WatchlistRegistry";
import {
  DYNAMIC_TEMPLATE_LABELS,
  DYNAMIC_WATCHLIST_TEMPLATES,
  SMART_WATCHLIST_EMPTY,
  safeSmartNumber,
  safeSmartText,
  type SmartWatchlistCandidate,
  type WatchlistRecommendation,
  type WatchlistRecommendationsView,
} from "./SmartWatchlistModels";

function rec(
  ticker: string,
  action: WatchlistRecommendation["action"],
  reason: string,
  score: number,
  priority: number
): WatchlistRecommendation {
  return {
    ticker: ticker.toUpperCase(),
    action,
    reason: safeSmartText(reason, SMART_WATCHLIST_EMPTY.noSuggestions),
    score: safeSmartNumber(score, 0),
    priority: safeSmartNumber(priority, 0),
  };
}

export function getRecommendations(input: {
  candidates: readonly SmartWatchlistCandidate[];
  watchlistSymbols?: readonly string[];
  portfolioSymbols?: readonly string[];
}): WatchlistRecommendationsView {
  if (!input.candidates.length) {
    return {
      toAdd: [],
      toRemove: [],
      toMonitor: [],
      trending: [],
      aiSuggestions: [],
      suggestedWatchlists: [],
      duplicates: [],
      empty: true,
      emptyMessage: SMART_WATCHLIST_EMPTY.noSuggestions,
    };
  }

  const watchSet = new Set(
    (input.watchlistSymbols ?? []).map((s) => s.toUpperCase())
  );
  const portfolioSet = new Set(
    (input.portfolioSymbols ?? []).map((s) => s.toUpperCase())
  );

  const toAdd: WatchlistRecommendation[] = [];
  const toRemove: WatchlistRecommendation[] = [];
  const toMonitor: WatchlistRecommendation[] = [];
  const trending: WatchlistRecommendation[] = [];
  const aiSuggestions: WatchlistRecommendation[] = [];

  for (const c of input.candidates) {
    const ticker = safeSmartText(c.ticker, "").toUpperCase();
    if (!ticker) continue;

    const conviction = safeSmartNumber(
      c.metrics.ai_conviction as number | null,
      0
    );
    const trust = safeSmartNumber(c.metrics.trust_score as number | null, 0);
    const momentum = safeSmartNumber(c.metrics.momentum as number | null, 0);
    const risk = safeSmartNumber(c.metrics.risk_score as number | null, 100);
    const inList = watchSet.has(ticker) || c.inWatchlist;

    if (!inList && conviction >= 70 && trust >= 65) {
      toAdd.push(
        rec(
          ticker,
          "add",
          "High conviction and trust — candidate for watchlist",
          conviction,
          Math.round(conviction * 0.7 + trust * 0.3)
        )
      );
    }

    if (inList && conviction < 40 && risk > 65) {
      toRemove.push(
        rec(
          ticker,
          "remove",
          "Conviction dropped with elevated risk",
          risk,
          Math.round(risk)
        )
      );
    }

    if (inList && momentum >= 55 && momentum < 80) {
      toMonitor.push(
        rec(
          ticker,
          "monitor",
          "Building momentum — monitor for breakout",
          momentum,
          Math.round(momentum)
        )
      );
    }

    if (momentum >= 75 && conviction >= 60) {
      trending.push(
        rec(
          ticker,
          "trending",
          "Strong momentum with institutional interest",
          momentum,
          Math.round(momentum * 0.6 + conviction * 0.4)
        )
      );
    }

    if (conviction >= 65 && trust >= 60 && !portfolioSet.has(ticker)) {
      aiSuggestions.push(
        rec(
          ticker,
          "ai_suggest",
          "AI composite score supports research attention",
          Math.round(conviction * 0.55 + trust * 0.45),
          Math.round(conviction)
        )
      );
    }
  }

  const suggestedWatchlists = DYNAMIC_WATCHLIST_TEMPLATES.slice(0, 4).map(
    (templateId) => ({
      templateId,
      label: DYNAMIC_TEMPLATE_LABELS[templateId],
      reason: `Suggested dynamic collection: ${DYNAMIC_TEMPLATE_LABELS[templateId]}`,
    })
  );

  const duplicates = detectDuplicateWatchlists();

  const empty =
    toAdd.length === 0 &&
    toRemove.length === 0 &&
    toMonitor.length === 0 &&
    trending.length === 0 &&
    aiSuggestions.length === 0;

  return {
    toAdd: toAdd.sort((a, b) => b.priority - a.priority),
    toRemove: toRemove.sort((a, b) => b.priority - a.priority),
    toMonitor: toMonitor.sort((a, b) => b.priority - a.priority),
    trending: trending.sort((a, b) => b.priority - a.priority),
    aiSuggestions: aiSuggestions.sort((a, b) => b.priority - a.priority),
    suggestedWatchlists,
    duplicates,
    empty,
    emptyMessage: empty
      ? SMART_WATCHLIST_EMPTY.noSuggestions
      : SMART_WATCHLIST_EMPTY.awaitingAiAnalysis,
  };
}

export function detectDuplicateWatchlists(): Array<{
  watchlistIds: string[];
  overlap: string[];
}> {
  const records = searchWatchlists({ includeArchived: false });
  const duplicates: Array<{ watchlistIds: string[]; overlap: string[] }> = [];

  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i]!;
      const b = records[j]!;
      const overlap = a.symbols.filter((s) => b.symbols.includes(s));
      if (overlap.length >= 2) {
        duplicates.push({
          watchlistIds: [a.id, b.id],
          overlap,
        });
      }
    }
  }
  return duplicates;
}

export class WatchlistRecommendationEngine {
  getRecommendations = getRecommendations;
  detectDuplicateWatchlists = detectDuplicateWatchlists;
}
