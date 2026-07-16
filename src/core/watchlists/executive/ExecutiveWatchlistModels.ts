/**
 * Executive Watchlist Hub — models & platform status (Sprint 10B.R8).
 * Composition layer only — composes R1–R7. Never rebuild engines.
 */

import { WATCHLIST_EMPTY, safeWatchlistText } from "../WatchlistModels";

export const EXECUTIVE_WATCHLIST_EMPTY = {
  noWatchlists: "No Watchlists",
  noExecutiveMetrics: "No Executive Metrics",
  noReports: "No Reports",
  awaitingWorkspace: "Awaiting Workspace",
} as const;

export type ExecutiveWatchlistEmptyMessage =
  (typeof EXECUTIVE_WATCHLIST_EMPTY)[keyof typeof EXECUTIVE_WATCHLIST_EMPTY];

export const WATCHLIST_PLATFORM_STATUS = {
  sprint: "10B",
  refinement: "R8",
  complete: true,
  frozen: true,
  version: "10B.R8.0",
  label: "Executive Watchlist Hub",
} as const;

export interface ExecutiveWatchlistComposeInput {
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  sectorBySymbol?: Record<string, string> | null;
  portfolioSymbols?: string[] | null;
  now?: Date | null;
}

export interface ExecutiveSummaryCard {
  id: string;
  label: string;
  value: string;
  numeric: number;
}

export interface ExecutiveRankedItem {
  key: string;
  label: string;
  score: number;
  scoreLabel: string;
  detail: string;
}

export interface ExecutiveWatchlistOverviewView {
  cards: ExecutiveSummaryCard[];
  totalWatchlists: number;
  activeWatchlists: number;
  favorites: number;
  archived: number;
  pinned: number;
  aiHealth: number;
  researchHealth: number;
  portfolioCoverage: number;
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveWatchlistHealthView {
  averageConviction: number;
  averageTrust: number;
  averageValidation: number;
  averageDiversification: number;
  overallHealthScore: number;
  overallHealthLabel: string;
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveWatchlistMetricBundle {
  totalCompanies: number;
  uniqueCompanies: number;
  averagePerformance: number;
  bestWatchlist: string;
  worstWatchlist: string;
  averageReturn: number;
  averageWinRate: number;
  labels: Record<string, string>;
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveWatchlistPanelsView {
  topOpportunities: ExecutiveRankedItem[];
  highestConviction: ExecutiveRankedItem[];
  highestRisk: ExecutiveRankedItem[];
  upcomingEarnings: ExecutiveRankedItem[];
  recentAiChanges: ExecutiveRankedItem[];
  researchActivity: ExecutiveRankedItem[];
  alertActivity: ExecutiveRankedItem[];
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveTimelineEntry {
  id: string;
  kind: string;
  summary: string;
  at: string;
}

export interface ExecutiveWatchlistTimelineView {
  entries: ExecutiveTimelineEntry[];
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveReportSection {
  id: string;
  title: string;
  body: string[];
}

export interface ExecutiveWatchlistReportView {
  title: string;
  generatedAt: string;
  executiveSummary: string;
  sections: ExecutiveReportSection[];
  markdown: string;
  printLayout: string;
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
}

export interface ExecutiveWatchlistDashboardView {
  overview: ExecutiveWatchlistOverviewView;
  health: ExecutiveWatchlistHealthView;
  metrics: ExecutiveWatchlistMetricBundle;
  panels: ExecutiveWatchlistPanelsView;
  timeline: ExecutiveWatchlistTimelineView;
  report: ExecutiveWatchlistReportView;
  sprintFrozen: boolean;
  empty: boolean;
  emptyMessage: ExecutiveWatchlistEmptyMessage;
  surfaceHints: {
    watchlist: string;
    dashboard: string;
    research: string;
    portfolio: string;
    results: string;
    company: string;
  };
}

export function safeExecutiveText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function safeExecutiveNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function formatExecutiveScore(value: number): string {
  return String(Math.round(safeExecutiveNumber(value, 0)));
}

export function formatExecutivePct(value: number): string {
  return `${Math.round(safeExecutiveNumber(value, 0))}%`;
}

export function emptyExecutiveOverview(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.noWatchlists
): ExecutiveWatchlistOverviewView {
  return {
    cards: [],
    totalWatchlists: 0,
    activeWatchlists: 0,
    favorites: 0,
    archived: 0,
    pinned: 0,
    aiHealth: 0,
    researchHealth: 0,
    portfolioCoverage: 0,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyExecutiveHealth(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics
): ExecutiveWatchlistHealthView {
  return {
    averageConviction: 0,
    averageTrust: 0,
    averageValidation: 0,
    averageDiversification: 0,
    overallHealthScore: 0,
    overallHealthLabel: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyExecutiveMetrics(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.noExecutiveMetrics
): ExecutiveWatchlistMetricBundle {
  return {
    totalCompanies: 0,
    uniqueCompanies: 0,
    averagePerformance: 0,
    bestWatchlist: message,
    worstWatchlist: message,
    averageReturn: 0,
    averageWinRate: 0,
    labels: {},
    empty: true,
    emptyMessage: message,
  };
}

export function emptyExecutivePanels(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.awaitingWorkspace
): ExecutiveWatchlistPanelsView {
  return {
    topOpportunities: [],
    highestConviction: [],
    highestRisk: [],
    upcomingEarnings: [],
    recentAiChanges: [],
    researchActivity: [],
    alertActivity: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyExecutiveTimeline(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.awaitingWorkspace
): ExecutiveWatchlistTimelineView {
  return { entries: [], empty: true, emptyMessage: message };
}

export function emptyExecutiveDashboard(
  message: ExecutiveWatchlistEmptyMessage = EXECUTIVE_WATCHLIST_EMPTY.noWatchlists
): ExecutiveWatchlistDashboardView {
  return {
    overview: emptyExecutiveOverview(message),
    health: emptyExecutiveHealth(message),
    metrics: emptyExecutiveMetrics(message),
    panels: emptyExecutivePanels(message),
    timeline: emptyExecutiveTimeline(message),
    report: {
      title: "Executive Watchlist Report",
      generatedAt: new Date().toISOString(),
      executiveSummary: message,
      sections: [],
      markdown: message,
      printLayout: message,
      empty: true,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noReports,
    },
    sprintFrozen: WATCHLIST_PLATFORM_STATUS.frozen,
    empty: true,
    emptyMessage: message,
    surfaceHints: {
      watchlist: "/watchlist",
      dashboard: "/",
      research: "/research",
      portfolio: "/portfolio",
      results: "/results",
      company: "/company",
    },
  };
}
