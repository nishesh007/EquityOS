/**
 * Executive Earnings Hub — presentation & orchestration only (Sprint 9B.R8).
 * Composes Sprint 9B module snapshots. No new AI / scoring engines.
 */

import type { EarningsCalendarMetrics } from "@/src/core/earnings/calendar";
import type {
  EarningsDashboardMetrics,
  RankedEarningsItem,
} from "@/src/core/earnings/dashboard";
import type { EarningsWorkspaceView } from "@/src/core/earnings/workspace";
import {
  ExportAccessControl,
  type ExportAccessSubject,
  type ExportUserRole,
  type SubscriptionTier,
} from "@/src/core/dataIntegrity/reporting";
import {
  EXECUTIVE_TONE_CLASS,
  type ExecutiveMetricCell,
  type ExecutiveModuleStatus,
  type ExecutiveQuickAction,
  type ExecutiveStatusItem,
  type ExecutiveTone,
} from "@/lib/dashboard/institutional-executive-presentation";

export const EXECUTIVE_EARNINGS_EMPTY = {
  noUpcoming: "No Upcoming Earnings",
  awaitingAi: "Awaiting AI Analysis",
  transcriptPending: "Transcript Pending",
  noPortfolio: "No Portfolio Coverage",
  noWatchlist: "No Watchlist Coverage",
  noHistorical: "No Historical Coverage",
} as const;

export type {
  ExportAccessSubject,
  ExportUserRole,
  SubscriptionTier,
};

export interface ExecutiveEarningsOverviewItem {
  id: string;
  label: string;
  value: string;
  tone: ExecutiveTone;
  toneClass: string;
}

export interface ExecutiveEarningsHubView {
  overview: ExecutiveEarningsOverviewItem[];
  metrics: ExecutiveMetricCell[];
  healthStrip: ExecutiveStatusItem[];
  quickActions: ExecutiveQuickAction[];
  access: {
    role: ExportUserRole;
    fullAccess: boolean;
    previewOnly: boolean;
    upgradeRequired: boolean;
    canExport: boolean;
  };
  empty: boolean;
  emptyMessage: string;
  reportsReady: string;
  sprintComplete: true;
}

export interface ExecutiveEarningsPresentationInput {
  calendarMetrics?: EarningsCalendarMetrics | null;
  dashboardMetrics?: EarningsDashboardMetrics | null;
  rankedItems?: readonly RankedEarningsItem[] | null;
  workspace?: EarningsWorkspaceView | null;
  subject?: ExportAccessSubject | null;
}

function safeCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.max(0, Math.round(n)));
}

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const t = String(value).trim();
  if (!t || t === "null" || t === "undefined" || t === "NaN") return fallback;
  return t;
}

function toneForCount(n: number, cautionAt = 0): ExecutiveTone {
  if (!Number.isFinite(n) || n <= cautionAt) return "neutral";
  if (n >= 8) return "excellent";
  if (n >= 3) return "healthy";
  return "caution";
}

function cell(
  id: string,
  label: string,
  value: string,
  t: ExecutiveTone
): ExecutiveMetricCell {
  return { id, label, value, tone: t, toneClass: EXECUTIVE_TONE_CLASS[t] };
}

function statusItem(
  id: string,
  label: string,
  healthy: boolean,
  pending = false
): ExecutiveStatusItem {
  const status: ExecutiveModuleStatus = pending
    ? "Pending"
    : healthy
      ? "Healthy"
      : "Warning";
  const t: ExecutiveTone = pending
    ? "neutral"
    : healthy
      ? "healthy"
      : "caution";
  return {
    id,
    label,
    status,
    tone: t,
    toneClass: EXECUTIVE_TONE_CLASS[t],
  };
}

function avgFromScores(
  items: readonly RankedEarningsItem[],
  pick: (item: RankedEarningsItem) => number
): string {
  const vals = items
    .map(pick)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (vals.length === 0) return "—";
  return String(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
}

function coveragePct(part: number, whole: number): string {
  if (!Number.isFinite(whole) || whole <= 0) return "—";
  if (!Number.isFinite(part) || part < 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function buildExecutiveEarningsOverview(
  input: ExecutiveEarningsPresentationInput
): ExecutiveEarningsOverviewItem[] {
  const cal = input.calendarMetrics;
  const dash = input.dashboardMetrics;
  const ranked = input.rankedItems ?? [];
  const workspace = input.workspace;

  const upcoming = dash?.upcomingEarnings ?? cal?.companiesCovered ?? 0;
  const today = dash?.todaysEarnings ?? cal?.todaysEarnings ?? 0;
  const tomorrow = dash?.tomorrowEarnings ?? cal?.tomorrowsEarnings ?? 0;
  const week = dash?.next7Days ?? cal?.nextWeekEarnings ?? 0;
  const portfolio = dash?.portfolioEarnings ?? cal?.portfolioEarnings ?? 0;
  const watchlist = dash?.watchlistEarnings ?? cal?.watchlistEarnings ?? 0;
  const highImpact = dash?.highImpactEarnings ?? cal?.highImpactResults ?? 0;

  const transcriptPending = ranked.filter(
    (r) => !r.scorecard.transcriptAvailable && r.scorecard.resultsReleased
  ).length;
  const aiPending = ranked.filter((r) => !r.scorecard.available).length;
  const reportsReady =
    workspace?.decisions.length ??
    ranked.filter((r) => r.scorecard.available).length;

  const mk = (
    id: string,
    label: string,
    value: number,
    emptyFallback?: string
  ): ExecutiveEarningsOverviewItem => {
    const t = toneForCount(value);
    return {
      id,
      label,
      value:
        value <= 0 && emptyFallback
          ? emptyFallback
          : safeCount(value),
      tone: value <= 0 ? "neutral" : t,
      toneClass: EXECUTIVE_TONE_CLASS[value <= 0 ? "neutral" : t],
    };
  };

  return [
    mk("upcoming", "Upcoming Earnings", upcoming, EXECUTIVE_EARNINGS_EMPTY.noUpcoming),
    mk("today", "Today's Earnings", today),
    mk("tomorrow", "Tomorrow", tomorrow),
    mk("week", "This Week", week),
    mk("portfolio", "Portfolio Earnings", portfolio, EXECUTIVE_EARNINGS_EMPTY.noPortfolio),
    mk("watchlist", "Watchlist Earnings", watchlist, EXECUTIVE_EARNINGS_EMPTY.noWatchlist),
    mk("high_impact", "High Impact", highImpact),
    mk(
      "transcript_pending",
      "Transcript Pending",
      transcriptPending,
      EXECUTIVE_EARNINGS_EMPTY.transcriptPending
    ),
    mk(
      "ai_pending",
      "AI Analysis Pending",
      aiPending,
      EXECUTIVE_EARNINGS_EMPTY.awaitingAi
    ),
    {
      id: "reports_ready",
      label: "Reports Ready",
      value: safeCount(reportsReady),
      tone: toneForCount(reportsReady),
      toneClass: EXECUTIVE_TONE_CLASS[toneForCount(reportsReady)],
    },
  ];
}

export function buildExecutiveEarningsMetrics(
  input: ExecutiveEarningsPresentationInput
): ExecutiveMetricCell[] {
  const cal = input.calendarMetrics;
  const dash = input.dashboardMetrics;
  const ranked = input.rankedItems ?? [];
  const workspace = input.workspace;

  const upcoming = dash?.upcomingEarnings ?? 0;
  const today = dash?.todaysEarnings ?? 0;
  const tomorrow = dash?.tomorrowEarnings ?? 0;
  const week = dash?.next7Days ?? 0;
  const portfolio = dash?.portfolioEarnings ?? 0;
  const watchlist = dash?.watchlistEarnings ?? 0;
  const highPriority = dash?.aiHighConviction ?? dash?.highImpactEarnings ?? 0;
  const reportsReady = workspace?.decisions.length ?? 0;

  const transcriptCount = ranked.filter((r) => r.scorecard.transcriptAvailable).length;
  const historicalCount = ranked.filter(
    (r) => r.scorecard.historicalBeatRate > 0
  ).length;
  const commentaryCount = ranked.filter(
    (r) => r.scorecard.transcriptAvailable || r.scorecard.resultsReleased
  ).length;

  const avgSurprise = safeText(
    dash?.averageBeatProbability,
    avgFromScores(ranked, (r) => r.scorecard.beatProbability)
  );
  const avgRisk = avgFromScores(ranked, (r) => r.scorecard.riskScore);
  const avgGuidance = avgFromScores(ranked, (r) =>
    r.scorecard.resultsReleased ? r.scorecard.opportunityScore : 0
  );

  const coverage = safeText(
    cal?.coverageLabel,
    coveragePct(cal?.companiesCovered ?? upcoming, 50)
  );

  return [
    cell("coverage", "Coverage", coverage, "healthy"),
    cell("upcoming", "Upcoming", safeCount(upcoming), toneForCount(upcoming)),
    cell("today", "Today", safeCount(today), toneForCount(today)),
    cell("tomorrow", "Tomorrow", safeCount(tomorrow), toneForCount(tomorrow)),
    cell("week", "Week", safeCount(week), toneForCount(week)),
    cell(
      "portfolio",
      "Portfolio",
      portfolio > 0 ? safeCount(portfolio) : EXECUTIVE_EARNINGS_EMPTY.noPortfolio,
      portfolio > 0 ? "healthy" : "neutral"
    ),
    cell(
      "watchlist",
      "Watchlist",
      watchlist > 0 ? safeCount(watchlist) : EXECUTIVE_EARNINGS_EMPTY.noWatchlist,
      watchlist > 0 ? "healthy" : "neutral"
    ),
    cell("high_priority", "High Priority", safeCount(highPriority), toneForCount(highPriority)),
    cell("reports_ready", "Reports Ready", safeCount(reportsReady), toneForCount(reportsReady)),
    cell(
      "avg_surprise",
      "Average Surprise",
      avgSurprise === "—" ? EXECUTIVE_EARNINGS_EMPTY.awaitingAi : avgSurprise,
      avgSurprise === "—" ? "neutral" : "healthy"
    ),
    cell(
      "avg_guidance",
      "Average Guidance",
      avgGuidance === "—" ? EXECUTIVE_EARNINGS_EMPTY.awaitingAi : avgGuidance,
      avgGuidance === "—" ? "neutral" : "healthy"
    ),
    cell(
      "avg_risk",
      "Average Risk",
      avgRisk === "—" ? EXECUTIVE_EARNINGS_EMPTY.awaitingAi : avgRisk,
      avgRisk === "—" ? "neutral" : "caution"
    ),
    cell(
      "transcript_coverage",
      "Transcript Coverage",
      ranked.length === 0
        ? EXECUTIVE_EARNINGS_EMPTY.transcriptPending
        : coveragePct(transcriptCount, ranked.length),
      transcriptCount > 0 ? "healthy" : "neutral"
    ),
    cell(
      "commentary_coverage",
      "Management Commentary Coverage",
      ranked.length === 0
        ? EXECUTIVE_EARNINGS_EMPTY.transcriptPending
        : coveragePct(commentaryCount, ranked.length),
      commentaryCount > 0 ? "healthy" : "neutral"
    ),
    cell(
      "historical_coverage",
      "Historical Coverage",
      ranked.length === 0
        ? EXECUTIVE_EARNINGS_EMPTY.noHistorical
        : coveragePct(historicalCount, ranked.length),
      historicalCount > 0 ? "healthy" : "neutral"
    ),
  ];
}

export function buildExecutiveEarningsHealthStrip(
  input: ExecutiveEarningsPresentationInput
): ExecutiveStatusItem[] {
  const dash = input.dashboardMetrics;
  const cal = input.calendarMetrics;
  const ranked = input.rankedItems ?? [];
  const workspace = input.workspace;
  const subject = input.subject ?? {
    userId: "dashboard-user",
    role: "subscriber" as ExportUserRole,
    subscriptionTier: "pro" as SubscriptionTier,
  };
  const acl = new ExportAccessControl().resolvePermissions(subject);

  const calendarHealthy =
    (cal?.companiesCovered ?? 0) > 0 || (dash?.upcomingEarnings ?? 0) > 0;
  const aiReady = Boolean(dash?.ready) || ranked.some((r) => r.scorecard.available);
  const transcriptReady = ranked.some((r) => r.scorecard.transcriptAvailable);
  const workspaceReady = Boolean(workspace) && !workspace?.empty;
  const portfolioSynced = (dash?.portfolioEarnings ?? 0) > 0;
  const reportingReady =
    (workspace?.decisions.length ?? 0) > 0 || ranked.some((r) => r.scorecard.available);
  const exportReady = acl.allowed && !acl.previewOnly;

  return [
    statusItem("calendar", "Calendar Healthy", calendarHealthy),
    statusItem("ai", "AI Ready", aiReady, !aiReady),
    statusItem("transcript", "Transcript Ready", transcriptReady, !transcriptReady),
    statusItem("workspace", "Workspace Ready", workspaceReady || calendarHealthy),
    statusItem("portfolio", "Portfolio Synced", portfolioSynced, !portfolioSynced),
    statusItem("reporting", "Reporting Ready", reportingReady),
    statusItem("export", "Export Ready", exportReady, acl.previewOnly),
  ];
}

export function buildExecutiveEarningsQuickActions(
  input: ExecutiveEarningsPresentationInput
): ExecutiveQuickAction[] {
  const previewOnly = resolveAccess(input.subject).previewOnly;
  return [
    {
      id: "calendar",
      label: "Open Calendar",
      href: "/results#executive-upcoming",
      available: true,
    },
    {
      id: "workspace",
      label: "Open Workspace",
      href: "/results#executive-workspace",
      available: true,
    },
    {
      id: "portfolio",
      label: "Portfolio Earnings",
      href: "/results#executive-portfolio",
      available: true,
    },
    {
      id: "watchlist",
      label: "Watchlist Earnings",
      href: "/results#executive-watchlist",
      available: true,
    },
    {
      id: "transcript",
      label: "Transcript Intelligence",
      href: "/results#executive-transcript",
      available: true,
    },
    {
      id: "reports",
      label: "Reports",
      href: "/results#executive-reports",
      available: true,
      reason: previewOnly ? "Preview only for free users" : undefined,
    },
    {
      id: "refresh",
      label: "Refresh",
      href: "/results",
      available: true,
    },
    {
      id: "export",
      label: "Export",
      href: "/results#executive-reports",
      available: !previewOnly,
      reason: previewOnly ? "Upgrade required for export" : undefined,
    },
  ];
}

function resolveAccess(subject?: ExportAccessSubject | null) {
  const resolved: ExportAccessSubject = subject ?? {
    userId: "dashboard-user",
    role: "subscriber",
    subscriptionTier: "pro",
  };
  const acl = new ExportAccessControl().resolvePermissions(resolved);
  const fullAccess =
    resolved.role === "administrator" ||
    (resolved.role === "subscriber" && !acl.previewOnly);
  return {
    role: resolved.role,
    fullAccess,
    previewOnly: acl.previewOnly || resolved.role === "free",
    upgradeRequired: acl.upgradeRequired || resolved.role === "free",
    canExport: acl.allowed && !acl.previewOnly,
  };
}

/** Master builder — presentation only. */
export function buildExecutiveEarningsHub(
  input: ExecutiveEarningsPresentationInput = {}
): ExecutiveEarningsHubView {
  const overview = buildExecutiveEarningsOverview(input);
  const metrics = buildExecutiveEarningsMetrics(input);
  const healthStrip = buildExecutiveEarningsHealthStrip(input);
  const quickActions = buildExecutiveEarningsQuickActions(input);
  const access = resolveAccess(input.subject);

  const upcoming =
    input.dashboardMetrics?.upcomingEarnings ??
    input.calendarMetrics?.companiesCovered ??
    0;
  const empty = upcoming <= 0;
  const reportsReady = overview.find((o) => o.id === "reports_ready")?.value ?? "—";

  return {
    overview,
    metrics,
    healthStrip,
    quickActions,
    access,
    empty,
    emptyMessage: empty ? EXECUTIVE_EARNINGS_EMPTY.noUpcoming : "",
    reportsReady: safeText(reportsReady, "—"),
    sprintComplete: true,
  };
}
