/**
 * Watchlist Insight Engine — insights & intelligence orchestrator (Sprint 10B.R3).
 */

import { getWatchlistChanges } from "./WatchlistChangeEngine";
import { getWatchlistHealth } from "./WatchlistHealthEngine";
import { getWatchlistOpportunities } from "./WatchlistOpportunityEngine";
import { getWatchlistRecommendations } from "./WatchlistRecommendationEngine";
import { getWatchlistSummary } from "./WatchlistSummaryEngine";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyInsightsView,
  emptyIntelligenceBundle,
  safeIntelNumber,
  safeIntelText,
  type WatchlistInsightBucket,
  type WatchlistInsightsView,
  type WatchlistIntelligenceBundle,
  type WatchlistIntelligenceContext,
} from "./WatchlistPresentationModels";

export const SPRINT_10B_R3_FROZEN = true;

function bucket(id: string, label: string, tickers: string[]): WatchlistInsightBucket {
  return { id, label, tickers: tickers.map((t) => t.toUpperCase()) };
}

export function getWatchlistInsights(
  context?: WatchlistIntelligenceContext | null
): WatchlistInsightsView {
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const snapshots = context?.snapshots ?? {};
  const metrics = context?.metricsBySymbol ?? {};
  const sectorBySymbol = context?.sectorBySymbol ?? {};

  if (!symbols.length) {
    return emptyInsightsView();
  }

  const rows = symbols
    .map((ticker) => ({
      ticker,
      snap: snapshots[ticker],
      metrics: metrics[ticker] ?? {},
      sector: safeIntelText(sectorBySymbol[ticker], "Other"),
    }))
    .filter((r) => r.snap);

  if (!rows.length) {
    return emptyInsightsView();
  }

  const topOpportunities = [...rows]
    .sort(
      (a, b) =>
        safeIntelNumber(b.snap!.convictionScore, 0) -
        safeIntelNumber(a.snap!.convictionScore, 0)
    )
    .slice(0, 3)
    .map((r) => r.ticker);

  const topRisks = [...rows]
    .sort(
      (a, b) =>
        (100 - safeIntelNumber(b.snap!.trustScore, 50)) -
        (100 - safeIntelNumber(a.snap!.trustScore, 50))
    )
    .slice(0, 3)
    .map((r) => r.ticker);

  const sectorPerf = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const entry = sectorPerf.get(row.sector) ?? { sum: 0, count: 0 };
    entry.sum += row.snap!.changePercent;
    entry.count += 1;
    sectorPerf.set(row.sector, entry);
  }
  const sectorAvg = [...sectorPerf.entries()]
    .map(([sector, v]) => ({ sector, avg: v.sum / v.count }))
    .sort((a, b) => b.avg - a.avg);

  const leaderSector = sectorAvg[0]?.sector;
  const laggardSector = sectorAvg[sectorAvg.length - 1]?.sector;

  const sectorLeaders = rows
    .filter((r) => r.sector === leaderSector)
    .sort((a, b) => b.snap!.changePercent - a.snap!.changePercent)
    .slice(0, 3)
    .map((r) => r.ticker);

  const sectorLaggards = rows
    .filter((r) => r.sector === laggardSector)
    .sort((a, b) => a.snap!.changePercent - b.snap!.changePercent)
    .slice(0, 3)
    .map((r) => r.ticker);

  const momentumLeaders = [...rows]
    .sort(
      (a, b) =>
        safeIntelNumber(b.metrics.momentum as number | null, 0) -
        safeIntelNumber(a.metrics.momentum as number | null, 0)
    )
    .slice(0, 3)
    .map((r) => r.ticker);

  const valueIdeas = [...rows]
    .filter((r) => safeIntelNumber(r.metrics.pe as number | null, 99) <= 20)
    .map((r) => r.ticker)
    .slice(0, 3);

  const growthIdeas = [...rows]
    .filter((r) => safeIntelNumber(r.metrics.sales_growth as number | null, 0) >= 12)
    .map((r) => r.ticker)
    .slice(0, 3);

  const incomeIdeas = [...rows]
    .filter((r) => safeIntelNumber(r.metrics.dividend_yield as number | null, 0) >= 2)
    .map((r) => r.ticker)
    .slice(0, 3);

  return {
    topOpportunities: bucket("top_opportunities", "Top Opportunities", topOpportunities),
    topRisks: bucket("top_risks", "Top Risks", topRisks),
    sectorLeaders: bucket("sector_leaders", "Sector Leaders", sectorLeaders),
    sectorLaggards: bucket("sector_laggards", "Sector Laggards", sectorLaggards),
    momentumLeaders: bucket("momentum_leaders", "Momentum Leaders", momentumLeaders),
    valueIdeas: bucket("value_ideas", "Value Ideas", valueIdeas),
    growthIdeas: bucket("growth_ideas", "Growth Ideas", growthIdeas),
    incomeIdeas: bucket("income_ideas", "Income Ideas", incomeIdeas),
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

let engineInstance: WatchlistInsightEngine | null = null;

export class WatchlistInsightEngine {
  getWatchlistHealth = getWatchlistHealth;
  getWatchlistSummary = getWatchlistSummary;
  getWatchlistInsights = getWatchlistInsights;
  getWatchlistOpportunities = getWatchlistOpportunities;
  getWatchlistRecommendations = getWatchlistRecommendations;
  getWatchlistChanges = getWatchlistChanges;

  buildBundle(context?: WatchlistIntelligenceContext | null): WatchlistIntelligenceBundle {
    const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
    if (!symbols.length) {
      return emptyIntelligenceBundle();
    }

    return {
      health: getWatchlistHealth(context),
      summary: getWatchlistSummary(context),
      opportunities: getWatchlistOpportunities(context),
      changes: getWatchlistChanges(context),
      recommendations: getWatchlistRecommendations(context),
      insights: getWatchlistInsights(context),
      empty: false,
      emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
    };
  }
}

export function getWatchlistInsightEngine(): WatchlistInsightEngine {
  if (!engineInstance) engineInstance = new WatchlistInsightEngine();
  return engineInstance;
}

export function resetWatchlistIntelligence(): void {
  engineInstance = null;
}

export function isSprint10BR3Frozen(): boolean {
  return SPRINT_10B_R3_FROZEN;
}

export function getWatchlistIntelligenceHealth(context?: WatchlistIntelligenceContext | null): {
  ready: boolean;
  opportunityCount: number;
  changeCount: number;
  recommendationCount: number;
  insightBuckets: number;
  sprint10BR3Frozen: boolean;
  emptyMessage: string;
} {
  const bundle = getWatchlistInsightEngine().buildBundle(context);
  const buckets = [
    bundle.insights.topOpportunities,
    bundle.insights.topRisks,
    bundle.insights.sectorLeaders,
    bundle.insights.sectorLaggards,
    bundle.insights.momentumLeaders,
    bundle.insights.valueIdeas,
    bundle.insights.growthIdeas,
    bundle.insights.incomeIdeas,
  ].filter((b) => b.tickers.length > 0);

  return {
    ready: bundle.health.companyCount > 0,
    opportunityCount: bundle.opportunities.items.length,
    changeCount: bundle.changes.items.length,
    recommendationCount: bundle.recommendations.items.length,
    insightBuckets: buckets.length,
    sprint10BR3Frozen: SPRINT_10B_R3_FROZEN,
    emptyMessage: bundle.health.companyCount === 0
      ? WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis
      : "",
  };
}

export {
  getWatchlistHealth,
  getWatchlistSummary,
  getWatchlistOpportunities,
  getWatchlistRecommendations,
  getWatchlistChanges,
};
