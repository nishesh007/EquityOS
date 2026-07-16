/**
 * Executive Research Hub — models & empty states (Sprint 10A.R8).
 * Composition layer only — composes R1–R7. Never rebuild engines.
 */

import { safeWorkspaceText } from "../WorkspaceModels";

export const EXECUTIVE_RESEARCH_EMPTY = {
  awaitingResearch: "Awaiting Research",
  noOpenResearch: "No Open Research",
  noRecentCompanies: "No Recent Companies",
  noPendingActions: "No Pending Actions",
  noCoverage: "No Coverage",
} as const;

export type ExecutiveResearchEmptyMessage =
  (typeof EXECUTIVE_RESEARCH_EMPTY)[keyof typeof EXECUTIVE_RESEARCH_EMPTY];

/** Sprint 10A freeze marker — R8 completes the sprint. */
export const RESEARCH_WORKSPACE_STATUS = {
  sprint: "10A",
  refinement: "R8",
  complete: true,
  frozen: true,
  version: "10A.R8.0",
  label: "Executive Research Hub",
} as const;

export const EXECUTIVE_RESEARCH_QUICK_ACTIONS = [
  "open_workspace",
  "company_deep_dive",
  "earnings_review",
  "knowledge_base",
  "decision_journal",
  "run_automation",
  "export_report",
  "portfolio_review",
] as const;

export type ExecutiveResearchQuickAction =
  (typeof EXECUTIVE_RESEARCH_QUICK_ACTIONS)[number];

export const EXECUTIVE_RESEARCH_QUICK_ACTION_LABELS: Record<
  ExecutiveResearchQuickAction,
  string
> = {
  open_workspace: "Open Workspace",
  company_deep_dive: "Company Deep Dive",
  earnings_review: "Earnings Review",
  knowledge_base: "Knowledge Base",
  decision_journal: "Decision Journal",
  run_automation: "Run Automation",
  export_report: "Export Report",
  portfolio_review: "Portfolio Review",
};

export interface ExecutiveSummaryCard {
  id: string;
  label: string;
  value: string;
  numeric: number;
}

export interface RankedResearchItem {
  key: string;
  label: string;
  count: number;
  score: number;
  scoreLabel: string;
  detail: string;
}

export interface ResearchLayerHealth {
  id: string;
  label: string;
  score: number;
  scoreLabel: string;
  ready: boolean;
  emptyMessage: string;
}

export interface ExecutiveResearchHealthView {
  overallHealthScore: number;
  overallHealthLabel: string;
  workspaceHealth: ResearchLayerHealth;
  copilotHealth: ResearchLayerHealth;
  knowledgeHealth: ResearchLayerHealth;
  automationHealth: ResearchLayerHealth;
  timelineHealth: ResearchLayerHealth;
  decisionJournalHealth: ResearchLayerHealth;
  integrationHealth: ResearchLayerHealth;
  layers: ResearchLayerHealth[];
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface ExecutiveResearchOverview {
  workspaceHealth: number;
  researchProgress: number;
  coverage: number;
  openResearch: number;
  recentCompanyCount: number;
  recentDecisionCount: number;
  pendingActionCount: number;
  cards: ExecutiveSummaryCard[];
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface ExecutiveResearchDashboardSummary {
  timelineSummary: string;
  recentAlerts: string;
  recentEarnings: string;
  recentScreens: string;
  pendingTasks: string;
  researchMemory: string;
  knowledgeSummary: string;
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface ExecutiveReportSection {
  id: string;
  title: string;
  collapsed: boolean;
  body: string[];
}

export interface ExecutiveResearchReportView {
  title: string;
  generatedAt: string;
  tableOfContents: string[];
  sections: ExecutiveReportSection[];
  markdown: string;
  printLayout: string;
  previewMode: boolean;
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface HomeResearchStrip {
  executiveSummary: string;
  researchProgress: string;
  coverageSummary: string;
  pendingActions: string;
  healthLabel: string;
  openResearchCount: number;
  companyCount: number;
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface ExecutiveResearchDashboardView {
  overview: ExecutiveResearchOverview;
  health: ExecutiveResearchHealthView;
  metrics: ExecutiveResearchMetricBundle;
  dashboard: ExecutiveResearchDashboardSummary;
  recentCompanies: RankedResearchItem[];
  recentDecisions: RankedResearchItem[];
  pendingActions: RankedResearchItem[];
  openResearch: RankedResearchItem[];
  quickActions: ExecutiveResearchQuickAction[];
  report: ExecutiveResearchReportView;
  homeStrip: HomeResearchStrip;
  sprintFrozen: boolean;
  empty: boolean;
  emptyMessage: ExecutiveResearchEmptyMessage;
}

export interface ExecutiveResearchMetricBundle {
  companiesResearched: number;
  reportsGenerated: number;
  researchCompletion: number;
  averageConviction: number;
  researchQuality: number;
  evidenceCoverage: number;
  validationCoverage: number;
  trustCoverage: number;
  openTabs: number;
  noteCount: number;
  evidenceCount: number;
  timelineCount: number;
  decisionCount: number;
  taskPending: number;
  taskCompleted: number;
  templateCount: number;
  labels: {
    companiesResearched: string;
    reportsGenerated: string;
    researchCompletion: string;
    averageConviction: string;
    researchQuality: string;
    evidenceCoverage: string;
    validationCoverage: string;
    trustCoverage: string;
  };
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

export function safeExecutiveResearchText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWorkspaceText(value, fallback);
}

export function assertNoSentinel(text: string): string {
  const t = safeExecutiveResearchText(text, "—");
  if (
    t === "null" ||
    t === "undefined" ||
    t === "NaN" ||
    t.toLowerCase() === "nan"
  ) {
    return "—";
  }
  return t;
}
