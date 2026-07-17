/**
 * Builds health factor views from engine-supplied scores.
 * Does not recalculate trend/momentum/fundamentals — only compares and labels.
 */

import type {
  RecommendationHealthFactor,
  RecommendationHealthFactorInput,
  RecommendationHealthFactorKey,
  RecommendationHealthTrend,
  RecommendationOriginalValues,
} from "./RecommendationHealthModels";
import {
  RECOMMENDATION_HEALTH_FACTORS,
  clampScore,
  roundScore,
} from "./RecommendationHealthModels";

const FACTOR_INPUT_KEY: Record<
  RecommendationHealthFactorKey,
  keyof RecommendationHealthFactorInput
> = {
  Trend: "trend",
  Momentum: "momentum",
  Volume: "volume",
  "Relative Strength": "relativeStrength",
  "Sector Leadership": "sectorLeadership",
  "Fundamental Strength": "fundamentalStrength",
  Valuation: "valuation",
  "Institutional Activity": "institutionalActivity",
  "Market Regime": "marketRegime",
  Volatility: "volatility",
  Risk: "risk",
};

const FACTOR_WEIGHT: Record<RecommendationHealthFactorKey, number> = {
  Trend: 1.1,
  Momentum: 1.2,
  Volume: 0.8,
  "Relative Strength": 1.1,
  "Sector Leadership": 1.0,
  "Fundamental Strength": 1.0,
  Valuation: 0.8,
  "Institutional Activity": 0.9,
  "Market Regime": 1.0,
  Volatility: 0.7,
  Risk: 1.0,
};

function directionForDelta(delta: number | null): RecommendationHealthTrend | "Unknown" {
  if (delta == null || !Number.isFinite(delta)) return "Unknown";
  if (delta >= 2) return "Improving";
  if (delta <= -2) return "Weakening";
  return "Stable";
}

function baselineForFactor(
  key: RecommendationHealthFactorKey,
  original: RecommendationOriginalValues
): number | null {
  // Seed baselines from immutable originals — never invent new conviction math.
  switch (key) {
    case "Trend":
    case "Momentum":
    case "Relative Strength":
    case "Sector Leadership":
      return original.originalConviction;
    case "Fundamental Strength":
    case "Valuation":
      return original.originalValidation ?? original.originalConviction;
    case "Institutional Activity":
    case "Market Regime":
      return original.originalTrust;
    case "Volume":
    case "Volatility":
      return original.originalTrust;
    case "Risk":
      return clampScore(100 - Math.min(100, original.originalConviction * 0.2));
    default:
      return original.originalConviction;
  }
}

export function buildHealthFactors(
  original: RecommendationOriginalValues,
  input: RecommendationHealthFactorInput = {}
): RecommendationHealthFactor[] {
  return RECOMMENDATION_HEALTH_FACTORS.map((key) => {
    const inputKey = FACTOR_INPUT_KEY[key];
    const raw = input[inputKey];
    const currentScore =
      typeof raw === "number" && Number.isFinite(raw) ? clampScore(raw) : null;
    const originalScore = baselineForFactor(key, original);
    const delta =
      currentScore == null || originalScore == null
        ? null
        : roundScore(currentScore - originalScore);
    return Object.freeze({
      key,
      label: key,
      originalScore,
      currentScore,
      delta,
      direction: directionForDelta(delta),
      note: input.notes?.[key],
    });
  });
}

/**
 * Aggregate current health from supplied factor scores.
 * Falls back toward original conviction when factors are sparse — never regenerates conviction.
 */
export function aggregateCurrentHealth(
  originalConviction: number,
  factors: readonly RecommendationHealthFactor[]
): number {
  const scored = factors.filter(
    (factor) => factor.currentScore != null && Number.isFinite(factor.currentScore)
  );
  if (scored.length === 0) {
    return clampScore(originalConviction);
  }

  let weighted = 0;
  let weightSum = 0;
  for (const factor of scored) {
    const weight = FACTOR_WEIGHT[factor.key] ?? 1;
    weighted += (factor.currentScore as number) * weight;
    weightSum += weight;
  }
  const factorHealth = weighted / weightSum;

  // Blend: 35% frozen original + 65% live factors → health evolves, conviction stays frozen.
  return roundScore(clampScore(originalConviction * 0.35 + factorHealth * 0.65));
}

export function collectTechnicalHealth(
  factors: readonly RecommendationHealthFactor[]
): number | null {
  return averageFactorScores(factors, [
    "Trend",
    "Momentum",
    "Volume",
    "Relative Strength",
  ]);
}

export function collectFundamentalHealth(
  factors: readonly RecommendationHealthFactor[]
): number | null {
  return averageFactorScores(factors, [
    "Fundamental Strength",
    "Valuation",
  ]);
}

export function collectSectorHealth(
  factors: readonly RecommendationHealthFactor[]
): number | null {
  return averageFactorScores(factors, ["Sector Leadership"]);
}

export function collectMarketHealth(
  factors: readonly RecommendationHealthFactor[]
): number | null {
  return averageFactorScores(factors, [
    "Market Regime",
    "Institutional Activity",
    "Volatility",
  ]);
}

function averageFactorScores(
  factors: readonly RecommendationHealthFactor[],
  keys: RecommendationHealthFactorKey[]
): number | null {
  const set = new Set(keys);
  const scores = factors
    .filter((factor) => set.has(factor.key) && factor.currentScore != null)
    .map((factor) => factor.currentScore as number);
  if (scores.length === 0) return null;
  return roundScore(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export class HealthFactorEngine {
  build = buildHealthFactors;
  aggregate = aggregateCurrentHealth;
  technical = collectTechnicalHealth;
  fundamental = collectFundamentalHealth;
  sector = collectSectorHealth;
  market = collectMarketHealth;
}
