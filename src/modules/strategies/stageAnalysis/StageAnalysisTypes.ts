/**
 * Stage Analysis types — Sprint 11B.3M.
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
import type { StageAnalysisConfig } from "./StageAnalysisConstants";

export type WeinsteinStage = 1 | 2 | 3 | 4;

export type StageTransition =
  | "none"
  | "1_to_2"
  | "2_to_3"
  | "3_to_4"
  | "4_to_1";

export type StageAnalysisDirection = "BUY" | "SELL" | "NONE";

export interface StageAnalysisCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface StageAnalysisMarketData {
  candlesDaily: readonly StageAnalysisCandle[];
  candlesWeekly: readonly StageAnalysisCandle[];
  ma30Week: number | null;
  /** Prior 30W MA values (oldest → newest) for slope/history. */
  ma30WeekHistory?: readonly number[];
  ema20: number | null;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  vwap: number;
  atr: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  relativeVolume: number | null;
  averageVolume20Week?: number | null;
  relativeStrength: number | null;
  previousStage?: WeinsteinStage | null;
}

export interface StageAnalysisDetection {
  detected: boolean;
  direction: StageAnalysisDirection;
  stage: WeinsteinStage | 0;
  previousStage: WeinsteinStage | 0;
  transition: StageTransition;
  transitionConfidence: number;
  stageQuality: number;
  trendStructure: number;
  relativeStrengthScore: number;
  volumeQuality: number;
  earlyStage2: boolean;
  lateStage2: boolean;
  ma30Week: number;
  maRising: boolean;
  maFalling: boolean;
  maFlat: boolean;
  priceAboveMa: boolean;
  priceBelowMa: boolean;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  institutionalAccumulation: boolean;
  distribution: boolean;
  ema20: number;
  ema50: number;
  vwap: number;
  atr: number;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  rsConfirmed: boolean;
  volumeConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface StageAnalysisStrategyInput extends StrategyMarketInput {
  stageAnalysis: StageAnalysisMarketData;
}

export interface StageAnalysisDetectionContext {
  input: StageAnalysisStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<StageAnalysisConfig>;
  timestamp?: Date;
}

export interface StageAnalysisValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isStageAnalysisStrategyInput(
  input: StrategyMarketInput | StageAnalysisStrategyInput | null | undefined
): input is StageAnalysisStrategyInput {
  if (!input || !("stageAnalysis" in input) || !input.stageAnalysis) {
    return false;
  }
  return (
    Array.isArray(input.stageAnalysis.candlesDaily) &&
    Array.isArray(input.stageAnalysis.candlesWeekly)
  );
}

export function toStageAnalysisDetectionContext(
  context: StrategyExecutionContext
): StageAnalysisDetectionContext | null {
  if (!isStageAnalysisStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
