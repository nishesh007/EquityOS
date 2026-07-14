/**
 * Executive Institutional Dashboard — presentation & orchestration only (Sprint 9F final).
 * Reuses platform / validation / trust / reporting / portfolio / opportunity / export snapshots.
 * No engine recalculation.
 */

import type { PortfolioDoctorAnalysis, PortfolioSummary, UpcomingResult } from "@/types";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  formatOptionalTimestamp,
  hasValidationActivity,
} from "@/lib/dashboard/display-value";
import {
  buildPlatformInstitutionalBadges,
  type PlatformInstitutionalBadge,
} from "@/lib/dashboard/institutional-exposure";
import {
  DEFAULT_EXPORT_CONFIGURATION,
} from "@/src/core/dataIntegrity/reporting/export/ExportConfiguration";
import {
  ExportAccessControl,
  type ExportAccessSubject,
} from "@/src/core/dataIntegrity/reporting/export/ExportAccessControl";
import type {
  ExportUserRole,
  SubscriptionTier,
} from "@/src/core/dataIntegrity/reporting/export/ExportConfiguration";
import {
  getMarketStatus,
  getMarketStatusLabel,
  type MarketStatus,
} from "@/lib/market/session";

const NA = "N/A";
const AWAITING = "Awaiting Validation";
const PENDING = "Pending";
const OFFLINE = "Offline";

export type ExecutiveTone =
  | "excellent"
  | "healthy"
  | "caution"
  | "critical"
  | "neutral";

export type ExecutiveModuleStatus = "Healthy" | "Warning" | "Offline" | "Pending";

export interface ExecutiveMetricCell {
  id: string;
  label: string;
  value: string;
  tone: ExecutiveTone;
  toneClass: string;
}

export interface ExecutiveHeaderView {
  institutionalGrade: string;
  platformStatus: string;
  productionReady: string;
  validationStatus: string;
  trustStatus: string;
  aiStatus: string;
  marketStatus: string;
  lastSuccessfulScan: string;
  platformVersion: string;
}

export interface ExecutiveSummaryView {
  totalSymbols: string;
  validatedSymbols: string;
  highConvictionIdeas: string;
  activeOpportunities: string;
  tomorrowWatchlist: string;
  openAlerts: string;
  historicalReports: string;
  latestScan: string;
}

export interface ExecutiveAlertItem {
  id: string;
  source:
    | "Validation"
    | "Trust"
    | "Platform"
    | "Data Quality"
    | "Export"
    | "Earnings"
    | "Portfolio";
  title: string;
  detail: string;
  tone: ExecutiveTone;
}

export interface ExecutiveStatusItem {
  id: string;
  label: string;
  status: ExecutiveModuleStatus;
  tone: ExecutiveTone;
  toneClass: string;
}

export interface ExecutiveQuickAction {
  id: string;
  label: string;
  href: string;
  available: boolean;
  reason?: string;
}

export interface ExecutiveReadinessView {
  productionReady: string;
  certification: string;
  build: string;
  release: string;
  environment: string;
  audit: string;
  lastValidation: string;
  empty: boolean;
  emptyMessage: string;
}

export interface ExecutiveFooterView {
  platformVersion: string;
  buildNumber: string;
  environment: string;
  lastUpdated: string;
  copyright: string;
  institutionalNotice: string;
}

export interface ExecutiveDashboardView {
  header: ExecutiveHeaderView;
  metrics: ExecutiveMetricCell[];
  summary: ExecutiveSummaryView;
  alerts: ExecutiveAlertItem[];
  statusStrip: ExecutiveStatusItem[];
  readiness: ExecutiveReadinessView;
  quickActions: ExecutiveQuickAction[];
  badges: PlatformInstitutionalBadge[];
  footer: ExecutiveFooterView;
  empty: boolean;
  emptyMessage: string;
  exportPreviewOnly: boolean;
  exportUpgradeRequired: boolean;
}

export const EXECUTIVE_TONE_CLASS: Record<ExecutiveTone, string> = {
  excellent: "text-gain",
  healthy: "text-accent",
  caution: "text-amber-600",
  critical: "text-loss",
  neutral: "text-text-muted",
};

function tone(score: number | null | undefined, invert = false): ExecutiveTone {
  if (score == null || !Number.isFinite(score)) return "neutral";
  const s = invert ? 100 - score : score;
  if (s >= 85) return "excellent";
  if (s >= 70) return "healthy";
  if (s >= 50) return "caution";
  return "critical";
}

function disp(
  value: number | null | undefined,
  fallback = NA,
  activity?: boolean
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  if (value === 0 && activity === false) return fallback;
  return String(Math.round(value));
}

function grade(score: number | null | undefined, fallback = AWAITING): string {
  if (score == null || !Number.isFinite(score)) return fallback;
  if (score >= 85) return "A — Institutional";
  if (score >= 75) return "B — Strong";
  if (score >= 65) return "C — Watch";
  if (score >= 50) return "D — Caution";
  return "F — Critical";
}

function moduleStatus(
  score: number | null | undefined,
  opts?: { activity?: boolean; offline?: boolean }
): ExecutiveModuleStatus {
  if (opts?.offline) return "Offline";
  if (score == null || !Number.isFinite(score) || opts?.activity === false) {
    return "Pending";
  }
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Warning";
  return "Offline";
}

function statusTone(status: ExecutiveModuleStatus): ExecutiveTone {
  if (status === "Healthy") return "healthy";
  if (status === "Warning") return "caution";
  if (status === "Offline") return "critical";
  return "neutral";
}

function countActiveOpportunities(state: OpportunityEngineState | null): number {
  if (!state) return 0;
  return Object.values(state.categories).reduce((sum, list) => sum + list.length, 0);
}

function countHighConviction(state: OpportunityEngineState | null): number {
  if (!state) return 0;
  const ai = state.categories.ai_high_conviction?.length ?? 0;
  const all = Object.values(state.categories).flat();
  const high = all.filter((c) => c.aiConvictionScore >= 80 || c.confidencePercent >= 80)
    .length;
  return Math.max(ai, high);
}

export function buildExecutiveMetrics(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  doctor?: PortfolioDoctorAnalysis | null;
}): ExecutiveMetricCell[] {
  const s = input.snapshot ?? null;
  const doctor = input.doctor ?? null;
  const hasVal = hasValidationActivity({
    totalValidations: s?.dashboard?.summary.totalValidations,
    totalCalculations: s?.trust?.totalCalculations,
    decisionTraces: s?.explainability?.decisionTraces,
  });

  const validation =
    s?.dashboard?.health.overallHealthScore ?? s?.platform?.overallHealthScore ?? null;
  const trust =
    s?.trust?.averageTrustScore ?? s?.platform?.overallTrustScore ?? null;
  const ai =
    s?.explainability?.confidenceCoverage ??
    s?.platform?.overallExplainability ??
    null;
  const platform = s?.platform?.overallHealthScore ?? validation;
  const pipeline = s?.dashboard?.health.validationEngineHealth ?? null;
  const integrity =
    s?.dashboard?.summary.averageIntegrityScore ??
    s?.platform?.overallCompliance ??
    null;
  const reporting =
    s?.operations?.reporting?.reportsGenerated != null &&
    s.operations.reporting.reportsGenerated > 0
      ? Math.min(100, 60 + s.operations.reporting.reportsGenerated)
      : s?.operations?.reporting?.lastGeneratedAt
        ? 75
        : null;
  const exportHealth =
    s?.operations?.reporting?.exportModelCount != null &&
    s.operations.reporting.exportModelCount > 0
      ? Math.min(100, 65 + s.operations.reporting.exportModelCount)
      : null;
  const portfolio = doctor?.healthScore.overall ?? null;
  const institutional = platform ?? portfolio ?? trust ?? validation;

  const cell = (
    id: string,
    label: string,
    value: string,
    raw: number | null | undefined
  ): ExecutiveMetricCell => {
    const t = tone(raw);
    return { id, label, value, tone: t, toneClass: EXECUTIVE_TONE_CLASS[t] };
  };

  return [
    cell("validation", "Validation Score", disp(validation, hasVal ? NA : AWAITING, hasVal), validation),
    cell("trust", "Trust Score", disp(trust, hasVal ? NA : AWAITING, hasVal), trust),
    cell("ai", "AI Confidence", disp(ai, AWAITING, hasVal), ai),
    cell("grade", "Institutional Grade", grade(institutional), institutional),
    cell("platform", "Platform Health", disp(platform, AWAITING), platform),
    cell("pipeline", "Pipeline Health", disp(pipeline, AWAITING, hasVal), pipeline),
    cell("integrity", "Data Integrity", disp(integrity, AWAITING, hasVal), integrity),
    cell(
      "reporting",
      "Reporting Health",
      reporting != null ? disp(reporting) : AWAITING,
      reporting
    ),
    cell(
      "export",
      "Export Health",
      exportHealth != null ? disp(exportHealth) : AWAITING,
      exportHealth
    ),
    cell(
      "portfolio",
      "Portfolio Health",
      doctor ? disp(portfolio, AWAITING) : AWAITING,
      portfolio
    ),
  ];
}

export function buildExecutiveSummary(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  opportunityState?: OpportunityEngineState | null;
  doctor?: PortfolioDoctorAnalysis | null;
  alertsCount?: number;
}): ExecutiveSummaryView {
  const s = input.snapshot ?? null;
  const opp = input.opportunityState ?? null;
  const hasVal = hasValidationActivity({
    totalValidations: s?.dashboard?.summary.totalValidations,
  });

  const totalSymbols = opp?.universeSize ?? null;
  const validated =
    s?.dashboard?.summary.passedValidations ??
    (hasVal ? s?.dashboard?.summary.totalValidations : null);
  const reports =
    s?.operations?.reporting?.reportsGenerated ??
    s?.operations?.reporting?.snapshotCount ??
    null;

  return {
    totalSymbols: disp(totalSymbols, AWAITING),
    validatedSymbols: disp(validated, hasVal ? NA : AWAITING, hasVal),
    highConvictionIdeas: disp(
      opp ? countHighConviction(opp) : null,
      opp ? "0" : AWAITING
    ),
    activeOpportunities: disp(
      opp ? countActiveOpportunities(opp) : null,
      opp ? "0" : AWAITING
    ),
    tomorrowWatchlist: disp(
      opp?.postMarket?.tomorrowWatchlist?.length ?? null,
      opp ? "0" : AWAITING
    ),
    openAlerts: disp(input.alertsCount ?? null, "0"),
    historicalReports: disp(reports, AWAITING),
    latestScan: formatOptionalTimestamp(
      opp?.lastScannedAt ?? s?.operations?.metrics?.lastRunAt ?? s?.dashboard?.summary.generatedAt,
      AWAITING
    ),
  };
}

export function buildExecutiveStatus(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  opportunityState?: OpportunityEngineState | null;
  doctor?: PortfolioDoctorAnalysis | null;
  marketStatus?: MarketStatus | null;
}): ExecutiveStatusItem[] {
  const s = input.snapshot ?? null;
  const opp = input.opportunityState ?? null;
  const doctor = input.doctor ?? null;
  const market = input.marketStatus ?? getMarketStatus();
  const hasVal = hasValidationActivity({
    totalValidations: s?.dashboard?.summary.totalValidations,
    totalCalculations: s?.trust?.totalCalculations,
    decisionTraces: s?.explainability?.decisionTraces,
  });

  const marketModule: ExecutiveModuleStatus =
    market === "open"
      ? "Healthy"
      : market === "pre_open" || market === "post_close"
        ? "Warning"
        : market === "holiday"
          ? "Offline"
          : "Pending";

  const scannerScore = opp?.lastScannedAt
    ? opp.isFrozen
      ? 55
      : 85
    : null;
  const validationScore =
    s?.dashboard?.health.overallHealthScore ?? s?.platform?.overallHealthScore ?? null;
  const trustScore =
    s?.trust?.averageTrustScore ?? s?.platform?.overallTrustScore ?? null;
  const aiScore =
    s?.explainability?.explainabilityHealthScore ??
    s?.platform?.overallExplainability ??
    null;
  const reportingScore =
    s?.operations?.reporting?.lastGeneratedAt ||
    (s?.operations?.reporting?.reportsGenerated ?? 0) > 0
      ? 80
      : null;
  const exportScore =
    (s?.operations?.reporting?.exportModelCount ?? 0) > 0 ? 80 : null;
  const portfolioScore = doctor?.healthScore.overall ?? null;

  const items: Array<{ id: string; label: string; status: ExecutiveModuleStatus }> = [
    { id: "market", label: "Market", status: marketModule },
    {
      id: "scanner",
      label: "Scanner",
      status: moduleStatus(scannerScore, { activity: Boolean(opp?.lastScannedAt) }),
    },
    {
      id: "validation",
      label: "Validation",
      status: moduleStatus(validationScore, { activity: hasVal }),
    },
    {
      id: "trust",
      label: "Trust",
      status: moduleStatus(trustScore, {
        activity: (s?.trust?.totalCalculations ?? 0) > 0,
      }),
    },
    {
      id: "ai",
      label: "AI",
      status: moduleStatus(aiScore, {
        activity: (s?.explainability?.decisionTraces ?? 0) > 0,
      }),
    },
    {
      id: "reporting",
      label: "Reporting",
      status: moduleStatus(reportingScore, {
        activity: reportingScore != null,
      }),
    },
    {
      id: "export",
      label: "Export",
      status: moduleStatus(exportScore, { activity: exportScore != null }),
    },
    {
      id: "portfolio",
      label: "Portfolio",
      status: moduleStatus(portfolioScore, { activity: Boolean(doctor) }),
    },
  ];

  return items.map((item) => {
    const t = statusTone(item.status);
    return {
      ...item,
      tone: t,
      toneClass: EXECUTIVE_TONE_CLASS[t],
    };
  });
}

function buildAlerts(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  doctor?: PortfolioDoctorAnalysis | null;
  earnings?: UpcomingResult[] | null;
}): ExecutiveAlertItem[] {
  const s = input.snapshot ?? null;
  const doctor = input.doctor ?? null;
  const earnings = input.earnings ?? [];
  const alerts: ExecutiveAlertItem[] = [];

  const failed = s?.dashboard?.summary.failedValidations ?? 0;
  const warnings = s?.dashboard?.summary.warningCount ?? 0;
  if (failed > 0) {
    alerts.push({
      id: "val-failed",
      source: "Validation",
      title: "Validation Warnings",
      detail: `${failed} failed validation(s) · ${warnings} warning(s)`,
      tone: "caution",
    });
  } else if (warnings > 0) {
    alerts.push({
      id: "val-warn",
      source: "Validation",
      title: "Validation Warnings",
      detail: `${warnings} validation warning(s) recorded`,
      tone: "caution",
    });
  }

  const rejected = s?.trust?.rejectedObjects ?? 0;
  if (rejected > 0) {
    alerts.push({
      id: "trust-rej",
      source: "Trust",
      title: "Trust Warnings",
      detail: `${rejected} rejected object(s) in trust engine`,
      tone: "caution",
    });
  }

  for (const w of s?.operations?.status?.warnings?.slice(0, 3) ?? []) {
    alerts.push({
      id: `plat-${w.slice(0, 24)}`,
      source: "Platform",
      title: "Platform Warnings",
      detail: w,
      tone: "caution",
    });
  }

  const diagWarnings = s?.operations?.status?.errors?.slice(0, 2) ?? [];
  for (const e of diagWarnings) {
    alerts.push({
      id: `dq-${e.slice(0, 24)}`,
      source: "Data Quality",
      title: "Data Quality Issues",
      detail: e,
      tone: "critical",
    });
  }

  for (const entry of s?.operations?.audit ?? []) {
    if ((entry.errors?.length ?? 0) > 0 && /export/i.test(entry.event)) {
      alerts.push({
        id: `export-${entry.timestamp}`,
        source: "Export",
        title: "Export Failures",
        detail: entry.errors?.[0] ?? entry.event,
        tone: "critical",
      });
    }
  }

  for (const result of earnings.slice(0, 3)) {
    alerts.push({
      id: `earn-${result.id}`,
      source: "Earnings",
      title: "Upcoming Earnings",
      detail: `${result.symbol} · ${result.company} · ${result.date} · ${result.quarter}`,
      tone: "neutral",
    });
  }

  for (const d of doctor?.diagnostics ?? []) {
    if (d.severity === "red" || d.severity === "yellow") {
      alerts.push({
        id: `port-${d.key}`,
        source: "Portfolio",
        title: "Portfolio Alerts",
        detail: `${d.label}: ${d.description}`,
        tone: d.severity === "red" ? "critical" : "caution",
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "none",
      source: "Platform",
      title: "No Open Alerts",
      detail: "Institutional monitors report a quiet session.",
      tone: "healthy",
    });
  }

  return alerts.slice(0, 16);
}

function buildQuickActions(input: {
  subject?: ExportAccessSubject;
  hasSnapshot?: boolean;
  hasPortfolio?: boolean;
}): ExecutiveQuickAction[] {
  const subject: ExportAccessSubject = input.subject ?? {
    userId: "dashboard-user",
    role: "subscriber",
    subscriptionTier: "pro",
  };
  const actions = new ExportAccessControl().visibleActions(subject);
  const canExport =
    actions.downloadPdf ||
    actions.downloadExcel ||
    actions.markdown ||
    actions.print;

  const list: ExecutiveQuickAction[] = [
    {
      id: "research",
      label: "Open Research",
      href: "/ai/research",
      available: true,
    },
    {
      id: "reports",
      label: "View Reports",
      href: "/#institutional-executive",
      available: Boolean(input.hasSnapshot),
      reason: input.hasSnapshot ? undefined : "Awaiting Validation",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      href: "/portfolio",
      available: true,
    },
    {
      id: "validation",
      label: "Validation",
      href: "/#institutional-executive",
      available: Boolean(input.hasSnapshot),
      reason: input.hasSnapshot ? undefined : AWAITING,
    },
    {
      id: "trust",
      label: "Trust",
      href: "/#institutional-executive",
      available: Boolean(input.hasSnapshot),
      reason: input.hasSnapshot ? undefined : AWAITING,
    },
    {
      id: "export",
      label: actions.upgradeRequired ? "Export Report · Upgrade" : "Export Report",
      href: "/portfolio",
      available: canExport || actions.upgradeRequired,
      reason: actions.previewOnly
        ? "Preview only — upgrade required for full export"
        : undefined,
    },
    {
      id: "market",
      label: "Market Dashboard",
      href: "/markets",
      available: true,
    },
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      available: true,
    },
  ];

  return list.filter((a) => a.available);
}

function buildReadiness(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
}): ExecutiveReadinessView {
  const s = input.snapshot ?? null;
  if (!s?.platform && !s?.operations) {
    return {
      productionReady: AWAITING,
      certification: AWAITING,
      build: AWAITING,
      release: AWAITING,
      environment: DEFAULT_EXPORT_CONFIGURATION.environment,
      audit: AWAITING,
      lastValidation: AWAITING,
      empty: true,
      emptyMessage: AWAITING,
    };
  }

  const readiness = s.platform?.overallReadiness ?? null;
  const cert =
    s.operations?.status?.certificationStatus != null
      ? String(s.operations.status.certificationStatus)
      : grade(s.platform?.overallCertification, AWAITING);
  const build =
    s.operations?.status?.engineVersion ??
    s.dashboard?.engineVersion ??
    DEFAULT_EXPORT_CONFIGURATION.versions.platformVersion;
  const release =
    s.operations?.release?.lastRunAt != null
      ? `Score ${disp(s.operations.release.releaseScore, NA)}`
      : AWAITING;
  const auditCount = s.operations?.audit?.length ?? 0;

  return {
    productionReady:
      readiness != null && readiness >= 75
        ? "Production Ready"
        : readiness != null
          ? "Monitored"
          : AWAITING,
    certification: cert,
    build,
    release,
    environment: DEFAULT_EXPORT_CONFIGURATION.environment,
    audit: auditCount > 0 ? `${auditCount} events` : AWAITING,
    lastValidation: formatOptionalTimestamp(
      s.dashboard?.summary.generatedAt ?? s.operations?.metrics?.lastRunAt,
      AWAITING
    ),
    empty: false,
    emptyMessage: "",
  };
}

export function buildExecutiveDashboard(input: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  opportunityState?: OpportunityEngineState | null;
  earnings?: UpcomingResult[] | null;
  subject?: ExportAccessSubject;
  marketStatus?: MarketStatus | null;
}): ExecutiveDashboardView {
  const snapshot = input.snapshot ?? null;
  const doctor = input.doctor ?? null;
  const opportunityState = input.opportunityState ?? null;
  const portfolio = input.portfolio ?? null;
  const earnings = input.earnings ?? null;
  const subject: ExportAccessSubject = input.subject ?? {
    userId: "dashboard-user",
    role: "subscriber",
    subscriptionTier: "pro",
  };
  const marketStatus = input.marketStatus ?? getMarketStatus();
  const config = DEFAULT_EXPORT_CONFIGURATION;
  const access = new ExportAccessControl(config).resolvePermissions(subject);

  const alerts = buildAlerts({ snapshot, doctor, earnings });
  const metrics = buildExecutiveMetrics({ snapshot, doctor });
  const summary = buildExecutiveSummary({
    snapshot,
    opportunityState,
    doctor,
    alertsCount: alerts.filter((a) => a.id !== "none").length,
  });
  const statusStrip = buildExecutiveStatus({
    snapshot,
    opportunityState,
    doctor,
    marketStatus,
  });
  const readiness = buildReadiness({ snapshot });
  const quickActions = buildQuickActions({
    subject,
    hasSnapshot: Boolean(snapshot?.platform || snapshot?.dashboard),
    hasPortfolio: Boolean(portfolio?.holdings.length || doctor),
  });

  const hasVal = hasValidationActivity({
    totalValidations: snapshot?.dashboard?.summary.totalValidations,
    totalCalculations: snapshot?.trust?.totalCalculations,
    decisionTraces: snapshot?.explainability?.decisionTraces,
  });
  const health =
    snapshot?.platform?.overallHealthScore ??
    snapshot?.dashboard?.health.overallHealthScore ??
    null;
  const trust =
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;
  const ai =
    snapshot?.explainability?.explainabilityHealthScore ??
    snapshot?.platform?.overallExplainability ??
    null;

  const header: ExecutiveHeaderView = {
    institutionalGrade: grade(health ?? doctor?.healthScore.overall ?? null),
    platformStatus:
      snapshot?.platform?.overallValidationStatus ??
      (health != null && health >= 70 ? "healthy" : AWAITING),
    productionReady: readiness.productionReady,
    validationStatus: hasVal
      ? String(snapshot?.platform?.overallValidationStatus ?? "healthy")
      : AWAITING,
    trustStatus:
      trust != null
        ? trust >= 75
          ? "High Trust"
          : trust >= 50
            ? "Watch"
            : "Low Trust"
        : AWAITING,
    aiStatus:
      ai != null
        ? ai >= 70
          ? "AI Verified"
          : "Monitored"
        : AWAITING,
    marketStatus: getMarketStatusLabel(marketStatus),
    lastSuccessfulScan: formatOptionalTimestamp(
      opportunityState?.lastScannedAt ??
        snapshot?.operations?.metrics?.lastRunAt ??
        snapshot?.dashboard?.summary.generatedAt,
      AWAITING
    ),
    platformVersion:
      snapshot?.operations?.status?.engineVersion ??
      config.versions.platformVersion,
  };

  const footer: ExecutiveFooterView = {
    platformVersion: config.versions.platformVersion,
    buildNumber:
      snapshot?.operations?.status?.engineVersion ??
      snapshot?.dashboard?.engineVersion ??
      config.versions.platformVersion,
    environment: config.environment,
    lastUpdated: formatOptionalTimestamp(
      snapshot?.dashboard?.summary.generatedAt ??
        opportunityState?.lastScannedAt ??
        doctor?.generatedAt,
      AWAITING
    ),
    copyright: `© ${new Date().getFullYear()} EquityOS — Institutional Research`,
    institutionalNotice:
      "Institutional decision-support only. Not investment advice. Validate outputs with platform controls before acting.",
  };

  const empty = !snapshot && !doctor && !opportunityState;

  return {
    header,
    metrics,
    summary,
    alerts,
    statusStrip,
    readiness,
    quickActions,
    badges: buildPlatformInstitutionalBadges(snapshot),
    footer,
    empty,
    emptyMessage: empty ? AWAITING : "",
    exportPreviewOnly: access.previewOnly,
    exportUpgradeRequired: access.upgradeRequired,
  };
}

export type { ExportAccessSubject, ExportUserRole, SubscriptionTier, MarketStatus };
