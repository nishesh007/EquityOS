/**
 * Watchlist Analytics Engine — cross-section analytics (Sprint 10B.R5).
 * Composes R3 summary + R1 metrics; no duplicated scoring.
 */

import { getWatchlistHealth } from "../intelligence";
import { getWatchlistSummary } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyAnalyticsView,
  safeAnalyticsNumber,
  safeAnalyticsText,
  type AllocationSlice,
  type AnalyticsHighlight,
  type WatchlistAnalyticsContext,
  type WatchlistAnalyticsView,
} from "./WatchlistAnalyticsModels";

function highlight(
  ticker: string,
  label: string,
  value: string
): AnalyticsHighlight {
  return { ticker, label, value: safeAnalyticsText(value, "—") };
}

function validationScore(status: string | null | undefined): number {
  const s = safeAnalyticsText(status, "").toLowerCase();
  if (s === "passed" || s === "validated") return 90;
  if (s === "pending" || s === "review") return 55;
  if (s === "failed" || s === "rejected") return 20;
  return 50;
}

function mcapBand(value: number): "Large" | "Mid" | "Small" {
  if (value >= 100_000) return "Large";
  if (value >= 20_000) return "Mid";
  return "Small";
}

export function getAnalyticsView(
  context?: WatchlistAnalyticsContext | null
): WatchlistAnalyticsView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyAnalyticsView();
  }

  const intelCtx = context as WatchlistIntelligenceContext;
  const summary = getWatchlistSummary(intelCtx);
  const health = getWatchlistHealth(intelCtx);
  const snapshots = context?.snapshots ?? {};
  const sectorBySymbol = context?.sectorBySymbol ?? {};
  const marketCapBySymbol = context?.marketCapBySymbol ?? {};

  if (summary.empty && health.empty) {
    return emptyAnalyticsView();
  }

  let validationSum = 0;
  let validationCount = 0;
  const riskDist = { low: 0, medium: 0, high: 0 };

  for (const ticker of symbols) {
    const snap = snapshots[ticker];
    if (!snap) continue;
    validationSum += validationScore(snap.validationStatus);
    validationCount += 1;
    const risk = 100 - safeAnalyticsNumber(snap.trustScore, 50);
    if (risk < 35) riskDist.low += 1;
    else if (risk < 65) riskDist.medium += 1;
    else riskDist.high += 1;
  }

  const sectorMap = new Map<string, number>();
  for (const ticker of symbols) {
    const sector = safeAnalyticsText(sectorBySymbol[ticker], "Other");
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1);
  }
  const sectorAllocation: AllocationSlice[] = [...sectorMap.entries()]
    .map(([label, count]) => ({
      label,
      count,
      weight: Math.round((count / symbols.length) * 100),
    }))
    .sort((a, b) => b.weight - a.weight);

  const mcapMap = new Map<string, number>();
  for (const ticker of symbols) {
    const band = mcapBand(safeAnalyticsNumber(marketCapBySymbol[ticker], 10_000));
    mcapMap.set(band, (mcapMap.get(band) ?? 0) + 1);
  }
  const marketCapAllocation: AllocationSlice[] = [...mcapMap.entries()].map(
    ([label, count]) => ({
      label,
      count,
      weight: Math.round((count / symbols.length) * 100),
    })
  );

  return {
    watchlistId,
    bestPerformer: summary.biggestWinner
      ? highlight(
          summary.biggestWinner.ticker,
          "Best Performer",
          summary.biggestWinner.value
        )
      : null,
    worstPerformer: summary.biggestLoser
      ? highlight(
          summary.biggestLoser.ticker,
          "Worst Performer",
          summary.biggestLoser.value
        )
      : null,
    mostImproved: summary.mostImproved
      ? highlight(
          summary.mostImproved.ticker,
          "Most Improved",
          summary.mostImproved.value
        )
      : null,
    mostDeteriorated: summary.mostDeteriorated
      ? highlight(
          summary.mostDeteriorated.ticker,
          "Most Deteriorated",
          summary.mostDeteriorated.value
        )
      : null,
    averageConviction: health.averageConviction,
    averageTrust: health.averageTrust,
    averageValidation:
      validationCount === 0 ? 0 : Math.round(validationSum / validationCount),
    riskDistribution: riskDist,
    sectorAllocation,
    marketCapAllocation,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.noPerformanceData,
  };
}

export class WatchlistAnalyticsEngine {
  getAnalyticsView = getAnalyticsView;
}
