/**
 * Institutional AI Earnings Intelligence — domain models (Sprint 9B.R2).
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { QuarterlyResult } from "@/types";

export type AIOutlook = "Bullish" | "Neutral" | "Bearish";

export type ExpectationOutcome = "Expected Beat" | "Inline" | "Miss";

export type MarginTrendExpectation = "Expand" | "Stable" | "Compress";

export type VolatilityLevel = "Low" | "Medium" | "High";

export type InterestLevel = "Low" | "Medium" | "High";

export type ConsensusDirection = "Positive" | "Neutral" | "Negative";

export type IntelligenceBadgeId =
  | "High Conviction"
  | "Beat Probability"
  | "Momentum"
  | "Turnaround"
  | "Undervalued"
  | "Expensive"
  | "Portfolio"
  | "Watchlist"
  | "High Impact";

export const INTELLIGENCE_EMPTY = {
  awaitingEarnings: "Awaiting Earnings",
  consensusNotAvailable: "Consensus Not Available",
  insufficientHistory: "Insufficient Historical Data",
  noAnalystCoverage: "No Analyst Coverage",
  notEnoughConfidence: "Not Enough AI Confidence",
} as const;

export interface EarningsQuarterPoint {
  label: string;
  revenue: number;
  eps: number;
  margin: number;
  surprise: "Beat" | "Inline" | "Miss" | "—";
}

export interface EarningsResearchContext {
  event: EarningsCalendarEvent;
  quarters: QuarterlyResult[];
  pe: number | null;
  revenueGrowth: number | null;
  netProfitGrowth: number | null;
  valuationStatus: "undervalued" | "fair" | "overvalued" | null;
  fiiPercent: number | null;
  diiPercent: number | null;
  hasAnalystCoverage: boolean;
}

export interface AIExpectationView {
  revenue: ExpectationOutcome;
  eps: ExpectationOutcome;
  marginTrend: MarginTrendExpectation;
  available: boolean;
  emptyMessage: string;
}

export interface ExpectedSurpriseView {
  direction: ExpectationOutcome;
  beatProbabilityLabel: string;
  historicalBeatRateLabel: string;
  consensusDirection: ConsensusDirection | typeof INTELLIGENCE_EMPTY.consensusNotAvailable;
  available: boolean;
  emptyMessage: string;
}

export interface EarningsRiskView {
  expectedVolatility: VolatilityLevel;
  institutionalInterest: InterestLevel;
  riskSummary: string;
  available: boolean;
  emptyMessage: string;
}

export interface EarningsSignalView {
  outlook: AIOutlook;
  badges: IntelligenceBadgeId[];
  importantWatchItem: string;
  available: boolean;
  emptyMessage: string;
}

export interface EarningsConfidenceView {
  score: number | null;
  label: string;
  breakdown: Array<{ factor: string; contribution: string }>;
  available: boolean;
  emptyMessage: string;
}

export interface EarningsPreviewSnapshot {
  ticker: string;
  resultDate: string;
  outlook: AIOutlook;
  confidence: EarningsConfidenceView;
  expectation: AIExpectationView;
  surprise: ExpectedSurpriseView;
  risk: EarningsRiskView;
  signals: EarningsSignalView;
  historicalBeatRateLabel: string;
  consensusDirectionLabel: string;
  importantWatchItem: string;
  badges: IntelligenceBadgeId[];
}

export interface EarningsResearchSummary {
  executiveSummary: string;
  streetExpectations: string;
  aiExpectations: string;
  historicalEarnings: string;
  revenueTrend: EarningsQuarterPoint[];
  epsTrend: EarningsQuarterPoint[];
  marginTrend: EarningsQuarterPoint[];
  operatingLeverage: string;
  beatMissHistory: Array<{ label: string; result: string }>;
  institutionalPositioning: string;
  riskAnalysis: string;
  bullCase: string[];
  bearCase: string[];
  catalysts: string[];
  questionsToWatch: string[];
  expectedMarketReaction: string;
  finalAIOpinion: string;
  confidenceBreakdown: Array<{ factor: string; contribution: string }>;
  empty: boolean;
  emptyMessage: string;
}

export interface EarningsCardPreviewView {
  outlook: string;
  confidence: string;
  expectedRevenue: string;
  expectedEps: string;
  expectedMarginTrend: string;
  expectedVolatility: string;
  institutionalInterest: string;
  historicalBeatRate: string;
  consensusDirection: string;
  importantWatchItem: string;
  badges: IntelligenceBadgeId[];
  ready: boolean;
  emptyMessage: string;
}

export interface EarningsDrawerView {
  title: string;
  subtitle: string;
  preview: EarningsCardPreviewView;
  research: EarningsResearchSummary;
  event: EarningsCalendarEvent;
}
