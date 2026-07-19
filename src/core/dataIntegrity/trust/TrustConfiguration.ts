/**
 * Institutional Trust Score Engine — configuration.
 * All weights, thresholds, and adjustment magnitudes live here; no magic numbers elsewhere.
 */

export type TrustMode = "strict" | "relaxed";

/** Built-in validation module identifiers consumed by the Trust Engine. */
export type BuiltinTrustModuleId =
  | "dataIntegrity"
  | "marketValidation"
  | "technicalValidation"
  | "fundamentalValidation"
  | "recommendationValidation"
  | "tradeSetupValidation"
  | "hallucinationDetection"
  | "historicalPerformance";

export type TrustModuleId = BuiltinTrustModuleId | (string & {});

export interface TrustWeightMap {
  dataIntegrity: number;
  marketValidation: number;
  technicalValidation: number;
  fundamentalValidation: number;
  recommendationValidation: number;
  tradeSetupValidation: number;
  hallucinationDetection: number;
  historicalPerformance: number;
  /** Extensible weights for future validation modules. */
  [moduleId: string]: number;
}

export interface TrustClassificationThresholds {
  institutionalElite: number;
  exceptional: number;
  veryHighTrust: number;
  highTrust: number;
  trusted: number;
  reviewRequired: number;
}

export interface TrustTrendWindows {
  shortDays: number;
  mediumDays: number;
  longDays: number;
}

export interface TrustConfidenceAdjustments {
  /** Score reduction per unit of elevated hallucination risk (0–100 scale). */
  hallucinationRiskPenalty: number;
  /** Score reduction when historical accuracy falls below baseline. */
  historicalAccuracyPenalty: number;
  /** Score reduction when data integrity decreases. */
  dataIntegrityPenalty: number;
  /** Score reduction per recommendation conflict signal. */
  recommendationConflictPenalty: number;
  /** Score reduction per market inconsistency signal. */
  marketInconsistencyPenalty: number;
  /** Score reduction per fundamental inconsistency signal. */
  fundamentalInconsistencyPenalty: number;
  /** Maximum total penalty applied from confidence adjustments. */
  maxPenalty: number;
}

export interface TrustBonusScoring {
  historicalAccuracyImproved: number;
  strongValidationAcrossModules: number;
  zeroContradictions: number;
  stableFinancials: number;
  stableTechnicals: number;
  excellentRecommendationQuality: number;
  institutionalGradeConsistency: number;
  /** Maximum total bonus applied. */
  maxBonus: number;
  /** Minimum module score (0–100) to count as “strong” for across-module bonus. */
  strongModuleThreshold: number;
  /** Minimum recommendation quality score to earn excellent-quality bonus. */
  excellentRecommendationThreshold: number;
}

export interface TrustConfiguration {
  mode: TrustMode;
  engineVersion: string;
  weights: TrustWeightMap;
  classificationThresholds: TrustClassificationThresholds;
  /** Scores below this are classified Reject and flagged rejected. */
  rejectThreshold: number;
  trendWindows: TrustTrendWindows;
  confidenceAdjustments: TrustConfidenceAdjustments;
  bonusScoring: TrustBonusScoring;
  /** Default score used when a registered module has no input score. */
  missingModuleDefaultScore: number;
  /** In strict mode, missing required modules apply missingModulePenalty. */
  missingModulePenalty: number;
  /** Rolling history retention (entries per object). */
  maxHistoryEntries: number;
  /** Volatility / stability sensitivity for trend analysis. */
  trendVolatilityDivisor: number;
  deteriorationDropThreshold: number;
  /** Momentum sensitivity (points per day scaled). */
  momentumScale: number;
}

export const DEFAULT_TRUST_CONFIGURATION: TrustConfiguration = {
  mode: "strict",
  engineVersion: "9F.10.0",
  weights: {
    dataIntegrity: 0.2,
    marketValidation: 0.1,
    technicalValidation: 0.1,
    fundamentalValidation: 0.15,
    recommendationValidation: 0.15,
    tradeSetupValidation: 0.1,
    hallucinationDetection: 0.1,
    historicalPerformance: 0.1,
  },
  classificationThresholds: {
    institutionalElite: 98,
    exceptional: 95,
    veryHighTrust: 90,
    highTrust: 85,
    trusted: 80,
    reviewRequired: 70,
  },
  rejectThreshold: 70,
  trendWindows: {
    shortDays: 7,
    mediumDays: 30,
    longDays: 90,
  },
  confidenceAdjustments: {
    hallucinationRiskPenalty: 0.15,
    historicalAccuracyPenalty: 0.12,
    dataIntegrityPenalty: 0.15,
    recommendationConflictPenalty: 2,
    marketInconsistencyPenalty: 2,
    fundamentalInconsistencyPenalty: 2,
    maxPenalty: 25,
  },
  bonusScoring: {
    historicalAccuracyImproved: 2,
    strongValidationAcrossModules: 3,
    zeroContradictions: 2,
    stableFinancials: 1.5,
    stableTechnicals: 1.5,
    excellentRecommendationQuality: 2,
    institutionalGradeConsistency: 2,
    maxBonus: 10,
    strongModuleThreshold: 90,
    excellentRecommendationThreshold: 90,
  },
  missingModuleDefaultScore: 0,
  missingModulePenalty: 5,
  maxHistoryEntries: 500,
  trendVolatilityDivisor: 10,
  deteriorationDropThreshold: 5,
  momentumScale: 1,
};

export type TrustConfigurationInput = Partial<
  Omit<
    TrustConfiguration,
    | "weights"
    | "classificationThresholds"
    | "trendWindows"
    | "confidenceAdjustments"
    | "bonusScoring"
  >
> & {
  weights?: Partial<TrustWeightMap>;
  classificationThresholds?: Partial<TrustClassificationThresholds>;
  trendWindows?: Partial<TrustTrendWindows>;
  confidenceAdjustments?: Partial<TrustConfidenceAdjustments>;
  bonusScoring?: Partial<TrustBonusScoring>;
};

/**
 * Merge weight overrides into a base map, skipping undefined entries so the
 * result satisfies the required `number` index signature of TrustWeightMap.
 */
export function mergeTrustWeights(
  base: TrustWeightMap,
  overrides?: Partial<TrustWeightMap> | null
): TrustWeightMap {
  const merged: TrustWeightMap = { ...base };
  for (const [moduleId, weight] of Object.entries(overrides ?? {})) {
    if (weight !== undefined) merged[moduleId] = weight;
  }
  return merged;
}

export function resolveTrustConfiguration(
  input?: TrustConfigurationInput
): TrustConfiguration {
  return {
    ...DEFAULT_TRUST_CONFIGURATION,
    ...input,
    weights: mergeTrustWeights(DEFAULT_TRUST_CONFIGURATION.weights, input?.weights),
    classificationThresholds: {
      ...DEFAULT_TRUST_CONFIGURATION.classificationThresholds,
      ...(input?.classificationThresholds ?? {}),
    },
    trendWindows: {
      ...DEFAULT_TRUST_CONFIGURATION.trendWindows,
      ...(input?.trendWindows ?? {}),
    },
    confidenceAdjustments: {
      ...DEFAULT_TRUST_CONFIGURATION.confidenceAdjustments,
      ...(input?.confidenceAdjustments ?? {}),
    },
    bonusScoring: {
      ...DEFAULT_TRUST_CONFIGURATION.bonusScoring,
      ...(input?.bonusScoring ?? {}),
    },
  };
}

export const BUILTIN_TRUST_MODULE_IDS: readonly BuiltinTrustModuleId[] = [
  "dataIntegrity",
  "marketValidation",
  "technicalValidation",
  "fundamentalValidation",
  "recommendationValidation",
  "tradeSetupValidation",
  "hallucinationDetection",
  "historicalPerformance",
] as const;
