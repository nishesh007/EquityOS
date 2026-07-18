/**
 * VWAP Continuation Detection types — Sprint 11B.3C.1.
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
import type { VWAPContinuationConfig } from "./VWAPContinuationConstants";

export type VWAPContinuationDirection = "BUY" | "SELL" | "NONE";

export interface VWAPContinuationDetection {
  detected: boolean;
  direction: VWAPContinuationDirection;
  vwap: number;
  distanceFromVWAP: number;
  pullbackDetected: boolean;
  bounceConfirmed: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface VWAPCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Optional per-bar VWAP when series is supplied via candles. */
  vwap?: number;
}

/**
 * Market payload supplied by callers — no duplicate fetching inside detector.
 */
export interface VWAPContinuationMarketData {
  candles1m?: readonly VWAPCandle[];
  candles5m: readonly VWAPCandle[];
  candles15m?: readonly VWAPCandle[];
  vwap: number;
  /** Ordered VWAP samples for slope (oldest → newest). */
  vwapSeries?: readonly number[];
  atr: number | null;
  relativeVolume: number | null;
  averageVolume?: number | null;
}

export interface VWAPContinuationStrategyInput extends StrategyMarketInput {
  vwapContinuation: VWAPContinuationMarketData;
}

export interface VWAPContinuationDetectionContext {
  input: VWAPContinuationStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<VWAPContinuationConfig>;
  timestamp?: Date;
}

export interface VWAPContinuationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isVWAPContinuationStrategyInput(
  input: StrategyMarketInput | VWAPContinuationStrategyInput | null | undefined
): input is VWAPContinuationStrategyInput {
  if (!input || !("vwapContinuation" in input) || !input.vwapContinuation) {
    return false;
  }
  return Array.isArray(input.vwapContinuation.candles5m);
}

export function toVWAPContinuationDetectionContext(
  context: StrategyExecutionContext
): VWAPContinuationDetectionContext | null {
  if (!isVWAPContinuationStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
