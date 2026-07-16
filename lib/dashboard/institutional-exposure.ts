/**
 * Institutional dashboard exposure — presentation-only mapping of Sprint 9E/9F snapshots.
 * No engine calls, no score recomputation, no duplicated validation/trust/explain logic.
 */

import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import type { InstitutionalCandidateView } from "@/lib/opportunity-engine/institutional-presentation";
import {
  formatOptionalTimestamp,
  hasValidationActivity,
} from "@/lib/dashboard/display-value";
import {
  RECOMMENDATION_LIFECYCLE_STATUS_LABELS,
  formatInstitutionalConviction,
  presentCandidateRecommendationMeta,
} from "@/src/core/recommendations";

export type MetricTone = "excellent" | "healthy" | "caution" | "critical" | "neutral";
export type MetricTrend = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export interface MetricTooltipMeta {
  description: string;
  calculation: string;
  meaning: string;
  healthyRange: string;
  lastUpdated: string;
}

export interface InstitutionalMetricView {
  id: string;
  label: string;
  rawValue: number | null;
  displayValue: string;
  tone: MetricTone;
  toneClass: string;
  trend: MetricTrend;
  trendLabel: string;
  lastUpdated: string;
  confidence: string;
  tooltip: MetricTooltipMeta;
}

export interface InstitutionalTrustPanelView {
  overallTrustScore: InstitutionalMetricView;
  confidenceLevel: string;
  trustTrend: MetricTrend;
  trustTrendLabel: string;
  trustGrade: string;
  trustFactors: Array<{ label: string; value: string }>;
  positiveDrivers: string[];
  negativeDrivers: string[];
  historicalTrust: string;
  distribution: Array<{ label: string; count: number }>;
  empty: boolean;
  emptyMessage: string;
}

export interface InstitutionalExplainabilityPanelView {
  decisionTrace: string[];
  ruleExecutionOrder: string[];
  ruleContribution: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  confidenceBreakdown: Array<{ label: string; value: string }>;
  decisionTimeline: string[];
  failureReasons: string[];
  skippedRules: string[];
  dependencyGraph: string[];
  healthScore: string;
  lastRunAt: string;
  empty: boolean;
  emptyMessage: string;
}

export interface InstitutionalRecommendationPanelView {
  recommendation: string;
  strategy: string;
  expectedHoldingPeriod: string;
  statusLabel: string;
  convictionDrivers: string[];
  whyThisStock: string[];
  whyNotOthers: string[];
  supportingSignals: string[];
  riskFactors: string[];
  expectedCatalyst: string;
  sectorContribution: string;
  historicalSimilarity: string;
  institutionalConviction: string;
  conviction: string;
  trust: string;
  validation: string;
  /** @deprecated Use institutionalConviction — kept for transitional consumers. */
  qualityScore: string;
  empty: boolean;
  emptyMessage: string;
}

export interface PlatformInstitutionalBadge {
  id: string;
  label: string;
}

export interface InstitutionalValidationDetailsView {
  overallSummary: string[];
  ruleExecution: string[];
  historicalValidation: string[];
  pipelineValidation: string[];
  confidenceAnalysis: string[];
  trustAnalysis: string[];
  executionTimeline: string[];
  warnings: string[];
  errors: string[];
  recommendation: string[];
}

const TONE_CLASS: Record<MetricTone, string> = {
  excellent: "text-gain",
  healthy: "text-accent",
  caution: "text-amber-600",
  critical: "text-loss",
  neutral: "text-text-muted",
};

const PLACEHOLDER_VALUES = new Set([
  "N/A",
  "Not Available",
  "Pending Validation",
  "Waiting For Next Scan",
  "Collecting...",
  "Unavailable",
]);

export function isPlaceholderDisplay(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value);
}

/** Institutional scores never render bare 0 / NaN — presentation only. */
function institutionalScoreDisplay(
  value: number | null | undefined,
  options?: {
    hasActivity?: boolean;
    suffix?: string;
    collectingLabel?: string;
    unavailableLabel?: string;
    naLabel?: string;
  }
): string {
  const hasActivity = options?.hasActivity === true;
  const collectingLabel = options?.collectingLabel ?? "Pending Validation";
  const unavailableLabel = options?.unavailableLabel ?? "Not Available";
  const naLabel = options?.naLabel ?? "N/A";

  if (value == null || !Number.isFinite(value)) {
    return hasActivity ? unavailableLabel : collectingLabel;
  }

  if (value === 0) {
    return hasActivity ? naLabel : collectingLabel;
  }

  return `${Math.round(value)}${options?.suffix ?? ""}`;
}

export function scoreTone(value: number | null | undefined): MetricTone {
  if (value == null || !Number.isFinite(value)) return "neutral";
  if (value >= 85) return "excellent";
  if (value >= 70) return "healthy";
  if (value >= 50) return "caution";
  return "critical";
}

export function toneClassFor(tone: MetricTone): string {
  return TONE_CLASS[tone];
}

export function trendFromDelta(delta: number | null | undefined): MetricTrend {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return "FLAT";
  if (delta > 0) return "UP";
  return "DOWN";
}

export function trendLabel(trend: MetricTrend): string {
  switch (trend) {
    case "UP":
      return "Improving";
    case "DOWN":
      return "Deteriorating";
    case "FLAT":
      return "Stable";
    default:
      return "Not Available";
  }
}

function trustGrade(score: number | null, hasActivity: boolean): string {
  if (!hasActivity || score == null || !Number.isFinite(score)) {
    return "Pending Validation";
  }
  if (score >= 85) return "A — High Trust";
  if (score >= 70) return "B — Institutional";
  if (score >= 55) return "C — Review Required";
  return "D — Low Trust";
}

function confidenceDisplay(
  coverage: number | null | undefined,
  hasActivity: boolean
): string {
  return institutionalScoreDisplay(coverage, {
    hasActivity,
    suffix: "%",
    collectingLabel: "Pending Validation",
    unavailableLabel: "Not Available",
    naLabel: "N/A",
  });
}

function lastUpdatedFrom(snapshot: InstitutionalPlatformSnapshot): string {
  return formatOptionalTimestamp(
    snapshot.explainability?.lastRunAt ??
      snapshot.dashboard?.summary.generatedAt ??
      null,
    "Not Available"
  );
}

function buildTooltip(
  meta: Omit<MetricTooltipMeta, "lastUpdated">,
  lastUpdated: string
): MetricTooltipMeta {
  return { ...meta, lastUpdated };
}

function metricView(input: {
  id: string;
  label: string;
  value: number | null | undefined;
  hasActivity: boolean;
  trend: MetricTrend;
  confidence: string;
  lastUpdated: string;
  tooltip: Omit<MetricTooltipMeta, "lastUpdated">;
  emptyLabel?: string;
}): InstitutionalMetricView {
  const raw =
    input.value != null && Number.isFinite(input.value) ? input.value : null;
  const displayValue = institutionalScoreDisplay(raw, {
    hasActivity: input.hasActivity,
    collectingLabel: input.emptyLabel ?? "Pending Validation",
    unavailableLabel: "Not Available",
    naLabel: "N/A",
  });
  const tone =
    isPlaceholderDisplay(displayValue) ? "neutral" : scoreTone(raw);

  return {
    id: input.id,
    label: input.label,
    rawValue: raw,
    displayValue,
    tone,
    toneClass: toneClassFor(tone),
    trend: input.trend,
    trendLabel: trendLabel(input.trend),
    lastUpdated: input.lastUpdated,
    confidence: input.confidence,
    tooltip: buildTooltip(input.tooltip, input.lastUpdated),
  };
}

/** Validation card metrics — value, color, trend, last updated, confidence. */
export function buildValidationMetricViews(
  snapshot: InstitutionalPlatformSnapshot | null
): InstitutionalMetricView[] {
  if (!snapshot) return [];

  const hasActivity = hasValidationActivity({
    totalValidations: snapshot.dashboard?.summary.totalValidations,
    totalCalculations: snapshot.trust?.totalCalculations,
    decisionTraces: snapshot.explainability?.decisionTraces,
    generatedExplanations: snapshot.explainability?.generatedExplanations,
  });

  const updated = lastUpdatedFrom(snapshot);
  const confidence = confidenceDisplay(
    snapshot.explainability?.confidenceCoverage,
    hasActivity
  );
  const deteriorating = snapshot.dashboard?.health.deteriorating === true;
  const trustTrend = trendFromDelta(snapshot.trust?.averageTrend);
  const overallTrend: MetricTrend = deteriorating
    ? "DOWN"
    : trustTrend === "UP"
      ? "UP"
      : trustTrend === "DOWN"
        ? "DOWN"
        : "FLAT";

  return [
    metricView({
      id: "overall",
      label: "Overall Validation",
      value:
        snapshot.dashboard?.health.overallHealthScore ??
        snapshot.platform?.overallHealthScore,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description:
          "Composite institutional validation health across Sprint 9E/9F engines.",
        calculation:
          "Weighted from rule, pipeline, integrity, trust, confidence, historical, and execution scores exposed by the Validation Dashboard.",
        meaning: "Higher scores indicate healthier institutional readiness.",
        healthyRange: "70–100",
      },
    }),
    metricView({
      id: "historical",
      label: "Historical Validation",
      value: snapshot.dashboard?.summary.historicalPerformanceScore,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Historical validation performance from the dashboard summary.",
        calculation: "Dashboard summary historicalPerformanceScore (existing engine output).",
        meaning: "Consistency of past validation outcomes.",
        healthyRange: "70–100",
      },
    }),
    metricView({
      id: "confidence",
      label: "Confidence Validation",
      value: snapshot.explainability?.confidenceCoverage,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Explainability confidence coverage across decision traces.",
        calculation: "Explainability Engine confidenceCoverage metric.",
        meaning: "Share of decisions with attributable confidence.",
        healthyRange: "65–100%",
      },
    }),
    metricView({
      id: "rule",
      label: "Rule Validation",
      value: snapshot.dashboard?.health.ruleEngineHealth,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Rule engine health from the Validation Dashboard.",
        calculation: "dashboard.health.ruleEngineHealth",
        meaning: "Health of institutional rule execution.",
        healthyRange: "70–100",
      },
    }),
    metricView({
      id: "integrity",
      label: "Data Integrity",
      value: snapshot.dashboard?.summary.averageIntegrityScore,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Average data integrity score across validated objects.",
        calculation: "dashboard.summary.averageIntegrityScore",
        meaning: "Integrity of inputs feeding institutional decisions.",
        healthyRange: "75–100",
      },
    }),
    metricView({
      id: "pipeline",
      label: "Pipeline Health",
      value: snapshot.dashboard?.health.validationEngineHealth,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Validation pipeline / engine health.",
        calculation: "dashboard.health.validationEngineHealth",
        meaning: "Operational health of the validation pipeline.",
        healthyRange: "70–100",
      },
    }),
    metricView({
      id: "trust",
      label: "Trust Health",
      value:
        snapshot.trust?.averageTrustScore ??
        snapshot.dashboard?.health.trustEngineHealth ??
        snapshot.platform?.overallTrustScore,
      hasActivity,
      trend: trustTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Trust Engine average trust health.",
        calculation:
          "Prefer trust.averageTrustScore, else dashboard trustEngineHealth / platform overallTrustScore.",
        meaning: "Institutional trust in validated outputs.",
        healthyRange: "75–100",
      },
    }),
    metricView({
      id: "execution",
      label: "Execution Quality",
      value:
        snapshot.dashboard?.summary.recommendationQuality ??
        snapshot.platform?.overallPerformance,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Recommendation / execution quality from existing engines.",
        calculation:
          "dashboard.summary.recommendationQuality or platform.overallPerformance",
        meaning: "Quality of recommendation execution readiness.",
        healthyRange: "70–100",
      },
    }),
    metricView({
      id: "readiness",
      label: "Production Readiness",
      value: snapshot.platform?.overallReadiness,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Platform production readiness score.",
        calculation: "platform.overallReadiness",
        meaning: "Readiness for institutional production exposure.",
        healthyRange: "75–100",
      },
    }),
    metricView({
      id: "platform",
      label: "Platform Health",
      value: snapshot.platform?.overallHealthScore,
      hasActivity,
      trend: overallTrend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Overall Sprint 9F platform health.",
        calculation: "platform.overallHealthScore",
        meaning: "Aggregate platform operational health.",
        healthyRange: "70–100",
      },
    }),
  ];
}

export function buildValidationDetailsView(
  snapshot: InstitutionalPlatformSnapshot | null
): InstitutionalValidationDetailsView {
  if (!snapshot) {
    return {
      overallSummary: ["Pending Validation"],
      ruleExecution: ["Waiting For Next Scan"],
      historicalValidation: ["Not Available"],
      pipelineValidation: ["Not Available"],
      confidenceAnalysis: ["Not Available"],
      trustAnalysis: ["Not Available"],
      executionTimeline: ["Waiting For Next Scan"],
      warnings: [],
      errors: [],
      recommendation: ["Waiting For Next Scan"],
    };
  }

  const metrics = buildValidationMetricViews(snapshot);
  const s = snapshot.dashboard?.summary;
  const h = snapshot.dashboard?.health;
  const t = snapshot.trust;
  const e = snapshot.explainability;

  const warnings: string[] = [];
  const errors: string[] = [];
  if (h?.deteriorating) warnings.push("Dashboard health marked deteriorating.");
  if ((s?.warningCount ?? 0) > 0) {
    warnings.push(`${s!.warningCount} validation warning(s) recorded.`);
  }
  if ((s?.criticalCount ?? 0) > 0) {
    errors.push(`${s!.criticalCount} critical validation issue(s) recorded.`);
  }
  if ((s?.failedValidations ?? 0) > 0) {
    errors.push(`${s!.failedValidations} failed validation(s).`);
  }
  if ((t?.rejectedObjects ?? 0) > 0) {
    warnings.push(`${t!.rejectedObjects} trust-rejected object(s).`);
  }

  return {
    overallSummary: metrics.slice(0, 5).map(
      (m) => `${m.label}: ${m.displayValue} · ${m.trendLabel}`
    ),
    ruleExecution: [
      `Rule Engine Health: ${institutionalScoreDisplay(h?.ruleEngineHealth, { hasActivity: true, unavailableLabel: "Not Available", collectingLabel: "Pending Validation" })}`,
      `Explainability Rule Coverage: ${institutionalScoreDisplay(e?.ruleCoverage, { hasActivity: (e?.decisionTraces ?? 0) > 0, unavailableLabel: "Not Available", collectingLabel: "Pending Validation" })}`,
      `Total Validations: ${s?.totalValidations ?? "N/A"}`,
      `Passed: ${s?.passedValidations ?? "N/A"} · Failed: ${s?.failedValidations ?? "N/A"}`,
    ],
    historicalValidation: [
      `Historical Performance: ${institutionalScoreDisplay(s?.historicalPerformanceScore, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Historical Engine Health: ${institutionalScoreDisplay(h?.historicalEngineHealth, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
    ],
    pipelineValidation: [
      `Validation Engine Health: ${institutionalScoreDisplay(h?.validationEngineHealth, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Platform Status: ${snapshot.platform?.overallValidationStatus ?? "Not Available"}`,
      `Engines Healthy: ${snapshot.platform?.healthyCount ?? "N/A"} / ${snapshot.platform?.engineCount ?? "N/A"}`,
    ],
    confidenceAnalysis: [
      `Confidence Coverage: ${institutionalScoreDisplay(e?.confidenceCoverage, { hasActivity: (e?.decisionTraces ?? 0) > 0, suffix: "%", collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Decision Traces: ${e?.decisionTraces ?? "N/A"}`,
      `Generated Explanations: ${e?.generatedExplanations ?? "N/A"}`,
    ],
    trustAnalysis: [
      `Average Trust: ${institutionalScoreDisplay(t?.averageTrustScore, { hasActivity: (t?.totalCalculations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Trust Trend Delta: ${t?.averageTrend ?? "N/A"}`,
      `Trust Calculations: ${t?.totalCalculations ?? "N/A"}`,
    ],
    executionTimeline: [
      `Last Updated: ${lastUpdatedFrom(snapshot)}`,
      `Dashboard Generated: ${formatOptionalTimestamp(s?.generatedAt, "Not Available")}`,
      `Explainability Last Run: ${formatOptionalTimestamp(e?.lastRunAt, "Not Available")}`,
      `Recommendation Health: ${institutionalScoreDisplay(h?.recommendationHealth, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
    ],
    warnings,
    errors,
    recommendation: [
      `Recommendation Quality: ${institutionalScoreDisplay(s?.recommendationQuality, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Trade Setup Quality: ${institutionalScoreDisplay(s?.tradeSetupQuality, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
      `Execution / Performance: ${institutionalScoreDisplay(snapshot.platform?.overallPerformance, { hasActivity: (s?.totalValidations ?? 0) > 0, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
    ],
  };
}

export function buildTrustPanelView(
  snapshot: InstitutionalPlatformSnapshot | null
): InstitutionalTrustPanelView {
  const emptyMessage = "Waiting For Next Scan";
  if (!snapshot) {
    return {
      overallTrustScore: metricView({
        id: "trust-overall",
        label: "Overall Trust Score",
        value: null,
        hasActivity: false,
        trend: "UNKNOWN",
        confidence: "Not Available",
        lastUpdated: "Not Available",
        tooltip: {
          description: "Trust Engine average trust score.",
          calculation: "trust.averageTrustScore",
          meaning: "Institutional trust in outputs.",
          healthyRange: "75–100",
        },
      }),
      confidenceLevel: "Not Available",
      trustTrend: "UNKNOWN",
      trustTrendLabel: "Not Available",
      trustGrade: "Pending Validation",
      trustFactors: [],
      positiveDrivers: [],
      negativeDrivers: [],
      historicalTrust: "Not Available",
      distribution: [],
      empty: true,
      emptyMessage,
    };
  }

  const hasActivity = (snapshot.trust?.totalCalculations ?? 0) > 0;
  const trustScore =
    snapshot.trust?.averageTrustScore ??
    snapshot.dashboard?.summary.averageTrustScore ??
    snapshot.platform?.overallTrustScore ??
    null;
  const trend = trendFromDelta(snapshot.trust?.averageTrend);
  const updated = lastUpdatedFrom(snapshot);
  const confidence = confidenceDisplay(
    snapshot.explainability?.confidenceCoverage,
    hasActivity || hasValidationActivity({
      totalValidations: snapshot.dashboard?.summary.totalValidations,
      totalCalculations: snapshot.trust?.totalCalculations,
    })
  );

  const distribution = Object.entries(snapshot.trust?.trustDistribution ?? {}).map(
    ([label, count]) => ({ label, count })
  );

  const positiveDrivers: string[] = [];
  const negativeDrivers: string[] = [];
  for (const row of distribution) {
    if (/HIGH|PASS|STRONG/i.test(row.label)) {
      positiveDrivers.push(`${row.label} (${row.count})`);
    } else if (/LOW|REJECT|FAIL|WEAK/i.test(row.label)) {
      negativeDrivers.push(`${row.label} (${row.count})`);
    } else {
      positiveDrivers.push(`${row.label} (${row.count})`);
    }
  }

  if ((snapshot.trust?.rejectedObjects ?? 0) > 0) {
    negativeDrivers.push(`Rejected objects: ${snapshot.trust!.rejectedObjects}`);
  }

  return {
    overallTrustScore: metricView({
      id: "trust-overall",
      label: "Overall Trust Score",
      value: trustScore,
      hasActivity,
      trend,
      confidence,
      lastUpdated: updated,
      tooltip: {
        description: "Average institutional trust score from the Trust Engine.",
        calculation: "trust.averageTrustScore (fallback to dashboard/platform trust).",
        meaning: "Higher trust indicates stronger institutional confidence.",
        healthyRange: "75–100",
      },
    }),
    confidenceLevel: confidence,
    trustTrend: trend,
    trustTrendLabel: trendLabel(trend),
    trustGrade: trustGrade(trustScore, hasActivity),
    trustFactors: [
      {
        label: "Highest Trust",
        value: institutionalScoreDisplay(snapshot.trust?.highestTrustScore, {
          hasActivity,
          collectingLabel: "Pending Validation",
          unavailableLabel: "Not Available",
        }),
      },
      {
        label: "Lowest Trust",
        value: institutionalScoreDisplay(snapshot.trust?.lowestTrustScore, {
          hasActivity,
          collectingLabel: "Pending Validation",
          unavailableLabel: "Not Available",
        }),
      },
      {
        label: "Calculations",
        value:
          (snapshot.trust?.totalCalculations ?? 0) > 0
            ? String(snapshot.trust!.totalCalculations)
            : "N/A",
      },
      {
        label: "Avg Runtime",
        value:
          hasActivity && snapshot.trust
            ? `${Math.round(snapshot.trust.averageValidationRuntime)} ms`
            : "Not Available",
      },
    ],
    positiveDrivers:
      positiveDrivers.length > 0 ? positiveDrivers : ["Not Available"],
    negativeDrivers:
      negativeDrivers.length > 0 ? negativeDrivers : ["N/A"],
    historicalTrust: institutionalScoreDisplay(
      snapshot.dashboard?.summary.historicalPerformanceScore,
      {
        hasActivity: (snapshot.dashboard?.summary.totalValidations ?? 0) > 0,
        collectingLabel: "Pending Validation",
        unavailableLabel: "Not Available",
      }
    ),
    distribution,
    empty: !hasActivity,
    emptyMessage,
  };
}

export function buildExplainabilityPanelView(
  snapshot: InstitutionalPlatformSnapshot | null,
  candidate: InstitutionalCandidateView | null = null
): InstitutionalExplainabilityPanelView {
  const emptyMessage = "Waiting For Next Scan";
  const e = snapshot?.explainability;
  const hasActivity =
    (e?.decisionTraces ?? 0) > 0 || (e?.generatedExplanations ?? 0) > 0;

  if (!snapshot || (!hasActivity && !candidate)) {
    return {
      decisionTrace: [],
      ruleExecutionOrder: [],
      ruleContribution: "Not Available",
      positiveDrivers: [],
      negativeDrivers: [],
      confidenceBreakdown: [],
      decisionTimeline: [],
      failureReasons: [],
      skippedRules: [],
      dependencyGraph: [],
      healthScore: "Pending Validation",
      lastRunAt: "Not Available",
      empty: true,
      emptyMessage,
    };
  }

  const decisionTrace =
    candidate?.decisionTrace?.length
      ? candidate.decisionTrace
      : [
          `Decision traces: ${e?.decisionTraces ?? 0}`,
          `Generated explanations: ${e?.generatedExplanations ?? 0}`,
          `Explainability health: ${institutionalScoreDisplay(e?.explainabilityHealthScore, { hasActivity, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })}`,
        ];

  const ruleExecutionOrder =
    candidate?.executionPath?.length
      ? candidate.executionPath
      : [
          "Universe scan",
          "Rule evaluation",
          "Confidence attribution",
          "Explainability publish",
        ];

  const positiveDrivers =
    candidate?.topPositiveDrivers?.map(
      (d) => `${d.label} (${d.contribution > 0 ? "+" : ""}${d.contribution})`
    ) ?? ["Not Available"];

  const negativeDrivers =
    candidate?.topNegativeDrivers?.map(
      (d) => `${d.label} (${d.contribution})`
    ) ?? ["N/A"];

  const failureReasons =
    candidate?.negativeFactors?.map((f) => f.label) ??
    ((snapshot.dashboard?.summary.failedValidations ?? 0) > 0
      ? [`${snapshot.dashboard!.summary.failedValidations} failed validation(s)`]
      : ["N/A"]);

  const skippedRules =
    (e?.ruleCoverage ?? 100) < 100
      ? [`Rule coverage incomplete (${institutionalScoreDisplay(e?.ruleCoverage, { hasActivity, collectingLabel: "Pending Validation", unavailableLabel: "Not Available" })})`]
      : ["N/A"];

  const dependencyGraph =
    candidate?.validationTrace?.length
      ? candidate.validationTrace
      : [
          "Validation Engine → Trust Engine",
          "Trust Engine → Explainability Engine",
          "Explainability Engine → Dashboard Exposure",
        ];

  return {
    decisionTrace,
    ruleExecutionOrder,
    ruleContribution: institutionalScoreDisplay(e?.ruleCoverage, {
      hasActivity,
      suffix: "%",
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    }),
    positiveDrivers,
    negativeDrivers,
    confidenceBreakdown: [
      {
        label: "Confidence Coverage",
        value: institutionalScoreDisplay(e?.confidenceCoverage, {
          hasActivity,
          suffix: "%",
          collectingLabel: "Pending Validation",
          unavailableLabel: "Not Available",
        }),
      },
      {
        label: "Rule Coverage",
        value: institutionalScoreDisplay(e?.ruleCoverage, {
          hasActivity,
          suffix: "%",
          collectingLabel: "Pending Validation",
          unavailableLabel: "Not Available",
        }),
      },
      {
        label: "Avg Explanation Time",
        value:
          hasActivity && e
            ? `${Math.round(e.averageExplanationTime)} ms`
            : "Not Available",
      },
      ...(candidate?.confidenceDistribution.slice(0, 4).map((row) => ({
        label: row.label,
        value: `${row.contribution > 0 ? "+" : ""}${row.contribution}`,
      })) ?? []),
    ],
    decisionTimeline:
      candidate?.timeline?.map(
        (ev) =>
          `${ev.label}: ${formatOptionalTimestamp(ev.at, "Not Available")}`
      ) ?? [
        `Last run: ${formatOptionalTimestamp(e?.lastRunAt, "Not Available")}`,
      ],
    failureReasons,
    skippedRules,
    dependencyGraph,
    healthScore: institutionalScoreDisplay(e?.explainabilityHealthScore, {
      hasActivity,
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    }),
    lastRunAt: formatOptionalTimestamp(e?.lastRunAt, "Not Available"),
    empty: false,
    emptyMessage,
  };
}

export function buildRecommendationPanelView(
  snapshot: InstitutionalPlatformSnapshot | null,
  candidate: InstitutionalCandidateView | null = null
): InstitutionalRecommendationPanelView {
  const emptyMessage = "Waiting For Next Scan";
  const quality =
    candidate?.recommendationQuality ??
    snapshot?.dashboard?.summary.recommendationQuality ??
    null;
  const trustScore =
    candidate?.trustScore ??
    snapshot?.trust?.averageTrustScore ??
    snapshot?.dashboard?.summary.averageTrustScore ??
    null;
  const validationScore =
    candidate?.validationScore ??
    snapshot?.dashboard?.summary.averageIntegrityScore ??
    null;
  const hasActivity =
    candidate != null ||
    (snapshot?.dashboard?.summary.totalValidations ?? 0) > 0;
  const emptyMeta = presentCandidateRecommendationMeta({});

  const emptyBase = {
    strategy: emptyMeta.strategy,
    expectedHoldingPeriod: emptyMeta.expectedHoldingPeriod,
    statusLabel: emptyMeta.statusLabel,
    conviction: "Pending Validation",
    trust: "Pending Validation",
    validation: "Pending Validation",
    institutionalConviction: "Pending Validation",
    qualityScore: "Pending Validation",
  };

  if (!snapshot && !candidate) {
    return {
      recommendation: "Pending Validation",
      ...emptyBase,
      convictionDrivers: [],
      whyThisStock: [],
      whyNotOthers: [],
      supportingSignals: [],
      riskFactors: [],
      expectedCatalyst: "Not Available",
      sectorContribution: "Not Available",
      historicalSimilarity: "Not Available",
      empty: true,
      emptyMessage,
    };
  }

  if (!candidate) {
    const qualityDisplay = institutionalScoreDisplay(quality, {
      hasActivity,
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    });
    return {
      recommendation: "Waiting For Next Scan",
      ...emptyBase,
      institutionalConviction: qualityDisplay,
      qualityScore: qualityDisplay,
      convictionDrivers: ["No active institutional candidate selected."],
      whyThisStock: ["No active institutional candidate selected."],
      whyNotOthers: ["N/A"],
      supportingSignals: ["Pending Validation"],
      riskFactors: ["N/A"],
      expectedCatalyst: "Not Available",
      sectorContribution: "Not Available",
      historicalSimilarity: "Not Available",
      empty: true,
      emptyMessage,
    };
  }

  const meta = presentCandidateRecommendationMeta({
    strategy: "Swing",
    status: "ENTRY_PENDING",
  });
  const convictionDrivers =
    candidate.primaryReasons.length > 0
      ? candidate.primaryReasons
      : candidate.supportingFactors.length > 0
        ? candidate.supportingFactors.map((f) => f.label)
        : ["Not Available"];
  const riskFactors =
    candidate.riskFactors.length > 0
      ? candidate.riskFactors.map((f) => `${f.label} (${f.contribution})`)
      : candidate.topNegativeDrivers.length > 0
        ? candidate.topNegativeDrivers.map((f) => f.label)
        : ["N/A"];
  const convictionDisplay = institutionalScoreDisplay(
    candidate.overallScore ?? quality,
    {
      hasActivity: true,
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    }
  );
  const trustDisplay = institutionalScoreDisplay(
    candidate.trustScore ?? trustScore,
    {
      hasActivity: true,
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    }
  );
  const validationDisplay = institutionalScoreDisplay(
    candidate.validationScore ?? validationScore,
    {
      hasActivity: true,
      collectingLabel: "Pending Validation",
      unavailableLabel: "Not Available",
    }
  );
  const institutionalDisplay =
    typeof (candidate.recommendationQuality ?? quality) === "number" &&
    Number.isFinite(candidate.recommendationQuality ?? quality)
      ? formatInstitutionalConviction(
          (candidate.recommendationQuality ?? quality) as number
        )
      : convictionDisplay;

  return {
    recommendation:
      candidate.primaryReasons[0] ??
      `Institutional candidate · ${institutionalDisplay}`,
    strategy: meta.strategy,
    expectedHoldingPeriod: meta.expectedHoldingPeriod,
    statusLabel:
      meta.statusLabel || RECOMMENDATION_LIFECYCLE_STATUS_LABELS.ENTRY_PENDING,
    convictionDrivers,
    whyThisStock: convictionDrivers,
    whyNotOthers:
      candidate.negativeFactors.length > 0
        ? candidate.negativeFactors.map(
            (f) => `${f.label} (${f.contribution})`
          )
        : ["N/A"],
    supportingSignals:
      candidate.supportingFactors.length > 0
        ? candidate.supportingFactors.map(
            (f) => `${f.label} (+${f.contribution})`
          )
        : ["Not Available"],
    riskFactors,
    expectedCatalyst: candidate.expectedCatalyst ?? "Not Available",
    sectorContribution:
      candidate.sectorContribution != null
        ? String(candidate.sectorContribution)
        : "Not Available",
    historicalSimilarity: candidate.historicalSimilarity ?? "Not Available",
    institutionalConviction: institutionalDisplay,
    conviction: convictionDisplay,
    trust: trustDisplay,
    validation: validationDisplay,
    qualityScore: institutionalDisplay,
    empty: false,
    emptyMessage,
  };
}

/** Platform-level institutional badges from existing snapshot thresholds. */
export function buildPlatformInstitutionalBadges(
  snapshot: InstitutionalPlatformSnapshot | null
): PlatformInstitutionalBadge[] {
  if (!snapshot) return [];

  const badges: PlatformInstitutionalBadge[] = [];
  const readiness = snapshot.platform?.overallReadiness ?? null;
  const health =
    snapshot.dashboard?.health.overallHealthScore ??
    snapshot.platform?.overallHealthScore ??
    null;
  const trust =
    snapshot.trust?.averageTrustScore ??
    snapshot.platform?.overallTrustScore ??
    null;
  const explain =
    snapshot.explainability?.explainabilityHealthScore ??
    snapshot.platform?.overallExplainability ??
    null;
  const pipeline = snapshot.dashboard?.health.validationEngineHealth ?? null;
  const hasExplainActivity =
    (snapshot.explainability?.decisionTraces ?? 0) > 0 ||
    (snapshot.explainability?.generatedExplanations ?? 0) > 0;
  const hasTrustActivity = (snapshot.trust?.totalCalculations ?? 0) > 0;
  const hasValidation =
    (snapshot.dashboard?.summary.totalValidations ?? 0) > 0;

  if (readiness != null && readiness >= 75) {
    badges.push({ id: "PRODUCTION_READY", label: "Production Ready" });
  }
  if (
    hasValidation &&
    health != null &&
    health >= 70 &&
    snapshot.platform?.overallValidationStatus !== "critical"
  ) {
    badges.push({ id: "VALIDATION_PASSED", label: "Validation Passed" });
  }
  if (hasTrustActivity && trust != null && trust >= 75) {
    badges.push({ id: "HIGH_TRUST", label: "High Trust" });
  }
  if (hasExplainActivity && (explain == null || explain >= 60)) {
    badges.push({ id: "AI_VERIFIED", label: "AI Verified" });
  }
  if (hasExplainActivity && explain != null && explain >= 70) {
    badges.push({ id: "EXPLAINABLE", label: "Explainable" });
  }
  if (
    readiness != null &&
    readiness >= 70 &&
    trust != null &&
    trust >= 70 &&
    health != null &&
    health >= 70
  ) {
    badges.push({ id: "INSTITUTIONAL_GRADE", label: "Institutional Grade" });
  }
  if (pipeline != null && pipeline >= 70) {
    badges.push({ id: "PIPELINE_HEALTHY", label: "Pipeline Healthy" });
  }

  return badges;
}
