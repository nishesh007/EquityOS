import { SharedRecommendationPanel } from "@/components/recommendations";
import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
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
import { PageContainer, SectionHeader } from "@/src/design";
import {
  Activity,
  BellRing,
  CalendarDays,
  ChevronRight,
  Newspaper,
  Sparkles,
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

  return (
    <PageContainer>
      <header className="mb-8 animate-fade-in-up">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          AI-powered Equity Research &amp; Market Intelligence
        </p>
      </header>

      <div className="space-y-12">
        <section aria-labelledby="market-pulse-heading">
          <SectionHeader
            title="01 · Market Pulse"
            subtitle="Indices, breadth, sector strength and institutional flow"
            accent="emerald"
            icon={<Activity className="h-4 w-4" />}
          />
          <div id="market-pulse-heading" className="space-y-5">
            <MarketIntelligenceStrip snapshot={marketIntelligence} />
            <MarketPulse pulse={pulse} marketIntelligence={marketIntelligence} />
            <MarketOverviewCards indices={indices} />
            <MarketBreadth breadth={breadth} />
          </div>
        </section>

        <section aria-labelledby="opportunities-heading">
          <SectionHeader
            title="02 · AI Opportunities"
            subtitle="Conviction-ranked ideas, watchlist, portfolio and alerts"
            accent="blue"
            icon={<Sparkles className="h-4 w-4" />}
          />
          <div id="opportunities-heading" className="space-y-5">
            <SharedRecommendationPanel
              recommendations={recommendations}
              title="Best Opportunities · Strategy Engine"
            />
            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <PortfolioSummary portfolio={portfolio} />
              </div>
              <div className="xl:col-span-4">
                <Watchlist
                  initialItems={watchlist}
                  recommendations={watchlistRecommendations}
                />
              </div>
            </div>
            <Link
              href="/ai"
              className="flex items-center justify-between rounded-lg border border-surface-border bg-card px-4 py-3 transition-colors hover:border-accent/40"
            >
              <span className="flex items-center gap-3">
                <BellRing className="h-4 w-4 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    Investor Alerts
                  </span>
                  <span className="block text-xs text-text-muted">
                    Review material AI insights and market changes
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="results-heading">
          <SectionHeader
            title="03 · Earnings"
            subtitle="Compact result windows; full analysis lives in the Earnings workspace"
            accent="orange"
            icon={<CalendarDays className="h-4 w-4" />}
            actions={
              <Link href="/results" className="text-xs font-semibold text-accent">
                Open Earnings →
              </Link>
            }
          />
          <div id="results-heading">
            <DashboardResultsSnapshot results={results} />
          </div>
        </section>

        <section aria-labelledby="news-heading">
          <SectionHeader
            title="04 · Verified Market News"
            subtitle="Clickable coverage from approved financial publishers"
            accent="indigo"
            icon={<Newspaper className="h-4 w-4" />}
          />
          <div id="news-heading">
            <LatestMarketNews news={news} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
