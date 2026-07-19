/**
 * JSON-safe Market Intelligence DTOs for application consumers.
 * Built from Sprint 11B Market Context + Market Regime engines — no recalculation.
 */

export interface MarketContextComponentBreakdown {
  trend: string;
  volatility: string;
  breadthScore: number;
  breadthQuality: string;
  advanceDeclineRatio: number;
  marketStrength: number;
  riskMode: string;
  momentumHint: number;
  liquidityHint: number;
  institutionalParticipation: number;
  leadingSectors: string[];
  weakSectors: string[];
  healthScore: number;
  qualityGrade: string;
}

export interface MarketContextView {
  marketTrend: string;
  marketStrength: number;
  contextScore: number;
  contextConfidence: number;
  riskMode: string;
  volatilityRegime: string;
  volatilityScore: number;
  breadthScore: number;
  breadthQuality: string;
  advanceCount: number;
  declineCount: number;
  advanceDeclineRatio: number;
  sectorBreadth: number;
  momentum: number;
  liquidity: number;
  institutionalParticipation: number;
  leadingSectors: string[];
  weakSectors: string[];
  summary: string[];
  warnings: string[];
  components: MarketContextComponentBreakdown;
  timestamp: string;
}

export interface RegimeComponentBreakdown {
  trendStrength: number;
  momentum: number;
  volatility: number;
  breadth: number;
  risk: string;
  contributions: Array<{
    factor: string;
    title: string;
    score: number;
    contribution: number;
    direction: string;
    reason: string;
  }>;
}

export interface MarketRegimeView {
  regime: string;
  confidence: number;
  confidenceGrade: string;
  priority: number;
  reasons: string[];
  triggeredRules: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  summary: string[];
  components: RegimeComponentBreakdown;
  timestamp: string;
}

/**
 * Shared application snapshot — single source of truth for all consumers.
 */
export interface MarketIntelligenceSnapshot {
  context: MarketContextView;
  regime: MarketRegimeView;
  confidence: number;
  confidenceGrade: string;
  pipelineHealth: number | null;
  pipelineHealthGrade: string | null;
  eligibleStrategyCount: number;
  timestamp: string;
  source: "trading-pipeline" | "context-regime";
}
