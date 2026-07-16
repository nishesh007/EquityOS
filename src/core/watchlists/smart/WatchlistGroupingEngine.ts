/**
 * Watchlist Grouping Engine — auto grouping by dimensions (Sprint 10B.R2).
 */

import {
  GROUPING_DIMENSIONS,
  SMART_WATCHLIST_EMPTY,
  safeSmartNumber,
  safeSmartText,
  type GroupingDimension,
  type SmartWatchlistCandidate,
  type WatchlistGroupBucket,
  type WatchlistGroupingView,
} from "./SmartWatchlistModels";

function bucketKey(
  dimension: GroupingDimension,
  candidate: SmartWatchlistCandidate
): string {
  switch (dimension) {
    case "sector":
      return safeSmartText(candidate.sector, "Unknown Sector");
    case "industry":
      return safeSmartText(candidate.industry, "Unknown Industry");
    case "theme":
      return safeSmartText(candidate.theme, "General Theme");
    case "market_cap": {
      const mcap = safeSmartNumber(
        candidate.metrics.market_cap as number | null,
        0
      );
      if (mcap >= 100_000) return "Large Cap";
      if (mcap >= 20_000) return "Mid Cap";
      return "Small Cap";
    }
    case "risk": {
      const risk = safeSmartNumber(
        candidate.metrics.risk_score as number | null,
        50
      );
      if (risk <= 30) return "Low Risk";
      if (risk <= 60) return "Moderate Risk";
      return "High Risk";
    }
    case "conviction": {
      const conviction = safeSmartNumber(
        candidate.metrics.ai_conviction as number | null,
        0
      );
      if (conviction >= 75) return "High Conviction";
      if (conviction >= 50) return "Moderate Conviction";
      return "Low Conviction";
    }
    case "trust": {
      const trust = safeSmartNumber(
        candidate.metrics.trust_score as number | null,
        0
      );
      if (trust >= 70) return "High Trust";
      if (trust >= 50) return "Moderate Trust";
      return "Low Trust";
    }
    default:
      return "Other";
  }
}

export function groupWatchlist(input: {
  candidates: readonly SmartWatchlistCandidate[];
  dimension?: GroupingDimension;
}): WatchlistGroupingView {
  const dimension = input.dimension ?? "sector";
  if (!GROUPING_DIMENSIONS.includes(dimension)) {
    return {
      dimension,
      buckets: [],
      total: 0,
      empty: true,
      emptyMessage: SMART_WATCHLIST_EMPTY.noMatches,
    };
  }

  if (!input.candidates.length) {
    return {
      dimension,
      buckets: [],
      total: 0,
      empty: true,
      emptyMessage: SMART_WATCHLIST_EMPTY.noMatches,
    };
  }

  const map = new Map<string, WatchlistGroupBucket>();
  for (const candidate of input.candidates) {
    const ticker = safeSmartText(candidate.ticker, "").toUpperCase();
    if (!ticker) continue;
    const key = bucketKey(dimension, candidate);
    const existing = map.get(key);
    if (existing) {
      existing.tickers.push(ticker);
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        label: key,
        dimension,
        tickers: [ticker],
        count: 1,
      });
    }
  }

  const buckets = Array.from(map.values()).sort((a, b) => b.count - a.count);
  return {
    dimension,
    buckets,
    total: input.candidates.length,
    empty: buckets.length === 0,
    emptyMessage:
      buckets.length === 0
        ? SMART_WATCHLIST_EMPTY.noMatches
        : SMART_WATCHLIST_EMPTY.awaitingAiAnalysis,
  };
}

export function autoGroupAllDimensions(
  candidates: readonly SmartWatchlistCandidate[]
): WatchlistGroupingView[] {
  return GROUPING_DIMENSIONS.map((dimension) =>
    groupWatchlist({ candidates, dimension })
  ).filter((view) => !view.empty);
}

export class WatchlistGroupingEngine {
  groupWatchlist = groupWatchlist;
  autoGroupAllDimensions = autoGroupAllDimensions;
}
