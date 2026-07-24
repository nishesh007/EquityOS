/**
 * Async Server Component slots for the dashboard.
 * Each slot awaits only its own lightweight slice — Suspense streams HTML.
 * Expensive engines hydrate on the client (breadth / MI context / OE API).
 * Never import this module from Client Components.
 */

import {
  MarketPulseWidget,
  PortfolioSummaryWidget,
  WatchlistWidget,
} from "@/components/dashboard/widgets/DashboardWidgets";
import {
  MarketNewsWidget,
  ResultsCalendarWidget,
  EarningsIntelligenceWidget,
} from "@/components/dashboard/widgets/DeferredDashboardWidgets";
import { HydratedAiOpportunities } from "@/components/dashboard/widgets/HydratedAiOpportunities";
import { HydratedMarketMovers } from "@/components/dashboard/widgets/HydratedMarketMovers";
import { HydratedMarketSnapshot } from "@/components/dashboard/widgets/HydratedMarketSnapshot";
import { LazyMarketBreadthWidget } from "@/components/dashboard/widgets/LazyDashboardWidgets";
import {
  loadDashboardAboveFold,
  loadDashboardNews,
  loadDashboardPortfolio,
  loadDashboardRecommendations,
  loadDashboardUpcomingResults,
  loadDashboardWatchlist,
} from "@/lib/market-orchestrator/orchestrator";

/** Above-fold: indices + pulse + cached MI/breadth only. */
export async function MarketSnapshotSlot() {
  const ctx = await loadDashboardAboveFold();
  return (
    <HydratedMarketSnapshot
      indices={ctx.indices}
      marketIntelligence={ctx.intelligence}
      breadth={ctx.breadth}
    />
  );
}

export async function MarketPulseSlot() {
  const ctx = await loadDashboardAboveFold();
  return (
    <MarketPulseWidget
      pulse={ctx.pulse}
      marketIntelligence={ctx.intelligence}
    />
  );
}

/**
 * OE: read persisted store for SSR shell, kick background refresh,
 * client hydrates via /api/recommendations when empty.
 */
export async function AiOpportunitiesSlot() {
  // Fire-and-forget freshness — returns immediately; scan stays off SSR critical path.
  void import("@/services/opportunityEngine").then((mod) =>
    mod.ensureOpportunityEngineState()
  );
  const recommendations = await loadDashboardRecommendations();
  return <HydratedAiOpportunities initial={recommendations} />;
}

export async function PortfolioSummarySlot() {
  const portfolio = await loadDashboardPortfolio();
  return <PortfolioSummaryWidget portfolio={portfolio} />;
}

export async function WatchlistSlot() {
  const [watchlist, recommendations] = await Promise.all([
    loadDashboardWatchlist(),
    loadDashboardRecommendations(),
  ]);
  return (
    <WatchlistWidget watchlist={watchlist} recommendations={recommendations} />
  );
}

/**
 * Cached breadth for first paint; MarketBreadth client-hydrates via
 * /api/market/breadth when the cache miss left emptyMarketBreadth.
 */
export async function MarketBreadthSlot() {
  const ctx = await loadDashboardAboveFold();
  return <LazyMarketBreadthWidget breadth={ctx.breadth} />;
}

/** Movers share the same client breadth coalescer as Internals. */
export async function MarketMoversSlot() {
  const ctx = await loadDashboardAboveFold();
  return <HydratedMarketMovers initial={ctx.breadth} />;
}

export async function MarketNewsSlot() {
  const news = await loadDashboardNews();
  return <MarketNewsWidget news={news} />;
}

export async function ResultsCalendarSlot() {
  const results = await loadDashboardUpcomingResults();
  return <ResultsCalendarWidget results={results} />;
}

export async function EarningsIntelligenceSlot() {
  const results = await loadDashboardUpcomingResults();
  return <EarningsIntelligenceWidget results={results} />;
}
