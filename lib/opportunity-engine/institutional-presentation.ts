/**
 * Presentation-only mapping of Opportunity Engine + Sprint 9F platform metrics.
 * Does not recompute scoring, trust, validation, or AI conviction.
 */

import type { ConfidenceReasonContribution } from "@/lib/opportunity-engine/reasons";
import {
  CONVICTION_POSITIVE_DRIVER_LABELS,
  resolveConvictionDisplayBreakdown,
  resolveConvictionRiskAdjustments,
} from "@/lib/opportunity-engine/conviction-display";
import { resolveConfidenceContributions } from "@/lib/opportunity-engine/reasons";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
  PostMarketReport,
} from "@/lib/opportunity-engine/types";
import type { PlatformHealthReport } from "@/src/core/dataIntegrity/platform/PlatformHealth";
import type { DashboardSummary } from "@/src/core/dataIntegrity/dashboard/DashboardSummary";
import type { ExplainabilityOperationalMetrics } from "@/src/core/dataIntegrity/explainability/ExplainabilityMetrics";
import type { TrustMetricsSnapshot } from "@/src/core/dataIntegrity/trust/TrustMetrics";
import type { PlatformStatus } from "@/src/core/dataIntegrity/platform/PlatformStatus";
import type { PlatformOperationalMetrics } from "@/src/core/dataIntegrity/platform/PlatformMetrics";
import type { PlatformSummary } from "@/src/core/dataIntegrity/platform/PlatformSummary";
import type { ObservabilityOperationalMetrics } from "@/src/core/dataIntegrity/observability/TelemetryMetrics";
import type { DiagnosticsOperationalMetrics } from "@/src/core/dataIntegrity/diagnostics/DiagnosticsMetrics";
import type { PerformanceOperationalMetrics } from "@/src/core/dataIntegrity/performance/PerformanceMetrics";
import type { SecurityOperationalMetrics } from "@/src/core/dataIntegrity/security/SecurityMetrics";
import type { ReleaseOperationalMetrics } from "@/src/core/dataIntegrity/release/ReleaseMetrics";
import type { ReportingOperationalMetrics } from "@/src/core/dataIntegrity/reporting/ReportMetrics";
import { getEarningsCalendarService } from "@/src/core/earnings/calendar";

export type InstitutionalBadgeId =
  | "AI_VERIFIED"
  | "VALIDATED"
  | "HIGH_TRUST"
  | "HIGH_CONFIDENCE"
  | "HISTORICALLY_ACCURATE"
  | "BACKTEST_VERIFIED"
  | "HIGH_QUALITY";

export interface InstitutionalBadge {
  id: InstitutionalBadgeId;
  label: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  at: string | null;
  available: boolean;
}

export interface ContributionRow {
  label: string;
  contribution: number;
}

export interface InstitutionalCandidateView {
  overallScore: number;
  confidence: number;
  trustScore: number | null;
  validationScore: number | null;
  historicalValidationAccuracy: number | null;
  explainabilityScore: number | null;
  signalStability: number | null;
  recommendationQuality: number | null;
  riskRating: "Low" | "Medium" | "High" | null;
  generatedAt: string;
  lastUpdatedAt: string;
  primaryReasons: string[];
  supportingFactors: ContributionRow[];
  negativeFactors: ContributionRow[];
  sectorContribution: number | null;
  momentumContribution: number | null;
  volumeContribution: number | null;
  fundamentalContribution: number | null;
  marketRegimeContribution: number | null;
  relativeStrengthContribution: number | null;
  confidenceDistribution: ContributionRow[];
  ruleContributions: ContributionRow[];
  decisionTrace: string[];
  executionPath: string[];
  validationTrace: string[];
  topPositiveDrivers: ContributionRow[];
  topNegativeDrivers: ContributionRow[];
  riskFactors: ContributionRow[];
  expectedCatalyst: string | null;
  /** Presentation-only earnings window — never used for scoring. */
  earningsProximity: string | null;
  earningsProximityLabel: string | null;
  institutionalFlow: number | null;
  sectorStrength: number | null;
  historicalSimilarity: string | null;
  badges: InstitutionalBadge[];
  timeline: TimelineEvent[];
}

export interface InstitutionalPlatformSnapshot {
  platform: PlatformHealthReport | null;
  dashboard: DashboardSummary | null;
  trust: TrustMetricsSnapshot | null;
  explainability: ExplainabilityOperationalMetrics | null;
  /** Sprint 9F.R4 — optional operational slices (read-only engine getters). */
  operations?: InstitutionalPlatformOperations | null;
}

export interface InstitutionalPlatformOperations {
  status: PlatformStatus | null;
  metrics: PlatformOperationalMetrics | null;
  summary: PlatformSummary | null;
  observability: ObservabilityOperationalMetrics | null;
  diagnostics: DiagnosticsOperationalMetrics | null;
  performance: PerformanceOperationalMetrics | null;
  security: SecurityOperationalMetrics | null;
  release: ReleaseOperationalMetrics | null;
  reporting: ReportingOperationalMetrics | null;
  audit: Array<{
    timestamp: string;
    event: string;
    warnings?: string[];
    errors?: string[];
  }>;
}

export interface TomorrowWatchlistMeta {
  generatedAt: string | null;
  sessionDate: string | null;
  validFromLabel: string | null;
  validUntilLabel: string | null;
  aiVersion: string;
  marketRegime: string | null;
  expectedSuccess: number | null;
  expectedHolding: string;
  dataFreshness: string;
  finalClosingScan: string | null;
}

function splitContributions(items: ConfidenceReasonContribution[]): {
  positives: ContributionRow[];
  negatives: ContributionRow[];
} {
  return {
    positives: items
      .filter((item) => item.contribution > 0)
      .map((item) => ({ label: item.label, contribution: item.contribution })),
    negatives: items
      .filter((item) => item.contribution < 0)
      .map((item) => ({ label: item.label, contribution: item.contribution })),
  };
}

function riskRatingFromCandidate(
  candidate: OpportunityCandidate,
  negatives: ContributionRow[]
): "Low" | "Medium" | "High" | null {
  if (candidate.riskReward <= 0 && negatives.length === 0) return null;
  if (candidate.riskReward < 1.5 || negatives.length >= 3) return "High";
  if (candidate.riskReward < 2 || negatives.length >= 1) return "Medium";
  return "Low";
}

/**
 * Signal stability from detection window only (presentation metric from existing timestamps).
 * Returns null when timestamps are missing/invalid.
 */
export function deriveSignalStability(candidate: OpportunityCandidate): number | null {
  const first = new Date(candidate.firstDetectedAt).getTime();
  const last = new Date(candidate.lastDetectedAt).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return null;
  const hours = (last - first) / 3_600_000;
  if (hours <= 0) return 55;
  if (hours < 1) return 65;
  if (hours < 3) return 78;
  if (hours < 6) return 88;
  return 95;
}

export function buildInstitutionalBadges(
  candidate: OpportunityCandidate,
  platform: InstitutionalPlatformSnapshot | null
): InstitutionalBadge[] {
  const badges: InstitutionalBadge[] = [];
  const hasConviction = Boolean(candidate.convictionComponents);
  const hasReasons =
    (candidate.confidenceReasonContributions?.length ?? 0) > 0 ||
    (candidate.confidenceReasons?.length ?? 0) > 0;

  if (hasConviction) {
    badges.push({ id: "AI_VERIFIED", label: "AI VERIFIED" });
  }
  if (hasReasons) {
    badges.push({ id: "VALIDATED", label: "VALIDATED" });
  }
  if (candidate.confidencePercent >= 75) {
    badges.push({ id: "HIGH_CONFIDENCE", label: "HIGH CONFIDENCE" });
  }
  if (candidate.aiConvictionScore >= 80 && candidate.confidencePercent >= 70) {
    badges.push({ id: "HIGH_QUALITY", label: "HIGH QUALITY" });
  }

  const trust =
    platform?.trust?.averageTrustScore ??
    platform?.dashboard?.summary.averageTrustScore ??
    platform?.platform?.overallTrustScore ??
    null;
  if (trust != null && trust >= 75 && candidate.confidencePercent >= 70) {
    badges.push({ id: "HIGH_TRUST", label: "HIGH TRUST" });
  }

  const historical =
    platform?.dashboard?.summary.historicalPerformanceScore ?? null;
  if (historical != null && historical >= 75 && candidate.aiConvictionScore >= 70) {
    badges.push({ id: "HISTORICALLY_ACCURATE", label: "HISTORICALLY ACCURATE" });
  }

  const backtestReady =
    (platform?.platform?.overallCertification ?? 0) >= 70 ||
    (platform?.platform?.overallReadiness ?? 0) >= 75;
  if (backtestReady && hasConviction) {
    badges.push({ id: "BACKTEST_VERIFIED", label: "BACKTEST VERIFIED" });
  }

  return badges;
}

export function buildRecommendationTimeline(
  candidate: OpportunityCandidate,
  postMarketGeneratedAt: string | null
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "generated",
      label: "Generated",
      at: candidate.firstDetectedAt,
      available: Boolean(candidate.firstDetectedAt),
    },
    {
      id: "validated",
      label: "Validated",
      at:
        (candidate.confidenceReasonContributions?.length ?? 0) > 0
          ? candidate.firstDetectedAt
          : null,
      available: (candidate.confidenceReasonContributions?.length ?? 0) > 0,
    },
    {
      id: "trust",
      label: "Trust Verified",
      at: candidate.convictionComponents ? candidate.lastDetectedAt : null,
      available: Boolean(candidate.convictionComponents),
    },
    {
      id: "published",
      label: "Published",
      at: candidate.lastDetectedAt,
      available: Boolean(candidate.lastDetectedAt),
    },
    {
      id: "updated",
      label: "Last Updated",
      at: candidate.lastUpdatedAt,
      available: Boolean(candidate.lastUpdatedAt),
    },
  ];

  if (postMarketGeneratedAt) {
    events.push({
      id: "post_market",
      label: "Post-Market Certified",
      at: postMarketGeneratedAt,
      available: true,
    });
  }

  return events.filter((event) => event.available);
}

function resolvePresentationEarningsProximity(candidate: OpportunityCandidate): {
  proximity: string | null;
  label: string | null;
  catalystHint: string | null;
} {
  const metrics = candidate.scanMetrics ?? {};
  const fromMetrics =
    typeof metrics.earnings_proximity === "string"
      ? metrics.earnings_proximity
      : null;
  const fromLabel =
    typeof metrics.earnings_proximity_label === "string"
      ? metrics.earnings_proximity_label
      : null;

  if (fromMetrics || fromLabel) {
    return {
      proximity: fromMetrics,
      label: fromLabel ?? fromMetrics,
      catalystHint: fromLabel ?? fromMetrics,
    };
  }

  const info = getEarningsCalendarService().getEarningsProximity(candidate.symbol);
  if (!info || info.proximity === "none") {
    return { proximity: null, label: null, catalystHint: null };
  }
  return {
    proximity: info.proximity,
    label: info.label,
    catalystHint:
      info.daysRemaining != null && info.quarter
        ? `${info.quarter} · ${info.label}`
        : info.label,
  };
}

export function buildInstitutionalCandidateView(
  candidate: OpportunityCandidate,
  platform: InstitutionalPlatformSnapshot | null = null,
  postMarketGeneratedAt: string | null = null
): InstitutionalCandidateView {
  const contributions = resolveConfidenceContributions(candidate);
  const { positives, negatives } = splitContributions(contributions);
  const breakdown = resolveConvictionDisplayBreakdown(candidate);
  const riskAdjustments = resolveConvictionRiskAdjustments(candidate);
  const components = candidate.convictionComponents;

  const trustScore =
    platform?.trust?.averageTrustScore ??
    platform?.dashboard?.summary.averageTrustScore ??
    platform?.platform?.overallTrustScore ??
    null;

  const validationScore =
    platform?.dashboard?.health.overallHealthScore ??
    platform?.platform?.overallHealthScore ??
    null;

  const historicalValidationAccuracy =
    platform?.dashboard?.summary.historicalPerformanceScore ?? null;

  const explainabilityScore =
    platform?.explainability?.explainabilityHealthScore ??
    platform?.platform?.overallExplainability ??
    null;

  const recommendationQuality =
    platform?.dashboard?.summary.recommendationQuality ??
    candidate.bestCallScore ??
    candidate.confidencePercent;

  const primaryReasons =
    candidate.confidenceReasons?.slice(0, 5) ??
    positives.slice(0, 5).map((item) => item.label);

  const decisionTrace = [
    `Signal ${candidate.symbol} · ${candidate.category} · ${candidate.side}`,
    `Conviction ${candidate.aiConvictionScore} · Confidence ${candidate.confidencePercent}%`,
    ...primaryReasons.map((reason) => `Reason: ${reason}`),
    ...negatives.map((item) => `Risk: ${item.label} (${item.contribution})`),
  ];

  const executionPath = [
    "Universe scan",
    `Category score · ${candidate.category}`,
    "Conviction assembly",
    "Confidence reason attribution",
    candidate.rank ? `Ranked #${candidate.rank}` : "Published to registry",
  ];

  const validationTrace = [
    hasLength(candidate.confidenceReasonContributions)
      ? "Rule contributions attached"
      : null,
    candidate.convictionComponents ? "Conviction components verified" : null,
    trustScore != null ? `Platform trust ${Math.round(trustScore)}` : null,
    validationScore != null
      ? `Platform validation health ${Math.round(validationScore)}`
      : null,
  ].filter((item): item is string => Boolean(item));

  const scanMetrics = candidate.scanMetrics ?? {};
  const institutionalFlow =
    typeof scanMetrics.delivery_percent === "number"
      ? scanMetrics.delivery_percent
      : typeof scanMetrics.volume_ratio === "number"
        ? scanMetrics.volume_ratio
        : null;
  const earnings = resolvePresentationEarningsProximity(candidate);

  return {
    overallScore: candidate.aiConvictionScore,
    confidence: candidate.confidencePercent,
    trustScore: trustScore != null ? Math.round(trustScore) : null,
    validationScore: validationScore != null ? Math.round(validationScore) : null,
    historicalValidationAccuracy:
      historicalValidationAccuracy != null
        ? Math.round(historicalValidationAccuracy)
        : null,
    explainabilityScore:
      explainabilityScore != null ? Math.round(explainabilityScore) : null,
    signalStability: deriveSignalStability(candidate),
    recommendationQuality:
      recommendationQuality != null ? Math.round(recommendationQuality) : null,
    riskRating: riskRatingFromCandidate(candidate, negatives),
    generatedAt: candidate.firstDetectedAt,
    lastUpdatedAt: candidate.lastUpdatedAt,
    primaryReasons,
    supportingFactors: positives,
    negativeFactors: negatives,
    sectorContribution: breakdown.sector,
    momentumContribution: breakdown.momentum,
    volumeContribution: breakdown.volume,
    fundamentalContribution: breakdown.fundamental,
    marketRegimeContribution: components?.marketRegime ?? null,
    relativeStrengthContribution: components?.relativeStrength ?? null,
    confidenceDistribution: contributions.map((item) => ({
      label: item.label,
      contribution: item.contribution,
    })),
    ruleContributions: contributions.map((item) => ({
      label: item.label,
      contribution: item.contribution,
    })),
    decisionTrace,
    executionPath,
    validationTrace,
    topPositiveDrivers: [
      ...Object.entries(CONVICTION_POSITIVE_DRIVER_LABELS).map(([key, label]) => ({
        label,
        contribution: breakdown[key as keyof typeof CONVICTION_POSITIVE_DRIVER_LABELS],
      })),
      ...positives,
    ]
      .filter((item) => item.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 6),
    topNegativeDrivers: [...negatives, ...riskAdjustments]
      .sort((a, b) => a.contribution - b.contribution)
      .slice(0, 6),
    riskFactors: [...negatives, ...riskAdjustments],
    expectedCatalyst: candidate.expectedCatalyst ?? earnings.catalystHint ?? null,
    earningsProximity: earnings.proximity,
    earningsProximityLabel: earnings.label,
    institutionalFlow,
    sectorStrength: candidate.sectorStrength ?? breakdown.sector ?? null,
    historicalSimilarity: null,
    badges: buildInstitutionalBadges(candidate, platform),
    timeline: buildRecommendationTimeline(candidate, postMarketGeneratedAt),
  };
}

function hasLength(value: unknown[] | undefined | null): boolean {
  return (value?.length ?? 0) > 0;
}

export function buildTomorrowWatchlistMeta(
  report: PostMarketReport | null,
  watchlist: OpportunityCandidate[]
): TomorrowWatchlistMeta {
  const avgConfidence =
    watchlist.length > 0
      ? Math.round(
          watchlist.reduce((sum, item) => sum + item.confidencePercent, 0) /
            watchlist.length
        )
      : null;

  const regimeFromSummary = report?.marketSummary
    ? report.marketSummary.breadth.advanceRatio >= 0.55
      ? "Bullish"
      : report.marketSummary.breadth.advanceRatio <= 0.45
        ? "Bearish"
        : "Mixed"
    : null;

  return {
    generatedAt: report?.generatedAt ?? null,
    sessionDate: report?.sessionDate ?? null,
    validFromLabel: report?.sessionDate
      ? nextSessionOpenLabel(report.sessionDate)
      : null,
    validUntilLabel: report?.sessionDate
      ? nextSessionCloseLabel(report.sessionDate)
      : null,
    aiVersion: "Sprint 9E",
    marketRegime: regimeFromSummary,
    expectedSuccess: avgConfidence,
    expectedHolding: "Intraday",
    dataFreshness: report ? "Final Close Snapshot" : "Live",
    finalClosingScan: report?.generatedAt ?? null,
  };
}

function nextSessionOpenLabel(sessionDate: string): string {
  // Watchlist generated after close is valid for the next calendar trading session date display.
  // Presentation-only: open 09:15 / close 15:30 IST labels for the following day key when available.
  const next = addOneCalendarDay(sessionDate);
  return `${formatDateLabel(next)} 09:15 AM`;
}

function nextSessionCloseLabel(sessionDate: string): string {
  const next = addOneCalendarDay(sessionDate);
  return `${formatDateLabel(next)} 03:30 PM`;
}

function addOneCalendarDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function countActiveOpportunities(state: OpportunityEngineState): number {
  return Object.values(state.categories).reduce(
    (sum, list) => sum + list.length,
    0
  );
}
