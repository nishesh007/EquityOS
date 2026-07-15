/**
 * Institutional Earnings Dashboard — domain models (Sprint 9B.R5).
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";

export type AttentionLevel = "Critical" | "High" | "Medium" | "Low";

export type PriorityTier = "P1" | "P2" | "P3" | "P4";

export type DashboardSortKey =
  | "ai_score"
  | "beat_probability"
  | "date"
  | "confidence"
  | "institutional_rank"
  | "expected_volatility"
  | "historical_beat_rate"
  | "market_cap"
  | "alphabetical";

export type SmartFilterId =
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_month"
  | "portfolio"
  | "watchlist"
  | "high_conviction"
  | "high_impact"
  | "large_cap"
  | "mid_cap"
  | "small_cap"
  | "bullish"
  | "bearish"
  | "high_risk"
  | "low_risk"
  | "high_beat_probability"
  | "transcript_available"
  | "results_released";

export const DASHBOARD_EMPTY = {
  noUpcoming: "No Upcoming Earnings",
  noMatchingFilters: "No Matching Filters",
  noPortfolio: "No Portfolio Earnings",
  noWatchlist: "No Watchlist Earnings",
  awaitingAi: "Awaiting AI Analysis",
} as const;

export interface EarningsScorecard {
  institutionalScore: number;
  aiConfidence: number;
  beatProbability: number;
  riskScore: number;
  opportunityScore: number;
  attentionLevel: AttentionLevel;
  priority: PriorityTier;
  portfolioImpact: number;
  watchlistImpact: number;
  historicalBeatRate: number;
  expectedVolatilityScore: number;
  institutionalInterestScore: number;
  outlook: "Bullish" | "Neutral" | "Bearish";
  transcriptAvailable: boolean;
  resultsReleased: boolean;
  available: boolean;
}

export interface RankedEarningsItem {
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  rank: number;
}

export interface EarningsDashboardMetrics {
  upcomingEarnings: number;
  todaysEarnings: number;
  tomorrowEarnings: number;
  next7Days: number;
  portfolioEarnings: number;
  watchlistEarnings: number;
  highImpactEarnings: number;
  aiHighConviction: number;
  averageBeatProbability: string;
  averageAiConfidence: string;
  portfolioExposure: string;
  watchlistExposure: string;
  ready: boolean;
}

export interface EarningsDashboardFilters {
  smartFilters?: SmartFilterId[];
  sector?: string | null;
  exchange?: "NSE" | "BSE" | null;
  search?: string | null;
}

export interface EarningsDashboardQuery {
  filters?: EarningsDashboardFilters;
  sortBy?: DashboardSortKey;
  page?: number;
  pageSize?: number;
  now?: Date;
}

export interface EarningsDashboardViewModel {
  metrics: EarningsDashboardMetrics;
  items: RankedEarningsItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  empty: boolean;
  emptyMessage: string;
  highConviction: RankedEarningsItem[];
  portfolio: RankedEarningsItem[];
  watchlist: RankedEarningsItem[];
}

export interface RankedCardPresentation {
  ticker: string;
  companyName: string;
  institutionalScoreLabel: string;
  aiConfidenceLabel: string;
  beatProbabilityLabel: string;
  riskLabel: string;
  opportunityLabel: string;
  attentionLevel: string;
  priority: string;
  portfolioImpactLabel: string;
  watchlistImpactLabel: string;
  outlook: string;
  heatLevel: AttentionLevel;
  badges: string[];
  ready: boolean;
  emptyMessage: string;
}
