import { calculateAIScore } from "@/lib/engine/calculators/ai-score";
import { calculateBreadthScore } from "@/lib/engine/calculators/breadth";
import { calculateChecklistScore } from "@/lib/engine/calculators/checklist";
import { calculateEquityScores } from "@/lib/engine/calculators/equity-factors";
import { calculateFinancialQuality } from "@/lib/engine/calculators/financial-quality";
import { buildInvestmentThesis } from "@/lib/engine/calculators/investment-thesis";
import { detectOpportunities } from "@/lib/engine/calculators/opportunities";
import { detectRedFlags } from "@/lib/engine/calculators/red-flags";
import { calculateResearchConfidence } from "@/lib/engine/calculators/research-confidence";
import { calculateMultiYearTrends } from "@/lib/engine/calculators/trend-engine";
import { calculateValuation } from "@/lib/engine/calculators/valuation-engine";
import {
  buildSwingSetup,
  type SwingBuildResult,
} from "@/lib/engine/calculators/swing";
import {
  buildTechnicalAnalysis,
  calculateTechnicalScoreFromAnalysis,
  type TechnicalBuildResult,
} from "@/lib/engine/calculators/technical";
import { calculateConvictionScore } from "@/lib/engine/calculators/ai-score";
import {
  buildDecisionAnalysis,
  type DecisionEngineInput,
  type DecisionEngineResult,
} from "@/lib/engine/calculators/decision-engine";
import {
  buildPortfolioDoctorAnalysis,
  type PortfolioDoctorInput,
  type PortfolioHoldingContext,
} from "@/lib/engine/calculators/portfolio-doctor";
import { createAnalysisContext, type AnalysisContext } from "@/lib/engine/analysis-context";
import { buildDataTransparency } from "@/lib/engine/data-transparency";
import { toEquityScore } from "@/lib/engine/mappers";
import type {
  CompanyScoreBundle,
  MarketScoreBundle,
  ScoreResult,
  TradeIdeaScores,
} from "@/lib/engine/types";
import type {
  CompanyProfile,
  EquityScore,
  InvestmentChecklist,
  MarketBreadth,
  TechnicalAnalysis,
  TradingData,
} from "@/types";
import type { OhlcBar } from "@/lib/providers/types";

/**
 * Central Equity Intelligence Engine.
 *
 * Single entry point for every score calculation in EquityOS.
 * UI components and services must consume scores through this engine —
 * never hardcode scores in presentation layers.
 */
export const EquityIntelligenceEngine = {
  calculateEquityScores(profile: CompanyProfile): CompanyScoreBundle {
    return calculateEquityScores(profile, profile.fundamentals);
  },

  toEquityScore(bundle: CompanyScoreBundle): EquityScore {
    return toEquityScore(bundle);
  },

  buildTechnicalAnalysis(
    profile: CompanyProfile,
    trading: TradingData,
    options?: { candles?: OhlcBar[] }
  ): TechnicalBuildResult {
    return buildTechnicalAnalysis(profile, trading, options);
  },

  buildSwingSetup(
    price: number,
    technicals: TechnicalAnalysis,
    trading: TradingData,
    rng: () => number
  ): SwingBuildResult {
    return buildSwingSetup(price, technicals, trading, rng);
  },

  calculateChecklist(
    profile: CompanyProfile,
    equityScore: EquityScore
  ): { checklist: InvestmentChecklist; scoreResult: ScoreResult } {
    return calculateChecklistScore(profile, equityScore);
  },

  calculateBreadthScore(breadth: MarketBreadth): MarketScoreBundle {
    return { breadth: calculateBreadthScore(breadth) };
  },

  calculateTradeIdeaScores(
    profile: CompanyProfile,
    technicals: TechnicalAnalysis
  ): TradeIdeaScores {
    const technical = calculateTechnicalScoreFromAnalysis(technicals);
    const equityBundle = calculateEquityScores(profile);

    return {
      technical,
      fundamental: equityBundle.fundamental,
    };
  },

  calculateConviction(
    profile: CompanyProfile,
    technicalScore: number,
    side: "Long" | "Short"
  ): ScoreResult {
    return calculateConvictionScore(profile, technicalScore, side);
  },

  calculateAIScore(symbol: string, overallScore: number): ScoreResult {
    return calculateAIScore(symbol, overallScore);
  },

  createAnalysisContext,

  calculateFinancialQuality(ctx: AnalysisContext) {
    return calculateFinancialQuality(ctx);
  },

  calculateValuation(ctx: AnalysisContext) {
    return calculateValuation(ctx);
  },

  calculateMultiYearTrends(ctx: AnalysisContext) {
    return calculateMultiYearTrends(ctx);
  },

  detectRedFlags(ctx: AnalysisContext, valuation: ReturnType<typeof calculateValuation>) {
    return detectRedFlags(ctx, valuation);
  },

  detectOpportunities(ctx: AnalysisContext) {
    return detectOpportunities(ctx);
  },

  calculateResearchConfidence(
    ctx: AnalysisContext,
    equityScore: EquityScore,
    financialQuality: ReturnType<typeof calculateFinancialQuality>,
    valuation: ReturnType<typeof calculateValuation>,
    technicalScore?: number
  ) {
    return calculateResearchConfidence(ctx, equityScore, financialQuality, valuation, technicalScore);
  },

  buildInvestmentThesis(
    ctx: AnalysisContext,
    equityScore: EquityScore,
    financialQuality: ReturnType<typeof calculateFinancialQuality>,
    valuation: ReturnType<typeof calculateValuation>,
    redFlags: ReturnType<typeof detectRedFlags>,
    technicalScore?: number,
    opportunities?: ReturnType<typeof detectOpportunities>
  ) {
    return buildInvestmentThesis(ctx, equityScore, financialQuality, valuation, redFlags, technicalScore, opportunities);
  },

  buildDecisionAnalysis(input: DecisionEngineInput): DecisionEngineResult {
    return buildDecisionAnalysis(input);
  },

  buildPortfolioDoctorAnalysis(input: PortfolioDoctorInput) {
    return buildPortfolioDoctorAnalysis(input);
  },

  buildDataTransparency,
};

export type {
  CompanyScoreBundle,
  ScoreResult,
  TradeIdeaScores,
  DecisionEngineInput,
  DecisionEngineResult,
  PortfolioDoctorInput,
  PortfolioHoldingContext,
};
