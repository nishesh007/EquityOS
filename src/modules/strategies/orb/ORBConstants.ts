/**
 * ORB Detection constants — Sprint 11B.3B.1.
 * Config-driven thresholds only. Detection only — no trade levels.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

/** Default NSE cash opening range window (IST, HH:mm). */
export const DEFAULT_ORB_RANGE_START = "09:15" as const;
export const DEFAULT_ORB_RANGE_END = "09:30" as const;

export const DEFAULT_ORB_CONFIG = {
  rangeStart: DEFAULT_ORB_RANGE_START,
  rangeEnd: DEFAULT_ORB_RANGE_END,
  /** Timezone offset minutes east of UTC for session clock (IST = +330). */
  sessionUtcOffsetMinutes: 330,
  /** Minimum 5m candles required for a valid opening range. */
  minimumRangeCandles: 2,
  /** Minimum total 5m candles in session sample. */
  minimumSessionCandles: 4,
  /** Regular cash session bounds (IST). */
  marketOpen: "09:15",
  marketClose: "15:30",
  /** Relative volume floor for confirmation. */
  minRelativeVolume: 1.2,
  /** Absolute volume vs average range-bar volume multiplier. */
  minVolumeMultiple: 1.25,
  /** Breadth score floors/ceilings. */
  bullishBreadthMin: 55,
  bearishBreadthMax: 45,
  /** Average sector score floors/ceilings. */
  bullishSectorMin: 55,
  bearishSectorMax: 45,
  /** Liquidity: minimum candle volume for breakout bar. */
  minBreakoutVolume: 1,
  /** ATR vs range width — liquidity/acceptability proxy. */
  maxRangeAtrRatio: 2.5,
  minRangeAtrRatio: 0.15,
  /** Wick rejection: wick / candle range. */
  maxWickRatio: 0.55,
  /** Regime confidence floor for detection. */
  minRegimeConfidence: 65,
  /** Detection confidence clamps. */
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  /** Weighting for ORB confidence composite. */
  confidenceWeights: {
    breakoutQuality: 0.25,
    volume: 0.2,
    breadth: 0.15,
    sector: 0.15,
    market: 0.15,
    liquidity: 0.1,
  },
  compatibleBullRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Event Driven",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  compatibleBearRegimes: [
    "Strong Bear",
    "Weak Bear",
    "Event Driven",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type ORBConfig = {
  readonly rangeStart: string;
  readonly rangeEnd: string;
  readonly sessionUtcOffsetMinutes: number;
  readonly minimumRangeCandles: number;
  readonly minimumSessionCandles: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minRelativeVolume: number;
  readonly minVolumeMultiple: number;
  readonly bullishBreadthMin: number;
  readonly bearishBreadthMax: number;
  readonly bullishSectorMin: number;
  readonly bearishSectorMax: number;
  readonly minBreakoutVolume: number;
  readonly maxRangeAtrRatio: number;
  readonly minRangeAtrRatio: number;
  readonly maxWickRatio: number;
  readonly minRegimeConfidence: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly confidenceFloor: number;
  readonly confidenceWeights: {
    readonly breakoutQuality: number;
    readonly volume: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
    readonly liquidity: number;
  };
  readonly compatibleBullRegimes: readonly MarketRegimeLabel[];
  readonly compatibleBearRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export const ORB_STRATEGY_ID = "orb" as const;
export const ORB_STRATEGY_NAME = "ORB" as const;
