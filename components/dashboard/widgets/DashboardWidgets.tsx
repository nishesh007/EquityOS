import { SharedRecommendationPanel } from "@/components/recommendations";
import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { MarketIntelligenceStrip } from "@/components/market";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { SharedRecommendation } from "@/lib/recommendations";
import type {
  MarketBreadth as MarketBreadthData,
  MarketIndex,
  MarketNews,
  MarketPulse as MarketPulseData,
  PortfolioSummary as PortfolioSummaryData,
  UpcomingResult,
  WatchlistItem,
} from "@/types";
import { SectionHeader, StatusBadge } from "@/src/design";
import {
  Activity,
  Briefcase,
  CalendarDays,
  Newspaper,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

/** Indices + intelligence strip — presentation only. */
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

export function MarketBreadthWidget({
  breadth,
}: {
  breadth: MarketBreadthData;
}) {
  return <MarketBreadth breadth={breadth} />;
}

export function MarketMoversWidget({
  breadth,
}: {
  breadth: MarketBreadthData;
}) {
  return (
    <Card padding="lg" accent="emerald">
      <CardHeader
        title="Market Movers"
        subtitle={breadth.universeLabel ?? "Selected universe"}
        icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gain">
            Top Gainers
          </p>
          <ul className="space-y-1.5">
            {breadth.gainers.slice(0, 5).map((item) => (
              <li
                key={item.symbol}
                className="flex items-center justify-between text-[11px]"
              >
                <StockLink
                  symbol={item.symbol}
                  className="font-semibold text-text-primary"
                >
                  {item.symbol}
                </StockLink>
                <ChangeIndicator
                  value={item.changePercent}
                  size="sm"
                  showIcon={false}
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-loss">
            Top Losers
          </p>
          <ul className="space-y-1.5">
            {breadth.losers.slice(0, 5).map((item) => (
              <li
                key={item.symbol}
                className="flex items-center justify-between text-[11px]"
              >
                <StockLink
                  symbol={item.symbol}
                  className="font-semibold text-text-primary"
                >
                  {item.symbol}
                </StockLink>
                <ChangeIndicator
                  value={item.changePercent}
                  size="sm"
                  showIcon={false}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
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

export function ResultsCalendarWidget({
  results,
}: {
  results: UpcomingResult[];
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Results Calendar"
        subtitle="Compact earnings windows"
        summary={`${results.length} upcoming result windows.`}
        accent="orange"
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <Link
            href="/results"
            className="text-xs font-semibold text-accent transition-colors hover:text-accent/80"
          >
            Open Earnings →
          </Link>
        }
      />
      <DashboardResultsSnapshot results={results} />
    </div>
  );
}

export function MarketNewsWidget({ news }: { news: MarketNews[] }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="News"
        subtitle="Verified coverage from approved publishers"
        summary={`${news.length} verified headlines in the latest feed.`}
        accent="indigo"
        icon={<Newspaper className="h-5 w-5" />}
      />
      <LatestMarketNews news={news} />
    </div>
  );
}

export function EarningsIntelligenceWidget({
  results,
}: {
  results: UpcomingResult[];
}) {
  return <DashboardResultsSnapshot results={results} />;
}
