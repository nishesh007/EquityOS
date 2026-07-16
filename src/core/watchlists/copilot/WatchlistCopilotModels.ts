/**
 * Watchlist Copilot — presentation models (Sprint 10B.R6).
 * AI brief, decision assistant, Q&A and research companion views.
 */

import { WATCHLIST_SURFACE_ROUTES, safeWatchlistNumber, safeWatchlistText } from "../WatchlistModels";

export const WATCHLIST_COPILOT_EMPTY = {
  noQuestions: "No Questions",
  noSuggestions: "No Suggestions",
  noBrief: "No Brief",
  awaitingAiSummary: "Awaiting AI Summary",
} as const;

export type WatchlistCopilotEmptyMessage =
  (typeof WATCHLIST_COPILOT_EMPTY)[keyof typeof WATCHLIST_COPILOT_EMPTY];

export const DECISION_KINDS = [
  "buy",
  "wait",
  "remove",
  "increase",
  "reduce",
  "research",
] as const;

export type DecisionKind = (typeof DECISION_KINDS)[number];

export const COPILOT_QUESTION_KINDS = [
  "why_here",
  "why_added",
  "why_removed",
  "why_conviction_falling",
  "why_ai_recommending",
] as const;

export type CopilotQuestionKind = (typeof COPILOT_QUESTION_KINDS)[number];

export interface WatchlistCopilotContext {
  watchlistId?: string | null;
  symbols?: string[] | null;
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  priorSnapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  portfolioSymbols?: string[] | null;
  sectorBySymbol?: Record<string, string> | null;
  metricsBySymbol?: Record<string, Record<string, number | string | null | undefined>> | null;
  opportunities?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").OpportunitySnapshot> | null;
  workspaceId?: string | null;
  ticker?: string | null;
  question?: string | null;
  compareWatchlistId?: string | null;
  compareSymbols?: string[] | null;
  compareTickers?: string[] | null;
  explainability?: Record<string, unknown> | null;
  now?: Date | null;
}

export interface BriefSection {
  label: string;
  items: string[];
}

export interface WatchlistBriefView {
  watchlistId: string;
  headline: string;
  opportunities: BriefSection;
  risks: BriefSection;
  earnings: BriefSection;
  alerts: BriefSection;
  researchSummary: string;
  marketContext: string;
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface DecisionItem {
  ticker: string;
  decision: DecisionKind;
  label: string;
  reason: string;
  confidence: number;
}

export interface DecisionAssistantView {
  watchlistId: string;
  decisions: DecisionItem[];
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface ExecutiveSummaryView {
  watchlistId: string;
  paragraph: string;
  topOpportunity: string;
  biggestConcern: string;
  overallHealth: string;
  priorityActions: string[];
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface CopilotAnswer {
  question: string;
  answer: string;
  kind: CopilotQuestionKind | "custom";
  ticker: string;
  empty: boolean;
}

export interface ComparisonRow {
  label: string;
  values: Record<string, string>;
}

export interface CompanyComparisonView {
  tickers: string[];
  rows: ComparisonRow[];
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface WatchlistComparisonView {
  leftId: string;
  rightId: string;
  rows: ComparisonRow[];
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface ResearchCompanionSuggestion {
  kind: "report" | "earnings" | "alert" | "screening" | "related";
  label: string;
  route: string;
  ticker?: string;
}

export interface ResearchCompanionView {
  watchlistId: string;
  suggestions: ResearchCompanionSuggestion[];
  relatedCompanies: string[];
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
}

export interface WatchlistCopilotBundle {
  brief: WatchlistBriefView;
  executiveSummary: ExecutiveSummaryView;
  decisions: DecisionAssistantView;
  researchCompanion: ResearchCompanionView;
  empty: boolean;
  emptyMessage: WatchlistCopilotEmptyMessage;
  surfaceHints: typeof WATCHLIST_SURFACE_ROUTES;
}

export function safeCopilotText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function safeCopilotNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return safeWatchlistNumber(value, fallback);
}

export function emptyBriefView(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noBrief
): WatchlistBriefView {
  return {
    watchlistId: "",
    headline: message,
    opportunities: { label: "Today's Opportunities", items: [] },
    risks: { label: "Today's Risks", items: [] },
    earnings: { label: "Today's Earnings", items: [] },
    alerts: { label: "Important Alerts", items: [] },
    researchSummary: message,
    marketContext: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyDecisionView(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noSuggestions
): DecisionAssistantView {
  return { watchlistId: "", decisions: [], empty: true, emptyMessage: message };
}

export function emptyExecutiveSummary(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.awaitingAiSummary
): ExecutiveSummaryView {
  return {
    watchlistId: "",
    paragraph: message,
    topOpportunity: message,
    biggestConcern: message,
    overallHealth: message,
    priorityActions: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyCompanyComparison(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noSuggestions
): CompanyComparisonView {
  return { tickers: [], rows: [], empty: true, emptyMessage: message };
}

export function emptyWatchlistComparison(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noSuggestions
): WatchlistComparisonView {
  return { leftId: "", rightId: "", rows: [], empty: true, emptyMessage: message };
}

export function emptyResearchCompanion(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noSuggestions
): ResearchCompanionView {
  return {
    watchlistId: "",
    suggestions: [],
    relatedCompanies: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyCopilotBundle(
  message: WatchlistCopilotEmptyMessage = WATCHLIST_COPILOT_EMPTY.noBrief
): WatchlistCopilotBundle {
  return {
    brief: emptyBriefView(message),
    executiveSummary: emptyExecutiveSummary(message),
    decisions: emptyDecisionView(message),
    researchCompanion: emptyResearchCompanion(message),
    empty: true,
    emptyMessage: message,
    surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
  };
}
