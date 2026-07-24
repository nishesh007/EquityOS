/**
 * Async Server Component slots for the dashboard.
 * Each slot awaits only its own slice — Suspense streams HTML around them.
 * Never import this module from Client Components.
 */

import {
  AiOpportunitiesWidget,
  MarketPulseWidget,
  MarketSnapshotWidget,
  PortfolioSummaryWidget,
  WatchlistWidget,
} from "@/components/dashboard/widgets/DashboardWidgets";
import {
  MarketMoversWidget,
  MarketNewsWidget,
  ResultsCalendarWidget,
  EarningsIntelligenceWidget,
} from "@/components/dashboard/widgets/DeferredDashboardWidgets";
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
    <MarketSnapshotWidget
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

/** OE recommendations from persisted state — no scan / no MI await. */
export async function AiOpportunitiesSlot() {
  const recommendations = await loadDashboardRecommendations();
  return <AiOpportunitiesWidget recommendations={recommendations} />;
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

/** Cached breadth only — client widget, never runs breadth engine on SSR. */
export async function MarketBreadthSlot() {
  const ctx = await loadDashboardAboveFold();
  return <LazyMarketBreadthWidget breadth={ctx.breadth} />;
}

export async function MarketMoversSlot() {
  const ctx = await loadDashboardAboveFold();
  return <MarketMoversWidget breadth={ctx.breadth} />;
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
