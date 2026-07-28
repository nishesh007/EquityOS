/**
 * Async Server Component slots for the dashboard.
 * Each slot awaits only its own lightweight slice — Suspense streams HTML.
 * Expensive engines hydrate on the client (breadth / MI context / OE API).
 * Never import this module from Client Components.
 */

import { MarketSnapshotWidget, MarketPulseWidget, PortfolioSummaryWidget, WatchlistWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import {
  MarketNewsWidget,
  ResultsCalendarWidget,
  EarningsIntelligenceWidget,
} from "@/components/dashboard/widgets/DeferredDashboardWidgets";
import { HydratedAiOpportunities } from "@/components/dashboard/widgets/HydratedAiOpportunities";
import { HydratedMarketMovers } from "@/components/dashboard/widgets/HydratedMarketMovers";
import { LazyMarketBreadthWidget } from "@/components/dashboard/widgets/LazyDashboardWidgets";
import {
  loadDashboardAboveFold,
  loadDashboardNews,
  loadDashboardPortfolio,
  loadDashboardRecommendations,
  loadDashboardUpcomingResults,
  loadDashboardWatchlist,
} from "@/lib/market-orchestrator/orchestrator";
import {
  filledSlotCount,
  resolveDashboardSlotsFromRecommendations,
  selectInstitutionalStrategyDashboard,
  selectRecommendationsWithFallback,
} from "@/lib/recommendations";
import {
  resolveCachedIntelligence,
} from "@/lib/market-orchestrator/dashboardContext";
import { getCachedMarketSnapshot } from "@/lib/market-orchestrator/marketsSnapshot";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  loadOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";

/**
 * Above-fold: canonical Market Snapshot intelligence (identical to Markets page).
 * No client enrich / no alternate Context-Regime path.
 */
export async function MarketSnapshotSlot() {
  const ctx = await loadDashboardAboveFold();
  return (
    <MarketSnapshotWidget
      indices={ctx.indices}
      marketIntelligence={ctx.intelligence}
      breadth={ctx.breadth}
      session={ctx.session}
    />
  );
}

export async function MarketPulseSlot() {
  const ctx = await loadDashboardAboveFold();
  return (
    <MarketPulseWidget
      pulse={ctx.pulse}
      marketIntelligence={ctx.intelligence}
      breadth={ctx.breadth}
      marketStatus={ctx.marketStatus}
      snapshotLocked
    />
  );
}

/**
 * OE: persisted store read only inside Suspense.
 * Background Opportunity / Strategy scan starts post-hydration on the client —
 * never from SSR (avoids Node event-loop "Waiting for shell").
 *
 * Prefer populated strategyDashboard picks; if every pick is null, project
 * cards from the shared recommendations list (same guard as client hydrate).
 */
export async function AiOpportunitiesSlot() {
  const state = await loadOpportunityEngineState();
  const marketIntelligence =
    getCachedMarketSnapshot()?.intelligence ??
    getCachedMarketIntelligenceSnapshot() ??
    resolveCachedIntelligence();
  const shared = toSharedSnapshot(marketIntelligence);
  const strategyDashboard = selectInstitutionalStrategyDashboard(
    state,
    shared
  );
  const recommendations = selectRecommendationsWithFallback(state, shared);
  const slots = resolveDashboardSlotsFromRecommendations({
    strategyDashboard,
    recommendations,
    lastScanTime: state.lastScannedAt,
  });
  const recommendationCount = filledSlotCount(slots);
  const { buildRecommendationFreshness } = await import(
    "@/lib/opportunity-engine/recommendation-freshness"
  );
  const freshness = buildRecommendationFreshness(
    state,
    Math.max(recommendationCount, recommendations.length)
  );
  return (
    <HydratedAiOpportunities
      initialSlots={slots}
      initialFreshness={freshness}
      initialStatus={{
        isScanning: state.isScanning,
        lastScannedAt: state.lastScannedAt,
        scanCount: state.scanCount,
        recommendationCount,
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
