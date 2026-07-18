/**
 * Greenblatt Magic Formula constants — Sprint 11B.3X.
 * Earnings Yield + ROC ranking. BUY / WATCH / AVOID. Holding 1–3 years.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const MAGIC_FORMULA_STRATEGY_ID = "greenblatt" as const;
export const MAGIC_FORMULA_STRATEGY_NAME = "Greenblatt" as const;

export const DEFAULT_MAGIC_FORMULA_CONFIG = {
  minimumYearsOfFinancials: 5,
  preferredYearsOfFinancials: 10,
  /** Buy when composite percentile is at or below this (1 = best). */
  topPercentileBuy: 0.2,
  topPercentileWatch: 0.4,
  /** Max allocation when percentile at or below buy * this factor. */
  topPercentileMaxAllocationFactor: 0.5,
  /** Absolute floors when peer universe is thin. */
  minEarningsYieldBuy: 0.08,
  minEarningsYieldWatch: 0.05,
  minRocBuy: 0.2,
  minRocWatch: 0.12,
  maxMagicFormulaRankBuy: 50,
  maxMagicFormulaRankWatch: 100,
  /** Financial filters. */
  maxDebtEquity: 1,
  minCurrentRatio: 1,
  rejectNegativeWorkingCapital: true,
  minProfitableYearsRatio: 0.7,
  minInstitutionalHolding: 0.08,
  minGovernanceScore: 55,
  minFinancialStrengthBuy: 65,
  minFinancialStrengthWatch: 50,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  qualityWeights: {
    magicFormulaRank: 0.3,
    returnOnCapital: 0.25,
    earningsYield: 0.2,
    financialStrength: 0.15,
    cashFlowQuality: 0.05,
    governance: 0.05,
  },
  holdingPeriodYears: { min: 1, max: 3 },
  positionAllocationPct: {
    starter: 0.25,
    half: 0.5,
    full: 0.85,
    maximum: 1,
  },
  softStopLossPct: 0.25,
  targetProgress1: 0.4,
  targetProgress2: 0.7,
  finalTargetMultiple: 1.4,
  buyConfidenceBonus: 27,
  watchConfidenceBonus: 19.5,
  avoidConfidenceBonus: 9,
  /** Rank score mapping: percentile 0 → 100, 1 → 0. */
  rankScoreCeiling: 100,
  defaultUniverseSize: 100,
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Sideways",
    "Low Volatility",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "High Volatility",
    "Event Driven",
    "Strong Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  minRegimeConfidence: 70,
  maxVolatilityScore: 50,
} as const;

export type MagicFormulaConfig = {
  readonly minimumYearsOfFinancials: number;
  readonly preferredYearsOfFinancials: number;
  readonly topPercentileBuy: number;
  readonly topPercentileWatch: number;
  readonly topPercentileMaxAllocationFactor: number;
  readonly minEarningsYieldBuy: number;
  readonly minEarningsYieldWatch: number;
  readonly minRocBuy: number;
  readonly minRocWatch: number;
  readonly maxMagicFormulaRankBuy: number;
  readonly maxMagicFormulaRankWatch: number;
  readonly maxDebtEquity: number;
  readonly minCurrentRatio: number;
  readonly rejectNegativeWorkingCapital: boolean;
  readonly minProfitableYearsRatio: number;
  readonly minInstitutionalHolding: number;
  readonly minGovernanceScore: number;
  readonly minFinancialStrengthBuy: number;
  readonly minFinancialStrengthWatch: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly qualityWeights: {
    readonly magicFormulaRank: number;
    readonly returnOnCapital: number;
    readonly earningsYield: number;
    readonly financialStrength: number;
    readonly cashFlowQuality: number;
    readonly governance: number;
  };
  readonly holdingPeriodYears: { readonly min: number; readonly max: number };
  readonly positionAllocationPct: {
    readonly starter: number;
    readonly half: number;
    readonly full: number;
    readonly maximum: number;
  };
  readonly softStopLossPct: number;
  readonly targetProgress1: number;
  readonly targetProgress2: number;
  readonly finalTargetMultiple: number;
  readonly buyConfidenceBonus: number;
  readonly watchConfidenceBonus: number;
  readonly avoidConfidenceBonus: number;
  readonly rankScoreCeiling: number;
  readonly defaultUniverseSize: number;
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
};

export function resolveMagicFormulaConfig(
  partial?: Partial<MagicFormulaConfig> & {
    qualityWeights?: Partial<MagicFormulaConfig["qualityWeights"]>;
    holdingPeriodYears?: Partial<MagicFormulaConfig["holdingPeriodYears"]>;
    positionAllocationPct?: Partial<
      MagicFormulaConfig["positionAllocationPct"]
    >;
  }
): MagicFormulaConfig {
  return {
    ...DEFAULT_MAGIC_FORMULA_CONFIG,
    ...partial,
    qualityWeights: {
      ...DEFAULT_MAGIC_FORMULA_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    holdingPeriodYears: {
      ...DEFAULT_MAGIC_FORMULA_CONFIG.holdingPeriodYears,
      ...partial?.holdingPeriodYears,
    },
    positionAllocationPct: {
      ...DEFAULT_MAGIC_FORMULA_CONFIG.positionAllocationPct,
      ...partial?.positionAllocationPct,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_MAGIC_FORMULA_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_MAGIC_FORMULA_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_MAGIC_FORMULA_CONFIG.blockedRiskModes,
  };
}
