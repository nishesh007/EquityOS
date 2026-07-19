/**
 * Watchlist Performance Engine — return & hit-rate analytics (Sprint 10B.R5).
 * Composes snapshot changePercent; no duplicated metric engines.
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { computeWatchlistMetrics, type WatchlistMetricsRecord } from "../WatchlistMetrics";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyPerformanceView,
  safeAnalyticsNumber,
  safeAnalyticsText,
  type PerformanceSymbolRow,
  type WatchlistAnalyticsContext,
  type WatchlistPerformanceView,
} from "./WatchlistAnalyticsModels";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function recordFromContext(context: WatchlistAnalyticsContext): WatchlistMetricsRecord {
  const symbols = (context.symbols ?? []).map((s) => s.toUpperCase());
  return {
    id: safeAnalyticsText(context.watchlistId, "watchlist"),
    kind: "custom",
    status: "active",
    symbols,
    pinned: false,
    favorite: false,
    metadata: {
      name: "Analytics",
      description: "",
      owner: "platform",
      color: "#2563eb",
      icon: "chart",
      tags: [],
      priority: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    cachedMetricsKey: `metrics:${context.watchlistId ?? "analytics"}`,
    empty: symbols.length === 0,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noPerformanceData,
  };
}

function returnSinceAdded(
  snap: WatchlistItemSnapshot,
  prior?: WatchlistItemSnapshot | null
): number {
  if (prior?.price && prior.price > 0 && snap.price > 0) {
    return round2(((snap.price - prior.price) / prior.price) * 100);
  }
  return round2(safeAnalyticsNumber(snap.changePercent, 0));
}

export function getPerformance(
  context?: WatchlistAnalyticsContext | null
): WatchlistPerformanceView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const snapshots = context?.snapshots ?? {};
  const prior = context?.priorSnapshots ?? {};

  if (!symbols.length) {
    return emptyPerformanceView();
  }

  const rows: PerformanceSymbolRow[] = [];
  for (const ticker of symbols) {
    const snap = snapshots[ticker];
    if (!snap) continue;
    const sinceAdded = returnSinceAdded(snap, prior[ticker]);
    const bench =
      safeAnalyticsNumber(context?.benchmarkReturns?.nifty, 1.2);
    rows.push({
      ticker,
      returnSinceAdded: sinceAdded,
      relativePerformance: round2(sinceAdded - bench),
      changePercent: round2(safeAnalyticsNumber(snap.changePercent, 0)),
    });
  }

  if (!rows.length) {
    return emptyPerformanceView();
  }

  const metrics = computeWatchlistMetrics({
    record: recordFromContext({ ...context, watchlistId, symbols }),
    snapshots,
    useCache: false,
  });

  const winners = rows.filter((r) => r.returnSinceAdded > 0);
  const losers = rows.filter((r) => r.returnSinceAdded < 0);
  const winRate = round2((winners.length / rows.length) * 100);
  const lossRate = round2((losers.length / rows.length) * 100);
  const averageGain =
    winners.length === 0
      ? 0
      : round2(
          winners.reduce((s, r) => s + r.returnSinceAdded, 0) / winners.length
        );
  const averageLoss =
    losers.length === 0
      ? 0
      : round2(
          losers.reduce((s, r) => s + r.returnSinceAdded, 0) / losers.length
        );
  const hitRatio =
    averageLoss === 0
      ? winRate
      : round2(
          Math.abs(averageGain / averageLoss) * (winRate / 100)
        );

  const aggregateReturn = round2(metrics.performance);
  const benchReturn = safeAnalyticsNumber(context?.benchmarkReturns?.nifty, 1.2);

  return {
    watchlistId,
    aggregateReturn,
    relativePerformance: round2(aggregateReturn - benchReturn),
    winRate,
    lossRate,
    averageGain,
    averageLoss,
    hitRatio,
    symbols: rows,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noPerformanceData,
  };
}

export class WatchlistPerformanceEngine {
  getPerformance = getPerformance;
}
