/**
 * Recommendation Health models.
 * Original R1 snapshot values stay frozen — only current health overlays evolve.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";

/** Factor keys supplied by existing engines (scores are inputs, never recomputed here). */
export const RECOMMENDATION_HEALTH_FACTORS = [
  "Trend",
  "Momentum",
  "Volume",
  "Relative Strength",
  "Sector Leadership",
  "Fundamental Strength",
  "Valuation",
  "Institutional Activity",
  "Market Regime",
  "Volatility",
  "Risk",
] as const;

export type RecommendationHealthFactorKey =
  (typeof RECOMMENDATION_HEALTH_FACTORS)[number];

export const RECOMMENDATION_HEALTH_STATES = [
  "Very Strong",
  "Strong",
  "Healthy",
  "Neutral",
  "Weak",
  "Critical",
  "Invalidated",
] as const;

export type RecommendationHealthState =
  (typeof RECOMMENDATION_HEALTH_STATES)[number];

export const RECOMMENDATION_HEALTH_TRENDS = [
  "Improving",
  "Stable",
  "Weakening",
] as const;

export type RecommendationHealthTrend =
  (typeof RECOMMENDATION_HEALTH_TRENDS)[number];

/** Immutable originals extracted once from the R1 snapshot. */
export interface RecommendationOriginalValues {
  readonly originalConviction: number;
  readonly originalTrust: number;
  readonly originalValidation: number | null;
  readonly originalEntryLow: number;
  readonly originalEntryHigh: number;
  readonly originalStop: number;
  readonly originalTargets: readonly number[];
  readonly originalReasons: readonly string[];
}

/** Current values — evolve over time, never overwrite originals. */
export interface RecommendationCurrentValues {
  readonly currentHealth: number;
  readonly currentTrust: number | null;
  readonly currentValidation: number | null;
  readonly currentRisk: number | null;
  readonly currentMomentum: number | null;
  readonly currentTechnicalHealth: number | null;
  readonly currentFundamentalHealth: number | null;
  readonly currentSectorHealth: number | null;
  readonly currentMarketHealth: number | null;
}

export interface RecommendationHealthFactor {
  readonly key: RecommendationHealthFactorKey;
  readonly label: string;
  /** Baseline / original factor contribution (0–100), if known. */
  readonly originalScore: number | null;
  /** Latest factor score from existing engines (0–100). */
  readonly currentScore: number | null;
  /** current − original (positive = improved). */
  readonly delta: number | null;
  readonly direction: RecommendationHealthTrend | "Unknown";
  readonly note?: string;
}

/**
 * Factor scores provided by existing AI / market engines.
 * This module aggregates and explains — it does not recalculate conviction.
 */
export interface RecommendationHealthFactorInput {
  readonly trend?: number | null;
  readonly momentum?: number | null;
  readonly volume?: number | null;
  readonly relativeStrength?: number | null;
  readonly sectorLeadership?: number | null;
  readonly fundamentalStrength?: number | null;
  readonly valuation?: number | null;
  readonly institutionalActivity?: number | null;
  readonly marketRegime?: number | null;
  readonly volatility?: number | null;
  /** Higher = healthier (lower risk). If callers supply raw risk, invert before passing. */
  readonly risk?: number | null;
  readonly currentTrust?: number | null;
  readonly currentValidation?: number | null;
  readonly notes?: Partial<Record<RecommendationHealthFactorKey, string>>;
}

export interface ConvictionDriftResult {
  readonly originalConviction: number;
  readonly currentHealth: number;
  readonly drift: number;
  readonly driftPercent: number;
  readonly trend: RecommendationHealthTrend;
  readonly explanations: readonly string[];
}

export interface RecommendationHealthExplanation {
  readonly healthImprovedBecause: readonly string[];
  readonly healthDeclinedBecause: readonly string[];
  readonly stillValidBecause: readonly string[];
  readonly majorRisks: readonly string[];
  readonly confidenceDrivers: readonly string[];
  readonly confidenceKillers: readonly string[];
}

export interface RecommendationHealthAssessment {
  readonly recommendationId: string;
  readonly snapshot: RecommendationSnapshot;
  readonly original: RecommendationOriginalValues;
  readonly current: RecommendationCurrentValues;
  readonly state: RecommendationHealthState;
  readonly trend: RecommendationHealthTrend;
  readonly drift: ConvictionDriftResult;
  readonly factors: readonly RecommendationHealthFactor[];
  readonly explanation: RecommendationHealthExplanation;
  readonly updatedAt: string;
  readonly invalidated: boolean;
}

export interface CalculateHealthInput {
  readonly snapshot: RecommendationSnapshot;
  readonly factors?: RecommendationHealthFactorInput;
  readonly invalidated?: boolean;
  readonly asOf?: string | Date;
  /** Optional prior health for Stable/Improving hysteresis. */
  readonly previousHealth?: number | null;
}

export function extractOriginalValidationScore(
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

export function extractOriginalValues(
  snapshot: RecommendationSnapshot
): RecommendationOriginalValues {
  return Object.freeze({
    originalConviction: snapshot.originalConviction,
    originalTrust: snapshot.originalTrust,
    originalValidation: extractOriginalValidationScore(snapshot),
    originalEntryLow: snapshot.entryRange.low,
    originalEntryHigh: snapshot.entryRange.high,
    originalStop: snapshot.stopLoss,
    originalTargets: Object.freeze(
      snapshot.targets.map((target) => target.price)
    ),
    originalReasons: Object.freeze([...snapshot.reasons]),
  });
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function roundScore(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeTimestamp(value?: string | Date): string {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Health timestamp is invalid");
  }
  return date.toISOString();
}
