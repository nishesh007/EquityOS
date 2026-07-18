/**
 * Relative Strength Leadership types — Sprint 11B.3O.
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
import type { RelativeStrengthLeadershipConfig } from "./RelativeStrengthLeadershipConstants";

export type RelativeStrengthLeadershipDirection = "BUY" | "NONE";

export interface RelativeStrengthLeadershipCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface RelativeStrengthSeriesPoint {
  timestamp: Date;
  close: number;
}

export interface RelativeStrengthMetrics {
  rsVsNifty: number;
  rsVsSector: number;
  rsVsIndustry: number;
  rsMomentum: number;
  rollingRs: number;
  weightedRs: number;
  percentileRank: number;
  leadershipRank: number;
  sectorRank: number;
  industryRank: number;
  momentumPersistence: number;
}

export interface RelativeStrengthLeadershipDetection {
  detected: boolean;
  direction: RelativeStrengthLeadershipDirection;
  relativeStrengthScore: number;
  relativeStrengthRank: number;
  sectorRank: number;
  industryRank: number;
  leadershipPercentile: number;
  rsVsNifty: number;
  rsVsSector: number;
  rsVsIndustry: number;
  rsMomentum: number;
  rollingRs: number;
  weightedRs: number;
  momentumPersistence: number;
  trendQuality: number;
  volumeConfirmation: number;
  ema20: number;
  ema50: number;
  ema150: number;
  ema200: number;
  vwap: number;
  atr: number;
  rsIncreasing: boolean;
  outperformingBenchmark: boolean;
  outperformingSector: boolean;
  outperformingIndustry: boolean;
  nearFiftyTwoWeekHigh: boolean;
  volumeConfirmed: boolean;
  breadthConfirmed: boolean;
  sectorConfirmed: boolean;
  marketConfirmed: boolean;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface RelativeStrengthLeadershipMarketData {
  candlesDaily: readonly RelativeStrengthLeadershipCandle[];
  candlesWeekly?: readonly RelativeStrengthLeadershipCandle[];
  nifty50?: readonly RelativeStrengthSeriesPoint[];
  nifty500?: readonly RelativeStrengthSeriesPoint[];
  sectorIndex?: readonly RelativeStrengthSeriesPoint[];
  industryIndex?: readonly RelativeStrengthSeriesPoint[];
  /** Precomputed RS inputs (0–100 scale preferred). */
  relativeStrengthRatio?: number | null;
  relativeStrengthMomentum?: number | null;
  pricePerformance?: number | null;
  leadershipPercentile?: number | null;
  sectorRankPercentile?: number | null;
  industryRankPercentile?: number | null;
  peerUniverseSize?: number | null;
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

export interface RelativeStrengthLeadershipStrategyInput
  extends StrategyMarketInput {
  relativeStrengthLeadership: RelativeStrengthLeadershipMarketData;
}

export interface RelativeStrengthLeadershipDetectionContext {
  input: RelativeStrengthLeadershipStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<RelativeStrengthLeadershipConfig>;
  timestamp?: Date;
}

export interface RelativeStrengthLeadershipValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isRelativeStrengthLeadershipStrategyInput(
  input:
    | StrategyMarketInput
    | RelativeStrengthLeadershipStrategyInput
    | null
    | undefined
): input is RelativeStrengthLeadershipStrategyInput {
  if (
    !input ||
    !("relativeStrengthLeadership" in input) ||
    !input.relativeStrengthLeadership
  ) {
    return false;
  }
  return Array.isArray(input.relativeStrengthLeadership.candlesDaily);
}

export function toRelativeStrengthLeadershipDetectionContext(
  context: StrategyExecutionContext
): RelativeStrengthLeadershipDetectionContext | null {
  if (!isRelativeStrengthLeadershipStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
