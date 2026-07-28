import { SharedRecommendationPanel } from "@/components/recommendations";
import { InstitutionalOpportunityDashboard } from "@/components/dashboard/institutional-opportunity/InstitutionalOpportunityDashboard";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { MarketIntelligenceStrip } from "@/components/market";
import { MarketSessionBanner } from "@/components/market/MarketSessionBanner";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { MarketSessionEnvelope } from "@/lib/market/market-state-types";
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
  session,
}: {
  indices: MarketIndex[];
  marketIntelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadthData;
  session: MarketSessionEnvelope;
}) {
  const regime = marketIntelligence.regime.regime;
  const breadthScore =
    breadth.breadthPercent != null && breadth.breadthPercent > 0
      ? Math.round(breadth.breadthPercent)
      : null;
  const marketPulseSummary =
    session.phase === "updating"
      ? "Updating today's market…"
      : breadthScore != null
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
      <MarketSessionBanner session={session} />
      <MarketIntelligenceStrip
        snapshot={
          session.sessionValid && session.phase !== "updating"
            ? marketIntelligence
            : null
        }
      />
      <MarketOverviewCards indices={indices} />
    </div>
  );
}

export function MarketPulseWidget({
  pulse,
  marketIntelligence,
  breadth,
  marketStatus,
  snapshotLocked = false,
}: {
  pulse: MarketPulseData;
  marketIntelligence: MarketIntelligenceSnapshot;
  breadth?: MarketBreadthData | null;
  marketStatus?: import("@/lib/market/session").MarketStatus;
  snapshotLocked?: boolean;
}) {
  return (
    <MarketPulse
      pulse={pulse}
      marketIntelligence={marketIntelligence}
      breadth={breadth}
      marketStatus={marketStatus}
      snapshotLocked={snapshotLocked}
      hideTimestamps={snapshotLocked}
    />
  );
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
