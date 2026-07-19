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

      <div className="space-y-10">
        <section aria-labelledby="market-pulse-heading">
          <SectionHeader
            title="01 · Market Pulse"
            subtitle="Indices, breadth, sector strength and institutional flow"
            accent="emerald"
            icon={<Activity className="h-5 w-5" />}
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
            subtitle="Conviction-ranked ideas from the Strategy Engine"
            accent="blue"
            icon={<Sparkles className="h-5 w-5" />}
            actions={
              <StatusBadge tone="success" size="sm">
                AI Verified
              </StatusBadge>
            }
          />
          <div id="opportunities-heading">
            <SharedRecommendationPanel
              recommendations={recommendations}
              title="Best Opportunities · Strategy Engine"
            />
          </div>
        </section>

        <section aria-labelledby="portfolio-heading">
          <SectionHeader
            title="03 · Portfolio"
            subtitle="Holdings, allocation and P&amp;L snapshot"
            accent="amber"
            icon={<Briefcase className="h-5 w-5" />}
          />
          <div id="portfolio-heading" className="grid gap-5 xl:grid-cols-12">
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
        </section>

        <section aria-labelledby="alerts-heading">
          <AccentContainer accent="purple" tint strip padding="md">
            <Link
              id="alerts-heading"
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
        </section>

        <section aria-labelledby="results-heading">
          <SectionHeader
            title="04 · Economic Calendar"
            subtitle="Compact earnings windows · full analysis in Earnings workspace"
            accent="orange"
            icon={<CalendarDays className="h-5 w-5" />}
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
            title="05 · Market Intelligence"
            subtitle="Verified coverage from approved financial publishers"
            accent="indigo"
            icon={<Newspaper className="h-5 w-5" />}
          />
          <div id="news-heading">
            <LatestMarketNews news={news} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
