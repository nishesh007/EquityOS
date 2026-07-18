/**
 * Darvas Box types — Sprint 11B.3N.
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
import type { DarvasBoxConfig } from "./DarvasBoxConstants";

export type DarvasBoxDirection = "BUY" | "NONE";

export interface DarvasBoxGeometry {
  boxHigh: number;
  boxLow: number;
  boxHeight: number;
  boxDuration: number;
  startIndex: number;
  endIndex: number;
  resistanceTouches: number;
  supportTouches: number;
  failedBreakoutAttempts: number;
}

export interface DarvasBoxDetection {
  detected: boolean;
  direction: DarvasBoxDirection;
  boxHigh: number;
  boxLow: number;
  boxHeight: number;
  boxDuration: number;
  resistanceTouches: number;
  supportTouches: number;
  failedBreakoutAttempts: number;
  boxQuality: number;
  breakoutQuality: number;
  volumeConfirmation: number;
  trendStructure: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
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

export interface DarvasBoxCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface DarvasBoxMarketData {
  candlesDaily: readonly DarvasBoxCandle[];
  candlesWeekly?: readonly DarvasBoxCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  fiftyTwoWeekHigh?: number | null;
  relativeStrength: number | null;
  newsDriven?: boolean;
}

export interface DarvasBoxStrategyInput extends StrategyMarketInput {
  darvasBox: DarvasBoxMarketData;
}

export interface DarvasBoxDetectionContext {
  input: DarvasBoxStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<DarvasBoxConfig>;
  timestamp?: Date;
}

export interface DarvasBoxValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isDarvasBoxStrategyInput(
  input: StrategyMarketInput | DarvasBoxStrategyInput | null | undefined
): input is DarvasBoxStrategyInput {
  if (!input || !("darvasBox" in input) || !input.darvasBox) return false;
  return Array.isArray(input.darvasBox.candlesDaily);
}

export function toDarvasBoxDetectionContext(
  context: StrategyExecutionContext
): DarvasBoxDetectionContext | null {
  if (!isDarvasBoxStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
