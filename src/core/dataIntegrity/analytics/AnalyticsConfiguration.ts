/**
 * Institutional Validation Analytics — configuration.
 * All windows, horizons, and thresholds live here; no magic numbers elsewhere.
 */

export type AnalyticsMode = "strict" | "relaxed";

export interface AnalyticsTrendWindows {
  hourlyHours: number;
  dailyDays: number;
  weeklyDays: number;
  monthlyDays: number;
  quarterlyDays: number;
  yearlyDays: number;
  rollingShortDays: number;
  rollingMediumDays: number;
  rollingLongDays: number;
}

export interface AnalyticsHealthWeights {
  validationStability: number;
  ruleEffectiveness: number;
  failureTrends: number;
  runtimeStability: number;
  trustStability: number;
  predictionConfidence: number;
}

export interface AnalyticsConfiguration {
  mode: AnalyticsMode;
  engineVersion: string;
  trendWindows: AnalyticsTrendWindows;
  predictionHorizonDays: number;
  snapshotFrequencyMs: number;
  snapshotRetention: number;
  minSampleSize: number;
  anomalyZScoreThreshold: number;
  spikeMultiplier: number;
  collapseDropThreshold: number;
  healthWeights: AnalyticsHealthWeights;
  maxAuditEntries: number;
  maxHistoryPoints: number;
  falsePositiveWeight: number;
  falseNegativeWeight: number;
}

export const DEFAULT_ANALYTICS_CONFIGURATION: AnalyticsConfiguration = {
  mode: "strict",
  engineVersion: "9F.14.0",
  trendWindows: {
    hourlyHours: 1,
    dailyDays: 1,
    weeklyDays: 7,
    monthlyDays: 30,
    quarterlyDays: 90,
    yearlyDays: 365,
    rollingShortDays: 7,
    rollingMediumDays: 30,
    rollingLongDays: 90,
  },
  predictionHorizonDays: 7,
  snapshotFrequencyMs: 3_600_000,
  snapshotRetention: 100,
  minSampleSize: 5,
  anomalyZScoreThreshold: 2.5,
  spikeMultiplier: 2,
  collapseDropThreshold: 15,
  healthWeights: {
    validationStability: 0.2,
    ruleEffectiveness: 0.2,
    failureTrends: 0.15,
    runtimeStability: 0.15,
    trustStability: 0.15,
    predictionConfidence: 0.15,
  },
  maxAuditEntries: 500,
  maxHistoryPoints: 2_000,
  falsePositiveWeight: 0.5,
  falseNegativeWeight: 0.5,
};

export type AnalyticsConfigurationInput = Partial<
  Omit<AnalyticsConfiguration, "trendWindows" | "healthWeights">
> & {
  trendWindows?: Partial<AnalyticsTrendWindows>;
  healthWeights?: Partial<AnalyticsHealthWeights>;
};

export function resolveAnalyticsConfiguration(
  input?: AnalyticsConfigurationInput
): AnalyticsConfiguration {
  return {
    ...DEFAULT_ANALYTICS_CONFIGURATION,
    ...input,
    trendWindows: {
      ...DEFAULT_ANALYTICS_CONFIGURATION.trendWindows,
      ...(input?.trendWindows ?? {}),
    },
    healthWeights: {
      ...DEFAULT_ANALYTICS_CONFIGURATION.healthWeights,
      ...(input?.healthWeights ?? {}),
    },
  };
}
