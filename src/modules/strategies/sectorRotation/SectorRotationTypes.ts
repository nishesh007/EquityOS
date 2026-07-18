/**
 * Sector Rotation types — Sprint 11B.3J.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import type {
  StrategyExecutionContext,
  StrategyMarketInput,
} from "../StrategyTypes";
import type { SectorRotationConfig } from "./SectorRotationConstants";

export type SectorRotationDirection = "BUY" | "SELL" | "NONE";

export type SectorRotationSignalKind =
  | "emerging_sector_leader"
  | "strengthening_sector"
  | "capital_rotation"
  | "institutional_sector_buying"
  | "sector_breakout"
  | "sector_breakdown"
  | "none";

export interface SectorRotationDetection {
  detected: boolean;
  direction: SectorRotationDirection;
  signalKind: SectorRotationSignalKind;
  sectorName: string;
  sectorRelativeStrength: number;
  sectorMomentum: number;
  sectorBreadth: number;
  stockRelativeStrength: number;
  benchmarkRelativeStrength: number;
  sectorOutperformsBenchmark: boolean;
  stockOutperformsSector: boolean;
  ema20: number;
  ema50: number;
  vwap: number;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface SectorRotationCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface SectorRotationMarketData {
  candles1m?: readonly SectorRotationCandle[];
  candles5m: readonly SectorRotationCandle[];
  candles15m?: readonly SectorRotationCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  relativeVolume: number | null;
  sectorName: string;
  sectorRelativeStrength: number | null;
  sectorMomentum: number | null;
  sectorBreadth: number | null;
  sectorVolume?: number | null;
  stockRelativeStrength: number | null;
  benchmarkRelativeStrength: number | null;
  newsDriven?: boolean;
}

export interface SectorRotationStrategyInput extends StrategyMarketInput {
  sectorRotation: SectorRotationMarketData;
}

export interface SectorRotationDetectionContext {
  input: SectorRotationStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<SectorRotationConfig>;
  timestamp?: Date;
}

export interface SectorRotationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isSectorRotationStrategyInput(
  input:
    | StrategyMarketInput
    | SectorRotationStrategyInput
    | null
    | undefined
): input is SectorRotationStrategyInput {
  if (!input || !("sectorRotation" in input) || !input.sectorRotation) {
    return false;
  }
  return Array.isArray(input.sectorRotation.candles5m);
}

export function toSectorRotationDetectionContext(
  context: StrategyExecutionContext
): SectorRotationDetectionContext | null {
  if (!isSectorRotationStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
