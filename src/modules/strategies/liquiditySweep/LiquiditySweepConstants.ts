/**
 * Liquidity Sweep Detection constants — Sprint 11B.3E.
 * Config-driven thresholds only — no magic numbers in detection logic.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const LIQUIDITY_SWEEP_STRATEGY_ID = "liquidity-sweep" as const;
export const LIQUIDITY_SWEEP_STRATEGY_NAME = "Liquidity Sweep" as const;

export const DEFAULT_LIQUIDITY_SWEEP_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 8,
  /** Bars used to locate recent swing liquidity. */
  swingLookbackBars: 12,
  /** Equal high/low tolerance as fraction of price. */
  equalLevelTolerancePct: 0.0015,
  /** Minimum wick penetration beyond liquidity as fraction of ATR (or price). */
  minSweepPenetrationPct: 0.001,
  /** Prefer ATR-scaled penetration when ATR present. */
  minSweepPenetrationAtrMultiple: 0.15,
  /** Close must reclaim inside structure by this fraction of the sweep range. */
  minReclaimFraction: 0.35,
  /** Lower/upper wick must be ≥ this fraction of candle range for reversal. */
  minWickBodyRatio: 0.5,
  /** Volume spike: last bar ≥ this multiple of recent average. */
  volumeSpikeMultiple: 1.4,
  /** Minimum relative volume for liquidity confirmation. */
  minRelativeVolume: 0.85,
  /** Soft preference for elevated RVOL on sweeps. */
  preferredRelativeVolume: 1.15,
  /** Circuit / extreme bar: range ≥ this fraction of price. */
  circuitMovePct: 0.05,
  /** Strong trend slope of closes (fraction) over lookback — reject as continuation. */
  strongTrendSlope: 0.012,
  trendSlopeLookback: 6,
  bullishBreadthMin: 35,
  bearishBreadthMax: 65,
  bullishSectorMin: 30,
  bearishSectorMax: 70,
  minRegimeConfidence: 55,
  /** Sweeps prefer stress — reject calm markets below this vol score. */
  minVolatilityScore: 50,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    sweepQuality: 0.25,
    reversal: 0.2,
    volume: 0.15,
    breadth: 0.1,
    sector: 0.1,
    market: 0.1,
    structure: 0.1,
  },
  compatibleRegimes: [
    "High Volatility",
    "Event Driven",
    "Weak Bull",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Low Volatility",
    "Strong Bull",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: ["Strong Bear"] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: ["Strong Bull"] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type LiquiditySweepConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly swingLookbackBars: number;
  readonly equalLevelTolerancePct: number;
  readonly minSweepPenetrationPct: number;
  readonly minSweepPenetrationAtrMultiple: number;
  readonly minReclaimFraction: number;
  readonly minWickBodyRatio: number;
  readonly volumeSpikeMultiple: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly circuitMovePct: number;
  readonly strongTrendSlope: number;
  readonly trendSlopeLookback: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minRegimeConfidence: number;
  readonly minVolatilityScore: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly sweepQuality: number;
    readonly reversal: number;
    readonly volume: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
    readonly structure: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveLiquiditySweepConfig(
  partial?: Partial<LiquiditySweepConfig> & {
    confidenceWeights?: Partial<LiquiditySweepConfig["confidenceWeights"]>;
  }
): LiquiditySweepConfig {
  return {
    ...DEFAULT_LIQUIDITY_SWEEP_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_LIQUIDITY_SWEEP_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_LIQUIDITY_SWEEP_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_LIQUIDITY_SWEEP_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_LIQUIDITY_SWEEP_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_LIQUIDITY_SWEEP_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_LIQUIDITY_SWEEP_CONFIG.blockedRiskModes,
  };
}
