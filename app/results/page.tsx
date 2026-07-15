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

export default async function ResultsPage() {
  const [
    dashboard,
    events,
    workspaceCtx,
    calendarMetrics,
    portfolioRows,
    watchlistSurface,
    screenerHealth,
  ] = await Promise.all([
    fetchEarningsDashboard({ pageSize: 8 }),
    fetchUpcomingEarningsEvents(),
    fetchEarningsWorkspaceContext(),
    fetchCalendarMetrics(),
    fetchPortfolioEarningsRows(),
    fetchWatchlistEarningsSurface(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Executive Earnings Hub"
        subtitle={`Sprint 9B complete · institutional calendar, AI, transcripts, workspace & reports · Screener event intel ${screenerHealth.eventIntelligenceReady ? "ready" : screenerHealth.emptyMessage}`}
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
