import { SharedRecommendationPanel } from "@/components/recommendations";
import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketHeatmap } from "@/components/dashboard/market-heatmap";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import {
  ComingSoonWidget,
  PersonalizedDashboard,
} from "@/components/dashboard/workspace";
import { MarketIntelligenceStrip } from "@/components/market";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import {
  fetchMarketIndices,
  fetchMarketNews,
  fetchPortfolioSummary,
  fetchUpcomingResults,
  fetchWatchlist,
} from "@/services/marketData";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import {
  AccentContainer,
  PageContainer,
  SectionHeader,
  StatusBadge,
} from "@/src/design";
import {
  Activity,
  BellRing,
  Briefcase,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Newspaper,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const [
    indices,
    portfolio,
    watchlist,
    news,
    results,
    pulse,
    breadth,
    recommendations,
    marketIntelligence,
  ] = await Promise.all([
    fetchMarketIndices(),
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchMarketNews(),
    fetchUpcomingResults(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
    fetchSharedRecommendationsFresh(8),
    getMarketIntelligenceSnapshot(),
  ]);
  const watchlistRecommendations = Object.fromEntries(
    recommendations
      .filter((recommendation) =>
        watchlist.some(
          (item) =>
            item.symbol.toUpperCase() === recommendation.symbol.toUpperCase()
        )
      )
      .map((recommendation) => [recommendation.symbol, recommendation])
  );

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

  const dayPct = portfolio.dayChangePercent;
  const daySign = dayPct > 0 ? "+" : "";
  const portfolioSummary = `Portfolio day change ${daySign}${dayPct.toFixed(1)}% · total return ${portfolio.totalGainPercent >= 0 ? "+" : ""}${portfolio.totalGainPercent.toFixed(1)}% across ${portfolio.holdings.length} holdings.`;

  const highConviction = recommendations.filter(
    (r) => r.conviction >= 70 || r.confidence >= 70
  ).length;
  const opportunitiesSummary =
    recommendations.length === 0
      ? "No active Strategy Engine recommendations in the latest scan."
      : `${recommendations.length} active opportunities · ${highConviction} meet high-conviction criteria (conviction or confidence ≥ 70).`;

  const header = (
    <header className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
        >
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Customizable institutional workspace · Edit Mode to rearrange
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="mt-4 h-px w-full bg-gradient-to-r from-indigo-500/60 via-indigo-500/20 to-transparent"
      />
    </header>
  );

  const movers = (
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

  return (
    <PageContainer>
      <PersonalizedDashboard
        header={header}
        widgets={{
          "market-snapshot": (
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
          ),
          "market-pulse": (
            <MarketPulse
              pulse={pulse}
              marketIntelligence={marketIntelligence}
            />
          ),
          "market-heatmap": <MarketHeatmap defaultUniverse="nse" />,
          "market-breadth": <MarketBreadth breadth={breadth} />,
          "market-movers": movers,
          "ai-opportunities": (
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
                recommendations={recommendations}
                title="Best Opportunities · Strategy Engine"
              />
            </div>
          ),
          "ai-alerts": (
            <AccentContainer accent="purple" tint strip padding="md">
              <Link
                href="/ai"
                className="flex items-center justify-between transition-opacity hover:opacity-90"
              >
                <span className="flex items-center gap-3">
                  <BellRing className="h-4 w-4 text-purple-400" />
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">
                      AI Alerts
                    </span>
                    <span className="block text-xs text-text-muted">
                      Review material AI insights and market changes
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </AccentContainer>
          ),
          "portfolio-summary": (
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
          ),
          watchlist: (
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
          ),
          "portfolio-health": (
            <ComingSoonWidget
              title="Portfolio Health"
              subtitle="Open Portfolio Doctor for live health metrics"
            />
          ),
          "research-summary": (
            <AccentContainer accent="violet" tint strip padding="md">
              <Link
                href="/validation"
                className="flex items-center justify-between transition-opacity hover:opacity-90"
              >
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    Research Summary
                  </span>
                  <span className="block text-xs text-text-muted">
                    Research Confidence · workspace shortcuts
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </AccentContainer>
          ),
          "ai-brief": (
            <ComingSoonWidget
              title="AI Market Brief"
              subtitle="Briefing surface reserved for layout"
            />
          ),
          "economic-calendar": (
            <ComingSoonWidget title="Economic Calendar" />
          ),
          "results-calendar": (
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
          ),
          "market-news": (
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
          ),
          "earnings-intelligence": (
            <DashboardResultsSnapshot results={results} />
          ),
          "validation-center": (
            <AccentContainer accent="cyan" tint strip padding="md">
              <Link
                href="/validation"
                className="flex items-center justify-between transition-opacity hover:opacity-90"
              >
                <span className="block text-sm font-semibold text-text-primary">
                  Research Confidence
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </AccentContainer>
          ),
        }}
      />
    </PageContainer>
  );
}
