/**
 * Institutional Accumulation types — Sprint 11B.3H.
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
import type { InstitutionalAccumulationConfig } from "./InstitutionalAccumulationConstants";

export type InstitutionalAccumulationDirection = "BUY" | "SELL" | "NONE";

export type InstitutionalAccumulationPattern =
  | "volume_dry_up"
  | "high_volume_breakout"
  | "absorption"
  | "shakeout_recovery"
  | "hidden_buying"
  | "demand_zone_defense"
  | "base_building"
  | "distribution"
  | "none";

export interface InstitutionalAccumulationDetection {
  detected: boolean;
  direction: InstitutionalAccumulationDirection;
  pattern: InstitutionalAccumulationPattern;
  demandZoneLow: number;
  demandZoneHigh: number;
  accumulationScore: number;
  volumeQuality: number;
  ema20: number;
  ema50: number;
  vwap: number;
  higherLows: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface InstitutionalAccumulationCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface InstitutionalAccumulationMarketData {
  candles1m?: readonly InstitutionalAccumulationCandle[];
  candles5m: readonly InstitutionalAccumulationCandle[];
  candles15m?: readonly InstitutionalAccumulationCandle[];
  candlesDaily?: readonly InstitutionalAccumulationCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  deliveryPercent?: number | null;
  newsDriven?: boolean;
}

export interface InstitutionalAccumulationStrategyInput
  extends StrategyMarketInput {
  institutionalAccumulation: InstitutionalAccumulationMarketData;
}

export interface InstitutionalAccumulationDetectionContext {
  input: InstitutionalAccumulationStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<InstitutionalAccumulationConfig>;
  timestamp?: Date;
}

export interface InstitutionalAccumulationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isInstitutionalAccumulationStrategyInput(
  input:
    | StrategyMarketInput
    | InstitutionalAccumulationStrategyInput
    | null
    | undefined
): input is InstitutionalAccumulationStrategyInput {
  if (
    !input ||
    !("institutionalAccumulation" in input) ||
    !input.institutionalAccumulation
  ) {
    return false;
  }
  return Array.isArray(input.institutionalAccumulation.candles5m);
}

export function toInstitutionalAccumulationDetectionContext(
  context: StrategyExecutionContext
): InstitutionalAccumulationDetectionContext | null {
  if (!isInstitutionalAccumulationStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
