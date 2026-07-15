"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { LayoutDashboard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReportExportToolbar } from "@/components/reporting/ReportExportToolbar";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";
import { EarningsNotificationCenterPanel } from "@/components/dashboard/earnings";
import {
  buildExecutiveEarningsHub,
  type ExportUserRole,
  type SubscriptionTier,
} from "@/lib/dashboard/executive-earnings-presentation";
import type {
  EarningsCalendarEvent,
  EarningsCalendarMetrics,
  PortfolioEarningsRow,
  WatchlistEarningsSurface,
} from "@/src/core/earnings/calendar";
import type {
  EarningsDashboardMetrics,
  RankedEarningsItem,
} from "@/src/core/earnings/dashboard";
import {
  generateInstitutionalReport,
  getWorkspace,
  type HoldingWeightInput,
  type WorkspaceContext,
} from "@/src/core/earnings/workspace";
import { ExecutiveEarningsOverview } from "@/src/presentation/dashboard/earnings/ExecutiveEarningsOverview";
import { ExecutiveEarningsMetrics } from "@/src/presentation/dashboard/earnings/ExecutiveEarningsMetrics";
import { ExecutiveEarningsHealthStrip } from "@/src/presentation/dashboard/earnings/ExecutiveEarningsHealthStrip";
import { ExecutiveQuickActions } from "@/src/presentation/dashboard/earnings/ExecutiveQuickActions";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";

const ExecutiveUpcomingPanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutiveUpcomingPanel").then(
      (m) => m.ExecutiveUpcomingPanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Loading calendar…" /> }
);

const ExecutivePortfolioPanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutivePortfolioPanel").then(
      (m) => m.ExecutivePortfolioPanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Loading portfolio…" /> }
);

const ExecutiveWatchlistPanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutiveWatchlistPanel").then(
      (m) => m.ExecutiveWatchlistPanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Loading watchlist…" /> }
);

const ExecutiveTranscriptPanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutiveTranscriptPanel").then(
      (m) => m.ExecutiveTranscriptPanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Transcript Pending" /> }
);

const ExecutivePostAnalysisPanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutivePostAnalysisPanel").then(
      (m) => m.ExecutivePostAnalysisPanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Awaiting AI Analysis" /> }
);

const ExecutiveWorkspacePanel = dynamic(
  () =>
    import("@/src/presentation/dashboard/earnings/ExecutiveWorkspacePanel").then(
      (m) => m.ExecutiveWorkspacePanel
    ),
  { ssr: false, loading: () => <ExecutiveEmptyState message="Loading workspace…" /> }
);

export interface ExecutiveEarningsHubProps {
  events: EarningsCalendarEvent[];
  dashboardMetrics?: EarningsDashboardMetrics | null;
  rankedItems?: RankedEarningsItem[];
  calendarMetrics?: EarningsCalendarMetrics | null;
  portfolioRows?: PortfolioEarningsRow[];
  watchlistSurface?: WatchlistEarningsSurface | null;
  workspaceContext?: WorkspaceContext | null;
  holdings?: HoldingWeightInput[];
  totalValue?: number;
  watchlistSymbols?: string[];
  role?: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  userId?: string;
  compact?: boolean;
}

export function ExecutiveEarningsHub({
  events,
  dashboardMetrics = null,
  rankedItems = [],
  calendarMetrics = null,
  portfolioRows = [],
  watchlistSurface = null,
  workspaceContext = null,
  holdings = [],
  totalValue,
  watchlistSymbols = [],
  role = "subscriber",
  subscriptionTier = "pro",
  userId = "dashboard-user",
  compact = false,
}: ExecutiveEarningsHubProps) {
  const [tick, setTick] = useState(0);
  const [, startTransition] = useTransition();
  const [showHeavy, setShowHeavy] = useState({
    upcoming: true,
    portfolio: true,
    watchlist: true,
    transcript: false,
    post: false,
    workspace: true,
  });

  const resolvedHoldings = holdings.length
    ? holdings
    : workspaceContext?.holdings ?? [];
  const resolvedWatchlist =
    watchlistSymbols.length > 0
      ? watchlistSymbols
      : workspaceContext?.watchlistSymbols ?? [];
  const resolvedTotal =
    totalValue ?? workspaceContext?.totalValue;

  const workspace = useMemo(() => {
    return getWorkspace({
      context: {
        holdings: resolvedHoldings,
        totalValue: resolvedTotal,
        watchlistSymbols: resolvedWatchlist,
      },
      includeReport: false,
    });
    // tick forces refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh token
  }, [resolvedHoldings, resolvedTotal, resolvedWatchlist, tick]);

  const view = useMemo(
    () =>
      buildExecutiveEarningsHub({
        calendarMetrics,
        dashboardMetrics,
        rankedItems: rankedItems.length > 0 ? rankedItems : undefined,
        workspace,
        subject: { userId, role, subscriptionTier },
      }),
    [
      calendarMetrics,
      dashboardMetrics,
      rankedItems,
      workspace,
      userId,
      role,
      subscriptionTier,
    ]
  );

  const executiveReport = useMemo(() => {
    const ticker = workspace.selectedTicker ?? workspace.decisions[0]?.ticker;
    if (!ticker || view.access.previewOnly) return null;
    const built = generateInstitutionalReport(ticker);
    return built.ready ? built.institutional : null;
  }, [workspace.selectedTicker, workspace.decisions, view.access.previewOnly]);

  const emptyWatchlist: WatchlistEarningsSurface = watchlistSurface ?? {
    upcoming: [],
    resultsTomorrow: [],
    highPriority: [],
    empty: true,
    emptyMessage: "No Watchlist Coverage",
  };

  return (
    <div
      className={`space-y-4 ${compact ? "" : "max-w-6xl"}`}
      data-testid="executive-earnings-hub"
    >
      <Card padding="lg">
        <CardHeader
          title="Executive Earnings Hub"
          subtitle="Sprint 9B complete · calendar · AI · transcripts · workspace · reports"
          action={
            <div className="flex items-center gap-2">
              {view.sprintComplete ? (
                <Badge variant="gain" size="sm">
                  9B Complete
                </Badge>
              ) : null}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <LayoutDashboard className="h-4 w-4 text-accent" />
              </div>
            </div>
          }
        />

        <div className="mb-4">
          <ExecutiveEarningsHealthStrip items={view.healthStrip} />
        </div>

        <div className="mb-4">
          <ExecutiveEarningsOverview
            items={view.overview}
            empty={view.empty}
            emptyMessage={view.emptyMessage}
          />
        </div>

        <div className="mb-4">
          <ExecutiveEarningsMetrics metrics={view.metrics} />
        </div>

        <ExecutiveQuickActions
          actions={view.quickActions}
          previewOnly={view.access.previewOnly}
          upgradeRequired={view.access.upgradeRequired}
          onRefresh={() =>
            startTransition(() => {
              setTick((n) => n + 1);
              setShowHeavy((s) => ({
                ...s,
                transcript: true,
                post: true,
              }));
            })
          }
        />
      </Card>

      <EarningsNotificationCenterPanel events={events} compact />

      {showHeavy.workspace ? (
        <ExecutiveWorkspacePanel
          holdings={resolvedHoldings}
          totalValue={resolvedTotal}
          watchlistSymbols={resolvedWatchlist}
        />
      ) : null}

      {showHeavy.upcoming ? (
        <ExecutiveUpcomingPanel
          events={events}
          metrics={dashboardMetrics}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {showHeavy.portfolio ? (
          <ExecutivePortfolioPanel rows={portfolioRows} />
        ) : null}
        {showHeavy.watchlist ? (
          <ExecutiveWatchlistPanel surface={emptyWatchlist} />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!showHeavy.transcript ? (
          <button
            type="button"
            className="rounded-md border border-surface-border-subtle px-2.5 py-1.5 text-[11px] text-text-muted hover:text-accent"
            onClick={() =>
              setShowHeavy((s) => ({ ...s, transcript: true }))
            }
            data-testid="load-transcript-panel"
          >
            Load Transcript Intelligence
          </button>
        ) : null}
        {!showHeavy.post ? (
          <button
            type="button"
            className="rounded-md border border-surface-border-subtle px-2.5 py-1.5 text-[11px] text-text-muted hover:text-accent"
            onClick={() => setShowHeavy((s) => ({ ...s, post: true }))}
            data-testid="load-post-panel"
          >
            Load Post Earnings Analysis
          </button>
        ) : null}
      </div>

      {showHeavy.transcript ? (
        <ExecutiveTranscriptPanel events={events} />
      ) : null}
      {showHeavy.post ? (
        <ExecutivePostAnalysisPanel events={events} />
      ) : null}

      <div id="executive-reports" data-testid="executive-earnings-reports">
        <Card padding="lg">
          <CardHeader
            title="Executive Earnings Report"
            subtitle="Sprint 9F Reporting Engine · role-based export"
            action={
              <ReportExportToolbar
                reportType="DailyMarketReport"
                role={role}
                subscriptionTier={subscriptionTier}
                userId={userId}
              />
            }
          />
          {view.access.previewOnly ? (
            <p
              className="mb-3 text-[11px] text-text-muted"
              data-testid="executive-earnings-report-preview"
            >
              Preview only — upgrade for full PDF / Excel export.
            </p>
          ) : null}
          <InstitutionalReportViewer
            report={executiveReport}
            role={role}
            subscriptionTier={subscriptionTier}
            userId={userId}
            compact
            defaultOpen={Boolean(executiveReport)}
            title="Institutional Earnings Report"
          />
        </Card>
      </div>
    </div>
  );
}
