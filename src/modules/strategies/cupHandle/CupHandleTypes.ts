/**
 * Cup & Handle types — Sprint 11B.3Q.
 * BUY only.
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
import type { CupHandleConfig } from "./CupHandleConstants";

export type CupHandleDirection = "BUY" | "NONE";

export interface CupHandleCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface CupGeometry {
  leftPeakIndex: number;
  leftPeakPrice: number;
  cupBottomIndex: number;
  cupBottomPrice: number;
  rightPeakIndex: number;
  rightPeakPrice: number;
  cupDepth: number;
  cupDepthPct: number;
  cupDuration: number;
  cupWidth: number;
  rounded: boolean;
  higherLows: boolean;
}

export interface HandleGeometry {
  startIndex: number;
  endIndex: number;
  handleHigh: number;
  handleLow: number;
  handleDepth: number;
  handleDepthPct: number;
  handleDuration: number;
  decliningVolume: boolean;
  upperHalf: boolean;
  tightRange: boolean;
}

export interface CupHandleDetection {
  detected: boolean;
  direction: CupHandleDirection;
  cupDepth: number;
  cupDepthPct: number;
  cupDuration: number;
  handleDepth: number;
  handleDepthPct: number;
  handleDuration: number;
  pivotPrice: number;
  leftPeakPrice: number;
  cupBottomPrice: number;
  rightPeakPrice: number;
  handleHigh: number;
  handleLow: number;
  cupQuality: number;
  handleQuality: number;
  breakoutQuality: number;
  volumeConfirmation: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
  roundedCup: boolean;
  handleValid: boolean;
  breakoutConfirmed: boolean;
  volumeConfirmed: boolean;
  rsConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface CupHandleMarketData {
  candlesDaily: readonly CupHandleCandle[];
  candlesWeekly?: readonly CupHandleCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  relativeStrength?: number | null;
  fiftyTwoWeekHigh?: number | null;
  newsDriven?: boolean;
}

export interface CupHandleStrategyInput extends StrategyMarketInput {
  cupHandle: CupHandleMarketData;
}

export interface CupHandleDetectionContext {
  input: CupHandleStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<CupHandleConfig>;
  timestamp?: Date;
}

export interface CupHandleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isCupHandleStrategyInput(
  input: StrategyMarketInput | CupHandleStrategyInput | null | undefined
): input is CupHandleStrategyInput {
  if (!input || !("cupHandle" in input) || !input.cupHandle) {
    return false;
  }
  return Array.isArray(input.cupHandle.candlesDaily);
}

export function toCupHandleDetectionContext(
  context: StrategyExecutionContext
): CupHandleDetectionContext | null {
  if (!isCupHandleStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
