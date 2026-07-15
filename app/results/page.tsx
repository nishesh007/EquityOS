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

export default async function ResultsPage() {
  const [
    dashboard,
    events,
    workspaceCtx,
    calendarMetrics,
    portfolioRows,
    watchlistSurface,
  ] = await Promise.all([
    fetchEarningsDashboard({ pageSize: 8 }),
    fetchUpcomingEarningsEvents(),
    fetchEarningsWorkspaceContext(),
    fetchCalendarMetrics(),
    fetchPortfolioEarningsRows(),
    fetchWatchlistEarningsSurface(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Executive Earnings Hub"
        subtitle="Sprint 9B complete · institutional calendar, AI, transcripts, workspace & reports"
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
