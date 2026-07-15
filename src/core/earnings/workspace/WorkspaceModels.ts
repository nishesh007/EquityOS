/**
 * Institutional Earnings Workspace — domain models (Sprint 9B.R7).
 */

import type { InstitutionalReport } from "@/src/core/dataIntegrity/reporting";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";

export type PortfolioImpactDirection = "Positive" | "Neutral" | "Negative";

export type DecisionRecommendation =
  | "Increase Position"
  | "Accumulate"
  | "Hold"
  | "Reduce"
  | "Exit"
  | "Monitor";

export type WorkspaceActionId =
  | "open_research"
  | "open_company"
  | "view_transcript"
  | "open_historical_results"
  | "download_report"
  | "add_to_watchlist"
  | "remove_from_watchlist";

export const WORKSPACE_EMPTY = {
  noPortfolio: "No Portfolio Exposure",
  noWatchlist: "No Watchlist Exposure",
  awaitingEarnings: "Awaiting Earnings",
  noReport: "No Institutional Report",
} as const;

export interface HoldingWeightInput {
  symbol: string;
  name?: string;
  quantity: number;
  currentPrice: number;
}

export interface WorkspaceContext {
  holdings?: HoldingWeightInput[];
  totalValue?: number;
  watchlistSymbols?: string[];
  portfolioSymbols?: string[];
}

export interface PortfolioImpactRow {
  ticker: string;
  companyName: string;
  upcomingEarnings: string;
  daysRemaining: string;
  positionSize: string;
  portfolioWeight: string;
  aiConviction: string;
  beatProbability: string;
  riskLevel: string;
  expectedVolatility: string;
  expectedPortfolioImpact: PortfolioImpactDirection;
  overallExposure: string;
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
}

export interface PortfolioImpactView {
  rows: PortfolioImpactRow[];
  overallExposure: string;
  empty: boolean;
  emptyMessage: string;
}

export interface WatchlistImpactRow {
  ticker: string;
  companyName: string;
  watchlistExposure: string;
  highConviction: boolean;
  highRisk: boolean;
  transcriptAvailable: boolean;
  resultsPublished: boolean;
  aiConfidence: string;
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
}

export interface WatchlistImpactView {
  rows: WatchlistImpactRow[];
  exposureSummary: string;
  highConvictionCount: number;
  highRiskCount: number;
  empty: boolean;
  emptyMessage: string;
}

export interface DecisionSummary {
  ticker: string;
  companyName: string;
  recommendation: DecisionRecommendation;
  reasoning: string;
  confidence: string;
  risk: string;
  catalysts: string[];
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
}

export interface EarningsReportSection {
  id: string;
  title: string;
  body: string;
}

export interface InstitutionalEarningsReportView {
  ticker: string;
  title: string;
  sections: EarningsReportSection[];
  /** Sprint 9F InstitutionalReport — export-ready. */
  institutional: InstitutionalReport | null;
  ready: boolean;
  emptyMessage: string;
  disclaimer: string;
}

export interface WorkspaceActionResult {
  action: WorkspaceActionId;
  ticker: string;
  href: string | null;
  ok: boolean;
  message: string;
}

export interface EarningsWorkspaceView {
  portfolio: PortfolioImpactView;
  watchlist: WatchlistImpactView;
  decisions: DecisionSummary[];
  selectedTicker: string | null;
  selectedDecision: DecisionSummary | null;
  report: InstitutionalEarningsReportView | null;
  empty: boolean;
  emptyMessage: string;
}
