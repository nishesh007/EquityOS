/**
 * Watchlist Health Engine — portfolio & diversification health (Sprint 10B.R3).
 * Composes R1 metrics; no duplicated scoring.
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { computeWatchlistMetrics, type WatchlistMetricsRecord } from "../WatchlistMetrics";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyHealthView,
  safeIntelNumber,
  safeIntelText,
  type WatchlistHealthView,
  type WatchlistIntelligenceContext,
} from "./WatchlistPresentationModels";

function mcapBand(value: number): "large" | "mid" | "small" {
  if (value >= 100_000) return "large";
  if (value >= 20_000) return "mid";
  return "small";
}

export function getWatchlistHealth(
  context?: WatchlistIntelligenceContext | null
): WatchlistHealthView {
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  if (!symbols.length) {
    return emptyHealthView(WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis);
  }

  const snapshots = context?.snapshots ?? {};
  const portfolioSet = new Set(
    (context?.portfolioSymbols ?? []).map((s) => s.toUpperCase())
  );
  const sectorBySymbol = context?.sectorBySymbol ?? {};
  const marketCapBySymbol = context?.marketCapBySymbol ?? {};

  const record: WatchlistMetricsRecord = {
    id: safeIntelText(context?.watchlistId, "watchlist"),
    kind: "custom",
    status: "active",
    symbols,
    pinned: false,
    favorite: false,
    metadata: {
      name: "Intelligence",
      description: "",
      owner: "platform",
      color: "#2563eb",
      icon: "list",
      tags: [],
      priority: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    cachedMetricsKey: `metrics:${context?.watchlistId ?? "intel"}`,
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };

  const metrics = computeWatchlistMetrics({
    record,
    snapshots,
    useCache: false,
  });

  const overlapCount = symbols.filter((s) => portfolioSet.has(s)).length;
  const portfolioOverlap =
    symbols.length === 0 ? 0 : Math.round((overlapCount / symbols.length) * 100);

  const sectorWeights = new Map<string, number>();
  for (const symbol of symbols) {
    const sector = safeIntelText(sectorBySymbol[symbol], "Other");
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + 1);
  }
  const maxSector = Math.max(0, ...sectorWeights.values());
  const sectorConcentration =
    symbols.length === 0 ? 0 : Math.round((maxSector / symbols.length) * 100);

  const distribution = { large: 0, mid: 0, small: 0 };
  for (const symbol of symbols) {
    const mcap = safeIntelNumber(marketCapBySymbol[symbol], 0);
    if (mcap <= 0) continue;
    distribution[mcapBand(mcap)] += 1;
  }

  let hhi = 0;
  for (const count of sectorWeights.values()) {
    const share = count / symbols.length;
    hhi += share * share;
  }
  const diversificationScore = Math.round((1 - hhi) * 100);

  return {
    watchlistId: record.id,
    averageConviction: metrics.averageConviction,
    averageTrust: metrics.averageTrust,
    averageRisk: metrics.risk,
    portfolioOverlap,
    sectorConcentration,
    marketCapDistribution: distribution,
    diversificationScore,
    companyCount: symbols.length,
    labels: {
      companies: String(symbols.length),
      conviction: `${metrics.averageConviction}`,
      trust: `${metrics.averageTrust}`,
      risk: `${metrics.risk}`,
      overlap: `${portfolioOverlap}%`,
      diversification: `${diversificationScore}`,
    },
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

export class WatchlistHealthEngine {
  getWatchlistHealth = getWatchlistHealth;
}
