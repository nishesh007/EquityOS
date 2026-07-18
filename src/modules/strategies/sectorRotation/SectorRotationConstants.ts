/**
 * Sector Rotation constants — Sprint 11B.3J.
 */

import type { MarketRegimeLabel } from "@/src/modules/marketRegime";

export const SECTOR_ROTATION_STRATEGY_ID = "sector-rotation" as const;
export const SECTOR_ROTATION_STRATEGY_NAME = "Sector Rotation" as const;

export const DEFAULT_SECTOR_ROTATION_CONFIG = {
  sessionUtcOffsetMinutes: 330,
  marketOpen: "09:15",
  marketClose: "15:30",
  minimumSessionCandles: 8,
  trendLookbackBars: 8,
  /** Min sector relative strength score. */
  minSectorRelativeStrength: 60,
  /** Sector must beat benchmark by this margin. */
  minSectorVsBenchmarkMargin: 5,
  /** Stock must beat its sector by this margin. */
  minStockVsSectorMargin: 3,
  /** Min sector breadth / participation score. */
  minSectorBreadth: 55,
  /** Sector momentum (delta) minimum for emerging leader. */
  minSectorMomentum: 2,
  minEmaSeparationPct: 0.0006,
  minRelativeVolume: 1.0,
  preferredRelativeVolume: 1.2,
  volumeConfirmationMultiple: 1.15,
  circuitMovePct: 0.05,
  bullishBreadthMin: 50,
  bearishBreadthMax: 50,
  bullishSectorMin: 60,
  bearishSectorMax: 40,
  minRegimeConfidence: 65,
  maxVolatilityScore: 60,
  scoreFloor: 0,
  scoreCeiling: 100,
  confidenceFloor: 20,
  confidenceWeights: {
    sectorStrength: 0.25,
    relativeStrength: 0.2,
    sectorBreadth: 0.15,
    volume: 0.1,
    market: 0.1,
    trendStructure: 0.1,
    vwap: 0.1,
  },
  compatibleRegimes: [
    "Strong Bull",
    "Weak Bull",
    "Sideways",
    "Low Volatility",
    "Weak Bear",
  ] as const satisfies readonly MarketRegimeLabel[],
  blockedRegimes: [
    "Strong Bear",
    "High Volatility",
  ] as const satisfies readonly MarketRegimeLabel[],
  bullBlockedRegimes: ["Strong Bear"] as const satisfies readonly MarketRegimeLabel[],
  bearBlockedRegimes: ["Strong Bull"] as const satisfies readonly MarketRegimeLabel[],
  blockedRiskModes: ["Risk Off"] as const,
} as const;

export type SectorRotationConfig = {
  readonly sessionUtcOffsetMinutes: number;
  readonly marketOpen: string;
  readonly marketClose: string;
  readonly minimumSessionCandles: number;
  readonly trendLookbackBars: number;
  readonly minSectorRelativeStrength: number;
  readonly minSectorVsBenchmarkMargin: number;
  readonly minStockVsSectorMargin: number;
  readonly minSectorBreadth: number;
  readonly minSectorMomentum: number;
  readonly minEmaSeparationPct: number;
  readonly minRelativeVolume: number;
  readonly preferredRelativeVolume: number;
  readonly volumeConfirmationMultiple: number;
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
    readonly sectorStrength: number;
    readonly relativeStrength: number;
    readonly sectorBreadth: number;
    readonly volume: number;
    readonly market: number;
    readonly trendStructure: number;
    readonly vwap: number;
  };
  readonly compatibleRegimes: readonly MarketRegimeLabel[];
  readonly blockedRegimes: readonly MarketRegimeLabel[];
  readonly bullBlockedRegimes: readonly MarketRegimeLabel[];
  readonly bearBlockedRegimes: readonly MarketRegimeLabel[];
  readonly blockedRiskModes: readonly ("Risk On" | "Neutral" | "Risk Off")[];
};

export function resolveSectorRotationConfig(
  partial?: Partial<SectorRotationConfig> & {
    confidenceWeights?: Partial<SectorRotationConfig["confidenceWeights"]>;
  }
): SectorRotationConfig {
  return {
    ...DEFAULT_SECTOR_ROTATION_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_SECTOR_ROTATION_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleRegimes:
      partial?.compatibleRegimes ?? DEFAULT_SECTOR_ROTATION_CONFIG.compatibleRegimes,
    blockedRegimes:
      partial?.blockedRegimes ?? DEFAULT_SECTOR_ROTATION_CONFIG.blockedRegimes,
    bullBlockedRegimes:
      partial?.bullBlockedRegimes ??
      DEFAULT_SECTOR_ROTATION_CONFIG.bullBlockedRegimes,
    bearBlockedRegimes:
      partial?.bearBlockedRegimes ??
      DEFAULT_SECTOR_ROTATION_CONFIG.bearBlockedRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_SECTOR_ROTATION_CONFIG.blockedRiskModes,
  };
}
