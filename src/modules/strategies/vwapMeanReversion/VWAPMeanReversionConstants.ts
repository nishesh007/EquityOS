/**
 * VWAP Mean Reversion Detection constants — Sprint 11B.3D.1.
 * Detection only — no trade level calculation.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const VWAP_MEAN_REVERSION_STRATEGY_ID = "vwap-mean-reversion" as const;
export const VWAP_MEAN_REVERSION_STRATEGY_NAME = "VWAP Mean Reversion" as const;

export const DEFAULT_VWAP_MEAN_REVERSION_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 8,
  /** Min |price-vwap| / σ to count as extended (1.5σ). */
  minDeviationSigma: 1.5,
  /** Max |price-vwap| / σ for mean-reversion window (2.5σ). */
  maxDeviationSigma: 2.5,
  /** Below this σ, price is hugging VWAP — reject. */
  hugVwapMaxSigma: 0.5,
  /** Default band multiplier when building bands from σ. */
  bandSigma: 2,
  rsiOversold: 30,
  rsiOverbought: 70,
  rsiLookback: 14,
  /** Lower/upper wick must be ≥ this fraction of candle range. */
  minWickBodyRatio: 0.55,
  /** Volume stability: last bar volume ≤ this multiple of recent average. */
  maxVolumeStabilityMultiple: 1.35,
  /** Relative volume above this suggests aggressive continuation — reject. */
  maxRelativeVolumeContinuation: 2.2,
  /** Min relative volume for liquidity. */
  minRelativeVolumeLiquidity: 0.7,
  /** Circuit / extreme bar: range ≥ this fraction of price. */
  circuitMovePct: 0.04,
  /** Strong trend slope of closes (fraction) over lookback. */
  strongTrendSlope: 0.008,
  trendSlopeLookback: 6,
  exhaustionLookback: 4,
  bullishBreadthMin: 35,
  bearishBreadthMax: 65,
  bullishSectorMin: 30,
  bearishSectorMax: 70,
  minRegimeConfidence: 60,
  maxVolatilityScore: 55,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    deviation: 0.25,
    rsi: 0.15,
    reversal: 0.2,
    volume: 0.1,
    exhaustion: 0.1,
    breadth: 0.08,
    sector: 0.07,
    market: 0.05,
  },
  compatibleRegimes: [
    "Sideways",
    "Low Volatility",
    "Weak Bull",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bull",
    "Strong Bear",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  /** Bullish MR blocked when regime is Strong Bear. */
  bullBlockedRegimes: ["Strong Bear"] as const satisfies readonly MarketRegimeLabel[],
  /** Bearish MR blocked when regime is Strong Bull. */
  bearBlockedRegimes: ["Strong Bull"] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type VWAPMeanReversionConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly minDeviationSigma: number;
  readonly maxDeviationSigma: number;
  readonly hugVwapMaxSigma: number;
  readonly bandSigma: number;
  readonly rsiOversold: number;
  readonly rsiOverbought: number;
  readonly rsiLookback: number;
  readonly minWickBodyRatio: number;
  readonly maxVolumeStabilityMultiple: number;
  readonly maxRelativeVolumeContinuation: number;
  readonly minRelativeVolumeLiquidity: number;
  readonly circuitMovePct: number;
  readonly strongTrendSlope: number;
  readonly trendSlopeLookback: number;
  readonly exhaustionLookback: number;
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
    readonly deviation: number;
    readonly rsi: number;
    readonly reversal: number;
    readonly volume: number;
    readonly exhaustion: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveVWAPMeanReversionConfig(
  partial?: Partial<VWAPMeanReversionConfig> & {
    confidenceWeights?: Partial<VWAPMeanReversionConfig["confidenceWeights"]>;
  }
): VWAPMeanReversionConfig {
  return {
    ...DEFAULT_VWAP_MEAN_REVERSION_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_VWAP_MEAN_REVERSION_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_VWAP_MEAN_REVERSION_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_VWAP_MEAN_REVERSION_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_VWAP_MEAN_REVERSION_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_VWAP_MEAN_REVERSION_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_VWAP_MEAN_REVERSION_CONFIG.blockedRiskModes,
  };
}
