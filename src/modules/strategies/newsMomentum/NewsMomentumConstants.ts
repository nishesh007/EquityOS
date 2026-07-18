/**
 * News Momentum constants — Sprint 11B.3K.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const NEWS_MOMENTUM_STRATEGY_ID = "news-momentum" as const;
export const NEWS_MOMENTUM_STRATEGY_NAME = "News Momentum" as const;

export const DEFAULT_NEWS_MOMENTUM_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 6,
  /** Max age of news in minutes for freshness. */
  maxNewsAgeMinutes: 180,
  /** Min news quality grade index (0=Ignore … 4=Very High). */
  minNewsQualityIndex: 3,
  minCredibility: 60,
  minImpact: 55,
  minRelativeVolume: 1.15,
  preferredRelativeVolume: 1.4,
  volumeConfirmationMultiple: 1.25,
  minEmaSeparationPct: 0.0005,
  circuitMovePct: 0.06,
  bullishBreadthMin: 40,
  bearishBreadthMax: 60,
  bullishSectorMin: 40,
  bearishSectorMax: 60,
  minRegimeConfidence: 55,
  minVolatilityScore: 45,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    newsQuality: 0.3,
    priceConfirmation: 0.15,
    volumeConfirmation: 0.15,
    sector: 0.1,
    breadth: 0.1,
    market: 0.1,
    vwap: 0.1,
  },
  compatibleRegimes: [
    "High Volatility",
    "Event Driven",
    "Strong Bull",
    "Weak Bull",
    "Strong Bear",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Low Volatility",
    "Sideways",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: ["Strong Bear"] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: ["Strong Bull"] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type NewsMomentumConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly maxNewsAgeMinutes: number;
  readonly minNewsQualityIndex: number;
  readonly minCredibility: number;
  readonly minImpact: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly volumeConfirmationMultiple: number;
  readonly minEmaSeparationPct: number;
  readonly circuitMovePct: number;
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
    readonly newsQuality: number;
    readonly priceConfirmation: number;
    readonly volumeConfirmation: number;
    readonly sector: number;
    readonly breadth: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveNewsMomentumConfig(
  partial?: Partial<NewsMomentumConfig> & {
    confidenceWeights?: Partial<NewsMomentumConfig["confidenceWeights"]>;
  }
): NewsMomentumConfig {
  return {
    ...DEFAULT_NEWS_MOMENTUM_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_NEWS_MOMENTUM_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_NEWS_MOMENTUM_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_NEWS_MOMENTUM_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_NEWS_MOMENTUM_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_NEWS_MOMENTUM_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_NEWS_MOMENTUM_CONFIG.blockedRiskModes,
  };
}
