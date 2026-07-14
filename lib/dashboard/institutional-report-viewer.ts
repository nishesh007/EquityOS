/**
 * Institutional Report Viewer — presentation only (9F report platform).
 * Reuses InstitutionalReport / ExportDocument patterns and ExportAccessControl.
 * No report regeneration, no scoring changes.
 */

import type { InstitutionalReport } from "@/src/core/dataIntegrity/reporting/ReportBuilder";
import {
  DEFAULT_EXPORT_CONFIGURATION,
  resolveExportConfiguration,
  type ExportConfiguration,
  type ExportUserRole,
  type SubscriptionTier,
} from "@/src/core/dataIntegrity/reporting/export/ExportConfiguration";
import {
  ExportAccessControl,
  type ExportAccessSubject,
} from "@/src/core/dataIntegrity/reporting/export/ExportAccessControl";
import {
  buildExportDocument,
  buildExportMetadata,
} from "@/src/core/dataIntegrity/reporting/export/ExportDocument";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { formatOptionalTimestamp } from "@/lib/dashboard/display-value";

const NA = "N/A";
const AWAITING = "Awaiting Validation";

export type ReportViewerTone =
  | "excellent"
  | "healthy"
  | "caution"
  | "critical"
  | "neutral";

export interface ReportViewerTocItem {
  id: string;
  label: string;
  locked: boolean;
}

export interface ReportViewerMetricCard {
  id: string;
  label: string;
  value: string;
  tone: ReportViewerTone;
  toneClass: string;
  locked: boolean;
}

export interface ReportViewerExecutiveSummary {
  overallRecommendation: string;
  institutionalGrade: string;
  overallConfidence: string;
  validationStatus: string;
  trustGrade: string;
  platformHealth: string;
  topRisks: string[];
  topOpportunities: string[];
  paragraphs: string[];
}

export interface ReportViewerMetadata {
  generatedBy: string;
  generatedAt: string;
  reportVersion: string;
  environment: string;
  executionId: string;
  snapshotId: string;
  platformBuild: string;
  reportTitle: string;
  reportType: string;
  marketSession: string;
  institutionalGrade: string;
  platformVersion: string;
  validationVersion: string;
  trustVersion: string;
  aiVersion: string;
  watermark: string;
}

export interface ReportViewerSection {
  id: string;
  heading: string;
  paragraphs: string[];
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  locked: boolean;
  premium: boolean;
}

export interface ReportViewerFooter {
  disclaimer: string;
  copyright: string;
  aiNotice: string;
  validationTimestamp: string;
  trustTimestamp: string;
}

export interface ReportViewerModel {
  title: string;
  subtitle: string;
  metadata: ReportViewerMetadata;
  executiveSummary: ReportViewerExecutiveSummary;
  metricCards: ReportViewerMetricCard[];
  sections: ReportViewerSection[];
  toc: ReportViewerTocItem[];
  footer: ReportViewerFooter;
  previewOnly: boolean;
  upgradeRequired: boolean;
  showExport: boolean;
  role: ExportUserRole;
}

const TONE_CLASS: Record<ReportViewerTone, string> = {
  excellent: "text-gain",
  healthy: "text-accent",
  caution: "text-amber-600",
  critical: "text-loss",
  neutral: "text-text-muted",
};

const TOC_ORDER: Array<{ id: string; label: string; premium?: boolean }> = [
  { id: "executive_summary", label: "Executive Summary" },
  { id: "market_summary", label: "Market Summary" },
  { id: "validation_summary", label: "Validation" },
  { id: "trust_summary", label: "Trust" },
  { id: "ai_explainability", label: "AI Explainability", premium: true },
  { id: "opportunity_list", label: "Recommendations", premium: true },
  { id: "tomorrow_watchlist", label: "Tomorrow Watchlist", premium: true },
  { id: "historical_validation", label: "Historical Validation", premium: true },
  { id: "historical_trust", label: "Historical Trust", premium: true },
  { id: "risk_analysis", label: "Risk Analysis", premium: true },
  { id: "charts", label: "Charts", premium: true },
  { id: "appendix", label: "Appendix", premium: true },
  { id: "disclaimer", label: "Disclaimer" },
];

function tone(score: number | null | undefined): ReportViewerTone {
  if (score == null || !Number.isFinite(score) || score === 0) return "neutral";
  if (score >= 85) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "caution";
  return "critical";
}

function disp(value: number | null | undefined, fallback = NA): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  if (value === 0) return fallback;
  return String(Math.round(value));
}

function grade(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score) || score === 0) return AWAITING;
  if (score >= 85) return "A — Institutional";
  if (score >= 75) return "B — Strong";
  if (score >= 65) return "C — Watch";
  return "D — Caution";
}

function metric(
  id: string,
  label: string,
  value: string,
  raw: number | null | undefined,
  locked: boolean
): ReportViewerMetricCard {
  const t = locked ? "neutral" : tone(raw);
  return {
    id,
    label,
    value: locked ? "Upgrade Required" : value,
    tone: t,
    toneClass: TONE_CLASS[t],
    locked,
  };
}

export function buildReportMetadata(input: {
  report?: InstitutionalReport | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  config?: ExportConfiguration;
  generatedBy?: string;
}): ReportViewerMetadata {
  const config = resolveExportConfiguration(input.config);
  const report = input.report ?? null;
  const snapshot = input.snapshot ?? null;
  const meta = report
    ? buildExportMetadata(report, config, input.generatedBy)
    : null;

  const health = snapshot?.platform?.overallHealthScore ?? null;
  const session =
    report?.reportingPeriod?.to?.slice(0, 10) ??
    snapshot?.dashboard?.summary.generatedAt?.slice(0, 10) ??
    NA;

  return {
    generatedBy:
      meta?.generatedBy ??
      input.generatedBy ??
      report?.auditInformation.generatedBy ??
      config.defaultGeneratedBy,
    generatedAt: formatOptionalTimestamp(
      meta?.generatedOn ??
        report?.generatedTime ??
        snapshot?.dashboard?.summary.generatedAt ??
        snapshot?.operations?.metrics?.lastRunAt,
      AWAITING
    ),
    reportVersion: meta?.reportVersion ?? config.versions.reportVersion,
    environment: meta?.environment ?? config.environment,
    executionId: report?.reportId ?? snapshot?.operations?.status?.engineVersion ?? NA,
    snapshotId:
      snapshot?.operations?.metrics?.snapshotCount != null &&
      snapshot.operations.metrics.snapshotCount > 0
        ? `ops-snapshots:${snapshot.operations.metrics.snapshotCount}`
        : report?.reportId ?? NA,
    platformBuild:
      meta?.platformVersion ??
      snapshot?.operations?.status?.engineVersion ??
      config.versions.platformVersion,
    reportTitle: report?.title ?? "Institutional Validation Report",
    reportType: String(report?.reportType ?? "ValidationReport"),
    marketSession: session,
    institutionalGrade: grade(
      report?.summary.overallHealth ?? health
    ),
    platformVersion: config.versions.platformVersion,
    validationVersion: config.versions.validationVersion,
    trustVersion: config.versions.trustVersion,
    aiVersion: config.versions.aiVersion,
    watermark: meta?.watermark ?? config.watermark,
  };
}

export function buildExecutiveSummary(input: {
  report?: InstitutionalReport | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
}): ReportViewerExecutiveSummary {
  const report = input.report ?? null;
  const snapshot = input.snapshot ?? null;
  const candidate = input.candidate ?? null;

  const health =
    report?.summary.overallHealth ??
    snapshot?.platform?.overallHealthScore ??
    snapshot?.dashboard?.health.overallHealthScore ??
    null;
  const trust =
    report?.summary.trustScore ??
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;
  const confidence =
    candidate?.confidence ??
    snapshot?.explainability?.confidenceCoverage ??
    null;
  const validation =
    report?.summary.overallValidationScore ??
    snapshot?.dashboard?.health.overallHealthScore ??
    null;

  const topRisks =
    report?.warnings?.slice(0, 4) ??
    candidate?.riskFactors?.slice(0, 4).map((r) => r.label) ??
    snapshot?.operations?.status?.warnings?.slice(0, 4) ??
    [];

  const topOpportunities =
    report?.recommendations?.slice(0, 4) ??
    candidate?.primaryReasons?.slice(0, 4) ??
    [];

  const overallRecommendation =
    candidate?.primaryReasons?.[0] ??
    report?.recommendations?.[0] ??
    (health != null && health >= 70
      ? "Institutional posture supportive"
      : AWAITING);

  return {
    overallRecommendation,
    institutionalGrade: grade(health),
    overallConfidence: disp(confidence, AWAITING),
    validationStatus:
      snapshot?.platform?.overallValidationStatus ??
      (validation != null && validation >= 70 ? "healthy" : AWAITING),
    trustGrade: grade(trust),
    platformHealth: disp(health, AWAITING),
    topRisks: topRisks.length > 0 ? topRisks : [NA],
    topOpportunities:
      topOpportunities.length > 0 ? topOpportunities : [AWAITING],
    paragraphs: [
      `Overall recommendation: ${overallRecommendation}.`,
      `Institutional grade ${grade(health)} with platform health ${disp(health, AWAITING)}.`,
      `Validation ${disp(validation, AWAITING)} · Trust ${disp(trust, AWAITING)} · Confidence ${disp(confidence, AWAITING)}.`,
    ],
  };
}

export function buildMetricCards(input: {
  report?: InstitutionalReport | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
  previewOnly?: boolean;
}): ReportViewerMetricCard[] {
  const report = input.report ?? null;
  const snapshot = input.snapshot ?? null;
  const candidate = input.candidate ?? null;
  const lockPremium = Boolean(input.previewOnly);

  const validation =
    report?.summary.overallValidationScore ??
    snapshot?.dashboard?.health.overallHealthScore ??
    null;
  const trust =
    report?.summary.trustScore ??
    snapshot?.trust?.averageTrustScore ??
    null;
  const confidence =
    candidate?.confidence ??
    snapshot?.explainability?.confidenceCoverage ??
    null;
  const risk = candidate?.riskRating
    ? candidate.riskRating === "Low"
      ? 80
      : candidate.riskRating === "Medium"
        ? 60
        : 40
    : report?.summary.overallHealth != null
      ? Math.max(0, 100 - (100 - report.summary.overallHealth))
      : null;
  const conviction =
    candidate?.overallScore ?? report?.summary.recommendationQuality ?? null;
  const execution =
    report?.summary.tradeQuality ??
    snapshot?.dashboard?.summary.recommendationQuality ??
    snapshot?.platform?.overallPerformance ??
    null;
  const pipeline =
    snapshot?.dashboard?.health.validationEngineHealth ?? null;
  const readiness = snapshot?.platform?.overallReadiness ?? null;

  return [
    metric("validation", "Validation", disp(validation, AWAITING), validation, false),
    metric("trust", "Trust", disp(trust, AWAITING), trust, false),
    metric("confidence", "Confidence", disp(confidence, AWAITING), confidence, false),
    metric(
      "risk",
      "Risk",
      candidate?.riskRating ?? disp(risk, AWAITING),
      risk,
      lockPremium
    ),
    metric("conviction", "Conviction", disp(conviction, AWAITING), conviction, lockPremium),
    metric(
      "execution",
      "Execution Quality",
      disp(execution, AWAITING),
      execution,
      lockPremium
    ),
    metric("pipeline", "Pipeline Health", disp(pipeline, AWAITING), pipeline, false),
    metric(
      "readiness",
      "Production Readiness",
      disp(readiness, AWAITING),
      readiness,
      lockPremium
    ),
  ];
}

function lockPremiumSections(
  sections: ReportViewerSection[],
  previewOnly: boolean
): ReportViewerSection[] {
  if (!previewOnly) return sections.map((s) => ({ ...s, locked: false }));
  return sections.map((s) => ({
    ...s,
    locked: s.premium,
    paragraphs: s.premium
      ? ["Upgrade Required — premium section available for subscribers."]
      : s.paragraphs,
    tables: s.premium ? undefined : s.tables,
  }));
}

function sectionsFromReport(
  report: InstitutionalReport,
  config: ExportConfiguration
): ReportViewerSection[] {
  const doc = buildExportDocument(report, config);
  const byId = new Map(doc.sections.map((s) => [s.id, s]));

  const historicalTrust: ReportViewerSection = {
    id: "historical_trust",
    heading: "Historical Trust",
    paragraphs: [
      `Average Trust Score: ${disp(report.trustMetrics.averageTrustScore, AWAITING)}`,
      `Rejected Objects: ${disp(report.trustMetrics.rejectedObjects, NA)}`,
      `Trust Distribution: ${
        Object.keys(report.trustMetrics.trustDistribution).length > 0
          ? Object.entries(report.trustMetrics.trustDistribution)
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")
          : NA
      }`,
    ],
    premium: true,
    locked: false,
  };

  return TOC_ORDER.map((item) => {
    if (item.id === "historical_trust") return historicalTrust;
    const src = byId.get(item.id);
    if (!src) {
      return {
        id: item.id,
        heading: item.label,
        paragraphs: [AWAITING],
        premium: Boolean(item.premium),
        locked: false,
      };
    }
    return {
      id: src.id,
      heading: src.heading,
      paragraphs: src.paragraphs.length > 0 ? src.paragraphs : [NA],
      tables: src.tables,
      premium: Boolean(item.premium),
      locked: false,
    };
  });
}

function sectionsFromSnapshot(
  snapshot: InstitutionalPlatformSnapshot | null,
  candidate: InstitutionalCandidateView | null
): ReportViewerSection[] {
  const s = snapshot;
  return TOC_ORDER.map((item) => {
    switch (item.id) {
      case "executive_summary":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: buildExecutiveSummary({ snapshot, candidate }).paragraphs,
          premium: false,
          locked: false,
        };
      case "market_summary":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Generated: ${formatOptionalTimestamp(s?.dashboard?.summary.generatedAt, AWAITING)}`,
            `Platform status: ${s?.platform?.overallValidationStatus ?? AWAITING}`,
            `Engines healthy: ${disp(s?.platform?.healthyCount, NA)} / ${disp(s?.platform?.engineCount, NA)}`,
          ],
          premium: false,
          locked: false,
        };
      case "validation_summary":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Overall Validation: ${disp(s?.dashboard?.health.overallHealthScore, AWAITING)}`,
            `Passed: ${disp(s?.dashboard?.summary.passedValidations, NA)} · Failed: ${disp(s?.dashboard?.summary.failedValidations, NA)}`,
            `Pipeline Health: ${disp(s?.dashboard?.health.validationEngineHealth, AWAITING)}`,
          ],
          premium: false,
          locked: false,
        };
      case "trust_summary":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Average Trust: ${disp(s?.trust?.averageTrustScore, AWAITING)}`,
            `Trust Trend: ${disp(s?.trust?.averageTrend, NA)}`,
            `Calculations: ${disp(s?.trust?.totalCalculations, NA)}`,
          ],
          premium: false,
          locked: false,
        };
      case "ai_explainability":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: candidate?.decisionTrace?.slice(0, 6) ?? [
            `Explainability health: ${disp(s?.explainability?.explainabilityHealthScore, AWAITING)}`,
            `Decision traces: ${disp(s?.explainability?.decisionTraces, NA)}`,
          ],
          premium: true,
          locked: false,
        };
      case "opportunity_list":
        return {
          id: item.id,
          heading: item.label,
          paragraphs:
            candidate?.primaryReasons?.length
              ? candidate.primaryReasons
              : [AWAITING],
          premium: true,
          locked: false,
        };
      case "tomorrow_watchlist":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            candidate?.expectedCatalyst
              ? `Catalyst: ${candidate.expectedCatalyst}`
              : AWAITING,
            candidate
              ? `Conviction ${disp(candidate.overallScore)} · Confidence ${disp(candidate.confidence)}`
              : AWAITING,
          ],
          premium: true,
          locked: false,
        };
      case "historical_validation":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Historical Performance: ${disp(s?.dashboard?.summary.historicalPerformanceScore, AWAITING)}`,
            `Historical Engine Health: ${disp(s?.dashboard?.health.historicalEngineHealth, AWAITING)}`,
          ],
          premium: true,
          locked: false,
        };
      case "historical_trust":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Highest Trust: ${disp(s?.trust?.highestTrustScore, AWAITING)}`,
            `Lowest Trust: ${disp(s?.trust?.lowestTrustScore, AWAITING)}`,
          ],
          premium: true,
          locked: false,
        };
      case "risk_analysis":
        return {
          id: item.id,
          heading: item.label,
          paragraphs:
            candidate?.riskFactors?.map((r) => `${r.label} (${r.contribution})`) ??
            s?.operations?.status?.warnings?.slice(0, 5) ??
            [NA],
          premium: true,
          locked: false,
        };
      case "charts":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            "Chart models reuse existing report analytics and platform health metrics.",
            `Platform health ${disp(s?.platform?.overallHealthScore, AWAITING)} · Trust ${disp(s?.trust?.averageTrustScore, AWAITING)}`,
          ],
          premium: true,
          locked: false,
        };
      case "appendix":
        return {
          id: item.id,
          heading: item.label,
          paragraphs: [
            `Platform version: ${s?.operations?.status?.engineVersion ?? NA}`,
            `Dashboard engine: ${s?.dashboard?.engineVersion ?? NA}`,
            `Certification: ${s?.operations?.status?.certificationStatus ?? NA}`,
          ],
          premium: true,
          locked: false,
        };
      case "disclaimer":
      default:
        return {
          id: "disclaimer",
          heading: "Disclaimer",
          paragraphs: [DEFAULT_EXPORT_CONFIGURATION.disclaimer],
          premium: false,
          locked: false,
        };
    }
  });
}

export function buildReportViewer(input: {
  report?: InstitutionalReport | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
  subject?: ExportAccessSubject;
  config?: ExportConfiguration;
  generatedBy?: string;
}): ReportViewerModel {
  const config = resolveExportConfiguration(input.config);
  const subject: ExportAccessSubject = input.subject ?? {
    userId: "dashboard-user",
    role: "subscriber",
    subscriptionTier: "pro",
  };
  const access = new ExportAccessControl(config).resolvePermissions(subject);
  const previewOnly = access.previewOnly || access.upgradeRequired;
  const showExport = !previewOnly && access.allowedFormats.length > 0;

  const metadata = buildReportMetadata({
    report: input.report,
    snapshot: input.snapshot,
    config,
    generatedBy: input.generatedBy,
  });
  const executiveSummary = buildExecutiveSummary({
    report: input.report,
    snapshot: input.snapshot,
    candidate: input.candidate,
  });
  const metricCards = buildMetricCards({
    report: input.report,
    snapshot: input.snapshot,
    candidate: input.candidate,
    previewOnly,
  });

  const rawSections = input.report
    ? sectionsFromReport(input.report, config)
    : sectionsFromSnapshot(input.snapshot ?? null, input.candidate ?? null);

  const sections = lockPremiumSections(rawSections, previewOnly);
  const toc: ReportViewerTocItem[] = TOC_ORDER.map((item) => ({
    id: item.id,
    label: item.label,
    locked: previewOnly && Boolean(item.premium),
  }));

  const footer: ReportViewerFooter = {
    disclaimer: config.disclaimer,
    copyright: `© ${new Date().getFullYear()} EquityOS — Institutional Research`,
    aiNotice:
      "Portions of this report are AI-assisted. Validate outputs with institutional controls before acting.",
    validationTimestamp: formatOptionalTimestamp(
      input.snapshot?.dashboard?.summary.generatedAt ?? input.report?.generatedTime,
      AWAITING
    ),
    trustTimestamp: formatOptionalTimestamp(
      input.snapshot?.explainability?.lastRunAt ??
        input.snapshot?.operations?.metrics?.lastRunAt,
      AWAITING
    ),
  };

  return {
    title: metadata.reportTitle,
    subtitle: `${metadata.reportType} · ${metadata.generatedAt}`,
    metadata,
    executiveSummary,
    metricCards,
    sections,
    toc,
    footer,
    previewOnly,
    upgradeRequired: access.upgradeRequired,
    showExport,
    role: subject.role,
  };
}

export type { ExportAccessSubject, ExportUserRole, SubscriptionTier };
