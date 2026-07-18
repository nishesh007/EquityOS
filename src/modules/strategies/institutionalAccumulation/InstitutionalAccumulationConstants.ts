/**
 * Institutional Accumulation constants — Sprint 11B.3H.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const INSTITUTIONAL_ACCUMULATION_STRATEGY_ID =
  "institutional-accumulation" as const;
export const INSTITUTIONAL_ACCUMULATION_STRATEGY_NAME =
  "Institutional Accumulation" as const;

export const DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 10,
  patternLookbackBars: 8,
  demandZoneLookbackBars: 6,
  /** Close must be in top/bottom fraction of bar range (accumulation/distribution). */
  closeNearExtremeFraction: 0.65,
  /** Volume multiple of recent average for accumulation candle. */
  accumulationVolumeMultiple: 1.35,
  /** Min relative volume. */
  minRelativeVolume: 0.95,
  preferredRelativeVolume: 1.25,
  /** Delivery % soft confirmation when present. */
  minDeliveryPercent: 40,
  /** Max downside on high-volume bar as fraction of range (absorption). */
  maxAbsorptionDownsideFraction: 0.35,
  /** Shakeout: wick must exceed this fraction of range. */
  minShakeoutWickFraction: 0.45,
  /** Demand zone defense: min touches. */
  minDemandZoneTouches: 2,
  equalLevelTolerancePct: 0.002,
  minEmaSeparationPct: 0.0005,
  volumeDryUpMaxMultiple: 0.65,
  circuitMovePct: 0.05,
  bullishBreadthMin: 48,
  bearishBreadthMax: 52,
  bullishSectorMin: 52,
  bearishSectorMax: 48,
  minRegimeConfidence: 70,
  maxVolatilityScore: 50,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    accumulationQuality: 0.25,
    volumeQuality: 0.2,
    trendStructure: 0.15,
    breadth: 0.1,
    sector: 0.1,
    market: 0.1,
    vwap: 0.1,
  },
  compatibleRegimes: [
    "Weak Bull",
    "Sideways",
    "Low Volatility",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "High Volatility",
    "Event Driven",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: ["Strong Bear"] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: ["Strong Bull"] as const satisfies readonly MarketRegimeLabel[],
  /** Accumulation prefers Risk On; Neutral allowed with reduced score. */
  preferredRiskModes: ["Risk On"] as const,
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type InstitutionalAccumulationConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly patternLookbackBars: number;
  readonly demandZoneLookbackBars: number;
  readonly closeNearExtremeFraction: number;
  readonly accumulationVolumeMultiple: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly minDeliveryPercent: number;
  readonly maxAbsorptionDownsideFraction: number;
  readonly minShakeoutWickFraction: number;
  readonly minDemandZoneTouches: number;
  readonly equalLevelTolerancePct: number;
  readonly minEmaSeparationPct: number;
  readonly volumeDryUpMaxMultiple: number;
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
    readonly accumulationQuality: number;
    readonly volumeQuality: number;
    readonly trendStructure: number;
    readonly breadth: number;
    readonly sector: number;
    readonly market: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly preferredRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveInstitutionalAccumulationConfig(
  partial?: Partial<InstitutionalAccumulationConfig> & {
    confidenceWeights?: Partial<
      InstitutionalAccumulationConfig["confidenceWeights"]
    >;
  }
): InstitutionalAccumulationConfig {
  return {
    ...DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.bearBlockedRegimes,
    preferredRiskModes:
      partial?.preferredRiskModes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.preferredRiskModes,
    blockedRiskModes:
      partial?.blockedRiskModes ??
      DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG.blockedRiskModes,
  };
}
