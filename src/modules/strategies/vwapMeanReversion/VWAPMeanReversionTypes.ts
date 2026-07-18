/**
 * VWAP Mean Reversion Detection types — Sprint 11B.3D.1.
 * Detection only — no entry / stop / target construction.
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
import type { VWAPMeanReversionConfig } from "./VWAPMeanReversionConstants";

export type VWAPMeanReversionDirection = "BUY" | "SELL" | "NONE";

export interface VWAPMeanReversionDetection {
  detected: boolean;
  direction: VWAPMeanReversionDirection;
  vwap: number;
  deviation: number;
  deviationBand: number;
  rsi: number;
  reversalConfirmed: boolean;
  volumeStable: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface VWAPMeanReversionCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface VWAPStandardDeviationBands {
  upper: number;
  lower: number;
  /** σ of price vs VWAP (or supplied std). */
  sigma: number;
}

/**
 * Market payload supplied by callers — no duplicate fetching inside detector.
 */
export interface VWAPMeanReversionMarketData {
  candles1m?: readonly VWAPMeanReversionCandle[];
  candles5m: readonly VWAPMeanReversionCandle[];
  vwap: number;
  /** Precomputed σ; if omitted, derived from closes vs VWAP. */
  vwapStdDev?: number | null;
  bands?: VWAPStandardDeviationBands | null;
  atr: number | null;
  relativeVolume: number | null;
  averageVolume?: number | null;
  /** Precomputed RSI; if omitted, derived from closes. */
  rsi?: number | null;
  /** Optional news/event flag from upstream. */
  newsDriven?: boolean;
}

export interface VWAPMeanReversionStrategyInput extends StrategyMarketInput {
  vwapMeanReversion: VWAPMeanReversionMarketData;
}

export interface VWAPMeanReversionDetectionContext {
  input: VWAPMeanReversionStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<VWAPMeanReversionConfig>;
  timestamp?: Date;
}

export interface VWAPMeanReversionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isVWAPMeanReversionStrategyInput(
  input:
    | StrategyMarketInput
    | VWAPMeanReversionStrategyInput
    | null
    | undefined
): input is VWAPMeanReversionStrategyInput {
  if (!input || !("vwapMeanReversion" in input) || !input.vwapMeanReversion) {
    return false;
  }
  return Array.isArray(input.vwapMeanReversion.candles5m);
}

export function toVWAPMeanReversionDetectionContext(
  context: StrategyExecutionContext
): VWAPMeanReversionDetectionContext | null {
  if (!isVWAPMeanReversionStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
