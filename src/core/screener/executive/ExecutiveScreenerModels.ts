/**
 * Executive AI Screener Hub — models & empty states (Sprint 9D.R8).
 * Presentation / orchestration only — composes R1–R7. Never rebuild engines.
 */

import { safeScreenText } from "../ScreenModels";

export const EXECUTIVE_SCREENER_EMPTY = {
  noScreeningResults: "No Screening Results",
  noSavedStrategies: "No Saved Strategies",
  awaitingScan: "Awaiting Scan",
  noOpportunities: "No Opportunities",
  noResearch: "No Research",
} as const;

export type ExecutiveScreenerEmptyMessage =
  (typeof EXECUTIVE_SCREENER_EMPTY)[keyof typeof EXECUTIVE_SCREENER_EMPTY];

/** Sprint 9D freeze marker — R8 completes the sprint. */
export const SPRINT_9D_STATUS = {
  sprint: "9D",
  refinement: "R8",
  complete: true,
  frozen: true,
  version: "9D.R8.0",
  label: "Executive AI Screener Hub",
} as const;

export const EXECUTIVE_QUICK_ACTIONS = [
  "run_screen",
  "open_research",
  "compare",
  "strategy_builder",
  "discovery",
  "portfolio",
  "watchlist",
  "export",
] as const;

export type ExecutiveQuickAction = (typeof EXECUTIVE_QUICK_ACTIONS)[number];

export const EXECUTIVE_QUICK_ACTION_LABELS: Record<
  ExecutiveQuickAction,
  string
> = {
  run_screen: "Run Screen",
  open_research: "Open Research",
  compare: "Compare",
  strategy_builder: "Strategy Builder",
  discovery: "Discovery",
  portfolio: "Portfolio",
  watchlist: "Watchlist",
  export: "Export",
};

export interface ExecutiveSummaryCard {
  id: string;
  label: string;
  value: string;
  numeric: number;
}

export interface RankedScreenerItem {
  key: string;
  label: string;
  count: number;
  score: number;
  scoreLabel: string;
  detail: string;
}

export interface ScreenerHealthView {
  overallHealthScore: number;
  overallHealthLabel: string;
  institutionalScore: number;
  institutionalScoreLabel: string;
  universeCoverage: number;
  universeCoverageLabel: string;
  screenSuccessRate: number;
  screenSuccessRateLabel: string;
  averageTrust: number;
  averageTrustLabel: string;
  averageValidation: number;
  averageValidationLabel: string;
  aiConfidence: number;
  aiConfidenceLabel: string;
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export interface ExecutiveScreenerOverview {
  overallHealth: number;
  institutionalScore: number;
  universeCoverage: number;
  screenSuccessRate: number;
  averageTrust: number;
  averageValidation: number;
  aiConfidence: number;
  highConvictionCount: number;
  portfolioCandidates: number;
  watchlistCandidates: number;
  opportunityCount: number;
  themeCount: number;
  cards: ExecutiveSummaryCard[];
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export interface SectorRotationSummary {
  leaders: RankedScreenerItem[];
  weak: RankedScreenerItem[];
  summary: string;
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export interface ExecutiveReportSection {
  id: string;
  title: string;
  collapsed: boolean;
  body: string[];
}

export interface ExecutiveScreenerReportView {
  title: string;
  generatedAt: string;
  tableOfContents: string[];
  sections: ExecutiveReportSection[];
  markdown: string;
  printLayout: string;
  previewMode: boolean;
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export interface HomeScreenerStrip {
  executiveSummary: string;
  todaysBestOpportunities: string;
  themeSummary: string;
  sectorSummary: string;
  institutionalActivity: string;
  healthLabel: string;
  opportunityCount: number;
  themeCount: number;
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export interface ExecutiveScreenerDashboardView {
  overview: ExecutiveScreenerOverview;
  health: ScreenerHealthView;
  topInstitutionalIdeas: RankedScreenerItem[];
  topStrategies: RankedScreenerItem[];
  topSavedScreens: RankedScreenerItem[];
  recentDiscoveries: RankedScreenerItem[];
  recentResearch: RankedScreenerItem[];
  sectorRotation: SectorRotationSummary;
  quickActions: ExecutiveQuickAction[];
  report: ExecutiveScreenerReportView;
  homeStrip: HomeScreenerStrip;
  sprintFrozen: boolean;
  empty: boolean;
  emptyMessage: ExecutiveScreenerEmptyMessage;
}

export function safeNumeric(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function safePct(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatCount(n: number): string {
  const v = safeNumeric(n, 0);
  return String(Math.max(0, Math.round(v)));
}

export function formatPct(n: number): string {
  const v = safeNumeric(n, 0);
  return `${Math.round(v * 10) / 10}%`;
}

export function formatScore(n: number): string {
  const v = safeNumeric(n, 0);
  return String(Math.round(v));
}

export function safeExecutiveScreenerText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeScreenText(value, fallback);
}
