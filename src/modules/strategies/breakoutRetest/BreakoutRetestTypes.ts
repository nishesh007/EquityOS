/**
 * Breakout Retest types — Sprint 11B.3I.
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
import type { BreakoutRetestConfig } from "./BreakoutRetestConstants";

export type BreakoutRetestDirection = "BUY" | "SELL" | "NONE";

export type BreakoutRetestPhase =
  | "breakout"
  | "retest"
  | "continuation"
  | "none";

export interface BreakoutRetestDetection {
  detected: boolean;
  direction: BreakoutRetestDirection;
  phase: BreakoutRetestPhase;
  breakoutLevel: number;
  breakoutExtreme: number;
  retestLow: number;
  retestHigh: number;
  breakoutQuality: number;
  retestQuality: number;
  ema20: number;
  ema50: number;
  vwap: number;
  breakoutConfirmed: boolean;
  retestHeld: boolean;
  continuationConfirmed: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface BreakoutRetestCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface BreakoutRetestMarketData {
  candles1m?: readonly BreakoutRetestCandle[];
  candles5m: readonly BreakoutRetestCandle[];
  candles15m?: readonly BreakoutRetestCandle[];
  candlesDaily?: readonly BreakoutRetestCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  relativeVolume: number | null;
  supportLevels?: readonly number[];
  resistanceLevels?: readonly number[];
  newsDriven?: boolean;
}

export interface BreakoutRetestStrategyInput extends StrategyMarketInput {
  breakoutRetest: BreakoutRetestMarketData;
}

export interface BreakoutRetestDetectionContext {
  input: BreakoutRetestStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<BreakoutRetestConfig>;
  timestamp?: Date;
}

export interface BreakoutRetestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isBreakoutRetestStrategyInput(
  input:
    | StrategyMarketInput
    | BreakoutRetestStrategyInput
    | null
    | undefined
): input is BreakoutRetestStrategyInput {
  if (!input || !("breakoutRetest" in input) || !input.breakoutRetest) {
    return false;
  }
  return Array.isArray(input.breakoutRetest.candles5m);
}

export function toBreakoutRetestDetectionContext(
  context: StrategyExecutionContext
): BreakoutRetestDetectionContext | null {
  if (!isBreakoutRetestStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
