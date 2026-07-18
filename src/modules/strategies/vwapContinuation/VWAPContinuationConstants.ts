/**
 * VWAP Continuation Detection constants — Sprint 11B.3C.1.
 * Detection only — no trade level calculation.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const VWAP_CONTINUATION_STRATEGY_ID = "vwap-continuation" as const;
export const VWAP_CONTINUATION_STRATEGY_NAME = "VWAP Continuation" as const;

export const DEFAULT_VWAP_CONTINUATION_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 8,
  slopeLookbackBars: 5,
  /** Absolute slope of VWAP series required to avoid "flat VWAP". */
  minVwapSlope: 0.0008,
  /** Max |price-vwap|/vwap to count as pullback proximity. */
  pullbackProximityPct: 0.004,
  /** Min bounce distance from VWAP after pullback (fraction of VWAP). */
  bounceMinDistancePct: 0.0015,
  /** Oscillation: max fraction of recent bars that flip side of VWAP. */
  maxOscillationRatio: 0.45,
  minRelativeVolume: 1.15,
  minVolumeMultiple: 1.2,
  minBreakoutVolume: 1,
  bullishBreadthMin: 52,
  bearishBreadthMax: 48,
  bullishSectorMin: 52,
  bearishSectorMax: 48,
  minRegimeConfidence: 65,
  maxVolatilityScore: 75,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    trend: 0.2,
    vwapSlope: 0.15,
    pullback: 0.15,
    bounce: 0.15,
    volume: 0.15,
    breadth: 0.1,
    sector: 0.05,
    market: 0.05,
  },
  compatibleBullRegimes: [
    "Strong Bull",
    "Weak Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  compatibleBearRegimes: [
    "Strong Bear",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Sideways",
    "Low Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type VWAPContinuationConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly slopeLookbackBars: number;
  readonly minVwapSlope: number;
  readonly pullbackProximityPct: number;
  readonly bounceMinDistancePct: number;
  readonly maxOscillationRatio: number;
  readonly minRelativeVolume: number;
  readonly minVolumeMultiple: number;
  readonly minBreakoutVolume: number;
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
    readonly trend: number;
    readonly vwapSlope: number;
    readonly pullback: number;
    readonly bounce: number;
    readonly volume: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
  };
  readonly compatibleBullRegimes: readonly MarketRegimeLabel[];
  readonly compatibleBearRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveVWAPContinuationConfig(
  partial?: Partial<VWAPContinuationConfig> & {
    confidenceWeights?: Partial<
      VWAPContinuationConfig["confidenceWeights"]
    >;
  }
): VWAPContinuationConfig {
  return {
    ...DEFAULT_VWAP_CONTINUATION_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_VWAP_CONTINUATION_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleBullRegimes:
      partial?.compatibleBullRegimes ??
      DEFAULT_VWAP_CONTINUATION_CONFIG.compatibleBullRegimes,
    compatibleBearRegimes:
      partial?.compatibleBearRegimes ??
      DEFAULT_VWAP_CONTINUATION_CONFIG.compatibleBearRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_VWAP_CONTINUATION_CONFIG.blockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_VWAP_CONTINUATION_CONFIG.blockedRiskModes,
  };
}
