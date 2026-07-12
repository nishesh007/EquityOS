/**
 * Equity Intelligence Engine — core scoring types.
 * Every score in EquityOS flows through this framework before reaching UI.
 */

export type ScoreSource = "computed" | "adapter" | "mock" | "cached";

export type ScoreCategory =
  | "technical"
  | "fundamental"
  | "momentum"
  | "quality"
  | "valuation"
  | "growth"
  | "risk"
  | "overall"
  | "swing"
  | "checklist"
  | "breadth"
  | "conviction"
  | "ai"
  | "decision";

export interface ContributingFactor {
  key: string;
  label: string;
  value: number | string;
  weight?: number;
  impact?: "positive" | "negative" | "neutral";
}

export interface ScoreResult {
  key: string;
  label: string;
  category: ScoreCategory;
  rawScore: number;
  normalizedScore: number;
  confidence: number;
  weight: number;
  explanation: string;
  contributingFactors: ContributingFactor[];
  source: ScoreSource;
}

export interface EquityFactorWeights {
  businessQuality: number;
  financialStrength: number;
  growth: number;
  valuation: number;
  momentum: number;
  risk: number;
}

export const DEFAULT_EQUITY_WEIGHTS: EquityFactorWeights = {
  businessQuality: 0.2,
  financialStrength: 0.2,
  growth: 0.18,
  valuation: 0.16,
  momentum: 0.14,
  risk: 0.12,
};

export interface CompanyScoreBundle {
  overall: ScoreResult;
  businessQuality: ScoreResult;
  financialStrength: ScoreResult;
  growth: ScoreResult;
  valuation: ScoreResult;
  momentum: ScoreResult;
  risk: ScoreResult;
  quality: ScoreResult;
  fundamental: ScoreResult;
}

export interface ResearchScoreBundle {
  technical: ScoreResult;
  swing: ScoreResult;
  checklist?: ScoreResult;
}

export interface MarketScoreBundle {
  breadth: ScoreResult;
}

export interface TradeIdeaScores {
  technical: ScoreResult;
  fundamental: ScoreResult;
  conviction?: ScoreResult;
}

/** Placeholder for future AI-derived composite score. */
export interface AIScoreBundle {
  ai: ScoreResult;
}
