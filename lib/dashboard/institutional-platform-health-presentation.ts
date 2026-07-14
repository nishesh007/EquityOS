/**
 * Institutional Platform Health Dashboard — presentation only (9F.R4).
 * Maps existing Sprint 9F platform / observability / diagnostics / performance /
 * release / security metrics. No recalculation.
 */

import type {
  InstitutionalPlatformOperations,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { formatOptionalTimestamp } from "@/lib/dashboard/display-value";

const NA = "N/A";
const NOT_YET = "Not Yet Available";
const AWAITING = "Awaiting Next Run";

export type HealthTone = "excellent" | "healthy" | "caution" | "critical" | "neutral";
export type HealthTrend = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export interface PlatformMetricTooltip {
  description: string;
  healthyRange: string;
  currentValue: string;
  trend: string;
  lastUpdated: string;
}

export interface PlatformMetricCell {
  id: string;
  label: string;
  value: string;
  tone: HealthTone;
  toneClass: string;
  trend: HealthTrend;
  trendLabel: string;
  tooltip: PlatformMetricTooltip;
}

export interface EngineHealthRow {
  id: string;
  label: string;
  health: string;
  latency: string;
  lastExecution: string;
  trend: HealthTrend;
  trendLabel: string;
  status: string;
  tone: HealthTone;
}

export interface PipelineMonitorView {
  pipelineHealth: string;
  executionPipeline: string;
  queueHealth: string;
  snapshotHealth: string;
  dependencyHealth: string;
  failureRate: string;
  successRate: string;
  retryRate: string;
  averageRuntime: string;
}

export interface ObservabilityPanelView {
  requests: string;
  events: string;
  warnings: string;
  errors: string;
  exceptions: string;
  recoveryEvents: string;
  averageProcessingTime: string;
  p50: string;
  p95: string;
  p99: string;
}

export interface DiagnosticsPanelView {
  criticalIssues: string;
  majorIssues: string;
  minorIssues: string;
  warnings: string;
  resolvedIssues: string;
  regressionDetection: string;
  dependencyDrift: string;
  configurationDrift: string;
  issueLines: string[];
}

export interface PerformancePanelView {
  cpuTrend: string;
  memoryTrend: string;
  executionTime: string;
  throughput: string;
  averageValidationTime: string;
  averageRecommendationTime: string;
  averageTrustCalculation: string;
}

export interface CertificationPanelView {
  productionReady: string;
  certificationGrade: string;
  securityPassed: string;
  compliancePassed: string;
  validationPassed: string;
  trustPassed: string;
  performancePassed: string;
  releaseApproved: string;
}

export interface AuditSummaryView {
  todaysAudits: string;
  successful: string;
  failed: string;
  warnings: string;
  exportActivity: string;
  validationRuns: string;
  trustEvaluations: string;
}

export interface PlatformTimelineEvent {
  id: string;
  label: string;
  at: string | null;
  available: boolean;
}

export interface PlatformStatusBadge {
  id: string;
  label: string;
}

export interface InstitutionalPlatformHealthDashboardView {
  header: {
    platformHealthScore: PlatformMetricCell;
    productionReadiness: PlatformMetricCell;
    platformGrade: string;
    overallStatus: string;
    lastValidation: string;
    lastCertification: string;
    platformVersion: string;
    environment: string;
    buildVersion: string;
    releaseVersion: string;
  };
  engines: EngineHealthRow[];
  pipeline: PipelineMonitorView;
  observability: ObservabilityPanelView;
  diagnostics: DiagnosticsPanelView;
  performance: PerformancePanelView;
  certification: CertificationPanelView;
  audit: AuditSummaryView;
  timeline: PlatformTimelineEvent[];
  badges: PlatformStatusBadge[];
  empty: boolean;
  emptyMessage: string;
}

const TONE_CLASS: Record<HealthTone, string> = {
  excellent: "text-gain",
  healthy: "text-accent",
  caution: "text-amber-600",
  critical: "text-loss",
  neutral: "text-text-muted",
};

function tone(score: number | null | undefined): HealthTone {
  if (score == null || !Number.isFinite(score) || score === 0) return "neutral";
  if (score >= 85) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "caution";
  return "critical";
}

function trendLabel(t: HealthTrend): string {
  switch (t) {
    case "UP":
      return "Improving";
    case "DOWN":
      return "Deteriorating";
    case "FLAT":
      return "Stable";
    default:
      return NOT_YET;
  }
}

function scoreDisp(
  value: number | null | undefined,
  active: boolean,
  suffix = ""
): string {
  if (value == null || !Number.isFinite(value)) {
    return active ? NA : AWAITING;
  }
  if (value === 0) return active ? NA : AWAITING;
  return `${Math.round(value)}${suffix}`;
}

function msDisp(value: number | null | undefined, active: boolean): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return active ? NA : AWAITING;
  }
  return `${Math.round(value)} ms`;
}

function pctDisp(value: number | null | undefined, active: boolean): string {
  return scoreDisp(value, active, "%");
}

/** Rates may legitimately be 0% when activity exists. */
function rateDisp(value: number | null | undefined, active: boolean): string {
  if (value == null || !Number.isFinite(value)) {
    return active ? NA : AWAITING;
  }
  return `${Math.round(value)}%`;
}

function countDisp(value: number | null | undefined, active: boolean): string {
  if (value == null || !Number.isFinite(value)) {
    return active ? NA : AWAITING;
  }
  if (value === 0) return active ? "0" : AWAITING;
  return String(Math.round(value));
}

function passedFromScore(score: number | null | undefined, active: boolean): string {
  if (!active || score == null || !Number.isFinite(score) || score === 0) {
    return AWAITING;
  }
  return score >= 70 ? "Passed" : "Not Passed";
}

function platformGrade(score: number | null, active: boolean): string {
  if (!active || score == null || score === 0) return AWAITING;
  if (score >= 90) return "A — Institutional";
  if (score >= 80) return "B — Production";
  if (score >= 70) return "C — Conditional";
  return "D — Degraded";
}

function metricCell(input: {
  id: string;
  label: string;
  value: string;
  raw?: number | null;
  trend: HealthTrend;
  description: string;
  healthyRange: string;
  lastUpdated: string;
}): PlatformMetricCell {
  const t = input.raw != null ? tone(input.raw) : "neutral";
  return {
    id: input.id,
    label: input.label,
    value: input.value,
    tone: t,
    toneClass: TONE_CLASS[t],
    trend: input.trend,
    trendLabel: trendLabel(input.trend),
    tooltip: {
      description: input.description,
      healthyRange: input.healthyRange,
      currentValue: input.value,
      trend: trendLabel(input.trend),
      lastUpdated: input.lastUpdated,
    },
  };
}

function ops(snapshot: InstitutionalPlatformSnapshot | null): InstitutionalPlatformOperations | null {
  return snapshot?.operations ?? null;
}

function overallTrend(snapshot: InstitutionalPlatformSnapshot): HealthTrend {
  if (snapshot.dashboard?.health.deteriorating) return "DOWN";
  const trustTrend = snapshot.trust?.averageTrend;
  if (trustTrend == null || trustTrend === 0) return "FLAT";
  return trustTrend > 0 ? "UP" : "DOWN";
}

const ENGINE_CATALOG: Array<{ id: string; label: string; match: RegExp }> = [
  { id: "validation", label: "Validation Engine", match: /orchestrator|integrity|dashboard/i },
  { id: "trust", label: "Trust Engine", match: /^trust$/i },
  { id: "explainability", label: "Explainability Engine", match: /explainability/i },
  { id: "reporting", label: "Reporting Engine", match: /reporting/i },
  { id: "security", label: "Security Engine", match: /security/i },
  { id: "knowledge", label: "Knowledge Engine", match: /knowledge/i },
  { id: "simulation", label: "Simulation Engine", match: /simulation/i },
  { id: "learning", label: "Learning Engine", match: /learning/i },
  { id: "performance", label: "Performance Engine", match: /performance/i },
  { id: "documentation", label: "Documentation Engine", match: /documentation/i },
  { id: "release", label: "Release Engine", match: /release/i },
];

function buildEngineRows(
  snapshot: InstitutionalPlatformSnapshot
): EngineHealthRow[] {
  const status = ops(snapshot)?.status;
  const engines = status?.engines ?? [];
  const perf = ops(snapshot)?.performance;
  const lastRun =
    formatOptionalTimestamp(
      ops(snapshot)?.metrics?.lastRunAt ??
        ops(snapshot)?.performance?.lastRunAt ??
        snapshot.explainability?.lastRunAt ??
        null,
      AWAITING
    );
  const t = overallTrend(snapshot);
  const active = engines.some((e) => e.registered);

  return ENGINE_CATALOG.map((cat) => {
    const match = engines.find((e) => cat.match.test(e.engineId) || cat.match.test(e.label));
    const healthScore =
      cat.id === "trust"
        ? snapshot.platform?.overallTrustScore
        : cat.id === "explainability"
          ? snapshot.platform?.overallExplainability
          : cat.id === "performance"
            ? snapshot.platform?.overallPerformance ?? perf?.performanceHealthScore
            : cat.id === "security"
              ? snapshot.platform?.overallSecurity
              : cat.id === "documentation"
                ? snapshot.platform?.overallDocumentation
                : cat.id === "release"
                  ? snapshot.platform?.overallCertification
                  : cat.id === "reporting"
                    ? snapshot.platform?.overallCoverage
                    : snapshot.platform?.overallHealthScore;

    const healthy = match?.healthy ?? (healthScore != null && healthScore >= 70);
    const registered = match?.registered ?? active;

    return {
      id: cat.id,
      label: cat.label,
      health: scoreDisp(healthScore, registered),
      latency: msDisp(
        cat.id === "performance" ? perf?.latencyMs : perf?.averageRuntimeMs,
        Boolean(perf?.lastRunAt)
      ),
      lastExecution: registered ? lastRun : AWAITING,
      trend: registered ? t : "UNKNOWN",
      trendLabel: trendLabel(registered ? t : "UNKNOWN"),
      status: !registered
        ? AWAITING
        : healthy
          ? "Healthy"
          : "Degraded",
      tone: tone(healthScore),
    };
  });
}

export function buildInstitutionalPlatformHealthDashboard(
  snapshot: InstitutionalPlatformSnapshot | null
): InstitutionalPlatformHealthDashboardView {
  if (!snapshot || (!snapshot.platform && !ops(snapshot))) {
    return {
      header: {
        platformHealthScore: metricCell({
          id: "health",
          label: "Platform Health Score",
          value: AWAITING,
          trend: "UNKNOWN",
          description: "Aggregate Sprint 9F platform health.",
          healthyRange: "70–100",
          lastUpdated: NOT_YET,
        }),
        productionReadiness: metricCell({
          id: "ready",
          label: "Production Readiness",
          value: AWAITING,
          trend: "UNKNOWN",
          description: "Platform production readiness score.",
          healthyRange: "75–100",
          lastUpdated: NOT_YET,
        }),
        platformGrade: AWAITING,
        overallStatus: AWAITING,
        lastValidation: AWAITING,
        lastCertification: AWAITING,
        platformVersion: NOT_YET,
        environment: NOT_YET,
        buildVersion: NOT_YET,
        releaseVersion: NOT_YET,
      },
      engines: [],
      pipeline: emptyPipeline(),
      observability: emptyObservability(),
      diagnostics: emptyDiagnostics(),
      performance: emptyPerformance(),
      certification: emptyCertification(),
      audit: emptyAudit(),
      timeline: [],
      badges: [],
      empty: true,
      emptyMessage: AWAITING,
    };
  }

  const o = ops(snapshot);
  const p = snapshot.platform;
  const active =
    (p?.registeredCount ?? 0) > 0 ||
    (snapshot.dashboard?.summary.totalValidations ?? 0) > 0 ||
    Boolean(o?.metrics?.initialized);
  const updated = formatOptionalTimestamp(
    o?.metrics?.lastRunAt ??
      o?.status?.updatedAt ??
      snapshot.dashboard?.summary.generatedAt ??
      snapshot.explainability?.lastRunAt ??
      null,
    AWAITING
  );
  const t = overallTrend(snapshot);
  const healthScore = p?.overallHealthScore ?? o?.metrics?.overallHealthScore ?? null;
  const readiness = p?.overallReadiness ?? null;

  const header = {
    platformHealthScore: metricCell({
      id: "health",
      label: "Platform Health Score",
      value: scoreDisp(healthScore, active),
      raw: healthScore,
      trend: t,
      description: "Aggregate health across Sprint 9F platform engines.",
      healthyRange: "70–100",
      lastUpdated: updated,
    }),
    productionReadiness: metricCell({
      id: "ready",
      label: "Production Readiness",
      value: scoreDisp(readiness, active),
      raw: readiness,
      trend: t,
      description: "Production readiness from Platform Health.",
      healthyRange: "75–100",
      lastUpdated: updated,
    }),
    platformGrade: platformGrade(healthScore, active),
    overallStatus: p?.overallValidationStatus
      ? p.overallValidationStatus
      : AWAITING,
    lastValidation: formatOptionalTimestamp(
      snapshot.dashboard?.summary.generatedAt ?? o?.metrics?.lastRunAt,
      AWAITING
    ),
    lastCertification: formatOptionalTimestamp(
      o?.release?.lastRunAt ??
        (o?.metrics?.certificationRuns ? o.metrics.lastRunAt : null),
      AWAITING
    ),
    platformVersion: o?.status?.engineVersion ?? NOT_YET,
    environment: process.env.NODE_ENV ?? NOT_YET,
    buildVersion: o?.status?.engineVersion ?? NOT_YET,
    releaseVersion:
      o?.release?.lastRunAt != null
        ? scoreDisp(o.release.releaseScore, true)
        : NOT_YET,
  };

  const diag = o?.diagnostics;
  const obs = o?.observability;
  const perf = o?.performance;
  const sec = o?.security;
  const rel = o?.release;
  const rep = o?.reporting;
  const auditEntries = o?.audit ?? [];

  const todayKey = new Date().toISOString().slice(0, 10);
  const todays = auditEntries.filter((a) => a.timestamp.startsWith(todayKey));
  const failed = auditEntries.filter((a) => (a.errors?.length ?? 0) > 0);
  const warned = auditEntries.filter((a) => (a.warnings?.length ?? 0) > 0);

  const pipeline: PipelineMonitorView = {
    pipelineHealth: scoreDisp(
      snapshot.dashboard?.health.validationEngineHealth ?? healthScore,
      active
    ),
    executionPipeline: scoreDisp(
      snapshot.dashboard?.health.overallHealthScore,
      active
    ),
    queueHealth:
      o?.metrics != null
        ? `${o.metrics.enginesRegistered}/${o.metrics.enginesRequired}`
        : AWAITING,
    snapshotHealth: countDisp(
      o?.metrics?.snapshotCount ?? diag?.snapshotCount ?? obs?.snapshotCount,
      active
    ),
    dependencyHealth: scoreDisp(
      diag?.healthScore ?? p?.overallReliability,
      Boolean(diag?.lastRunAt) || active
    ),
    failureRate: rateDisp(
      snapshot.dashboard?.summary
        ? (snapshot.dashboard.summary.failedValidations /
            Math.max(1, snapshot.dashboard.summary.totalValidations)) *
            100
        : null,
      (snapshot.dashboard?.summary.totalValidations ?? 0) > 0
    ),
    successRate: rateDisp(
      snapshot.dashboard?.summary
        ? (snapshot.dashboard.summary.passedValidations /
            Math.max(1, snapshot.dashboard.summary.totalValidations)) *
            100
        : null,
      (snapshot.dashboard?.summary.totalValidations ?? 0) > 0
    ),
    retryRate: NOT_YET,
    averageRuntime: msDisp(
      o?.metrics?.averageRuntimeMs ?? perf?.averageRuntimeMs ?? diag?.averageRuntime,
      Boolean(o?.metrics?.lastRunAt || perf?.lastRunAt || diag?.lastRunAt)
    ),
  };

  const observability: ObservabilityPanelView = {
    requests: scoreDisp(obs?.collectedMetrics, Boolean(obs?.lastCollectionAt)),
    events: scoreDisp(obs?.telemetryEvents, Boolean(obs?.lastCollectionAt)),
    warnings: scoreDisp(
      snapshot.dashboard?.summary.warningCount ?? o?.status?.warnings.length,
      active
    ),
    errors: scoreDisp(
      snapshot.dashboard?.summary.criticalCount ?? o?.status?.errors.length,
      active
    ),
    exceptions: scoreDisp(obs?.droppedEvents, Boolean(obs?.lastCollectionAt)),
    recoveryEvents: scoreDisp(obs?.exportCount, Boolean(obs?.lastCollectionAt)),
    averageProcessingTime: msDisp(
      obs?.averageCollectionTime ?? perf?.averageRuntimeMs,
      Boolean(obs?.lastCollectionAt || perf?.lastRunAt)
    ),
    // Percentiles require LatencyProfile samples — expose placeholders until samples exist.
    p50: NOT_YET,
    p95: NOT_YET,
    p99: NOT_YET,
  };

  const issueLines = [
    ...(o?.status?.errors ?? []).map((e) => `Error: ${e}`),
    ...(o?.status?.warnings ?? []).map((w) => `Warning: ${w}`),
    ...(o?.summary?.risks ?? []).map((r) => `Risk: ${r}`),
  ];

  const diagnostics: DiagnosticsPanelView = {
    criticalIssues: scoreDisp(
      snapshot.dashboard?.summary.criticalCount ?? o?.status?.errors.length,
      active
    ),
    majorIssues: scoreDisp(failed.length, auditEntries.length > 0),
    minorIssues: scoreDisp(warned.length, auditEntries.length > 0),
    warnings: scoreDisp(
      snapshot.dashboard?.summary.warningCount ?? o?.status?.warnings.length,
      active
    ),
    resolvedIssues: scoreDisp(
      snapshot.dashboard?.summary.passedValidations,
      (snapshot.dashboard?.summary.totalValidations ?? 0) > 0
    ),
    regressionDetection: snapshot.dashboard?.health.deteriorating
      ? "Detected"
      : active
        ? "Clear"
        : AWAITING,
    dependencyDrift:
      diag?.healthScore != null && diag.healthScore > 0 && diag.healthScore < 70
        ? "Attention"
        : active
          ? "Stable"
          : AWAITING,
    configurationDrift: active ? "Stable" : AWAITING,
    issueLines: issueLines.length > 0 ? issueLines.slice(0, 12) : [NOT_YET],
  };

  const performance: PerformancePanelView = {
    cpuTrend: pctDisp(perf?.cpuUsagePct, Boolean(perf?.lastRunAt)),
    memoryTrend: pctDisp(perf?.memoryUsagePct, Boolean(perf?.lastRunAt)),
    executionTime: msDisp(perf?.latencyMs ?? perf?.averageRuntimeMs, Boolean(perf?.lastRunAt)),
    throughput: scoreDisp(perf?.throughputPerSec, Boolean(perf?.lastRunAt)),
    averageValidationTime: msDisp(
      o?.metrics?.averageRuntimeMs ?? diag?.averageRuntime,
      Boolean(o?.metrics?.lastRunAt || diag?.lastRunAt)
    ),
    averageRecommendationTime: msDisp(
      snapshot.explainability?.averageExplanationTime,
      (snapshot.explainability?.generatedExplanations ?? 0) > 0
    ),
    averageTrustCalculation: msDisp(
      snapshot.trust?.averageValidationRuntime,
      (snapshot.trust?.totalCalculations ?? 0) > 0
    ),
  };

  const certStatus = o?.status?.certificationStatus;
  const certification: CertificationPanelView = {
    productionReady:
      certStatus === "production_ready" || (readiness != null && readiness >= 75)
        ? "Yes"
        : certStatus && certStatus !== "uninitialized"
          ? String(certStatus)
          : AWAITING,
    certificationGrade: scoreDisp(
      p?.overallCertification ?? rel?.releaseScore,
      Boolean(rel?.lastRunAt) || active
    ),
    securityPassed: passedFromScore(p?.overallSecurity ?? sec?.securityHealthScore, active),
    compliancePassed: passedFromScore(p?.overallCompliance, active),
    validationPassed: passedFromScore(healthScore, active),
    trustPassed: passedFromScore(p?.overallTrustScore ?? snapshot.trust?.averageTrustScore, active),
    performancePassed: passedFromScore(
      p?.overallPerformance ?? perf?.performanceHealthScore,
      active
    ),
    releaseApproved:
      certStatus === "production_ready"
        ? "Approved"
        : certStatus === "conditionally_ready"
          ? "Conditional"
          : AWAITING,
  };

  const audit: AuditSummaryView = {
    todaysAudits: scoreDisp(todays.length || auditEntries.length, auditEntries.length > 0),
    successful: scoreDisp(
      Math.max(0, auditEntries.length - failed.length),
      auditEntries.length > 0
    ),
    failed: scoreDisp(failed.length, auditEntries.length > 0),
    warnings: scoreDisp(warned.length, auditEntries.length > 0),
    exportActivity: scoreDisp(
      rep?.exportModelCount ?? obs?.exportCount,
      Boolean(rep?.lastGeneratedAt || obs?.lastCollectionAt)
    ),
    validationRuns: scoreDisp(
      snapshot.dashboard?.summary.totalValidations ?? diag?.diagnosticsRuns,
      active
    ),
    trustEvaluations: scoreDisp(
      snapshot.trust?.totalCalculations,
      (snapshot.trust?.totalCalculations ?? 0) > 0
    ),
  };

  const timeline: PlatformTimelineEvent[] = [
    {
      id: "validation",
      label: "Validation",
      at: snapshot.dashboard?.summary.generatedAt ?? null,
      available: (snapshot.dashboard?.summary.totalValidations ?? 0) > 0,
    },
    {
      id: "trust",
      label: "Trust",
      at: snapshot.trust?.totalCalculations ? updated : null,
      available: (snapshot.trust?.totalCalculations ?? 0) > 0,
    },
    {
      id: "recommendation",
      label: "Recommendation",
      at: snapshot.explainability?.lastRunAt ?? null,
      available: (snapshot.explainability?.generatedExplanations ?? 0) > 0,
    },
    {
      id: "export",
      label: "Export",
      at: rep?.lastGeneratedAt ?? null,
      available: (rep?.exportModelCount ?? 0) > 0 || (obs?.exportCount ?? 0) > 0,
    },
    {
      id: "scheduler",
      label: "Scheduler",
      at: o?.metrics?.lastRunAt ?? null,
      available: Boolean(o?.metrics?.lastRunAt),
    },
    {
      id: "snapshot",
      label: "Platform Snapshot",
      at: o?.metrics?.lastRunAt ?? null,
      available: (o?.metrics?.snapshotCount ?? 0) > 0,
    },
    {
      id: "certification",
      label: "Certification",
      at: rel?.lastRunAt ?? null,
      available: (rel?.certificationRuns ?? 0) > 0 || Boolean(certStatus && certStatus !== "uninitialized"),
    },
    {
      id: "release",
      label: "Release",
      at: rel?.lastRunAt ?? null,
      available: (rel?.certificationRuns ?? 0) > 0,
    },
  ];

  // Fill timeline gaps from recent audit events
  for (const entry of auditEntries.slice(-8)) {
    timeline.push({
      id: `audit-${entry.timestamp}-${entry.event}`,
      label: entry.event,
      at: entry.timestamp,
      available: true,
    });
  }

  const badges: PlatformStatusBadge[] = [];
  if (readiness != null && readiness >= 75) {
    badges.push({ id: "PRODUCTION_READY", label: "Production Ready" });
  }
  if (certStatus === "production_ready" || (p?.overallCertification ?? 0) >= 75) {
    badges.push({ id: "CERTIFIED", label: "Certified" });
  }
  if (p?.overallValidationStatus === "healthy") {
    badges.push({ id: "HEALTHY", label: "Healthy" });
  }
  if (obs?.lastCollectionAt || active) {
    badges.push({ id: "MONITORED", label: "Monitored" });
  }
  if ((snapshot.explainability?.decisionTraces ?? 0) > 0) {
    badges.push({ id: "EXPLAINABLE", label: "Explainable" });
  }
  if ((snapshot.dashboard?.summary.totalValidations ?? 0) > 0 && (healthScore ?? 0) >= 70) {
    badges.push({ id: "VALIDATED", label: "Validated" });
  }
  if ((snapshot.trust?.averageTrustScore ?? p?.overallTrustScore ?? 0) >= 75) {
    badges.push({ id: "HIGH_TRUST", label: "High Trust" });
  }
  if ((healthScore ?? 0) >= 80 && (readiness ?? 0) >= 70) {
    badges.push({ id: "INSTITUTIONAL_GRADE", label: "Institutional Grade" });
  }

  return {
    header,
    engines: buildEngineRows(snapshot),
    pipeline,
    observability,
    diagnostics,
    performance,
    certification,
    audit,
    timeline: timeline.filter((e) => e.available).slice(-16),
    badges,
    empty: false,
    emptyMessage: AWAITING,
  };
}

function emptyPipeline(): PipelineMonitorView {
  return {
    pipelineHealth: AWAITING,
    executionPipeline: AWAITING,
    queueHealth: AWAITING,
    snapshotHealth: AWAITING,
    dependencyHealth: AWAITING,
    failureRate: NA,
    successRate: NA,
    retryRate: NA,
    averageRuntime: AWAITING,
  };
}

function emptyObservability(): ObservabilityPanelView {
  return {
    requests: AWAITING,
    events: AWAITING,
    warnings: NA,
    errors: NA,
    exceptions: NA,
    recoveryEvents: NA,
    averageProcessingTime: AWAITING,
    p50: NOT_YET,
    p95: NOT_YET,
    p99: NOT_YET,
  };
}

function emptyDiagnostics(): DiagnosticsPanelView {
  return {
    criticalIssues: NA,
    majorIssues: NA,
    minorIssues: NA,
    warnings: NA,
    resolvedIssues: NA,
    regressionDetection: AWAITING,
    dependencyDrift: AWAITING,
    configurationDrift: AWAITING,
    issueLines: [NOT_YET],
  };
}

function emptyPerformance(): PerformancePanelView {
  return {
    cpuTrend: AWAITING,
    memoryTrend: AWAITING,
    executionTime: AWAITING,
    throughput: AWAITING,
    averageValidationTime: AWAITING,
    averageRecommendationTime: AWAITING,
    averageTrustCalculation: AWAITING,
  };
}

function emptyCertification(): CertificationPanelView {
  return {
    productionReady: AWAITING,
    certificationGrade: AWAITING,
    securityPassed: AWAITING,
    compliancePassed: AWAITING,
    validationPassed: AWAITING,
    trustPassed: AWAITING,
    performancePassed: AWAITING,
    releaseApproved: AWAITING,
  };
}

function emptyAudit(): AuditSummaryView {
  return {
    todaysAudits: AWAITING,
    successful: NA,
    failed: NA,
    warnings: NA,
    exportActivity: NA,
    validationRuns: AWAITING,
    trustEvaluations: AWAITING,
  };
}
