/**
 * Recommendation Replay models.
 * Historical recommendations are never rewritten — replay only composes R1–R3 reads.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  LivingRecommendation,
  RecommendationLivingState,
  RecommendationTimelineEvent,
} from "../lifecycle/RecommendationLifecycleModels";
import type {
  RecommendationHealthAssessment,
  RecommendationHealthExplanation,
  RecommendationHealthFactor,
  RecommendationHealthTrend,
} from "../health/RecommendationHealthModels";

export const RECOMMENDATION_OUTCOMES = [
  "Successful",
  "Partially Successful",
  "Failed",
  "Invalidated",
  "Expired",
  "Manual Exit",
  "Stop Loss Hit",
  "Target 1 Hit",
  "Target 2 Hit",
] as const;

export type RecommendationOutcome = (typeof RECOMMENDATION_OUTCOMES)[number];

export const RECOMMENDATION_VERDICTS = [
  "Validated",
  "Partially Validated",
  "Invalidated",
  "Inconclusive",
  "Pending",
] as const;

export type RecommendationVerdict = (typeof RECOMMENDATION_VERDICTS)[number];

/** Immutable decision journal captured at generation time from the R1 snapshot. */
export interface RecommendationDecisionJournal {
  readonly recommendationId: string;
  readonly recommendationCreatedAt: string;
  readonly originalConviction: number;
  readonly originalTrust: number;
  readonly originalValidation: number | null;
  readonly originalEntryLow: number;
  readonly originalEntryHigh: number;
  readonly originalStop: number;
  readonly originalTargets: readonly number[];
  readonly originalReasons: readonly string[];
  readonly originalIndicators: Readonly<Record<string, unknown>>;
  readonly originalMarketState: Readonly<Record<string, unknown>>;
  readonly originalSectorState: Readonly<Record<string, unknown>>;
  readonly originalTechnicalState: Readonly<Record<string, unknown>>;
  readonly originalFundamentalState: Readonly<Record<string, unknown>>;
  readonly aiVersion: string;
  readonly modelVersion: string;
  readonly timestamp: string;
  readonly generatedByEngine: string;
  readonly strategy: string;
  readonly companySymbol: string;
  readonly companyName: string;
}

export interface RecommendationAccountabilityView {
  readonly whatAiSaw: readonly string[];
  readonly whyAiRecommended: readonly string[];
  readonly whatChanged: readonly string[];
  readonly whatStayedValid: readonly string[];
  readonly whyHealthImproved: readonly string[];
  readonly whyHealthDeclined: readonly string[];
  readonly finalOutcome: RecommendationOutcome | "Pending";
}

export interface RecommendationComparisonView {
  readonly originalConviction: number;
  readonly currentHealth: number | null;
  readonly originalReasons: readonly string[];
  readonly currentFactors: readonly string[];
  readonly originalTrend: string;
  readonly currentTrend: RecommendationHealthTrend | "Unknown";
  readonly originalRisk: readonly string[];
  readonly currentRisk: number | null;
  readonly originalEntryLow: number;
  readonly originalEntryHigh: number;
  readonly originalStop: number;
  readonly originalTargets: readonly number[];
}

export interface RecommendationExecutiveReview {
  readonly recommendationSummary: string;
  readonly decisionSummary: string;
  readonly confidenceEvolution: string;
  readonly majorTurningPoints: readonly string[];
  readonly aiLessons: readonly string[];
  readonly recommendationVerdict: RecommendationVerdict;
}

export interface RecommendationAuditRecord {
  readonly recommendationId: string;
  readonly journal: RecommendationDecisionJournal;
  readonly accountability: RecommendationAccountabilityView;
  readonly comparison: RecommendationComparisonView;
  readonly executiveReview: RecommendationExecutiveReview;
  readonly outcome: RecommendationOutcome | "Pending";
  readonly auditedAt: string;
  readonly snapshotFrozen: true;
}

export interface RecommendationReplayBundle {
  readonly recommendationId: string;
  readonly snapshot: RecommendationSnapshot;
  readonly journal: RecommendationDecisionJournal;
  readonly timeline: readonly RecommendationTimelineEvent[];
  readonly indicators: Readonly<Record<string, unknown>>;
  readonly reasons: readonly string[];
  readonly decision: RecommendationAccountabilityView;
  readonly healthEvolution: RecommendationHealthAssessment | null;
  readonly lifecycle: LivingRecommendation | null;
  readonly lifecycleState: RecommendationLivingState | null;
  readonly healthFactors: readonly RecommendationHealthFactor[];
  readonly healthExplanation: RecommendationHealthExplanation | null;
  readonly comparison: RecommendationComparisonView;
  readonly audit: RecommendationAuditRecord;
  readonly lessons: readonly string[];
  readonly outcome: RecommendationOutcome | "Pending";
  readonly replayedAt: string;
}

export interface CurrentMarketReplayInput {
  readonly price?: number | null;
  readonly trendLabel?: string | null;
  readonly asOf?: string | Date;
}

export function extractValidationScore(
  snapshot: RecommendationSnapshot
): number | null {
  const validation = snapshot.originalValidation;
  if (
    validation &&
    typeof validation === "object" &&
    "overallValidationScore" in validation &&
    typeof (validation as { overallValidationScore?: unknown })
      .overallValidationScore === "number"
  ) {
    return (validation as { overallValidationScore: number })
      .overallValidationScore;
  }
  return null;
}

export function normalizeReplayTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Replay timestamp is invalid");
  }
  return date.toISOString();
}

export function freezeRecord<T extends Record<string, unknown>>(
  value: T
): Readonly<T> {
  return Object.freeze({ ...value });
}
