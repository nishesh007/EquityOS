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
import { Activity, Sparkles } from "lucide-react";

/** Indices + session — presentation only. Eager (above-fold). */
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
    <div className="space-y-3">
      <SectionHeader
        title="Market Snapshot"
        subtitle="Indices and session range"
        summary={marketPulseSummary}
        accent="emerald"
        level={2}
        icon={<Activity className="h-5 w-5" />}
      />
      <MarketSessionBanner session={session} />
      <MarketOverviewCards indices={indices} />
    </div>
  );
}

/** Sprint 10C — Market Internals as its own dashboard section. */
export function MarketInternalsWidget({
  marketIntelligence,
}: {
  marketIntelligence: MarketIntelligenceSnapshot;
}) {
  const intelligenceReady =
    Boolean(marketIntelligence?.context) || Boolean(marketIntelligence?.regime);

  return (
    <MarketIntelligenceStrip
      snapshot={intelligenceReady ? marketIntelligence : null}
    />
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
  publishedRecommendations = [],
  publishedMeta = null,
}: {
  slots: InstitutionalStrategySlot[];
  phase?: OpportunityUiPhase;
  freshness?: RecommendationFreshness | null;
  /** Published SSOT list — banner derives ONLY from this length. */
  publishedRecommendations?: SharedRecommendation[];
  publishedMeta?: {
    sessionId: string | null;
    scanId: string | null;
    generatedAt: string | null;
    recommendationVersion?: string | null;
  } | null;
}) {
  const publishedLen = publishedRecommendations.length;
  const effectivePhase: OpportunityUiPhase =
    publishedLen > 0 ? "available" : phase;
  const phaseCopy = opportunityPhaseCopy(effectivePhase);

  const opportunitiesSummary =
    publishedLen === 0
      ? phaseCopy.summary
      : [
          `Recommendations: ${publishedLen}`,
          publishedMeta?.generatedAt
            ? `Generated: ${publishedMeta.generatedAt}`
            : null,
          publishedMeta?.sessionId
            ? `Session: ${publishedMeta.sessionId}`
            : null,
          publishedMeta?.scanId ? `Scan: ${publishedMeta.scanId}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const staleBanner =
    freshness?.displayMessage ??
    (freshness?.stale && freshness.generatedAt
      ? `Showing latest validated recommendations generated on ${freshness.generatedAt}.`
      : null);

  return (
    <div className="space-y-3">
      <SectionHeader
        title="EquityOS Recommendations"
        subtitle="AI-powered recommendations across every investment horizon"
        summary={opportunitiesSummary}
        accent="blue"
        level={2}
        icon={<Sparkles className="h-5 w-5" />}
      />
      {staleBanner && publishedLen > 0 ? (
        <p
          className="rounded-xl border border-surface-border-subtle bg-surface-raised px-4 py-3 text-caption text-text-secondary"
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
