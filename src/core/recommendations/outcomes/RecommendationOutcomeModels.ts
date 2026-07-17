/**
 * Recommendation Outcome models.
 * Evaluation is recommendation-centric and lifecycle-complete — never today's candle alone.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  LivingRecommendation,
  RecommendationLivingState,
} from "../lifecycle/RecommendationLifecycleModels";
import type { RecommendationHealthAssessment } from "../health/RecommendationHealthModels";

export const RECOMMENDATION_OUTCOME_STATES = [
  "Pending Entry",
  "Entry Triggered",
  "Running",
  "Target 1 Hit",
  "Target 2 Hit",
  "Trailing",
  "Stop Loss Hit",
  "Manual Exit",
  "Expired",
  "Cancelled",
  "Archived",
] as const;

export type RecommendationOutcomeState =
  (typeof RECOMMENDATION_OUTCOME_STATES)[number];

export const INSTITUTIONAL_VERDICTS = [
  "Outstanding",
  "Successful",
  "Partially Successful",
  "Neutral",
  "Failed",
  "Invalidated",
] as const;

export type InstitutionalVerdict = (typeof INSTITUTIONAL_VERDICTS)[number];

/** Optional realized path supplied by market/data engines — never invents session OHLC. */
export interface RecommendationPricePathInput {
  readonly currentPrice?: number | null;
  readonly highSinceEntry?: number | null;
  readonly lowSinceEntry?: number | null;
  readonly asOf?: string | Date;
  readonly sessionsActive?: number | null;
}

export interface RecommendationTargetProgress {
  readonly entryTriggered: boolean;
  readonly target1Hit: boolean;
  readonly target2Hit: boolean;
  readonly trailing: boolean;
  readonly stopLossHit: boolean;
  readonly targetProgressPercent: number;
  readonly distanceToTarget1: number | null;
  readonly distanceToTarget2: number | null;
  readonly distanceToStop: number | null;
  readonly nextMilestone: string;
}

export interface RecommendationPerformanceMetrics {
  readonly maximumGainPercent: number | null;
  readonly maximumDrawdownPercent: number | null;
  readonly currentReturnPercent: number | null;
  readonly daysActive: number;
  readonly sessionsActive: number;
  readonly holdingPeriod: string;
  readonly holdingHorizon: string;
  readonly riskRewardAchieved: number | null;
  readonly targetProgressPercent: number;
  readonly distanceToTarget: number | null;
  readonly distanceToStop: number | null;
}

export interface RecommendationOutcomeAttribution {
  readonly succeededBecause: readonly string[];
  readonly failedBecause: readonly string[];
  readonly stillRunningBecause: readonly string[];
  readonly missedTargetBecause: readonly string[];
  readonly stoppedOutBecause: readonly string[];
  readonly expiredBecause: readonly string[];
}

export interface RecommendationOutcomeAssessment {
  readonly recommendationId: string;
  readonly snapshot: RecommendationSnapshot;
  readonly state: RecommendationOutcomeState;
  readonly lifecycleState: RecommendationLivingState | null;
  readonly verdict: InstitutionalVerdict;
  readonly performance: RecommendationPerformanceMetrics;
  readonly targets: RecommendationTargetProgress;
  readonly attribution: RecommendationOutcomeAttribution;
  readonly exitReason: string | null;
  readonly targetAchieved: string | null;
  readonly lifecycleBadge: string;
  readonly expectedHoldingPeriod: string;
  readonly strategy: string;
  readonly recommendationDate: string;
  readonly currentHealth: number | null;
  readonly originalConviction: number;
  readonly evaluatedAt: string;
}

export interface RecommendationOutcomeSummary {
  readonly total: number;
  readonly completed: number;
  readonly running: number;
  readonly hitRate: number;
  readonly target1Rate: number;
  readonly target2Rate: number;
  readonly stopLossRate: number;
  readonly averageReturn: number | null;
  readonly averageHoldingPeriodDays: number | null;
  readonly averageDrawdown: number | null;
  readonly averageMaximumGain: number | null;
  readonly recommendationSuccessRate: number;
}

export interface EvaluateRecommendationOutcomeInput {
  readonly snapshot: RecommendationSnapshot;
  readonly lifecycle?: LivingRecommendation | null;
  readonly health?: RecommendationHealthAssessment | null;
  readonly path?: RecommendationPricePathInput;
  readonly evaluatedAt?: string | Date;
}

export function normalizeOutcomeTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Outcome timestamp is invalid");
  }
  return date.toISOString();
}

export function roundMetric(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function holdingDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.max(0, Math.floor((to - from) / (24 * 60 * 60 * 1000)));
}
