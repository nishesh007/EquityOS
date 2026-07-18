/**
 * Momentum Continuation types — Sprint 11B.3F.
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
import type { MomentumContinuationConfig } from "./MomentumContinuationConstants";

export type MomentumContinuationDirection = "BUY" | "SELL" | "NONE";

export interface MomentumContinuationDetection {
  detected: boolean;
  direction: MomentumContinuationDirection;
  trendStrength: number;
  pullbackDepth: number;
  pullbackHigh: number;
  pullbackLow: number;
  ema20: number;
  ema50: number;
  vwap: number;
  adx: number;
  rsi: number;
  strongTrend: boolean;
  healthyPullback: boolean;
  momentumResumption: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface MomentumContinuationCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

/**
 * Market payload supplied by callers — no duplicate fetching inside detector.
 */
export interface MomentumContinuationMarketData {
  candles1m?: readonly MomentumContinuationCandle[];
  candles5m: readonly MomentumContinuationCandle[];
  candles15m?: readonly MomentumContinuationCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  /** Optional EMA20 series for slope checks (newest last). */
  ema20Series?: readonly number[] | null;
  relativeVolume: number | null;
  averageVolume?: number | null;
  rsi?: number | null;
  adx?: number | null;
  /** Optional news/event flag from upstream. */
  newsDriven?: boolean;
}

export interface MomentumContinuationStrategyInput extends StrategyMarketInput {
  momentumContinuation: MomentumContinuationMarketData;
}

export interface MomentumContinuationDetectionContext {
  input: MomentumContinuationStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<MomentumContinuationConfig>;
  timestamp?: Date;
}

export interface MomentumContinuationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isMomentumContinuationStrategyInput(
  input:
    | StrategyMarketInput
    | MomentumContinuationStrategyInput
    | null
    | undefined
): input is MomentumContinuationStrategyInput {
  if (
    !input ||
    !("momentumContinuation" in input) ||
    !input.momentumContinuation
  ) {
    return false;
  }
  return Array.isArray(input.momentumContinuation.candles5m);
}

export function toMomentumContinuationDetectionContext(
  context: StrategyExecutionContext
): MomentumContinuationDetectionContext | null {
  if (!isMomentumContinuationStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
