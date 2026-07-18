/**
 * Peter Lynch GARP constants — Sprint 11B.3W.
 * Growth at a Reasonable Price. BUY / WATCH / AVOID. Holding 1–5 years.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const PETER_LYNCH_STRATEGY_ID = "lynch" as const;
export const PETER_LYNCH_STRATEGY_NAME = "Lynch" as const;

export const DEFAULT_PETER_LYNCH_CONFIG = {
  minimumYearsOfFinancials: 5,
  preferredYearsOfFinancials: 10,
  /** Growth grade thresholds (CAGR decimal). */
  excellentGrowthCagr: 0.2,
  goodGrowthCagr: 0.12,
  averageGrowthCagr: 0.06,
  minGrowthCagrBuy: 0.12,
  minGrowthCagrWatch: 0.06,
  /** PEG bands. */
  pegAttractiveMax: 1,
  pegAcceptableMax: 1.5,
  pegWatchMax: 2,
  maxPegForBuy: 1.5,
  maxPegReject: 2,
  /** Financial strength. */
  minRoe: 0.15,
  minRoce: 0.12,
  minRoic: 0.1,
  maxDebtEquity: 0.8,
  minCurrentRatio: 1.2,
  minInterestCoverage: 4,
  /** Valuation. */
  maxPeForBuy: 35,
  fairValueBandPct: 0.1,
  minMarginOfSafetyBuy: 0.1,
  minMarginOfSafetyWatch: 0,
  /** Business / governance. */
  minBusinessQualityBuy: 65,
  minBusinessQualityWatch: 50,
  minFinancialStrengthBuy: 65,
  minFinancialStrengthWatch: 50,
  maxPromoterPledge: 0.05,
  minInstitutionalHolding: 0.1,
  minGovernanceScore: 55,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  qualityWeights: {
    growthQuality: 0.3,
    businessQuality: 0.2,
    financialStrength: 0.2,
    pegAnalysis: 0.15,
    valuation: 0.1,
    governance: 0.05,
  },
  holdingPeriodYears: { min: 1, max: 5 },
  positionAllocationPct: {
    starter: 0.25,
    half: 0.5,
    full: 0.85,
    maximum: 1,
  },
  softStopLossPct: 0.25,
  targetProgress1: 0.4,
  targetProgress2: 0.7,
  finalTargetMultiple: 1.5,
  buyConfidenceBonus: 27,
  watchConfidenceBonus: 19.5,
  avoidConfidenceBonus: 9,
  /** Valuation blend / PEG helpers. */
  intrinsicEstimateWeight: 0.6,
  growthImpliedValueWeight: 0.4,
  minFairPe: 8,
  pegNormalizationBase: 15,
  growthPremiumPegAnchor: 1.5,
  growthPremiumScale: 20,
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
  minRegimeConfidence: 70,
  maxVolatilityScore: 50,
} as const;

export type PeterLynchConfig = {
  readonly minimumYearsOfFinancials: number;
  readonly preferredYearsOfFinancials: number;
  readonly excellentGrowthCagr: number;
  readonly goodGrowthCagr: number;
  readonly averageGrowthCagr: number;
  readonly minGrowthCagrBuy: number;
  readonly minGrowthCagrWatch: number;
  readonly pegAttractiveMax: number;
  readonly pegAcceptableMax: number;
  readonly pegWatchMax: number;
  readonly maxPegForBuy: number;
  readonly maxPegReject: number;
  readonly minRoe: number;
  readonly minRoce: number;
  readonly minRoic: number;
  readonly maxDebtEquity: number;
  readonly minCurrentRatio: number;
  readonly minInterestCoverage: number;
  readonly maxPeForBuy: number;
  readonly fairValueBandPct: number;
  readonly minMarginOfSafetyBuy: number;
  readonly minMarginOfSafetyWatch: number;
  readonly minBusinessQualityBuy: number;
  readonly minBusinessQualityWatch: number;
  readonly minFinancialStrengthBuy: number;
  readonly minFinancialStrengthWatch: number;
  readonly maxPromoterPledge: number;
  readonly minInstitutionalHolding: number;
  readonly minGovernanceScore: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly qualityWeights: {
    readonly growthQuality: number;
    readonly businessQuality: number;
    readonly financialStrength: number;
    readonly pegAnalysis: number;
    readonly valuation: number;
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
  readonly intrinsicEstimateWeight: number;
  readonly growthImpliedValueWeight: number;
  readonly minFairPe: number;
  readonly pegNormalizationBase: number;
  readonly growthPremiumPegAnchor: number;
  readonly growthPremiumScale: number;
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
};

export function resolvePeterLynchConfig(
  partial?: Partial<PeterLynchConfig> & {
    qualityWeights?: Partial<PeterLynchConfig["qualityWeights"]>;
    holdingPeriodYears?: Partial<PeterLynchConfig["holdingPeriodYears"]>;
    positionAllocationPct?: Partial<PeterLynchConfig["positionAllocationPct"]>;
  }
): PeterLynchConfig {
  return {
    ...DEFAULT_PETER_LYNCH_CONFIG,
    ...partial,
    qualityWeights: {
      ...DEFAULT_PETER_LYNCH_CONFIG.qualityWeights,
      ...partial?.qualityWeights,
    },
    holdingPeriodYears: {
      ...DEFAULT_PETER_LYNCH_CONFIG.holdingPeriodYears,
      ...partial?.holdingPeriodYears,
    },
    positionAllocationPct: {
      ...DEFAULT_PETER_LYNCH_CONFIG.positionAllocationPct,
      ...partial?.positionAllocationPct,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_PETER_LYNCH_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_PETER_LYNCH_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_PETER_LYNCH_CONFIG.blockedRiskModes,
  };
}
