/**
 * Institutional Historical Performance Validation — configuration.
 * All thresholds are configurable; no hardcoded magic numbers in rules.
 */

export type HistoricalMode = "strict" | "relaxed";

export interface HistoricalValidationConfig {
  mode: HistoricalMode;
  /** Minimum overall hit rate (%). */
  minHitRate: number;
  /** Minimum historical performance score (0–100). */
  minPerformanceScore: number;
  /** Maximum acceptable drawdown (%). */
  maxDrawdown: number;
  /** Minimum average realized risk-reward. */
  minRiskReward: number;
  /** Rolling window length in days for consistency / decay checks. */
  rollingWindowDays: number;
  /** Minimum prediction accuracy (%). */
  minPredictionAccuracy: number;
  /** Minimum success rate for recommendations (%). */
  minSuccessRate: number;
  /** Maximum failure rate (%). */
  maxFailureRate: number;
  /** Maximum average loss (%). */
  maxAverageLoss: number;
  /** Maximum false stop-out rate (%). */
  maxFalseStopOutRate: number;
  /** Maximum early exit rate (%). */
  maxEarlyExitRate: number;
  /** Maximum late exit rate (%). */
  maxLateExitRate: number;
  /** Hit-rate drop (pp) that triggers model decay. */
  decayHitRateDrop: number;
  /** Accuracy drop (pp) that triggers model decay. */
  decayAccuracyDrop: number;
  /** Minimum sample size before enforcing hard thresholds. */
  minSampleSize: number;
  scoreWeights: {
    predictionAccuracy: number;
    hitRate: number;
    riskManagement: number;
    consistency: number;
    drawdown: number;
    holdingDiscipline: number;
  };
  scoreBands: {
    institutionalGrade: number;
    excellent: number;
    good: number;
  };
}

export const DEFAULT_HISTORICAL_VALIDATION_CONFIG: HistoricalValidationConfig = {
  mode: "strict",
  minHitRate: 50,
  minPerformanceScore: 80,
  maxDrawdown: 25,
  minRiskReward: 1,
  rollingWindowDays: 90,
  minPredictionAccuracy: 55,
  minSuccessRate: 50,
  maxFailureRate: 50,
  maxAverageLoss: 8,
  maxFalseStopOutRate: 30,
  maxEarlyExitRate: 40,
  maxLateExitRate: 40,
  decayHitRateDrop: 15,
  decayAccuracyDrop: 15,
  minSampleSize: 5,
  scoreWeights: {
    predictionAccuracy: 0.3,
    hitRate: 0.2,
    riskManagement: 0.2,
    consistency: 0.15,
    drawdown: 0.1,
    holdingDiscipline: 0.05,
  },
  scoreBands: {
    institutionalGrade: 95,
    excellent: 90,
    good: 80,
  },
};

export type HistoricalValidationConfigInput =
  Partial<HistoricalValidationConfig> & {
    scoreWeights?: Partial<HistoricalValidationConfig["scoreWeights"]>;
    scoreBands?: Partial<HistoricalValidationConfig["scoreBands"]>;
  };

export function resolveHistoricalConfig(
  input?: HistoricalValidationConfigInput
): HistoricalValidationConfig {
  return {
    ...DEFAULT_HISTORICAL_VALIDATION_CONFIG,
    ...input,
    scoreWeights: {
      ...DEFAULT_HISTORICAL_VALIDATION_CONFIG.scoreWeights,
      ...(input?.scoreWeights ?? {}),
    },
    scoreBands: {
      ...DEFAULT_HISTORICAL_VALIDATION_CONFIG.scoreBands,
      ...(input?.scoreBands ?? {}),
    },
  };
}

export type HistoricalScoreBand =
  | "INSTITUTIONAL_GRADE"
  | "EXCELLENT"
  | "GOOD"
  | "REVIEW_REQUIRED";

export function resolveHistoricalScoreBand(
  score: number,
  bands: HistoricalValidationConfig["scoreBands"] = DEFAULT_HISTORICAL_VALIDATION_CONFIG.scoreBands
): HistoricalScoreBand {
  if (score >= bands.institutionalGrade) return "INSTITUTIONAL_GRADE";
  if (score >= bands.excellent) return "EXCELLENT";
  if (score >= bands.good) return "GOOD";
  return "REVIEW_REQUIRED";
}
