import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { AIMarketSummary } from "@/components/dashboard/AIMarketSummary";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { UpcomingResultsCalendar } from "@/components/dashboard/UpcomingResultsCalendar";
import { DashboardEarningsPanel } from "@/components/dashboard/earnings";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { OpportunityEnginePanel } from "@/components/dashboard/OpportunityEnginePanel";
import { InstitutionalPortfolioPanel } from "@/components/dashboard/institutional/InstitutionalPortfolioPanel";
import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import {
  fetchMarketIndices,
  fetchPortfolioSummary,
  fetchWatchlist,
  fetchAIMarketSummary,
  fetchMarketNews,
  fetchUpcomingResults,
} from "@/services/marketData";
import {
  fetchEarningsCalendarDashboard,
  fetchEarningsDashboard,
  fetchUpcomingEarningsEvents,
} from "@/services/earningsCalendar";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { fetchOpportunityEngineState } from "@/services/opportunityEngine";
import { fetchPortfolioDoctorAnalysis } from "@/services/portfolioAnalysisData";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";
import {
  fetchWatchlistPlatformHealth,
  formatWatchlistPlatformSubtitle,
} from "@/services/watchlistPlatform";
import { MainGrid, PageContainer } from "@/src/design";

export default async function DashboardPage() {
  const [
    indices,
    portfolio,
    watchlist,
    aiSummary,
    news,
    results,
    pulse,
    breadth,
    opportunityState,
    doctorAnalysis,
    earningsDashboard,
    rankedDashboard,
    alertEvents,
    screenerHealth,
    researchWorkspace,
    watchlistPlatform,
  ] = await Promise.all([
    fetchMarketIndices(),
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchAIMarketSummary(),
    fetchMarketNews(),
    fetchUpcomingResults(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
    fetchOpportunityEngineState(),
    fetchPortfolioDoctorAnalysis(),
    fetchEarningsCalendarDashboard(),
    fetchEarningsDashboard({ pageSize: 6, sortBy: "institutional_rank" }),
    fetchUpcomingEarningsEvents(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
    Promise.resolve(fetchResearchWorkspaceHealth()),
    Promise.resolve(fetchWatchlistPlatformHealth()),
  ]);

  return (
    <PageContainer>
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Equity Research Terminal
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Indian markets, institutional flow and AI-ranked opportunities ·{" "}
          {screenerHealth.screenCount} AI screens ·{" "}
          {screenerHealth.portfolioScreens} portfolio ·{" "}
          {screenerHealth.watchlistScreens} watchlist ·{" "}
          {screenerHealth.strategyTemplateCount} strategies ·{" "}
          {screenerHealth.discoveryReady
            ? `${screenerHealth.ideaKindsCount} discovery kinds`
            : screenerHealth.emptyMessage}{" "}
          · workspace{" "}
          {screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage}{" "}
          · executive{" "}
          {screenerHealth.executiveReady
            ? screenerHealth.sprint9DFrozen
              ? "9D frozen"
              : screenerHealth.executiveSummary
            : screenerHealth.emptyMessage}{" "}
          · research workspace{" "}
          {researchWorkspace.ready
            ? `${researchWorkspace.workspaceCount} desks · ${researchWorkspace.openTabs} tabs · company ${researchWorkspace.companyReady ? "ready" : researchWorkspace.companyEmptyMessage} · knowledge ${researchWorkspace.knowledgeReady ? `${researchWorkspace.noteCount} notes` : researchWorkspace.knowledgeEmptyMessage} · timeline ${researchWorkspace.integrationReady ? `${researchWorkspace.timelineCount} events` : researchWorkspace.integrationEmptyMessage} · copilot ${researchWorkspace.copilotReady ? "ready" : researchWorkspace.copilotEmptyMessage} · automation ${researchWorkspace.automationReady ? `${researchWorkspace.taskCount} tasks` : researchWorkspace.automationEmptyMessage} · executive ${researchWorkspace.executiveReady ? researchWorkspace.executiveSummary : researchWorkspace.executiveEmptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""}`
            : researchWorkspace.emptyMessage}{" "}
          · watchlists{" "}
          {formatWatchlistPlatformSubtitle(watchlistPlatform)}{" "}
          ·{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Market snapshot band — indices, pulse, breadth (full width). */}
      <section className="mb-6 space-y-6 animate-fade-in-up [animation-delay:60ms]">
        <MarketOverviewCards indices={indices} />
        <MarketPulse pulse={pulse} />
        <MarketBreadth breadth={breadth} />
      </section>

      {/* Institutional main grid — 70% work column, 30% context rail. */}
      <section className="mb-6 animate-fade-in-up [animation-delay:180ms]">
        <MainGrid
          primary={
            <>
              <ExecutiveInstitutionalDashboard
                portfolio={portfolio}
                doctor={doctorAnalysis}
                opportunityState={opportunityState}
                earnings={results}
              />
              <OpportunityEnginePanel initialState={opportunityState} />
              <PortfolioSummary portfolio={portfolio} />
              <InstitutionalPortfolioPanel
                portfolio={portfolio}
                doctor={doctorAnalysis}
                compact
                showReportViewer={false}
                title="Dashboard · Portfolio Health"
              />
            </>
          }
          secondary={
            <>
              <Watchlist initialItems={watchlist} />
              <AIMarketSummary
                summary={aiSummary}
                meta={{
                  marketData: indices.some((index) => index.value > 0)
                    ? "Live"
                    : null,
                  news: news.length > 0 ? `${news.length} headlines` : null,
                  breadth:
                    breadth.advances + breadth.declines > 0
                      ? `${breadth.advances} adv / ${breadth.declines} dec`
                      : null,
                  trend:
                    aiSummary.sentiment === "bullish"
                      ? "Bullish"
                      : aiSummary.sentiment === "bearish"
                        ? "Bearish"
                        : "Neutral",
                  generatedAt:
                    indices.find((index) => index.quote?.lastUpdated)?.quote
                      ?.lastUpdated ?? null,
                }}
              />
              <UpcomingResultsCalendar results={results} />
              <LatestMarketNews news={news} />
            </>
          }
        />
      </section>

      {/* Bottom band — earnings intelligence, history and secondary feeds. */}
      <section className="animate-fade-in-up [animation-delay:300ms]">
        <DashboardEarningsPanel
          view={earningsDashboard}
          rankedMetrics={rankedDashboard.metrics}
          topRanked={rankedDashboard.items}
          alertEvents={alertEvents}
        />
      </section>
    </PageContainer>
  );
}
