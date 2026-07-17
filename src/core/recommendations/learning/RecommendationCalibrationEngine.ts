/**
 * Future-only recommendation calibration from historical evidence.
 * Existing snapshots are never passed in or modified.
 */

import type {
  CalibratedFutureRecommendation,
  FutureRecommendationCalibrationInput,
  HistoricalFactorStatistics,
  RecommendationCalibration,
  RecommendationCalibrationAdjustment,
  RecommendationHistoricalLearning,
} from "./RecommendationFeedbackModels";
import {
  clampLearning,
  normalizeLearningTimestamp,
  roundLearning,
} from "./RecommendationFeedbackModels";

function factorDelta(
  factors: readonly HistoricalFactorStatistics[],
  name: HistoricalFactorStatistics["factor"]
): number {
  const factor = factors.find((item) => item.factor === name);
  if (
    !factor ||
    factor.successfulAverage == null ||
    factor.failedAverage == null
  ) {
    return 0;
  }
  return factor.successfulAverage - factor.failedAverage;
}

function adjustment(
  factor: RecommendationCalibrationAdjustment["factor"],
  percent: number,
  rationale: string,
  confidence: number
): RecommendationCalibrationAdjustment {
  return Object.freeze({
    factor,
    adjustmentPercent: roundLearning(Math.max(-3, Math.min(3, percent))),
    rationale,
    confidence: roundLearning(confidence),
  });
}

export function buildRecommendationCalibration(
  historical: RecommendationHistoricalLearning,
  generatedAt?: string | Date
): RecommendationCalibration {
  const sampleConfidence = roundLearning(
    Math.min(100, (historical.evaluated / 25) * 100)
  );
  const momentumDelta = factorDelta(
    historical.factors,
    "Momentum Success"
  );
  const riskDelta = factorDelta(historical.factors, "Risk Success");
  const sectorRates = historical.sectors.filter(
    (group) => group.observations >= 2
  );
  const sectorSpread =
    sectorRates.length < 2
      ? 0
      : Math.max(...sectorRates.map((group) => group.successRate)) -
        Math.min(...sectorRates.map((group) => group.successRate));

  const adjustments = [
    adjustment(
      "Momentum",
      momentumDelta / 10,
      momentumDelta >= 0
        ? "Successful recommendations showed stronger momentum evidence"
        : "Momentum was not reliably associated with successful outcomes",
      sampleConfidence
    ),
    adjustment(
      "Sector",
      sectorSpread === 0 ? 0 : sectorSpread >= 30 ? 2 : 1,
      sectorSpread === 0
        ? "Insufficient sector dispersion for calibration"
        : "Sector-level success rates show meaningful historical dispersion",
      sampleConfidence
    ),
    adjustment(
      "Risk",
      riskDelta / 10,
      riskDelta >= 0
        ? "Healthy risk profiles correlated with successful outcomes"
        : "Risk scoring requires more conservative future weighting",
      sampleConfidence
    ),
  ];

  const convictionCap = roundLearning(
    Math.max(75, Math.min(98, 98 - historical.failureRate * 0.15))
  );
  const trustCalibration = roundLearning(
    Math.max(-5, Math.min(5, (historical.successRate - 50) / 10))
  );
  const validationWeighting = roundLearning(
    Math.max(
      0.8,
      Math.min(1.2, 1 + (historical.successRate - 50) / 250)
    ),
    2
  );

  return Object.freeze({
    generatedAt: normalizeLearningTimestamp(generatedAt),
    sampleSize: historical.evaluated,
    confidence: sampleConfidence,
    adjustments: Object.freeze(adjustments),
    convictionCap,
    trustCalibration,
    validationWeighting,
    appliesTo: "FUTURE_RECOMMENDATIONS_ONLY" as const,
  });
}

export function calibrateFutureRecommendation(
  input: FutureRecommendationCalibrationInput,
  calibration: RecommendationCalibration
): CalibratedFutureRecommendation {
  const requested = new Set(input.factors ?? []);
  const applicable = calibration.adjustments.filter(
    (item) => requested.size === 0 || requested.has(item.factor)
  );
  const convictionAdjustment = applicable.reduce(
    (sum, item) => sum + item.adjustmentPercent,
    0
  );

  return Object.freeze({
    conviction: roundLearning(
      Math.min(
        calibration.convictionCap,
        clampLearning(input.baseConviction + convictionAdjustment)
      )
    ),
    trust: roundLearning(
      clampLearning(input.baseTrust + calibration.trustCalibration)
    ),
    validationWeight: roundLearning(
      Math.max(
        0,
        input.baseValidationWeight * calibration.validationWeighting
      ),
      2
    ),
    appliedAdjustments: Object.freeze(applicable),
    historicalSampleSize: calibration.sampleSize,
    calibrationConfidence: calibration.confidence,
  });
}

export class RecommendationCalibrationEngine {
  build = buildRecommendationCalibration;
  applyToFuture = calibrateFutureRecommendation;
}
