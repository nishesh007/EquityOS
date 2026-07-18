/**
 * Earnings Momentum types — Sprint 11B.3T.
 * BUY + SELL.
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
import type { EarningsMomentumConfig } from "./EarningsMomentumConstants";

export type EarningsMomentumDirection = "BUY" | "SELL" | "NONE";

export type EarningsGuidanceTone =
  | "upgrade"
  | "downgrade"
  | "inline"
  | "none";

export interface EarningsMomentumCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface EarningsFundamentals {
  epsActual: number;
  epsEstimate: number;
  revenueActual: number;
  revenueEstimate: number;
  ebitda?: number | null;
  ebitdaPrior?: number | null;
  operatingMargin?: number | null;
  operatingMarginPrior?: number | null;
  netProfit?: number | null;
  patGrowth?: number | null;
  revenueGrowthYoy?: number | null;
  revenueGrowthQoq?: number | null;
  epsGrowthYoy?: number | null;
  epsGrowthQoq?: number | null;
  guidance: EarningsGuidanceTone;
  estimateRevision?: number | null;
  oneTimeGains?: boolean;
  accountingAdjustments?: boolean;
  managementCommentaryPositive?: boolean;
  institutionalBuying?: boolean;
  institutionalSelling?: boolean;
}

export interface EarningsAnalysis {
  epsSurprise: number;
  revenueSurprise: number;
  profitGrowth: number;
  revenueGrowth: number;
  operatingMarginExpansion: number;
  ebitdaGrowth: number;
  guidanceUpgrade: boolean;
  guidanceDowngrade: boolean;
  sequentialGrowth: number;
  yoyGrowth: number;
  qoqGrowth: number;
  estimateRevision: number;
}

export interface EarningsMomentumDetection {
  detected: boolean;
  direction: EarningsMomentumDirection;
  epsActual: number;
  epsEstimate: number;
  epsSurprise: number;
  revenueActual: number;
  revenueEstimate: number;
  revenueSurprise: number;
  guidance: EarningsGuidanceTone;
  marginExpansion: number;
  earningsQuality: number;
  guidanceQuality: number;
  priceConfirmation: number;
  volumeConfirmation: number;
  ema20: number;
  ema50: number;
  vwap: number;
  atr: number;
  swingLow: number;
  swingHigh: number;
  priceConfirmed: boolean;
  volumeConfirmed: boolean;
  rsConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  institutionalConfirmed: boolean;
  confidence: number;
  analysis: EarningsAnalysis;
  reasons: string[];
  warnings: string[];
}

export interface EarningsMomentumMarketData {
  candlesDaily: readonly EarningsMomentumCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  relativeVolume: number | null;
  averageVolume20d?: number | null;
  relativeStrength?: number | null;
  lastPrice?: number | null;
  fundamentals: EarningsFundamentals;
}

export interface EarningsMomentumStrategyInput extends StrategyMarketInput {
  earningsMomentum: EarningsMomentumMarketData;
}

export interface EarningsMomentumDetectionContext {
  input: EarningsMomentumStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<EarningsMomentumConfig>;
  timestamp?: Date;
}

export interface EarningsMomentumValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isEarningsMomentumStrategyInput(
  input:
    | StrategyMarketInput
    | EarningsMomentumStrategyInput
    | null
    | undefined
): input is EarningsMomentumStrategyInput {
  if (
    !input ||
    !("earningsMomentum" in input) ||
    !input.earningsMomentum
  ) {
    return false;
  }
  return (
    Array.isArray(input.earningsMomentum.candlesDaily) &&
    !!input.earningsMomentum.fundamentals
  );
}

export function toEarningsMomentumDetectionContext(
  context: StrategyExecutionContext
): EarningsMomentumDetectionContext | null {
  if (!isEarningsMomentumStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
