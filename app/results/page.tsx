import { PageHeader } from "@/components/layout/PageHeader";
import { ExecutiveEarningsHub } from "@/src/presentation/dashboard/earnings";
import {
  fetchCalendarMetrics,
  fetchEarningsDashboard,
  fetchEarningsWorkspaceContext,
  fetchPortfolioEarningsRows,
  fetchUpcomingEarningsEvents,
  fetchWatchlistEarningsSurface,
} from "@/services/earningsCalendar";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";

export default async function ResultsPage() {
  const [
    dashboard,
    events,
    workspaceCtx,
    calendarMetrics,
    portfolioRows,
    watchlistSurface,
    screenerHealth,
    researchWorkspace,
  ] = await Promise.all([
    fetchEarningsDashboard({ pageSize: 8 }),
    fetchUpcomingEarningsEvents(),
    fetchEarningsWorkspaceContext(),
    fetchCalendarMetrics(),
    fetchPortfolioEarningsRows(),
    fetchWatchlistEarningsSurface(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
    Promise.resolve(fetchResearchWorkspaceHealth()),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Executive Earnings Hub"
        subtitle={`Sprint 9B complete · institutional calendar, AI, transcripts, workspace & reports · Screener institutional ${screenerHealth.institutionalReady ? "ready" : screenerHealth.emptyMessage} · discovery ${screenerHealth.discoveryReady ? "ready" : screenerHealth.emptyMessage} · screener workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · executive ${screenerHealth.executiveReady ? (screenerHealth.sprint9DFrozen ? "9D frozen" : screenerHealth.executiveSummary) : screenerHealth.emptyMessage} · research workspace ${researchWorkspace.ready ? `${researchWorkspace.openSessions} sessions · ${researchWorkspace.openTabs} tabs · executive ${researchWorkspace.executiveReady ? researchWorkspace.executiveSummary : researchWorkspace.executiveEmptyMessage}` : researchWorkspace.emptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""}`}
      />

      <section className="animate-fade-in-up">
        <ExecutiveEarningsHub
          events={events}
          dashboardMetrics={dashboard.metrics}
          rankedItems={dashboard.items}
          calendarMetrics={calendarMetrics}
          portfolioRows={portfolioRows}
          watchlistSurface={watchlistSurface}
          workspaceContext={workspaceCtx}
          holdings={workspaceCtx.holdings}
          totalValue={workspaceCtx.totalValue}
          watchlistSymbols={workspaceCtx.watchlistSymbols}
          role="subscriber"
          subscriptionTier="pro"
        />
      </section>
    </div>
  );
}
