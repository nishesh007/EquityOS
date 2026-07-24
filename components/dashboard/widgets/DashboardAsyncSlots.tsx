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
import { selectInstitutionalStrategyDashboard } from "@/lib/recommendations";
import {
  resolveCachedIntelligence,
} from "@/lib/market-orchestrator/dashboardContext";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  peekOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";

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
 * OE: persisted store read only inside Suspense.
 * Background Opportunity / Strategy scan starts post-hydration on the client —
 * never from SSR (avoids Node event-loop "Waiting for shell").
 */
export async function AiOpportunitiesSlot() {
  const state = peekOpportunityEngineState();
  const marketIntelligence =
    getCachedMarketIntelligenceSnapshot() ?? resolveCachedIntelligence();
  const slots = selectInstitutionalStrategyDashboard(
    state,
    toSharedSnapshot(marketIntelligence)
  );
  return (
    <HydratedAiOpportunities
      initialSlots={slots}
      initialStatus={{
        isScanning: state.isScanning,
        lastScannedAt: state.lastScannedAt,
        scanCount: state.scanCount,
        recommendationCount: slots.filter((slot) => slot.pick != null).length,
      }}
    />
  );
}

export async function PortfolioSummarySlot() {
  const portfolio = await loadDashboardPortfolio();
  return <PortfolioSummaryWidget portfolio={portfolio} />;
}

export async function WatchlistSlot() {
  // Recommendations come from the same request-memoized store peek as AI slot.
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
