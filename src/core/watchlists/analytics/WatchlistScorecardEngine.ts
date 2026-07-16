/**
 * Watchlist Scorecard Engine — institutional grading (Sprint 10B.R5).
 * Composes performance, analytics, health; no duplicated scoring.
 */

import { getWatchlistHealth } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getBenchmark } from "./WatchlistBenchmarkEngine";
import { getPerformance } from "./WatchlistPerformanceEngine";
import { getAnalyticsView } from "./WatchlistAnalyticsEngine";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyScorecardView,
  scoreToGrade,
  safeAnalyticsText,
  type ScorecardGrade,
  type WatchlistAnalyticsContext,
  type WatchlistScorecardView,
} from "./WatchlistAnalyticsModels";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getScorecard(
  context?: WatchlistAnalyticsContext | null
): WatchlistScorecardView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyScorecardView();
  }

  const performance = getPerformance(context);
  const analytics = getAnalyticsView(context);
  const benchmark = getBenchmark(context);
  const health = getWatchlistHealth(context as WatchlistIntelligenceContext);

  if (performance.empty) {
    return emptyScorecardView();
  }

  const researchQuality = clampScore(analytics.averageValidation);
  const selectionQuality = clampScore(
    performance.winRate * 0.6 + analytics.averageConviction * 0.4
  );
  const riskQuality = clampScore(
    100 - health.averageRisk + analytics.riskDistribution.low * 5
  );
  const diversification = clampScore(health.diversificationScore);
  const consistency = clampScore(
    performance.hitRatio * 20 + (100 - Math.abs(performance.relativePerformance) * 2)
  );

  const alphaBonus = benchmark.benchmarks[0]
    ? Math.max(0, benchmark.benchmarks[0].relativeAlpha * 5)
    : 0;
  const overall = clampScore(
    (researchQuality +
      selectionQuality +
      riskQuality +
      diversification +
      consistency) /
      5 +
      alphaBonus
  );

  const scores: Record<string, number> = {
    researchQuality,
    selectionQuality,
    riskQuality,
    diversification,
    consistency,
    overall,
  };

  const toGrade = (key: string): ScorecardGrade => scoreToGrade(scores[key] ?? 0);

  return {
    watchlistId,
    overallGrade: toGrade("overall"),
    researchQuality: toGrade("researchQuality"),
    selectionQuality: toGrade("selectionQuality"),
    riskQuality: toGrade("riskQuality"),
    diversification: toGrade("diversification"),
    consistency: toGrade("consistency"),
    scores,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noPerformanceData,
  };
}

export class WatchlistScorecardEngine {
  getScorecard = getScorecard;
}
