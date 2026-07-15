/**
 * Executive Alert Hub — models & empty states (Sprint 9C.R8).
 * Composition layer only — reuses Center, Workspace, Intelligence, Export.
 */

import { safeAlertText } from "../AlertModels";
import type { CenterAlert } from "../center/AlertCenterModels";

export const EXECUTIVE_EMPTY = {
  noAlerts: "No Alerts",
  noExecutiveSummary: "No Executive Summary",
  noAnalytics: "No Analytics",
  awaitingAlertGeneration: "Awaiting Alert Generation",
} as const;

export type ExecutiveEmptyMessage =
  (typeof EXECUTIVE_EMPTY)[keyof typeof EXECUTIVE_EMPTY];

export type ExecutivePanelId =
  | "portfolio_risk"
  | "watchlist"
  | "opportunity"
  | "research"
  | "market"
  | "sector"
  | "technical"
  | "fundamental"
  | "news"
  | "corporate_action"
  | "validation"
  | "trust";

export const EXECUTIVE_PANEL_LABELS: Record<ExecutivePanelId, string> = {
  portfolio_risk: "Portfolio Risk Alerts",
  watchlist: "Watchlist Alerts",
  opportunity: "Opportunity Alerts",
  research: "Research Alerts",
  market: "Market Alerts",
  sector: "Sector Alerts",
  technical: "Technical Alerts",
  fundamental: "Fundamental Alerts",
  news: "News Alerts",
  corporate_action: "Corporate Action Alerts",
  validation: "Validation Alerts",
  trust: "Trust Alerts",
};

export interface ExecutiveSummaryCard {
  id: string;
  label: string;
  value: string;
  numeric: number;
}

export interface ExecutiveOverview {
  totalAlerts: number;
  critical: number;
  highPriority: number;
  portfolioAlerts: number;
  watchlistAlerts: number;
  unread: number;
  pinned: number;
  resolvedToday: number;
  archived: number;
  averageConfidence: number;
  platformHealth: number;
  cards: ExecutiveSummaryCard[];
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface DistributionBucket {
  key: string;
  count: number;
  label: string;
  pct: number;
}

export interface AlertHealthView {
  overallHealthScore: number;
  overallHealthLabel: string;
  priorityDistribution: DistributionBucket[];
  categoryDistribution: DistributionBucket[];
  severityDistribution: DistributionBucket[];
  confidenceDistribution: DistributionBucket[];
  resolutionRate: number;
  resolutionRateLabel: string;
  averageResolutionTimeMs: number;
  averageResolutionTimeLabel: string;
  alertVelocity: number;
  alertVelocityLabel: string;
  falsePositiveRate: number;
  falsePositiveRateLabel: string;
  historicalSuccessRate: number;
  historicalSuccessRateLabel: string;
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface ExecutivePanel {
  id: ExecutivePanelId;
  label: string;
  count: number;
  countLabel: string;
  alerts: CenterAlert[];
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface RankedItem {
  key: string;
  label: string;
  count: number;
  score: number;
  scoreLabel: string;
}

export interface ExecutiveAnalytics {
  topCompanies: RankedItem[];
  topSectors: RankedItem[];
  mostTriggeredRules: RankedItem[];
  highestConfidenceAlerts: RankedItem[];
  highestRiskAlerts: RankedItem[];
  mostFrequentCategories: RankedItem[];
  mostResolved: RankedItem[];
  mostArchived: RankedItem[];
  trendLabel: string;
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface ExecutiveTimelineEvent {
  id: string;
  type: string;
  label: string;
  at: string;
  detail: string;
  alertId: string;
}

export interface ExecutiveTimelineView {
  events: ExecutiveTimelineEvent[];
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface HomeAlertStrip {
  unread: number;
  unreadLabel: string;
  critical: number;
  criticalLabel: string;
  portfolio: number;
  portfolioLabel: string;
  watchlist: number;
  watchlistLabel: string;
  highestPriority: string;
  highestPriorityLabel: string;
  latestAiRecommendation: string;
  latestAiRecommendationLabel: string;
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface ReportSectionView {
  id: string;
  title: string;
  collapsed: boolean;
  body: string[];
}

export interface ExecutiveReportView {
  title: string;
  generatedAt: string;
  tableOfContents: string[];
  sections: ReportSectionView[];
  markdown: string;
  printLayout: string;
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
}

export interface AlertExecutiveDashboardView {
  overview: ExecutiveOverview;
  health: AlertHealthView;
  panels: ExecutivePanel[];
  analytics: ExecutiveAnalytics;
  timeline: ExecutiveTimelineView;
  report: ExecutiveReportView;
  homeStrip: HomeAlertStrip;
  workspacePinned: number;
  workspaceFavorites: number;
  empty: boolean;
  emptyMessage: ExecutiveEmptyMessage;
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
  return `${Math.round(v)}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export function safeExecutiveText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeAlertText(value, fallback);
}
