/**
 * 52-Week High Breakout types — Sprint 11B.3S.
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
import type { FiftyTwoWeekHighConfig } from "./FiftyTwoWeekHighConstants";

export type FiftyTwoWeekHighDirection = "BUY" | "NONE";

export interface FiftyTwoWeekHighCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface FiftyTwoWeekHighBreakoutInfo {
  previous52WeekHigh: number;
  currentBreakoutLevel: number;
  breakoutAge: number;
  distanceFromBreakout: number;
  distanceFromBreakoutAtr: number;
  closingBreakout: boolean;
  intradayBreakout: boolean;
  breakoutAttempts: number;
  swingLow: number;
}

export interface FiftyTwoWeekHighDetection {
  detected: boolean;
  direction: FiftyTwoWeekHighDirection;
  previous52WeekHigh: number;
  currentBreakoutLevel: number;
  breakoutAge: number;
  distanceFromBreakout: number;
  distanceFromBreakoutAtr: number;
  breakoutQuality: number;
  trendQuality: number;
  volumeConfirmation: number;
  momentumPersistence: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
  swingLow: number;
  breakoutConfirmed: boolean;
  volumeConfirmed: boolean;
  rsConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  institutionalConfirmed: boolean;
  closingBreakout: boolean;
  intradayBreakout: boolean;
  breakoutAttempts: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface FiftyTwoWeekHighMarketData {
  candlesDaily: readonly FiftyTwoWeekHighCandle[];
  candlesWeekly?: readonly FiftyTwoWeekHighCandle[];
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
  fiftyTwoWeekLow?: number | null;
  newsDriven?: boolean;
}

export interface FiftyTwoWeekHighStrategyInput extends StrategyMarketInput {
  fiftyTwoWeekHigh: FiftyTwoWeekHighMarketData;
}

export interface FiftyTwoWeekHighDetectionContext {
  input: FiftyTwoWeekHighStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<FiftyTwoWeekHighConfig>;
  timestamp?: Date;
}

export interface FiftyTwoWeekHighValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isFiftyTwoWeekHighStrategyInput(
  input:
    | StrategyMarketInput
    | FiftyTwoWeekHighStrategyInput
    | null
    | undefined
): input is FiftyTwoWeekHighStrategyInput {
  if (
    !input ||
    !("fiftyTwoWeekHigh" in input) ||
    !input.fiftyTwoWeekHigh
  ) {
    return false;
  }
  return Array.isArray(input.fiftyTwoWeekHigh.candlesDaily);
}

export function toFiftyTwoWeekHighDetectionContext(
  context: StrategyExecutionContext
): FiftyTwoWeekHighDetectionContext | null {
  if (!isFiftyTwoWeekHighStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
