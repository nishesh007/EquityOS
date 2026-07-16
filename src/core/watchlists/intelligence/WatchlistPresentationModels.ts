/**
 * Watchlist Intelligence — presentation models (Sprint 10B.R3).
 * Empty-safe views for monitoring workspace. No duplicated AI calculations.
 */

import { safeWatchlistNumber, safeWatchlistText } from "../WatchlistModels";

export const WATCHLIST_INTELLIGENCE_EMPTY = {
  noOpportunities: "No Opportunities",
  noChanges: "No Changes",
  noRecommendations: "No Recommendations",
  awaitingAnalysis: "Awaiting Analysis",
} as const;

export type WatchlistIntelligenceEmptyMessage =
  (typeof WATCHLIST_INTELLIGENCE_EMPTY)[keyof typeof WATCHLIST_INTELLIGENCE_EMPTY];

export const OPPORTUNITY_KINDS = [
  "new_buy_zone",
  "breakout",
  "trend_reversal",
  "oversold",
  "upcoming_earnings",
  "upcoming_corporate_action",
  "high_conviction_addition",
  "remove_candidate",
] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export const INTELLIGENCE_RECOMMENDATION_ACTIONS = [
  "add",
  "remove",
  "monitor",
  "increase_allocation",
  "reduce_allocation",
  "research_now",
  "ignore",
] as const;

export type IntelligenceRecommendationAction =
  (typeof INTELLIGENCE_RECOMMENDATION_ACTIONS)[number];

export const CHANGE_KINDS = [
  "price_movement",
  "conviction_change",
  "trust_change",
  "validation_change",
  "technical_change",
  "fundamental_change",
  "alert_history",
] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

export interface WatchlistIntelligenceContext {
  watchlistId?: string | null;
  symbols?: string[] | null;
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  priorSnapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  opportunities?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").OpportunitySnapshot> | null;
  portfolioSymbols?: string[] | null;
  sectorBySymbol?: Record<string, string> | null;
  marketCapBySymbol?: Record<string, number> | null;
  metricsBySymbol?: Record<string, Record<string, number | string | null | undefined>> | null;
  alertHistory?: Array<{ ticker: string; title: string; at: string }> | null;
  now?: Date | null;
}

export interface WatchlistHealthView {
  watchlistId: string;
  averageConviction: number;
  averageTrust: number;
  averageRisk: number;
  portfolioOverlap: number;
  sectorConcentration: number;
  marketCapDistribution: { large: number; mid: number; small: number };
  diversificationScore: number;
  companyCount: number;
  labels: Record<string, string>;
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface WatchlistSummaryHighlight {
  ticker: string;
  label: string;
  value: string;
}

export interface WatchlistSummaryView {
  watchlistId: string;
  narrative: string;
  biggestWinner: WatchlistSummaryHighlight | null;
  biggestLoser: WatchlistSummaryHighlight | null;
  mostImproved: WatchlistSummaryHighlight | null;
  mostDeteriorated: WatchlistSummaryHighlight | null;
  highestConviction: WatchlistSummaryHighlight | null;
  highestRisk: WatchlistSummaryHighlight | null;
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface WatchlistOpportunityItem {
  ticker: string;
  kind: OpportunityKind;
  title: string;
  reason: string;
  priority: number;
}

export interface WatchlistOpportunitiesView {
  items: WatchlistOpportunityItem[];
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface WatchlistChangeItem {
  ticker: string;
  kind: ChangeKind;
  summary: string;
  delta: string;
  at: string;
}

export interface WatchlistChangesView {
  items: WatchlistChangeItem[];
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface IntelligenceRecommendationItem {
  ticker: string;
  action: IntelligenceRecommendationAction;
  reason: string;
  priority: number;
}

export interface IntelligenceRecommendationsView {
  items: IntelligenceRecommendationItem[];
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface WatchlistInsightBucket {
  id: string;
  label: string;
  tickers: string[];
}

export interface WatchlistInsightsView {
  topOpportunities: WatchlistInsightBucket;
  topRisks: WatchlistInsightBucket;
  sectorLeaders: WatchlistInsightBucket;
  sectorLaggards: WatchlistInsightBucket;
  momentumLeaders: WatchlistInsightBucket;
  valueIdeas: WatchlistInsightBucket;
  growthIdeas: WatchlistInsightBucket;
  incomeIdeas: WatchlistInsightBucket;
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export interface WatchlistIntelligenceBundle {
  health: WatchlistHealthView;
  summary: WatchlistSummaryView;
  opportunities: WatchlistOpportunitiesView;
  changes: WatchlistChangesView;
  recommendations: IntelligenceRecommendationsView;
  insights: WatchlistInsightsView;
  empty: boolean;
  emptyMessage: WatchlistIntelligenceEmptyMessage;
}

export function safeIntelText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function safeIntelNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return safeWatchlistNumber(value, fallback);
}

export function emptyHealthView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis
): WatchlistHealthView {
  return {
    watchlistId: "",
    averageConviction: 0,
    averageTrust: 0,
    averageRisk: 0,
    portfolioOverlap: 0,
    sectorConcentration: 0,
    marketCapDistribution: { large: 0, mid: 0, small: 0 },
    diversificationScore: 0,
    companyCount: 0,
    labels: { companies: message },
    empty: true,
    emptyMessage: message,
  };
}

export function emptySummaryView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis
): WatchlistSummaryView {
  return {
    watchlistId: "",
    narrative: message,
    biggestWinner: null,
    biggestLoser: null,
    mostImproved: null,
    mostDeteriorated: null,
    highestConviction: null,
    highestRisk: null,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyOpportunitiesView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.noOpportunities
): WatchlistOpportunitiesView {
  return { items: [], empty: true, emptyMessage: message };
}

export function emptyChangesView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.noChanges
): WatchlistChangesView {
  return { items: [], empty: true, emptyMessage: message };
}

export function emptyIntelligenceRecommendationsView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.noRecommendations
): IntelligenceRecommendationsView {
  return { items: [], empty: true, emptyMessage: message };
}

export function emptyInsightsView(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis
): WatchlistInsightsView {
  const bucket = (id: string, label: string): WatchlistInsightBucket => ({
    id,
    label,
    tickers: [],
  });
  return {
    topOpportunities: bucket("top_opportunities", "Top Opportunities"),
    topRisks: bucket("top_risks", "Top Risks"),
    sectorLeaders: bucket("sector_leaders", "Sector Leaders"),
    sectorLaggards: bucket("sector_laggards", "Sector Laggards"),
    momentumLeaders: bucket("momentum_leaders", "Momentum Leaders"),
    valueIdeas: bucket("value_ideas", "Value Ideas"),
    growthIdeas: bucket("growth_ideas", "Growth Ideas"),
    incomeIdeas: bucket("income_ideas", "Income Ideas"),
    empty: true,
    emptyMessage: message,
  };
}

export function emptyIntelligenceBundle(
  message: WatchlistIntelligenceEmptyMessage = WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis
): WatchlistIntelligenceBundle {
  return {
    health: emptyHealthView(message),
    summary: emptySummaryView(message),
    opportunities: emptyOpportunitiesView(),
    changes: emptyChangesView(),
    recommendations: emptyIntelligenceRecommendationsView(),
    insights: emptyInsightsView(message),
    empty: true,
    emptyMessage: message,
  };
}
