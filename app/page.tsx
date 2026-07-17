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
import Link from "next/link";
import { PageContainer, WorkspaceDashboard } from "@/src/design";

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

      {/* Sprint 10C.R6 — customizable workspace. Content renders on the
          server; arrangement (drag & drop, resize, visibility, profiles)
          is personalized on the client and auto-saved. */}
      <div className="animate-fade-in-up [animation-delay:60ms]">
        <WorkspaceDashboard
          widgets={{
            "market-snapshot": <MarketOverviewCards indices={indices} />,
            "market-pulse": <MarketPulse pulse={pulse} />,
            "market-breadth": <MarketBreadth breadth={breadth} />,
            "ai-opportunities": (
              <OpportunityEnginePanel initialState={opportunityState} />
            ),
            "portfolio-summary": <PortfolioSummary portfolio={portfolio} />,
            "portfolio-health": (
              <InstitutionalPortfolioPanel
                portfolio={portfolio}
                doctor={doctorAnalysis}
                compact
                showReportViewer={false}
                title="Dashboard · Portfolio Health"
              />
            ),
            watchlist: <Watchlist initialItems={watchlist} />,
            "ai-brief": (
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
            ),
            "results-calendar": <UpcomingResultsCalendar results={results} />,
            "market-news": <LatestMarketNews news={news} />,
            "earnings-intelligence": (
              <DashboardEarningsPanel
                view={earningsDashboard}
                rankedMetrics={rankedDashboard.metrics}
                topRanked={rankedDashboard.items}
                alertEvents={alertEvents}
              />
            ),
            "validation-center": (
              <Link
                href="/validation"
                className="flex h-full flex-col justify-between rounded-lg border border-surface-border bg-card p-4 transition-colors hover:border-accent/50"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Validation Center
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Institutional health, module validation and system checks
                    live on the dedicated validation page.
                  </p>
                </div>
                <span className="mt-3 text-xs font-medium text-accent">
                  Open Validation Center →
                </span>
              </Link>
            ),
          }}
        />
      </div>
    </PageContainer>
  );
}
