import { SharedRecommendationPanel } from "@/components/recommendations";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { MarketIntelligenceStrip } from "@/components/market";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { SharedRecommendation } from "@/lib/recommendations";
import type {
  MarketBreadth as MarketBreadthData,
  MarketIndex,
  MarketPulse as MarketPulseData,
  PortfolioSummary as PortfolioSummaryData,
  WatchlistItem,
} from "@/types";
import { SectionHeader, StatusBadge } from "@/src/design";
import { Activity, Briefcase, Sparkles, Star } from "lucide-react";

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
  recommendations,
}: {
  recommendations: SharedRecommendation[];
}) {
  const limited = recommendations.slice(0, 8);
  const highConviction = limited.filter(
    (r) => r.conviction >= 70 || r.confidence >= 70
  ).length;
  const opportunitiesSummary =
    limited.length === 0
      ? "No active Strategy Engine recommendations in the latest scan."
      : `${limited.length} active opportunities · ${highConviction} meet high-conviction criteria (conviction or confidence ≥ 70).`;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="AI Opportunities"
        subtitle="Conviction-ranked ideas from the Strategy Engine"
        summary={opportunitiesSummary}
        accent="blue"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <StatusBadge tone="success" size="sm">
            AI Verified
          </StatusBadge>
        }
      />
      <SharedRecommendationPanel
        recommendations={limited}
        title="Best Opportunities · Strategy Engine"
      />
    </div>
  );
}

export function PortfolioSummaryWidget({
  portfolio,
}: {
  portfolio: PortfolioSummaryData;
}) {
  const dayPct = portfolio.dayChangePercent;
  const daySign = dayPct > 0 ? "+" : "";
  const portfolioSummary = `Portfolio day change ${daySign}${dayPct.toFixed(1)}% · total return ${portfolio.totalGainPercent >= 0 ? "+" : ""}${portfolio.totalGainPercent.toFixed(1)}% across ${portfolio.holdings.length} holdings.`;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Portfolio"
        subtitle="Holdings, allocation and P&amp;L snapshot"
        summary={portfolioSummary}
        accent="amber"
        icon={<Briefcase className="h-5 w-5" />}
      />
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-400">
        <Star className="h-4 w-4" />
        <span className="text-xs font-semibold">Watchlist</span>
      </div>
      <Watchlist
        initialItems={watchlist}
        recommendations={watchlistRecommendations}
      />
    </div>
  );
}
