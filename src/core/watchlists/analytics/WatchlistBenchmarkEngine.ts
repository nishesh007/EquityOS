/**
 * Watchlist Benchmark Engine — index comparison (Sprint 10B.R5).
 */

import { getPerformance } from "./WatchlistPerformanceEngine";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyBenchmarkView,
  safeAnalyticsNumber,
  safeAnalyticsText,
  type BenchmarkKind,
  type BenchmarkRow,
  type WatchlistAnalyticsContext,
  type WatchlistBenchmarkView,
} from "./WatchlistAnalyticsModels";

const BENCHMARK_LABELS: Record<BenchmarkKind, string> = {
  nifty: "Nifty 50",
  sensex: "Sensex",
  sector_index: "Sector Index",
  custom: "Custom Benchmark",
};

const DEFAULT_BENCHMARKS: Record<BenchmarkKind, number> = {
  nifty: 1.2,
  sensex: 1.0,
  sector_index: 1.5,
  custom: 0.8,
};

function betaFromVolatility(
  watchlistReturn: number,
  benchmarkReturn: number
): number {
  if (benchmarkReturn === 0) return 1;
  return Math.round((watchlistReturn / benchmarkReturn) * 100) / 100;
}

export function getBenchmark(
  context?: WatchlistAnalyticsContext | null
): WatchlistBenchmarkView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const performance = getPerformance(context);

  if (performance.empty) {
    return emptyBenchmarkView();
  }

  const watchlistReturn = performance.aggregateReturn;
  const overrides = context?.benchmarkReturns ?? {};
  const kinds: BenchmarkKind[] = ["nifty", "sensex", "sector_index", "custom"];

  const benchmarks: BenchmarkRow[] = kinds.map((kind) => {
    const benchReturn = safeAnalyticsNumber(
      overrides[kind],
      DEFAULT_BENCHMARKS[kind]
    );
    const alpha = Math.round((watchlistReturn - benchReturn) * 100) / 100;
    const beta = betaFromVolatility(watchlistReturn, benchReturn);
    return {
      kind,
      label: BENCHMARK_LABELS[kind],
      returnPercent: benchReturn,
      relativeAlpha: alpha,
      relativeBeta: beta,
    };
  });

  return {
    watchlistId,
    watchlistReturn,
    benchmarks,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noBenchmark,
  };
}

export class WatchlistBenchmarkEngine {
  getBenchmark = getBenchmark;
}
