/**
 * Domain contracts for AI-generated content.
 */

import type {
  AIAnalysis,
  AIInvestmentThesis,
  AIMarketSummary,
  IntradayIdea,
  SwingTradeIdea,
} from "@/types";

export interface AIDataService {
  fetchMarketSummary(): Promise<AIMarketSummary>;
  fetchIntradayIdeas(): Promise<IntradayIdea[]>;
  fetchSwingTradeIdeas(): Promise<SwingTradeIdea[]>;
}

export interface CompanyAIService {
  fetchAnalysis(symbol: string): Promise<AIAnalysis | null>;
  fetchThesis(symbol: string): Promise<AIInvestmentThesis | null>;
}

export type { AIAnalysis, AIInvestmentThesis, AIMarketSummary, IntradayIdea, SwingTradeIdea };
