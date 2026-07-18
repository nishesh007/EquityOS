/**
 * Graham Value Investing constants — Sprint 11B.3V.
 * Deep-value engine. BUY / WATCH / AVOID. Holding 2–7 years.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const GRAHAM_STRATEGY_ID = "graham" as const;
export const GRAHAM_STRATEGY_NAME = "Graham" as const;

export const DEFAULT_GRAHAM_CONFIG = {
  minimumYearsOfFinancials: 5,
  preferredYearsOfFinancials: 10,
  /** Graham liquidity / leverage screens. */
  minCurrentRatio: 2,
  minQuickRatio: 1,
  maxDebtEquity: 1,
  minInterestCoverage: 3,
  minWorkingCapitalPositive: true,
  /** Earnings / cash flow. */
  requirePositiveEarnings: true,
  requirePositiveFcf: true,
  minDividendYears: 0,
  /** Valuation. */
  minMarginOfSafetyBuy: 0.33,
  minMarginOfSafetyWatch: 0.15,
  fairValueBandPct: 0.1,
  maxPeForBuy: 15,
  maxPbForBuy: 1.5,
  grahamNumberMultiplier: 22.5,
  /** Weight of provided IV estimate vs Graham Number / book. */
  intrinsicEstimateWeight: 0.35,
  grahamNumberWeight: 0.4,
  bookValueWeight: 0.15,
  normalizedEarningsWeight: 0.1,
  /** Conservative multiple on normalized EPS. */
  normalizedEarningsMultiple: 9,
  /** Screen scoring. */
  passScore: 100,
  borderlineScore: 55,
  failScore: 15,
  /** Decision floors. */
  minFinancialStrengthBuy: 70,
  minBalanceSheetBuy: 70,
  minFinancialStrengthWatch: 55,
  minBalanceSheetWatch: 55,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  qualityWeights: {
    financialStrength: 0.3,
    marginOfSafety: 0.25,
    balanceSheet: 0.2,
    valuation: 0.15,
    cashFlowQuality: 0.05,
    governance: 0.05,
  },
  holdingPeriodYears: { min: 2, max: 7 },
  positionAllocationPct: {
    starter: 0.25,
    half: 0.5,
    full: 0.85,
    maximum: 1,
  },
  softStopLossPct: 0.25,
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Sideways",
    "Low Volatility",
    "Weak Bear",
    "Strong Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: [] as const,
  minRegimeConfidence: 72,
  maxVolatilityScore: 50,
} as const;

export type GrahamConfig = {
  readonly minimumYearsOfFinancials: number;
  readonly preferredYearsOfFinancials: number;
  readonly minCurrentRatio: number;
  readonly minQuickRatio: number;
  readonly maxDebtEquity: number;
  readonly minInterestCoverage: number;
  readonly minWorkingCapitalPositive: boolean;
  readonly requirePositiveEarnings: boolean;
  readonly requirePositiveFcf: boolean;
  readonly minDividendYears: number;
  readonly minMarginOfSafetyBuy: number;
  readonly minMarginOfSafetyWatch: number;
  readonly fairValueBandPct: number;
  readonly maxPeForBuy: number;
  readonly maxPbForBuy: number;
  readonly grahamNumberMultiplier: number;
  readonly intrinsicEstimateWeight: number;
  readonly grahamNumberWeight: number;
  readonly bookValueWeight: number;
  readonly normalizedEarningsWeight: number;
  readonly normalizedEarningsMultiple: number;
  readonly passScore: number;
  readonly borderlineScore: number;
  readonly failScore: number;
  readonly minFinancialStrengthBuy: number;
  readonly minBalanceSheetBuy: number;
  readonly minFinancialStrengthWatch: number;
  readonly minBalanceSheetWatch: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly qualityWeights: {
    readonly financialStrength: number;
    readonly marginOfSafety: number;
    readonly balanceSheet: number;
    readonly valuation: number;
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
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
};

export function resolveGrahamConfig(
  partial?: Partial<GrahamConfig> & {
    qualityWeights?: Partial<GrahamConfig["qualityWeights"]>;
    holdingPeriodYears?: Partial<GrahamConfig["holdingPeriodYears"]>;
    positionAllocationPct?: Partial<GrahamConfig["positionAllocationPct"]>;
  }
): GrahamConfig {
  return {
    ...DEFAULT_GRAHAM_CONFIG,
    ...partial,
    qualityWeights: {
      ...DEFAULT_GRAHAM_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    holdingPeriodYears: {
      ...DEFAULT_GRAHAM_CONFIG.holdingPeriodYears,
      ...partial?.holdingPeriodYears,
    },
    positionAllocationPct: {
      ...DEFAULT_GRAHAM_CONFIG.positionAllocationPct,
      ...partial?.positionAllocationPct,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_GRAHAM_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_GRAHAM_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_GRAHAM_CONFIG.blockedRiskModes,
  };
}
