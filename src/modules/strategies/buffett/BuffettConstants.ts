/**
 * Buffett Quality Investing constants — Sprint 11B.3U.
 * Long-term institutional quality compounder engine. BUY / HOLD / AVOID.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const BUFFETT_STRATEGY_ID = "buffett" as const;
export const BUFFETT_STRATEGY_NAME = "Buffett" as const;

export const DEFAULT_BUFFETT_CONFIG = {
  minimumYearsOfFinancials: 5,
  preferredYearsOfFinancials: 10,
  /** Financial strength thresholds. */
  minRoe: 0.15,
  minRoce: 0.15,
  minRoic: 0.12,
  maxDebtEquity: 0.5,
  minCurrentRatio: 1.2,
  minInterestCoverage: 5,
  minGrossMargin: 0.25,
  minOperatingMargin: 0.12,
  minNetMargin: 0.08,
  /** Consistency: max coefficient of variation for EPS/revenue growth. */
  maxEarningsCv: 0.55,
  maxRevenueCv: 0.4,
  /** Moat score thresholds. */
  wideMoatMinScore: 75,
  narrowMoatMinScore: 55,
  /** Management. */
  minGovernanceScore: 60,
  maxPromoterPledge: 0.05,
  minPromoterHolding: 0.2,
  minInstitutionalHolding: 0.15,
  /** Valuation. */
  minMarginOfSafetyBuy: 0.15,
  fairValueBandPct: 0.1,
  maxPeForBuy: 35,
  minFcfYieldBuy: 0.02,
  /** Required FCF yield for yield-based intrinsic cross-check. */
  requiredFcfYield: 0.04,
  /** Weight of provided IV estimate vs price-unit cross-checks. */
  intrinsicEstimateWeight: 0.7,
  /** Decision score floors. */
  minBusinessQualityBuy: 70,
  minFinancialStrengthBuy: 70,
  minManagementQualityBuy: 65,
  minMoatScoreBuy: 55,
  holdBusinessQualityMin: 55,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  qualityWeights: {
    businessQuality: 0.25,
    economicMoat: 0.2,
    financialStrength: 0.2,
    managementQuality: 0.15,
    valuation: 0.15,
    balanceSheet: 0.05,
  },
  holdingPeriodYears: { min: 3, max: 10 },
  positionAllocationPct: {
    starter: 0.25,
    half: 0.5,
    full: 0.85,
    maximum: 1,
  },
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
  minRegimeConfidence: 75,
  maxVolatilityScore: 45,
} as const;

export type BuffettConfig = {
  readonly minimumYearsOfFinancials: number;
  readonly preferredYearsOfFinancials: number;
  readonly minRoe: number;
  readonly minRoce: number;
  readonly minRoic: number;
  readonly maxDebtEquity: number;
  readonly minCurrentRatio: number;
  readonly minInterestCoverage: number;
  readonly minGrossMargin: number;
  readonly minOperatingMargin: number;
  readonly minNetMargin: number;
  readonly maxEarningsCv: number;
  readonly maxRevenueCv: number;
  readonly wideMoatMinScore: number;
  readonly narrowMoatMinScore: number;
  readonly minGovernanceScore: number;
  readonly maxPromoterPledge: number;
  readonly minPromoterHolding: number;
  readonly minInstitutionalHolding: number;
  readonly minMarginOfSafetyBuy: number;
  readonly fairValueBandPct: number;
  readonly maxPeForBuy: number;
  readonly minFcfYieldBuy: number;
  readonly requiredFcfYield: number;
  readonly intrinsicEstimateWeight: number;
  readonly minBusinessQualityBuy: number;
  readonly minFinancialStrengthBuy: number;
  readonly minManagementQualityBuy: number;
  readonly minMoatScoreBuy: number;
  readonly holdBusinessQualityMin: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly qualityWeights: {
    readonly businessQuality: number;
    readonly economicMoat: number;
    readonly financialStrength: number;
    readonly managementQuality: number;
    readonly valuation: number;
    readonly balanceSheet: number;
  };
  readonly holdingPeriodYears: { readonly min: number; readonly max: number };
  readonly positionAllocationPct: {
    readonly starter: number;
    readonly half: number;
    readonly full: number;
    readonly maximum: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
};

export function resolveBuffettConfig(
  partial?: Partial<BuffettConfig> & {
    qualityWeights?: Partial<BuffettConfig["qualityWeights"]>;
    holdingPeriodYears?: Partial<BuffettConfig["holdingPeriodYears"]>;
    positionAllocationPct?: Partial<BuffettConfig["positionAllocationPct"]>;
  }
): BuffettConfig {
  return {
    ...DEFAULT_BUFFETT_CONFIG,
    ...partial,
    qualityWeights: {
      ...DEFAULT_BUFFETT_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    holdingPeriodYears: {
      ...DEFAULT_BUFFETT_CONFIG.holdingPeriodYears,
      ...partial?.holdingPeriodYears,
    },
    positionAllocationPct: {
      ...DEFAULT_BUFFETT_CONFIG.positionAllocationPct,
      ...partial?.positionAllocationPct,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_BUFFETT_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_BUFFETT_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_BUFFETT_CONFIG.blockedRiskModes,
  };
}
