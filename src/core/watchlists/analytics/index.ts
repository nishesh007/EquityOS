/**
 * Watchlist Analytics — public exports & orchestrator (Sprint 10B.R5).
 */

export {
  WATCHLIST_ANALYTICS_EMPTY,
  BENCHMARK_KINDS,
  SCORECARD_GRADES,
  safeAnalyticsText,
  safeAnalyticsNumber,
  scoreToGrade,
  emptyPerformanceView,
  emptyAnalyticsView,
  emptyHistoryView,
  emptyBenchmarkView,
  emptyAIReviewView,
  emptyScorecardView,
  emptyAnalyticsBundle,
} from "./WatchlistAnalyticsModels";
export type {
  WatchlistAnalyticsEmptyMessage,
  BenchmarkKind,
  ScorecardGrade,
  WatchlistAnalyticsContext,
  PerformanceSymbolRow,
  WatchlistPerformanceView,
  AnalyticsHighlight,
  AllocationSlice,
  WatchlistAnalyticsView,
  HistoryEntry,
  WatchlistHistoryView,
  BenchmarkRow,
  WatchlistBenchmarkView,
  WatchlistAIReviewView,
  WatchlistScorecardView,
  WatchlistAnalyticsBundle,
} from "./WatchlistAnalyticsModels";

export { getPerformance, WatchlistPerformanceEngine } from "./WatchlistPerformanceEngine";
export { getBenchmark, WatchlistBenchmarkEngine } from "./WatchlistBenchmarkEngine";
export { getAnalyticsView, WatchlistAnalyticsEngine } from "./WatchlistAnalyticsEngine";
export { getWatchlistHistory, WatchlistHistoryEngine } from "./WatchlistHistoryEngine";
export { getAIReview, WatchlistReviewEngine } from "./WatchlistReviewEngine";
export { getScorecard, WatchlistScorecardEngine } from "./WatchlistScorecardEngine";

import { WATCHLIST_SURFACE_ROUTES } from "../WatchlistModels";
import { getPerformance } from "./WatchlistPerformanceEngine";
import { getBenchmark } from "./WatchlistBenchmarkEngine";
import { getAnalyticsView } from "./WatchlistAnalyticsEngine";
import { getWatchlistHistory } from "./WatchlistHistoryEngine";
import { getAIReview } from "./WatchlistReviewEngine";
import { getScorecard } from "./WatchlistScorecardEngine";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyAnalyticsBundle,
  safeAnalyticsText,
  type WatchlistAnalyticsBundle,
  type WatchlistAnalyticsContext,
} from "./WatchlistAnalyticsModels";

export const SPRINT_10B_R5_FROZEN = true;

let engineInstance: WatchlistAnalyticsOrchestrator | null = null;

export class WatchlistAnalyticsOrchestrator {
  getPerformance = getPerformance;
  getBenchmark = getBenchmark;
  getAnalyticsView = getAnalyticsView;
  getWatchlistHistory = getWatchlistHistory;
  getAIReview = getAIReview;
  getScorecard = getScorecard;

  buildBundle(context?: WatchlistAnalyticsContext | null): WatchlistAnalyticsBundle {
    const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
    if (!symbols.length) {
      return emptyAnalyticsBundle();
    }

    return {
      performance: getPerformance(context),
      analytics: getAnalyticsView(context),
      history: getWatchlistHistory(context),
      benchmark: getBenchmark(context),
      aiReview: getAIReview(context),
      scorecard: getScorecard(context),
      empty: false,
      emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noPerformanceData,
      surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
    };
  }
}

export function getWatchlistAnalyticsOrchestrator(): WatchlistAnalyticsOrchestrator {
  if (!engineInstance) engineInstance = new WatchlistAnalyticsOrchestrator();
  return engineInstance;
}

export function getWatchlistAnalytics(
  context?: WatchlistAnalyticsContext | null
): WatchlistAnalyticsBundle {
  return getWatchlistAnalyticsOrchestrator().buildBundle(context);
}

export function resetWatchlistAnalytics(): void {
  engineInstance = null;
}

export function isSprint10BR5Frozen(): boolean {
  return SPRINT_10B_R5_FROZEN;
}

export function getWatchlistAnalyticsHealth(context?: WatchlistAnalyticsContext | null): {
  ready: boolean;
  performanceReady: boolean;
  benchmarkCount: number;
  historyCount: number;
  overallGrade: string;
  sprint10BR5Frozen: boolean;
  emptyMessage: string;
} {
  const bundle = getWatchlistAnalytics(context);
  return {
    ready: !bundle.performance.empty,
    performanceReady: !bundle.performance.empty,
    benchmarkCount: bundle.benchmark.benchmarks.length,
    historyCount:
      bundle.history.addedTimeline.length +
      bundle.history.performanceHistory.length +
      bundle.history.alertHistory.length,
    overallGrade: bundle.scorecard.overallGrade,
    sprint10BR5Frozen: SPRINT_10B_R5_FROZEN,
    emptyMessage: bundle.empty ? bundle.emptyMessage : "",
  };
}
