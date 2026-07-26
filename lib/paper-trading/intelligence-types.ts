/**
 * Sprint 11E.3 — AI Recommendation Intelligence types.
 * Read-only analysis of paper-trade history. Never mutates trades or recommendations.
 */

import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";

export type ConfidenceBucketId =
  | "70-80"
  | "80-85"
  | "85-90"
  | "90-95"
  | "95-100";

export type MarketRegimeBucket =
  | "bull"
  | "bear"
  | "sideways"
  | "high_volatility"
  | "low_volatility";

export type FailureReasonId =
  | "stop_loss_hit"
  | "weak_momentum"
  | "poor_risk_reward"
  | "low_volume"
  | "event_risk"
  | "gap_down"
  | "market_reversal"
  | "recommendation_expired";

export interface AiRecommendationHealth {
  recommendationsGenerated: number;
  recommendationsExecuted: number;
  executionRate: number;
  recommendationWinRate: number;
  averageReturn: number;
  averageHoldingMs: number;
  averageConviction: number;
  averageRiskReward: number;
  averageRecommendationAgeMs: number;
}

export interface ConfidenceAccuracyRow {
  bucket: ConfidenceBucketId;
  label: string;
  trades: number;
  winRate: number;
  averageReturn: number;
  averageHoldingMs: number;
  averageRiskReward: number;
  largestWinner: number;
  largestLoser: number;
}

export interface SectorPerformanceRow {
  sector: string;
  trades: number;
  winRate: number;
  averageReturn: number;
  totalPnl: number;
  bestCompany: string;
  worstCompany: string;
}

export interface MarketRegimeRow {
  regime: MarketRegimeBucket;
  label: string;
  trades: number;
  winRate: number;
  averageReturn: number;
  averageDrawdown: number;
}

export interface StrategyIntelligenceRow {
  strategy: PaperStrategy;
  recommendations: number;
  trades: number;
  winRate: number;
  averageReturn: number;
  profitFactor: number;
  drawdown: number;
  averageHoldingMs: number;
  targetHitPercent: number;
  stopLossPercent: number;
}

export interface FailureReasonRow {
  reason: FailureReasonId;
  label: string;
  count: number;
  percent: number;
}

export interface TopRecommendationRow {
  tradeId: string;
  company: string;
  symbol: string;
  strategy: PaperStrategy;
  confidence: number;
  returnPercent: number;
  holdingMs: number;
  recommendationDate: string;
  exitReason: string;
  trade: PaperTrade;
}

export interface WeakRecommendationRow {
  tradeId: string;
  company: string;
  symbol: string;
  strategy: PaperStrategy;
  confidence: number;
  returnPercent: number;
  holdingMs: number;
  failureReason: string;
  maximumDrawdown: number;
  trade: PaperTrade;
}

export interface AiQualityScores {
  recommendationAccuracy: number;
  recommendationStability: number;
  riskManagement: number;
  targetAccuracy: number;
  stopLossAccuracy: number;
  overallAiQualityScore: number;
  explanations: Record<
    | "recommendationAccuracy"
    | "recommendationStability"
    | "riskManagement"
    | "targetAccuracy"
    | "stopLossAccuracy"
    | "overallAiQualityScore",
    string
  >;
}

export interface AiInsight {
  id: string;
  text: string;
  severity: "positive" | "neutral" | "caution";
}

export interface AiIntelligenceModel {
  health: AiRecommendationHealth;
  confidenceAccuracy: ConfidenceAccuracyRow[];
  sectorPerformance: SectorPerformanceRow[];
  marketRegimes: MarketRegimeRow[];
  strategyIntelligence: StrategyIntelligenceRow[];
  failureAnalysis: FailureReasonRow[];
  topRecommendations: TopRecommendationRow[];
  weakRecommendations: WeakRecommendationRow[];
  quality: AiQualityScores;
  insights: AiInsight[];
}
