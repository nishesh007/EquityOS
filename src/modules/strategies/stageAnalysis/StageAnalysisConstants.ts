/**
 * Stage Analysis constants — Sprint 11B.3M.
 * Stan Weinstein Stage Analysis. BUY (early Stage 2) / SELL (Stage 4 / 3→4).
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const STAGE_ANALYSIS_STRATEGY_ID = "stage-analysis" as const;
export const STAGE_ANALYSIS_STRATEGY_NAME = "Stage Analysis" as const;

export const DEFAULT_STAGE_ANALYSIS_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumWeeklyCandles: 40,
  minimumDailyCandles: 30,
  /** Slope lookback for 30W MA trend (bars). */
  maSlopeLookback: 4,
  /** Flat MA: |slope| below this fraction of price. */
  flatMaSlopePct: 0.002,
  /** Rising/falling MA min slope fraction of price. */
  trendingMaSlopePct: 0.0015,
  /** Price must clear MA by this fraction for Stage 2. */
  priceAboveMaPct: 0.005,
  /** Price must be below MA by this for Stage 4. */
  priceBelowMaPct: 0.005,
  /** Sideways base: range / mid below this. */
  sidewaysRangePct: 0.12,
  /** Low volatility score ceiling for Stage 1. */
  stage1MaxVolatilityScore: 45,
  /** Higher-high / higher-low confirmation bars. */
  structureLookback: 8,
  minRelativeStrength: 55,
  strongRelativeStrength: 65,
  minRelativeVolume: 1.1,
  bullishBreadthMin: 52,
  bullishSectorMin: 52,
  minRegimeConfidence: 65,
  maxVolatilityScore: 55,
  /** Late Stage 2: price extended this far above MA. */
  lateStage2ExtensionPct: 0.25,
  /** Transition confidence floors. */
  minTransitionConfidence: 45,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    stageQuality: 0.25,
    trendStructure: 0.2,
    relativeStrength: 0.15,
    volumeQuality: 0.1,
    sector: 0.1,
    market: 0.1,
    vwap: 0.1,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  sellCompatibleRegimes: [
    "Strong Bear",
    "Weak Bear",
    "High Volatility",
    "Weak Bull",
    "Strong Bull",
    "Low Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimesBuy: [
    "Strong Bear",
    "Weak Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type StageAnalysisConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumWeeklyCandles: number;
  readonly minimumDailyCandles: number;
  readonly maSlopeLookback: number;
  readonly flatMaSlopePct: number;
  readonly trendingMaSlopePct: number;
  readonly priceAboveMaPct: number;
  readonly priceBelowMaPct: number;
  readonly sidewaysRangePct: number;
  readonly stage1MaxVolatilityScore: number;
  readonly structureLookback: number;
  readonly minRelativeStrength: number;
  readonly strongRelativeStrength: number;
  readonly minRelativeVolume: number;
  readonly bullishBreadthMin: number;
  readonly bullishSectorMin: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly lateStage2ExtensionPct: number;
  readonly minTransitionConfidence: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly stageQuality: number;
    readonly trendStructure: number;
    readonly relativeStrength: number;
    readonly volumeQuality: number;
    readonly sector: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly sellCompatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimesBuy: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveStageAnalysisConfig(
  partial?: Partial<StageAnalysisConfig> & {
    confidenceWeights?: Partial<StageAnalysisConfig["confidenceWeights"]>;
  }
): StageAnalysisConfig {
  return {
    ...DEFAULT_STAGE_ANALYSIS_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_STAGE_ANALYSIS_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_STAGE_ANALYSIS_CONFIG.compatibleRegimes,
    sellCompatibleRegimes:
      partial?.sellCompatibleRegimes ??
      DEFAULT_STAGE_ANALYSIS_CONFIG.sellCompatibleRegimes,
    blockedRegimesBuy:
      partial?.blockedRegimesBuy ?? DEFAULT_STAGE_ANALYSIS_CONFIG.blockedRegimesBuy,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_STAGE_ANALYSIS_CONFIG.blockedRiskModes,
  };
}
