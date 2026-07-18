/**
 * Momentum Continuation constants — Sprint 11B.3F.
 * Config-driven thresholds only — no magic numbers in detection logic.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const MOMENTUM_CONTINUATION_STRATEGY_ID = "momentum-continuation" as const;
export const MOMENTUM_CONTINUATION_STRATEGY_NAME = "Momentum Continuation" as const;

export const DEFAULT_MOMENTUM_CONTINUATION_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 10,
  /** Bars used for HH/HL structure and pullback window. */
  trendLookbackBars: 8,
  pullbackLookbackBars: 3,
  /** Max pullback depth as fraction of recent impulse / ATR. */
  maxPullbackFraction: 0.5,
  maxPullbackAtrMultiple: 1.75,
  /** Min ADX for strong trend. */
  minAdx: 22,
  /** EMA separation: EMA20 must be beyond EMA50 by this fraction of price. */
  minEmaSeparationPct: 0.0008,
  /** Flat EMA: slope of EMA20 over lookback below this → reject. */
  flatEmaSlopePct: 0.0003,
  emaSlopeLookback: 4,
  /** Minimum relative volume. */
  minRelativeVolume: 1.0,
  preferredRelativeVolume: 1.25,
  /** Volume confirmation: last bar ≥ this multiple of recent average. */
  volumeConfirmationMultiple: 1.15,
  /** RSI soft bounds for continuation (not extreme exhaustion). */
  rsiBullMin: 45,
  rsiBullMax: 78,
  rsiBearMin: 22,
  rsiBearMax: 55,
  /** Circuit / extreme bar. */
  circuitMovePct: 0.05,
  bullishBreadthMin: 55,
  bearishBreadthMax: 45,
  bullishSectorMin: 55,
  bearishSectorMax: 45,
  minRegimeConfidence: 70,
  maxVolatilityScore: 70,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    trendStrength: 0.2,
    pullbackQuality: 0.15,
    volume: 0.15,
    adx: 0.15,
    breadth: 0.1,
    sector: 0.1,
    market: 0.1,
    vwap: 0.05,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Strong Bear",
    "Weak Bear",
    "Event Driven",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Sideways",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: [
    "Strong Bear",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: [
    "Strong Bull",
    "Weak Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type MomentumContinuationConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly trendLookbackBars: number;
  readonly pullbackLookbackBars: number;
  readonly maxPullbackFraction: number;
  readonly maxPullbackAtrMultiple: number;
  readonly minAdx: number;
  readonly minEmaSeparationPct: number;
  readonly flatEmaSlopePct: number;
  readonly emaSlopeLookback: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly volumeConfirmationMultiple: number;
  readonly rsiBullMin: number;
  readonly rsiBullMax: number;
  readonly rsiBearMin: number;
  readonly rsiBearMax: number;
  readonly circuitMovePct: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minRegimeConfidence: number;
  readonly maxVolatilityScore: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly trendStrength: number;
    readonly pullbackQuality: number;
    readonly volume: number;
    readonly adx: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveMomentumContinuationConfig(
  partial?: Partial<MomentumContinuationConfig> & {
    confidenceWeights?: Partial<
      MomentumContinuationConfig["confidenceWeights"]
    >;
  }
): MomentumContinuationConfig {
  return {
    ...DEFAULT_MOMENTUM_CONTINUATION_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_MOMENTUM_CONTINUATION_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_MOMENTUM_CONTINUATION_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_MOMENTUM_CONTINUATION_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_MOMENTUM_CONTINUATION_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_MOMENTUM_CONTINUATION_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_MOMENTUM_CONTINUATION_CONFIG.blockedRiskModes,
  };
}
