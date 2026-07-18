/**
 * Liquidity Sweep types — Sprint 11B.3E.
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
import type { LiquiditySweepConfig } from "./LiquiditySweepConstants";

export type LiquiditySweepDirection = "BUY" | "SELL" | "NONE";

export type LiquiditySweepType =
  | "swing_high_sweep"
  | "swing_low_sweep"
  | "equal_high_sweep"
  | "equal_low_sweep"
  | "stop_hunt"
  | "liquidity_grab"
  | "false_breakout"
  | "false_breakdown"
  | "none";

export interface LiquidityZone {
  level: number;
  kind: "swing_high" | "swing_low" | "equal_high" | "equal_low" | "custom";
  touches: number;
}

export interface LiquiditySweepDetection {
  detected: boolean;
  direction: LiquiditySweepDirection;
  sweepType: LiquiditySweepType;
  liquidityLevel: number;
  sweepExtreme: number;
  reclaimClose: number;
  sweepDistance: number;
  reversalConfirmed: boolean;
  volumeSpike: boolean;
  relativeVolumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface LiquiditySweepCandle {
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
export interface LiquiditySweepMarketData {
  candles1m?: readonly LiquiditySweepCandle[];
  candles5m: readonly LiquiditySweepCandle[];
  candles15m?: readonly LiquiditySweepCandle[];
  vwap: number;
  atr: number | null;
  relativeVolume: number | null;
  averageVolume?: number | null;
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  liquidityZones?: readonly LiquidityZone[];
  /** Optional news/event flag from upstream. */
  newsDriven?: boolean;
}

export interface LiquiditySweepStrategyInput extends StrategyMarketInput {
  liquiditySweep: LiquiditySweepMarketData;
}

export interface LiquiditySweepDetectionContext {
  input: LiquiditySweepStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<LiquiditySweepConfig>;
  timestamp?: Date;
}

export interface LiquiditySweepValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isLiquiditySweepStrategyInput(
  input:
    | StrategyMarketInput
    | LiquiditySweepStrategyInput
    | null
    | undefined
): input is LiquiditySweepStrategyInput {
  if (!input || !("liquiditySweep" in input) || !input.liquiditySweep) {
    return false;
  }
  return Array.isArray(input.liquiditySweep.candles5m);
}

export function toLiquiditySweepDetectionContext(
  context: StrategyExecutionContext
): LiquiditySweepDetectionContext | null {
  if (!isLiquiditySweepStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
