/**
 * Relative Strength Intraday types — Sprint 11B.3G.
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
import type { RelativeStrengthIntradayConfig } from "./RelativeStrengthIntradayConstants";

export type RelativeStrengthIntradayDirection = "BUY" | "SELL" | "NONE";

export interface RelativeStrengthIntradayDetection {
  detected: boolean;
  direction: RelativeStrengthIntradayDirection;
  stockRelativeStrength: number;
  sectorRelativeStrength: number;
  benchmarkRelativeStrength: number;
  relativeStrengthScore: number;
  outperformsBenchmark: boolean;
  outperformsSector: boolean;
  ema20: number;
  ema50: number;
  vwap: number;
  strongTrend: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface RelativeStrengthIntradayCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface RelativeStrengthIntradayMarketData {
  candles1m?: readonly RelativeStrengthIntradayCandle[];
  candles5m: readonly RelativeStrengthIntradayCandle[];
  candles15m?: readonly RelativeStrengthIntradayCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  ema20Series?: readonly number[] | null;
  relativeVolume: number | null;
  averageVolume?: number | null;
  /** Precomputed stock RS score 0–100 (or signed vs peers). */
  stockRelativeStrength: number | null;
  sectorRelativeStrength: number | null;
  benchmarkRelativeStrength: number | null;
  openingRangeHigh?: number | null;
  openingRangeLow?: number | null;
  newsDriven?: boolean;
}

export interface RelativeStrengthIntradayStrategyInput extends StrategyMarketInput {
  relativeStrengthIntraday: RelativeStrengthIntradayMarketData;
}

export interface RelativeStrengthIntradayDetectionContext {
  input: RelativeStrengthIntradayStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<RelativeStrengthIntradayConfig>;
  timestamp?: Date;
}

export interface RelativeStrengthIntradayValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isRelativeStrengthIntradayStrategyInput(
  input:
    | StrategyMarketInput
    | RelativeStrengthIntradayStrategyInput
    | null
    | undefined
): input is RelativeStrengthIntradayStrategyInput {
  if (
    !input ||
    !("relativeStrengthIntraday" in input) ||
    !input.relativeStrengthIntraday
  ) {
    return false;
  }
  return Array.isArray(input.relativeStrengthIntraday.candles5m);
}

export function toRelativeStrengthIntradayDetectionContext(
  context: StrategyExecutionContext
): RelativeStrengthIntradayDetectionContext | null {
  if (!isRelativeStrengthIntradayStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
