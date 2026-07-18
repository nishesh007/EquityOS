/**
 * News Momentum types — Sprint 11B.3K.
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
import type { NewsMomentumConfig } from "./NewsMomentumConstants";

export type NewsMomentumDirection = "BUY" | "SELL" | "NONE";

export type NewsCatalystType =
  | "earnings_beat"
  | "earnings_miss"
  | "large_order_win"
  | "government_order"
  | "ma"
  | "promoter_buying"
  | "promoter_selling"
  | "block_deal"
  | "bulk_deal"
  | "management_guidance"
  | "dividend"
  | "bonus"
  | "split"
  | "rating_upgrade"
  | "rating_downgrade"
  | "regulatory_approval"
  | "regulatory_action"
  | "unknown";

export type NewsQualityGrade =
  | "Very High"
  | "High"
  | "Medium"
  | "Low"
  | "Ignore";

export type NewsSourceKind =
  | "exchange_filing"
  | "corporate_announcement"
  | "earnings"
  | "analyst"
  | "news_wire"
  | "rumor"
  | "other";

export interface NewsCatalystEvent {
  id: string;
  headline: string;
  catalystType: NewsCatalystType;
  source: NewsSourceKind;
  publishedAt: Date;
  credibility: number;
  impact: number;
  marketRelevance: number;
  isDuplicate?: boolean;
  isRumor?: boolean;
  directionHint?: "BUY" | "SELL" | "NEUTRAL";
}

export interface NewsMomentumDetection {
  detected: boolean;
  direction: NewsMomentumDirection;
  catalystType: NewsCatalystType;
  catalystStrength: number;
  newsQuality: NewsQualityGrade;
  credibility: number;
  impact: number;
  freshnessMinutes: number;
  ema20: number;
  ema50: number;
  vwap: number;
  priceConfirmed: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface NewsMomentumCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface NewsMomentumMarketData {
  candles1m?: readonly NewsMomentumCandle[];
  candles5m: readonly NewsMomentumCandle[];
  candles15m?: readonly NewsMomentumCandle[];
  vwap: number;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  relativeVolume: number | null;
  newsEvents: readonly NewsCatalystEvent[];
  /** Optional gap % from prior close for gap projection targets. */
  gapPercent?: number | null;
}

export interface NewsMomentumStrategyInput extends StrategyMarketInput {
  newsMomentum: NewsMomentumMarketData;
}

export interface NewsMomentumDetectionContext {
  input: NewsMomentumStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<NewsMomentumConfig>;
  timestamp?: Date;
}

export interface NewsMomentumValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isNewsMomentumStrategyInput(
  input:
    | StrategyMarketInput
    | NewsMomentumStrategyInput
    | null
    | undefined
): input is NewsMomentumStrategyInput {
  if (!input || !("newsMomentum" in input) || !input.newsMomentum) {
    return false;
  }
  return Array.isArray(input.newsMomentum.candles5m);
}

export function toNewsMomentumDetectionContext(
  context: StrategyExecutionContext
): NewsMomentumDetectionContext | null {
  if (!isNewsMomentumStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
