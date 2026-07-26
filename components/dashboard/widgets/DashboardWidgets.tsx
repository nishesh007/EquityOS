import { SharedRecommendationPanel } from "@/components/recommendations";
import { InstitutionalOpportunityDashboard } from "@/components/dashboard/institutional-opportunity/InstitutionalOpportunityDashboard";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { MarketIntelligenceStrip } from "@/components/market";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  opportunityPhaseCopy,
  type OpportunityUiPhase,
} from "@/lib/opportunity-engine/ui-phase";
import type { RecommendationFreshness } from "@/lib/opportunity-engine/recommendation-freshness";
import type {
  InstitutionalStrategySlot,
  SharedRecommendation,
} from "@/lib/recommendations";
import type {
  MarketBreadth as MarketBreadthData,
  MarketIndex,
  MarketPulse as MarketPulseData,
  PortfolioSummary as PortfolioSummaryData,
  WatchlistItem,
} from "@/types";
import { SectionHeader } from "@/src/design/components/SectionHeader";
import { StatusBadge } from "@/src/design/components/StatusBadge";
import { Activity, Sparkles } from "lucide-react";

/** Indices + intelligence strip — presentation only. Eager (above-fold). */
export function MarketSnapshotWidget({
  indices,
  marketIntelligence,
  breadth,
}: {
  indices: MarketIndex[];
  marketIntelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadthData;
}) {
  const regime = marketIntelligence.regime.regime;
  const breadthScore =
    breadth.advances + breadth.declines > 0
      ? Math.round(
          (breadth.advances / (breadth.advances + breadth.declines)) * 100
        )
      : null;
  const marketPulseSummary =
    breadthScore != null
      ? `Indian markets remain in a ${regime} regime with breadth at ${breadthScore}% advances.`
      : `Indian markets remain in a ${regime} regime.`;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Market Snapshot"
        subtitle="Indices, session range and intelligence strip"
        summary={marketPulseSummary}
        accent="emerald"
        icon={<Activity className="h-5 w-5" />}
      />
      <MarketIntelligenceStrip snapshot={marketIntelligence} />
      <MarketOverviewCards indices={indices} />
    </div>
  );
}

export function MarketPulseWidget({
  pulse,
  marketIntelligence,
}: {
  pulse: MarketPulseData;
  marketIntelligence: MarketIntelligenceSnapshot;
}) {
  return <MarketPulse pulse={pulse} marketIntelligence={marketIntelligence} />;
}

export function AiOpportunitiesWidget({
  slots,
  phase = "empty",
  freshness = null,
}: {
  slots: InstitutionalStrategySlot[];
  phase?: OpportunityUiPhase;
  freshness?: RecommendationFreshness | null;
}) {
  const filled = slots.filter((slot) => slot.pick != null).length;
  const phaseCopy = opportunityPhaseCopy(filled > 0 ? "available" : phase);
  const opportunitiesSummary =
    filled === 0
      ? phaseCopy.summary
      : `${filled} of 7 strategies show a high-conviction pick from the master market scan.`;

  const staleBanner =
    freshness?.displayMessage ??
    (freshness?.stale && freshness.generatedAt
      ? `Showing latest validated recommendations generated on ${freshness.generatedAt}.`
      : null);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="EquityOS Recommendations"
        subtitle="AI-powered recommendations across every investment horizon."
        summary={opportunitiesSummary}
        accent="blue"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <StatusBadge tone="success" size="sm">
            AI Verified
          </StatusBadge>
        }
      />
      {staleBanner && filled > 0 ? (
        <p
          className="rounded-lg border border-border/60 bg-surface-elevated/40 px-3 py-2 text-sm text-text-secondary"
          role="status"
          data-stale={freshness?.stale ? "true" : "false"}
          data-stale-reason={freshness?.staleReason ?? undefined}
        >
          {staleBanner}
          {freshness?.stale && freshness.staleReason ? (
            <span className="ml-2 text-text-muted">({freshness.staleReason})</span>
          ) : null}
        </p>
      ) : null}
      <InstitutionalOpportunityDashboard slots={slots} />
    </div>
  );
}

export function PortfolioSummaryWidget({
  portfolio,
}: {
  portfolio: PortfolioSummaryData;
}) {
  return (
    <div className="h-full">
      <PortfolioSummary portfolio={portfolio} />
    </div>
  );
}

export function WatchlistWidget({
  watchlist,
  recommendations,
}: {
  watchlist: WatchlistItem[];
  recommendations: SharedRecommendation[];
}) {
  const limited = recommendations.slice(0, 8);
  const watchlistRecommendations = Object.fromEntries(
    limited
      .filter((recommendation) =>
        watchlist.some(
          (item) =>
            item.symbol.toUpperCase() === recommendation.symbol.toUpperCase()
        )
      )
      .map((recommendation) => [recommendation.symbol, recommendation])
  );

  return (
    <div className="h-full">
      <Watchlist
        initialItems={watchlist}
        recommendations={watchlistRecommendations}
      />
    </div>
  );
}
