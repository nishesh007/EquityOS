/**
 * Conviction Drift — Original Conviction (frozen) → Current Health (evolving).
 * Explains what improved / weakened without regenerating conviction.
 */

import type {
  ConvictionDriftResult,
  RecommendationHealthFactor,
  RecommendationHealthTrend,
} from "./RecommendationHealthModels";
import { roundScore } from "./RecommendationHealthModels";

const DRIFT_LABELS: Record<string, string> = {
  Trend: "Trend structure changed",
  Momentum: "Momentum weakening",
  Volume: "Volume support shifted",
  "Relative Strength": "Relative strength declined",
  "Sector Leadership": "Sector cooled",
  "Fundamental Strength": "Fundamental strength shifted",
  Valuation: "Valuation support changed",
  "Institutional Activity": "Institutional activity shifted",
  "Market Regime": "Broad market deteriorated",
  Volatility: "Volatility regime changed",
  Risk: "Risk profile changed",
};

const IMPROVE_LABELS: Record<string, string> = {
  Trend: "Trend strengthened",
  Momentum: "Momentum improved",
  Volume: "Volume confirmation improved",
  "Relative Strength": "Relative strength improved",
  "Sector Leadership": "Sector leadership strengthened",
  "Fundamental Strength": "Fundamentals improved",
  Valuation: "Valuation support improved",
  "Institutional Activity": "Institutional activity improved",
  "Market Regime": "Market regime improved",
  Volatility: "Volatility cooled constructively",
  Risk: "Risk profile improved",
};

export function resolveHealthTrend(
  drift: number,
  previousHealth?: number | null,
  currentHealth?: number
): RecommendationHealthTrend {
  if (drift >= 2) return "Improving";
  if (drift <= -2) return "Weakening";
  if (
    previousHealth != null &&
    currentHealth != null &&
    Number.isFinite(previousHealth) &&
    Number.isFinite(currentHealth)
  ) {
    const step = currentHealth - previousHealth;
    if (step >= 1.5) return "Improving";
    if (step <= -1.5) return "Weakening";
  }
  return "Stable";
}

export function buildDriftExplanations(
  factors: readonly RecommendationHealthFactor[],
  trend: RecommendationHealthTrend
): string[] {
  const weakening = factors
    .filter((factor) => (factor.delta ?? 0) <= -2)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  const improving = factors
    .filter((factor) => (factor.delta ?? 0) >= 2)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  if (trend === "Weakening") {
    return weakening.slice(0, 4).map((factor) => {
      const label = DRIFT_LABELS[factor.key] ?? `${factor.label} weakened`;
      return factor.note?.trim() || label;
    });
  }

  if (trend === "Improving") {
    return improving.slice(0, 4).map((factor) => {
      const label = IMPROVE_LABELS[factor.key] ?? `${factor.label} improved`;
      return factor.note?.trim() || label;
    });
  }

  const stableNotes = factors
    .filter((factor) => factor.direction === "Stable" && factor.currentScore != null)
    .slice(0, 3)
    .map((factor) => `${factor.label} remains stable`);
  return stableNotes.length > 0
    ? stableNotes
    : ["Setup remains broadly unchanged versus original conviction"];
}

export function calculateConvictionDrift(
  originalConviction: number,
  currentHealth: number,
  factors: readonly RecommendationHealthFactor[] = [],
  previousHealth?: number | null
): ConvictionDriftResult {
  const drift = roundScore(currentHealth - originalConviction);
  const driftPercent =
    originalConviction === 0
      ? 0
      : roundScore((drift / Math.abs(originalConviction)) * 100);
  const trend = resolveHealthTrend(drift, previousHealth, currentHealth);
  return Object.freeze({
    originalConviction,
    currentHealth,
    drift,
    driftPercent,
    trend,
    explanations: Object.freeze(buildDriftExplanations(factors, trend)),
  });
}

export function buildHealthExplanation(
  factors: readonly RecommendationHealthFactor[],
  originalReasons: readonly string[],
  riskFactors: readonly string[] = []
) {
  const improved = factors
    .filter((factor) => (factor.delta ?? 0) >= 2)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 4)
    .map(
      (factor) =>
        factor.note?.trim() ||
        IMPROVE_LABELS[factor.key] ||
        `${factor.label} improved`
    );

  const declined = factors
    .filter((factor) => (factor.delta ?? 0) <= -2)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 4)
    .map(
      (factor) =>
        factor.note?.trim() ||
        DRIFT_LABELS[factor.key] ||
        `${factor.label} weakened`
    );

  const stillValid = [
    ...originalReasons.slice(0, 3),
    ...factors
      .filter(
        (factor) =>
          factor.currentScore != null &&
          factor.currentScore >= 70 &&
          (factor.delta == null || factor.delta >= -1)
      )
      .slice(0, 2)
      .map((factor) => `${factor.label} remains supportive`),
  ].slice(0, 4);

  const majorRisks = [
    ...riskFactors.slice(0, 3),
    ...factors
      .filter((factor) => factor.key === "Risk" || (factor.currentScore ?? 100) < 45)
      .slice(0, 2)
      .map((factor) =>
        factor.key === "Risk"
          ? factor.note?.trim() || "Risk elevated versus original setup"
          : `${factor.label} below healthy threshold`
      ),
  ].slice(0, 4);

  const confidenceDrivers = factors
    .filter((factor) => (factor.currentScore ?? 0) >= 70)
    .sort((a, b) => (b.currentScore ?? 0) - (a.currentScore ?? 0))
    .slice(0, 4)
    .map((factor) => `${factor.label} (${factor.currentScore})`);

  const confidenceKillers = factors
    .filter((factor) => factor.currentScore != null && factor.currentScore < 50)
    .sort((a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0))
    .slice(0, 4)
    .map((factor) => `${factor.label} (${factor.currentScore})`);

  return Object.freeze({
    healthImprovedBecause: Object.freeze(
      improved.length > 0 ? improved : (["No material improvement detected"] as const)
    ),
    healthDeclinedBecause: Object.freeze(
      declined.length > 0 ? declined : (["No material decline detected"] as const)
    ),
    stillValidBecause: Object.freeze(
      stillValid.length > 0
        ? stillValid
        : (["Original thesis components remain under review"] as const)
    ),
    majorRisks: Object.freeze(
      majorRisks.length > 0 ? majorRisks : (["No major risks flagged"] as const)
    ),
    confidenceDrivers: Object.freeze(
      confidenceDrivers.length > 0
        ? confidenceDrivers
        : (["Awaiting live factor confirmation"] as const)
    ),
    confidenceKillers: Object.freeze(
      confidenceKillers.length > 0
        ? confidenceKillers
        : (["No confidence killers identified"] as const)
    ),
  });
}

export class ConvictionDriftEngine {
  calculate = calculateConvictionDrift;
  explain = buildHealthExplanation;
  trend = resolveHealthTrend;
}
