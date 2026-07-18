/**
 * ORB Detection types — Sprint 11B.3B.1.
 * Detection only — no entry / stop / target / trade recommendation.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import type { StrategyExecutionContext, StrategyMarketInput } from "../StrategyTypes";
import type { ORBConfig } from "./ORBConstants";

export type ORBDirection = "BUY" | "SELL" | "NONE";

/**
 * Canonical ORB detection output.
 */
export interface ORBDetection {
  detected: boolean;
  direction: ORBDirection;
  openingHigh: number;
  openingLow: number;
  breakoutPrice: number;
  breakoutTime: Date;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  liquidityConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface ORBCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * ORB-specific market payload. Supplied by callers using existing EquityOS
 * OHLC / VWAP / volume feeds — no duplicate fetching inside the detector.
 */
export interface ORBMarketData {
  candles5m: readonly ORBCandle[];
  candles15m?: readonly ORBCandle[];
  vwap: number | null;
  relativeVolume: number | null;
  atr: number | null;
  /** Optional average volume of opening-range bars for relative checks. */
  averageVolume?: number | null;
}

export interface ORBStrategyInput extends StrategyMarketInput {
  orb: ORBMarketData;
}

export interface ORBDetectionContext {
  input: ORBStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<ORBConfig>;
  timestamp?: Date;
}

export interface OpeningRange {
  high: number;
  low: number;
  start: Date;
  end: Date;
  candles: ORBCandle[];
  rangeWidth: number;
}

export interface ORBBreakoutCandidate {
  direction: Exclude<ORBDirection, "NONE">;
  candle: ORBCandle;
  openingHigh: number;
  openingLow: number;
  falseBreakout: boolean;
  falseBreakoutReasons: string[];
}

export interface ORBValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isORBStrategyInput(
  input: StrategyMarketInput | ORBStrategyInput | null | undefined
): input is ORBStrategyInput {
  if (!input || !("orb" in input) || !input.orb) return false;
  return Array.isArray(input.orb.candles5m);
}

export function toORBDetectionContext(
  context: StrategyExecutionContext
): ORBDetectionContext | null {
  if (!isORBStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
