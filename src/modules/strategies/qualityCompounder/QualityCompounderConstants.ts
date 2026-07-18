/**
 * Quality Compounder constants — Sprint 11B.3Y.
 * Flagship long-term compounder. BUY / HOLD / WATCH / AVOID. Holding 5–20 years.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const QUALITY_COMPOUNDER_STRATEGY_ID = "quality-compounder" as const;
export const QUALITY_COMPOUNDER_STRATEGY_NAME = "Quality Compounder" as const;

export const DEFAULT_QUALITY_COMPOUNDER_CONFIG = {
  minimumYearsOfFinancials: 5,
  preferredYearsOfFinancials: 10,
  /** Business quality grade floors (0–100). */
  exceptionalBusinessMin: 90,
  excellentBusinessMin: 80,
  goodBusinessMin: 65,
  averageBusinessMin: 50,
  /** Moat. */
  wideMoatMinScore: 75,
  narrowMoatMinScore: 55,
  /** Financial / compounding. */
  minRoe: 0.15,
  minRoce: 0.15,
  minRoic: 0.12,
  maxDebtEquity: 0.6,
  minCurrentRatio: 1.2,
  minInterestCoverage: 5,
  minRevenueCagrBuy: 0.08,
  minEpsCagrBuy: 0.08,
  minFcfCagrBuy: 0.06,
  maxEarningsCv: 0.5,
  maxRevenueCv: 0.4,
  /** Management / governance. */
  minManagementBuy: 70,
  minManagementHold: 55,
  minGovernanceScore: 65,
  maxPromoterPledge: 0.05,
  minInstitutionalHolding: 0.15,
  /** Capital allocation. */
  minCapitalAllocationBuy: 70,
  minCapitalAllocationHold: 55,
  /** Valuation. */
  minMarginOfSafetyBuy: 0.1,
  fairValueBandPct: 0.1,
  premiumQualityMaxOverpay: 0.15,
  maxPeForBuy: 40,
  minFcfYieldBuy: 0.02,
  intrinsicEstimateWeight: 0.65,
  growthImpliedWeight: 0.35,
  minFairPe: 12,
  /** Decision floors. */
  minBusinessBuy: 70,
  minFinancialBuy: 70,
  minMoatScoreBuy: 55,
  minGrowthSustainabilityBuy: 65,
  holdBusinessMin: 60,
  watchBusinessMin: 50,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  qualityWeights: {
    businessQuality: 0.2,
    economicMoat: 0.2,
    financialStrength: 0.15,
    capitalAllocation: 0.15,
    growthSustainability: 0.1,
    managementQuality: 0.1,
    valuation: 0.05,
    governance: 0.05,
  },
  holdingPeriodYears: { min: 5, max: 20 },
  expectedCagrExcellent: 0.15,
  expectedCagrGood: 0.12,
  expectedCagrAverage: 0.08,
  softStopLossPct: 0.3,
  targetProgress1: 0.35,
  targetProgress2: 0.65,
  finalTargetMultiple: 2,
  buyConfidenceBonus: 28,
  holdConfidenceBonus: 22,
  watchConfidenceBonus: 16,
  avoidConfidenceBonus: 8,
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Sideways",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
  minRegimeConfidence: 78,
  maxVolatilityScore: 45,
} as const;

export type QualityCompounderConfig = {
  readonly minimumYearsOfFinancials: number;
  readonly preferredYearsOfFinancials: number;
  readonly exceptionalBusinessMin: number;
  readonly excellentBusinessMin: number;
  readonly goodBusinessMin: number;
  readonly averageBusinessMin: number;
  readonly wideMoatMinScore: number;
  readonly narrowMoatMinScore: number;
  readonly minRoe: number;
  readonly minRoce: number;
  readonly minRoic: number;
  readonly maxDebtEquity: number;
  readonly minCurrentRatio: number;
  readonly minInterestCoverage: number;
  readonly minRevenueCagrBuy: number;
  readonly minEpsCagrBuy: number;
  readonly minFcfCagrBuy: number;
  readonly maxEarningsCv: number;
  readonly maxRevenueCv: number;
  readonly minManagementBuy: number;
  readonly minManagementHold: number;
  readonly minGovernanceScore: number;
  readonly maxPromoterPledge: number;
  readonly minInstitutionalHolding: number;
  readonly minCapitalAllocationBuy: number;
  readonly minCapitalAllocationHold: number;
  readonly minMarginOfSafetyBuy: number;
  readonly fairValueBandPct: number;
  readonly premiumQualityMaxOverpay: number;
  readonly maxPeForBuy: number;
  readonly minFcfYieldBuy: number;
  readonly intrinsicEstimateWeight: number;
  readonly growthImpliedWeight: number;
  readonly minFairPe: number;
  readonly minBusinessBuy: number;
  readonly minFinancialBuy: number;
  readonly minMoatScoreBuy: number;
  readonly minGrowthSustainabilityBuy: number;
  readonly holdBusinessMin: number;
  readonly watchBusinessMin: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly qualityWeights: {
    readonly businessQuality: number;
    readonly economicMoat: number;
    readonly financialStrength: number;
    readonly capitalAllocation: number;
    readonly growthSustainability: number;
    readonly managementQuality: number;
    readonly valuation: number;
    readonly governance: number;
  };
  readonly holdingPeriodYears: { readonly min: number; readonly max: number };
  readonly expectedCagrExcellent: number;
  readonly expectedCagrGood: number;
  readonly expectedCagrAverage: number;
  readonly softStopLossPct: number;
  readonly targetProgress1: number;
  readonly targetProgress2: number;
  readonly finalTargetMultiple: number;
  readonly buyConfidenceBonus: number;
  readonly holdConfidenceBonus: number;
  readonly watchConfidenceBonus: number;
  readonly avoidConfidenceBonus: number;
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
};

export function resolveQualityCompounderConfig(
  partial?: Partial<QualityCompounderConfig> & {
    qualityWeights?: Partial<QualityCompounderConfig["qualityWeights"]>;
    holdingPeriodYears?: Partial<QualityCompounderConfig["holdingPeriodYears"]>;
  }
): QualityCompounderConfig {
  return {
    ...DEFAULT_QUALITY_COMPOUNDER_CONFIG,
    ...partial,
    qualityWeights: {
      ...DEFAULT_QUALITY_COMPOUNDER_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    holdingPeriodYears: {
      ...DEFAULT_QUALITY_COMPOUNDER_CONFIG.holdingPeriodYears,
      ...partial?.holdingPeriodYears,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_QUALITY_COMPOUNDER_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_QUALITY_COMPOUNDER_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_QUALITY_COMPOUNDER_CONFIG.blockedRiskModes,
  };
}
