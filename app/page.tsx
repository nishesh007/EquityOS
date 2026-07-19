import { SharedRecommendationPanel } from "@/components/recommendations";
import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketHeatmap } from "@/components/dashboard/market-heatmap";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PersonalizedDashboard } from "@/components/dashboard/workspace";
import { MarketIntelligenceStrip } from "@/components/market";
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
  MainGrid,
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
            AI-powered Equity Research &amp; Market Intelligence
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="mt-4 h-px w-full bg-gradient-to-r from-indigo-500/60 via-indigo-500/20 to-transparent"
      />
    </header>
  );

  return (
    <PageContainer>
      <PersonalizedDashboard
        header={header}
        sections={[
          {
            id: "market-pulse",
            label: "Market Pulse",
            accent: "emerald",
            children: (
              <>
                <SectionHeader
                  title="01 · Market Pulse"
                  subtitle="Indices, market internals, sector strength and institutional flow"
                  summary={marketPulseSummary}
                  accent="emerald"
                  icon={<Activity className="h-5 w-5" />}
                />
                <MarketIntelligenceStrip snapshot={marketIntelligence} />
                <MarketPulse
                  pulse={pulse}
                  marketIntelligence={marketIntelligence}
                />
                <MarketOverviewCards indices={indices} />
                <MarketHeatmap defaultUniverse="nse" />
                <MarketBreadth breadth={breadth} />
              </>
            ),
          },
          {
            id: "opportunities",
            label: "AI Opportunities",
            accent: "blue",
            children: (
              <>
                <SectionHeader
                  title="02 · AI Opportunities"
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
              </>
            ),
          },
          {
            id: "portfolio",
            label: "Portfolio & Watchlist",
            accent: "amber",
            children: (
              <>
                <SectionHeader
                  title="03 · Portfolio"
                  subtitle="Holdings, allocation and P&amp;L snapshot"
                  summary={portfolioSummary}
                  accent="amber"
                  icon={<Briefcase className="h-5 w-5" />}
                />
                <MainGrid
                  gap="standard"
                  primary={<PortfolioSummary portfolio={portfolio} />}
                  secondary={
                    <div className="h-full space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Star className="h-4 w-4" />
                        <span className="text-xs font-semibold">Watchlist</span>
                      </div>
                      <Watchlist
                        initialItems={watchlist}
                        recommendations={watchlistRecommendations}
                      />
                    </div>
                  }
                />
              </>
            ),
          },
          {
            id: "intelligence",
            label: "Investment Intelligence",
            accent: "purple",
            children: (
              <AccentContainer accent="purple" tint strip padding="md">
                <Link
                  href="/ai"
                  className="flex items-center justify-between transition-opacity hover:opacity-90"
                >
                  <span className="flex items-center gap-3">
                    <BellRing className="h-4 w-4 text-purple-400" />
                    <span>
                      <span className="block text-sm font-semibold text-text-primary">
                        Investment Intelligence
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
          },
          {
            id: "earnings",
            label: "Economic Calendar",
            accent: "orange",
            children: (
              <>
                <SectionHeader
                  title="04 · Economic Calendar"
                  subtitle="Compact earnings windows · full analysis in Earnings workspace"
                  summary={`${results.length} upcoming result windows on the dashboard snapshot.`}
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
              </>
            ),
          },
          {
            id: "news",
            label: "Market Intelligence",
            accent: "indigo",
            children: (
              <>
                <SectionHeader
                  title="05 · Market Intelligence"
                  subtitle="Verified coverage from approved financial publishers"
                  summary={`${news.length} verified headlines in the latest feed.`}
                  accent="indigo"
                  icon={<Newspaper className="h-5 w-5" />}
                />
                <LatestMarketNews news={news} />
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
