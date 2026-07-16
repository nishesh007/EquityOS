/**
 * Watchlist Review Engine — AI selection review (Sprint 10B.R5).
 * Template-based review from R3 summary + performance; no LLM recalculation.
 */

import { getWatchlistRecommendations } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getWatchlistResearch } from "../workspace";
import { getPerformance } from "./WatchlistPerformanceEngine";
import { getAnalyticsView } from "./WatchlistAnalyticsEngine";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyAIReviewView,
  safeAnalyticsNumber,
  safeAnalyticsText,
  type WatchlistAnalyticsContext,
  type WatchlistAIReviewView,
} from "./WatchlistAnalyticsModels";

export function getAIReview(
  context?: WatchlistAnalyticsContext | null
): WatchlistAIReviewView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyAIReviewView();
  }

  const performance = getPerformance(context);
  const analytics = getAnalyticsView(context);
  const intelCtx = context as WatchlistIntelligenceContext;
  const recs = getWatchlistRecommendations(intelCtx);
  const research = getWatchlistResearch({
    watchlistId,
    symbols,
    workspaceId: context?.workspaceId,
    snapshots: context?.snapshots,
    now: context?.now,
  });

  if (performance.empty) {
    return emptyAIReviewView();
  }

  const winners = performance.symbols.filter((s) => s.returnSinceAdded > 0);
  const losers = performance.symbols.filter((s) => s.returnSinceAdded < 0);

  const whyWinnersWorked = winners.slice(0, 3).map((w) => {
    const snap = context?.snapshots?.[w.ticker];
    const conviction = safeAnalyticsNumber(snap?.convictionScore, 0);
    return `${w.ticker} gained ${w.returnSinceAdded}% — conviction ${conviction} supported the thesis.`;
  });

  const whyLosersFailed = losers.slice(0, 3).map((l) => {
    const snap = context?.snapshots?.[l.ticker];
    const trust = safeAnalyticsNumber(snap?.trustScore, 50);
    return `${l.ticker} lost ${Math.abs(l.returnSinceAdded)}% — trust score ${trust} flagged elevated risk.`;
  });

  const commonSuccessFactors: string[] = [];
  if (analytics.averageConviction >= 70) {
    commonSuccessFactors.push("High average conviction on winning ideas");
  }
  if (performance.winRate >= 50) {
    commonSuccessFactors.push(`Win rate of ${performance.winRate}% shows selective accuracy`);
  }
  if (analytics.bestPerformer) {
    commonSuccessFactors.push(
      `${analytics.bestPerformer.ticker} outperformed as ${analytics.bestPerformer.label}`
    );
  }

  const commonMistakes: string[] = [];
  if (analytics.worstPerformer) {
    commonMistakes.push(
      `${analytics.worstPerformer.ticker} underperformed — review entry timing`
    );
  }
  if (analytics.riskDistribution.high > analytics.riskDistribution.low) {
    commonMistakes.push("Risk distribution skews high — tighten position sizing");
  }
  if (performance.lossRate > performance.winRate) {
    commonMistakes.push("Loss rate exceeds win rate — refine removal criteria");
  }

  const suggestedImprovements = recs.items.slice(0, 4).map(
    (r) => `${r.action.toUpperCase()} ${r.ticker}: ${r.reason}`
  );
  if (suggestedImprovements.length === 0 && analytics.mostDeteriorated) {
    suggestedImprovements.push(
      `Monitor ${analytics.mostDeteriorated.ticker} for conviction recovery or exit`
    );
  }

  const researchCoverage = research.links.filter(
    (l) => l.summary !== WATCHLIST_ANALYTICS_EMPTY.noReview &&
      l.summary !== "No Research"
  ).length;
  const researchQualityReview =
    research.empty || researchCoverage === 0
      ? "Research coverage is thin — deepen notes and decision journal entries."
      : `${researchCoverage} of ${symbols.length} symbols have research coverage. ${research.health}`;

  return {
    watchlistId,
    whyWinnersWorked,
    whyLosersFailed,
    commonSuccessFactors,
    commonMistakes,
    suggestedImprovements,
    researchQualityReview,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noReview,
  };
}

export class WatchlistReviewEngine {
  getAIReview = getAIReview;
}
