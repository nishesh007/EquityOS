/**
 * VCP types — Sprint 11B.3L.
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
import type { VCPConfig } from "./VCPConstants";

export type VCPDirection = "BUY" | "NONE";

export interface VCPContraction {
  index: number;
  high: number;
  low: number;
  range: number;
  averageVolume: number;
}

export interface VCPDetection {
  detected: boolean;
  direction: VCPDirection;
  contractionCount: number;
  contractions: VCPContraction[];
  pivotPrice: number;
  pivotLow: number;
  lastContractionLow: number;
  patternQuality: number;
  contractionQuality: number;
  volumeDryUpScore: number;
  breakoutQuality: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
  primaryUptrend: boolean;
  volumeDryUp: boolean;
  breakoutConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface VCPCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface VCPMarketData {
  candlesDaily: readonly VCPCandle[];
  candlesWeekly?: readonly VCPCandle[];
  candles5m?: readonly VCPCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  fiftyTwoWeekHigh?: number | null;
  newsDriven?: boolean;
}

export interface VCPStrategyInput extends StrategyMarketInput {
  vcp: VCPMarketData;
}

export interface VCPDetectionContext {
  input: VCPStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<VCPConfig>;
  timestamp?: Date;
}

export interface VCPValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isVCPStrategyInput(
  input: StrategyMarketInput | VCPStrategyInput | null | undefined
): input is VCPStrategyInput {
  if (!input || !("vcp" in input) || !input.vcp) return false;
  return Array.isArray(input.vcp.candlesDaily);
}

export function toVCPDetectionContext(
  context: StrategyExecutionContext
): VCPDetectionContext | null {
  if (!isVCPStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
