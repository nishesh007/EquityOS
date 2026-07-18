/**
 * Flat Base types — Sprint 11B.3R.
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
import type { FlatBaseConfig } from "./FlatBaseConstants";

export type FlatBaseDirection = "BUY" | "NONE";

export interface FlatBaseCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface FlatBaseGeometry {
  startIndex: number;
  endIndex: number;
  pivotPrice: number;
  baseLow: number;
  baseDepth: number;
  baseDepthPct: number;
  baseDuration: number;
  higherLows: boolean;
  atrContracted: boolean;
  tightCloses: boolean;
}

export interface FlatBaseDetection {
  detected: boolean;
  direction: FlatBaseDirection;
  pivotPrice: number;
  baseDepth: number;
  baseDepthPct: number;
  baseDuration: number;
  baseLow: number;
  baseQuality: number;
  breakoutQuality: number;
  trendQuality: number;
  volumeConfirmation: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
  flatBaseValid: boolean;
  baseValid: boolean;
  breakoutConfirmed: boolean;
  volumeConfirmed: boolean;
  rsConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  priorAdvancePct: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface FlatBaseMarketData {
  candlesDaily: readonly FlatBaseCandle[];
  candlesWeekly?: readonly FlatBaseCandle[];
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

export interface FlatBaseStrategyInput extends StrategyMarketInput {
  flatBase: FlatBaseMarketData;
}

export interface FlatBaseDetectionContext {
  input: FlatBaseStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<FlatBaseConfig>;
  timestamp?: Date;
}

export interface FlatBaseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isFlatBaseStrategyInput(
  input: StrategyMarketInput | FlatBaseStrategyInput | null | undefined
): input is FlatBaseStrategyInput {
  if (!input || !("flatBase" in input) || !input.flatBase) {
    return false;
  }
  return Array.isArray(input.flatBase.candlesDaily);
}

export function toFlatBaseDetectionContext(
  context: StrategyExecutionContext
): FlatBaseDetectionContext | null {
  if (!isFlatBaseStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
