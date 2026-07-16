/**
 * Canonical recommendation presentation standards for EquityOS.
 *
 * Recommendation quality ≠ recommendation performance.
 * Performance metrics never appear on recommendation surfaces.
 */

import {
  RECOMMENDATION_LIFECYCLE_STATUS_LABELS,
  expectedHoldingPeriodForStrategy,
  normalizeRecommendationLifecycleStatus,
  normalizeRecommendationStrategy,
  type RecommendationLifecycleStatus,
} from "./RecommendationMetadata";
import type { RecommendationSnapshot } from "./RecommendationSnapshot";

export const RECOMMENDATION_EMPTY = {
  noRecommendations: "No Recommendations",
  noHistory: "No History",
  noActiveRecommendation: "No Active Recommendation",
  awaitingRecommendation: "Awaiting Recommendation",
} as const;

export type RecommendationEmptyMessage =
  (typeof RECOMMENDATION_EMPTY)[keyof typeof RECOMMENDATION_EMPTY];

/** Section titles — never "Best Calls of the Day". */
export const RECOMMENDATION_SECTION_LABELS = {
  highestConviction: "Highest Conviction Recommendations",
  topAi: "Top AI Recommendations",
} as const;

/** Metric labels — never "Best Call Score". */
export const RECOMMENDATION_METRIC_LABELS = {
  institutionalConviction: "Institutional Conviction",
  conviction: "Conviction",
  trust: "Trust",
  validation: "Validation",
  strategy: "Strategy",
  expectedHoldingPeriod: "Expected Holding",
  status: "Status",
  originalConviction: "Original Conviction",
  currentHealth: "Current Health",
  convictionDrivers: "Conviction Drivers",
  riskFactors: "Risk Factors",
} as const;

/**
 * Fields allowed only on the lifecycle / performance page.
 * Recommendation cards must never surface these.
 */
export const RECOMMENDATION_PERFORMANCE_FIELDS = [
  "return",
  "returns",
  "drawdown",
  "maximumDrawdown",
  "maximumGain",
  "targetHit",
  "success",
  "failure",
  "timeline",
  "replay",
  "pnl",
  "profit",
  "loss",
  "winRate",
  "moveAfterSignalPercent",
  "maximumGainAfterSignal",
  "maximumDrawdownAfterSignal",
] as const;

export type RecommendationPerformanceField =
  (typeof RECOMMENDATION_PERFORMANCE_FIELDS)[number];

export interface RecommendationScoreTriplet {
  conviction: number;
  trust: number;
  validation: number;
}

export interface RecommendationPresentationCard {
  recommendationId: string;
  company: string;
  symbol: string;
  strategy: string;
  expectedHoldingPeriod: string;
  status: RecommendationLifecycleStatus;
  statusLabel: string;
  generatedAt: string;
  generatedByEngine: string;
  aiVersion: string;
  institutionalConviction: number;
  institutionalConvictionDisplay: string;
  conviction: number;
  trust: number;
  validation: number;
  originalConviction: number;
  currentHealth: number | null;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targets: number[];
  riskReward: number;
  convictionDrivers: string[];
  riskFactors: string[];
  portfolioStatus: RecommendationSnapshot["portfolioStatus"];
  watchlistStatus: RecommendationSnapshot["watchlistStatus"];
  empty: boolean;
  emptyMessage: RecommendationEmptyMessage;
}

export interface RecommendationListPresentation {
  title: string;
  recommendations: RecommendationPresentationCard[];
  total: number;
  empty: boolean;
  emptyMessage: RecommendationEmptyMessage;
}

export function formatInstitutionalConviction(
  score: number,
  style: "ratio" | "percent" = "ratio"
): string {
  const rounded = Math.round(score);
  return style === "percent" ? `${rounded}%` : `${rounded} / 100`;
}

export function extractValidationScore(
  validation: RecommendationSnapshot["originalValidation"]
): number {
  if (
    validation &&
    typeof validation === "object" &&
    "overallValidationScore" in validation &&
    typeof validation.overallValidationScore === "number" &&
    Number.isFinite(validation.overallValidationScore)
  ) {
    return validation.overallValidationScore;
  }
  return 0;
}

export function toRecommendationPresentationCard(
  snapshot: RecommendationSnapshot,
  options?: { currentHealth?: number | null }
): RecommendationPresentationCard {
  const validation = extractValidationScore(snapshot.originalValidation);
  const institutionalConviction = snapshot.originalConviction;

  return {
    recommendationId: snapshot.recommendationId,
    company: snapshot.company.name,
    symbol: snapshot.company.symbol,
    strategy: snapshot.strategy,
    expectedHoldingPeriod: snapshot.expectedHoldingPeriod,
    status: snapshot.recommendationStatus,
    statusLabel:
      RECOMMENDATION_LIFECYCLE_STATUS_LABELS[snapshot.recommendationStatus],
    generatedAt: snapshot.generatedAt,
    generatedByEngine: snapshot.generatedByEngine,
    aiVersion: snapshot.aiVersion,
    institutionalConviction,
    institutionalConvictionDisplay: formatInstitutionalConviction(
      institutionalConviction
    ),
    conviction: snapshot.originalConviction,
    trust: snapshot.originalTrust,
    validation,
    originalConviction: snapshot.originalConviction,
    currentHealth:
      options?.currentHealth == null || !Number.isFinite(options.currentHealth)
        ? null
        : options.currentHealth,
    entryLow: snapshot.entryRange.low,
    entryHigh: snapshot.entryRange.high,
    stopLoss: snapshot.stopLoss,
    targets: snapshot.targets.map((target) => target.price),
    riskReward: snapshot.riskReward,
    convictionDrivers: [...snapshot.convictionDrivers],
    riskFactors: [...snapshot.riskFactors],
    portfolioStatus: snapshot.portfolioStatus,
    watchlistStatus: snapshot.watchlistStatus,
    empty: false,
    emptyMessage: RECOMMENDATION_EMPTY.awaitingRecommendation,
  };
}

export function presentRecommendations(
  snapshots: RecommendationSnapshot[],
  options?: {
    emptyMessage?: RecommendationEmptyMessage;
    title?: string;
  }
): RecommendationListPresentation {
  const recommendations = snapshots.map((snapshot) =>
    toRecommendationPresentationCard(snapshot)
  );
  return {
    title:
      options?.title ?? RECOMMENDATION_SECTION_LABELS.highestConviction,
    recommendations,
    total: recommendations.length,
    empty: recommendations.length === 0,
    emptyMessage:
      options?.emptyMessage ?? RECOMMENDATION_EMPTY.noRecommendations,
  };
}

export function emptyRecommendationPresentation(
  message: RecommendationEmptyMessage = RECOMMENDATION_EMPTY.awaitingRecommendation
): RecommendationListPresentation {
  return presentRecommendations([], { emptyMessage: message });
}

export function assertNoPerformanceInRecommendation(
  payload: Record<string, unknown>
): void {
  for (const field of RECOMMENDATION_PERFORMANCE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw new Error(
        `Performance field "${field}" must not appear inside recommendation presentation`
      );
    }
  }
}

export function stripPerformanceFields<T extends Record<string, unknown>>(
  payload: T
): Omit<T, RecommendationPerformanceField> {
  const clone = { ...payload };
  for (const field of RECOMMENDATION_PERFORMANCE_FIELDS) {
    delete clone[field];
  }
  return clone;
}

/** Lifecycle/performance page presentation only — never mixed into recommendation cards. */
export interface RecommendationLifecyclePresentation {
  recommendationId: string;
  returnPct: number | null;
  drawdownPct: number | null;
  targetHit: boolean | null;
  success: boolean | null;
  failure: boolean | null;
  timeline: string[];
  replay: string[];
  empty: boolean;
  emptyMessage: string;
}

export function emptyRecommendationLifecyclePresentation(
  recommendationId = ""
): RecommendationLifecyclePresentation {
  return {
    recommendationId,
    returnPct: null,
    drawdownPct: null,
    targetHit: null,
    success: null,
    failure: null,
    timeline: [],
    replay: [],
    empty: true,
    emptyMessage: "No History",
  };
}

/**
 * Presentation adapter for opportunity/dashboard candidates.
 * Composes existing category + horizon fields — no score recalculation.
 */
export function presentCandidateRecommendationMeta(input: {
  category?: string | null;
  strategy?: string | null;
  timeHorizon?: string | null;
  expectedHoldingPeriod?: string | null;
  status?: string | null;
}): {
  strategy: string;
  expectedHoldingPeriod: string;
  status: RecommendationLifecycleStatus;
  statusLabel: string;
} {
  const strategy = normalizeRecommendationStrategy(
    input.strategy?.trim() || input.category?.trim() || "Swing"
  );
  const expectedHoldingPeriod =
    input.expectedHoldingPeriod?.trim() ||
    input.timeHorizon?.trim() ||
    expectedHoldingPeriodForStrategy(String(strategy));
  const status = normalizeRecommendationLifecycleStatus(input.status);
  return {
    strategy: String(strategy),
    expectedHoldingPeriod,
    status,
    statusLabel: RECOMMENDATION_LIFECYCLE_STATUS_LABELS[status],
  };
}
