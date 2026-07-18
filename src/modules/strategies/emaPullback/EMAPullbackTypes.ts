/**
 * EMA Pullback types — Sprint 11B.3P.
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
import type { EMAPullbackConfig } from "./EMAPullbackConstants";

export type EMAPullbackDirection = "BUY" | "SELL" | "NONE";

export type EMAPullbackTrendDirection = "Bull" | "Bear" | "None";

export type EMAPullbackType =
  | "ema20"
  | "ema50"
  | "vwap"
  | "none";

export interface EMAPullbackCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface EMAPullbackDetection {
  detected: boolean;
  direction: EMAPullbackDirection;
  trendDirection: EMAPullbackTrendDirection;
  pullbackType: EMAPullbackType;
  trendQuality: number;
  pullbackQuality: number;
  emaAlignment: number;
  volumeQuality: number;
  pullbackDepth: number;
  pullbackHigh: number;
  pullbackLow: number;
  ema9: number;
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  vwap: number;
  atr: number;
  adx: number;
  rsi: number;
  strongTrend: boolean;
  controlledPullback: boolean;
  bullishRejection: boolean;
  higherLow: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface EMAPullbackMarketData {
  candles1m?: readonly EMAPullbackCandle[];
  candles5m?: readonly EMAPullbackCandle[];
  candles15m?: readonly EMAPullbackCandle[];
  candlesDaily: readonly EMAPullbackCandle[];
  vwap: number;
  atr: number | null;
  ema9?: number | null;
  ema20: number | null;
  ema50: number | null;
  ema100: number | null;
  ema200: number | null;
  /** Optional EMA20 history (newest last) for rising slope. */
  ema20Series?: readonly number[] | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  rsi?: number | null;
  adx?: number | null;
  relativeStrength?: number | null;
  newsDriven?: boolean;
}

export interface EMAPullbackStrategyInput extends StrategyMarketInput {
  emaPullback: EMAPullbackMarketData;
}

export interface EMAPullbackDetectionContext {
  input: EMAPullbackStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<EMAPullbackConfig>;
  timestamp?: Date;
}

export interface EMAPullbackValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isEMAPullbackStrategyInput(
  input: StrategyMarketInput | EMAPullbackStrategyInput | null | undefined
): input is EMAPullbackStrategyInput {
  if (!input || !("emaPullback" in input) || !input.emaPullback) {
    return false;
  }
  return Array.isArray(input.emaPullback.candlesDaily);
}

export function toEMAPullbackDetectionContext(
  context: StrategyExecutionContext
): EMAPullbackDetectionContext | null {
  if (!isEMAPullbackStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
