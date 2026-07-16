/**
 * Cross-module research integration — presentation models (Sprint 10A.R5).
 * Timeline, decision journal, snapshots, insights. Never surface null/undefined/NaN.
 */

import { safeWorkspaceText } from "../WorkspaceModels";

export const INTEGRATION_EMPTY = {
  noTimeline: "No Timeline",
  noDecisions: "No Decisions",
  noSnapshots: "No Snapshots",
  awaitingResearchActivity: "Awaiting Research Activity",
} as const;

export type IntegrationEmptyMessage =
  (typeof INTEGRATION_EMPTY)[keyof typeof INTEGRATION_EMPTY];

export const TIMELINE_EVENT_KINDS = [
  "research_created",
  "alert_triggered",
  "earnings_released",
  "opportunity_detected",
  "screen_matched",
  "validation_updated",
  "trust_updated",
  "report_exported",
  "decision_recorded",
  "note_saved",
  "conclusion_recorded",
  "observation_recorded",
] as const;

export type TimelineEventKind = (typeof TIMELINE_EVENT_KINDS)[number];

export const DECISION_KINDS = [
  "initial_thesis",
  "updated_thesis",
  "bull_case",
  "bear_case",
  "risk_change",
  "confidence_change",
  "action_taken",
  "reason",
  "outcome",
] as const;

export type DecisionKind = (typeof DECISION_KINDS)[number];

export const CROSS_MODULE_LINKS = [
  "earnings",
  "alerts",
  "screener",
  "portfolio",
  "watchlist",
  "opportunity",
  "validation",
  "trust",
  "research",
] as const;

export type CrossModuleLink = (typeof CROSS_MODULE_LINKS)[number];

export interface ResearchTimelineEntry {
  id: string;
  workspaceId: string | null;
  ticker: string | null;
  kind: TimelineEventKind;
  module: CrossModuleLink | "research";
  label: string;
  detail: string;
  route: string;
  at: string;
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface DecisionJournalEntry {
  id: string;
  workspaceId: string;
  ticker: string | null;
  kind: DecisionKind;
  title: string;
  body: string;
  reason: string;
  outcome: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface ResearchSnapshotPayload {
  ticker: string | null;
  thesis: string;
  bullCase: string[];
  bearCase: string[];
  risks: string[];
  catalysts: string[];
  confidence: number;
  noteCount: number;
  evidenceCount: number;
}

export interface ResearchSnapshot {
  id: string;
  workspaceId: string;
  label: string;
  payload: ResearchSnapshotPayload;
  createdAt: string;
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface SnapshotComparison {
  leftId: string;
  rightId: string;
  thesisChanged: boolean;
  bullAdded: string[];
  bullRemoved: string[];
  bearAdded: string[];
  bearRemoved: string[];
  riskAdded: string[];
  riskRemoved: string[];
  confidenceDelta: number;
  summary: string;
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface WorkspaceInsights {
  topPositiveFactors: string[];
  topNegativeFactors: string[];
  keyRisks: string[];
  catalysts: string[];
  aiSummary: string;
  recommendedActions: string[];
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface ResearchTimelineView {
  entries: ResearchTimelineEntry[];
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface DecisionJournalView {
  entries: DecisionJournalEntry[];
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface SnapshotTimelineView {
  snapshots: ResearchSnapshot[];
  empty: boolean;
  emptyMessage: IntegrationEmptyMessage;
}

export interface CrossModuleEventLine {
  module: CrossModuleLink;
  kind: TimelineEventKind;
  ticker?: string | null;
  label: string;
  detail?: string | null;
  route?: string | null;
}

export interface CrossModuleEventBag {
  workspaceId: string;
  earnings?: CrossModuleEventLine[] | null;
  alerts?: CrossModuleEventLine[] | null;
  screener?: CrossModuleEventLine[] | null;
  portfolio?: CrossModuleEventLine[] | null;
  watchlist?: CrossModuleEventLine[] | null;
  opportunity?: CrossModuleEventLine[] | null;
  validation?: CrossModuleEventLine[] | null;
  trust?: CrossModuleEventLine[] | null;
  research?: CrossModuleEventLine[] | null;
}

export function emptyTimelineEntry(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noTimeline
): ResearchTimelineEntry {
  return {
    id: "",
    workspaceId: null,
    ticker: null,
    kind: "research_created",
    module: "research",
    label: message,
    detail: message,
    route: "/research",
    at: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeTimelineEntry(
  input: Partial<ResearchTimelineEntry>
): ResearchTimelineEntry {
  const kind = TIMELINE_EVENT_KINDS.includes(input.kind as TimelineEventKind)
    ? (input.kind as TimelineEventKind)
    : "research_created";
  const module =
    input.module === "research" ||
    CROSS_MODULE_LINKS.includes(input.module as CrossModuleLink)
      ? (input.module as CrossModuleLink | "research")
      : "research";

  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: input.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    kind,
    module,
    label: safeWorkspaceText(input.label, INTEGRATION_EMPTY.awaitingResearchActivity),
    detail: safeWorkspaceText(input.detail, INTEGRATION_EMPTY.awaitingResearchActivity),
    route: safeWorkspaceText(input.route, "/research"),
    at: safeWorkspaceText(input.at, new Date().toISOString()),
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? INTEGRATION_EMPTY.awaitingResearchActivity,
  };
}

export function emptyDecisionEntry(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noDecisions
): DecisionJournalEntry {
  return {
    id: "",
    workspaceId: "",
    ticker: null,
    kind: "initial_thesis",
    title: message,
    body: message,
    reason: message,
    outcome: message,
    confidence: 0,
    createdAt: "",
    updatedAt: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeDecisionEntry(
  input: Partial<DecisionJournalEntry>
): DecisionJournalEntry {
  const kind = DECISION_KINDS.includes(input.kind as DecisionKind)
    ? (input.kind as DecisionKind)
    : "initial_thesis";

  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    kind,
    title: safeWorkspaceText(input.title, INTEGRATION_EMPTY.awaitingResearchActivity),
    body: safeWorkspaceText(input.body, INTEGRATION_EMPTY.awaitingResearchActivity),
    reason: safeWorkspaceText(input.reason, ""),
    outcome: safeWorkspaceText(input.outcome, ""),
    confidence: Math.max(0, Math.min(100, Number(input.confidence) || 0)),
    createdAt: safeWorkspaceText(input.createdAt, new Date().toISOString()),
    updatedAt: safeWorkspaceText(input.updatedAt, new Date().toISOString()),
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? INTEGRATION_EMPTY.awaitingResearchActivity,
  };
}

export function emptySnapshot(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noSnapshots
): ResearchSnapshot {
  return {
    id: "",
    workspaceId: "",
    label: message,
    payload: {
      ticker: null,
      thesis: message,
      bullCase: [],
      bearCase: [],
      risks: [],
      catalysts: [],
      confidence: 0,
      noteCount: 0,
      evidenceCount: 0,
    },
    createdAt: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeSnapshot(input: Partial<ResearchSnapshot>): ResearchSnapshot {
  const payload = input.payload ?? emptySnapshot().payload;
  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    label: safeWorkspaceText(input.label, INTEGRATION_EMPTY.awaitingResearchActivity),
    payload: {
      ticker: payload.ticker
        ? safeWorkspaceText(payload.ticker, "").toUpperCase()
        : null,
      thesis: safeWorkspaceText(payload.thesis, INTEGRATION_EMPTY.awaitingResearchActivity),
      bullCase: Array.isArray(payload.bullCase)
        ? payload.bullCase.map((v) => safeWorkspaceText(v, "")).filter(Boolean)
        : [],
      bearCase: Array.isArray(payload.bearCase)
        ? payload.bearCase.map((v) => safeWorkspaceText(v, "")).filter(Boolean)
        : [],
      risks: Array.isArray(payload.risks)
        ? payload.risks.map((v) => safeWorkspaceText(v, "")).filter(Boolean)
        : [],
      catalysts: Array.isArray(payload.catalysts)
        ? payload.catalysts.map((v) => safeWorkspaceText(v, "")).filter(Boolean)
        : [],
      confidence: Math.max(0, Math.min(100, Number(payload.confidence) || 0)),
      noteCount: Math.max(0, Number(payload.noteCount) || 0),
      evidenceCount: Math.max(0, Number(payload.evidenceCount) || 0),
    },
    createdAt: safeWorkspaceText(input.createdAt, new Date().toISOString()),
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? INTEGRATION_EMPTY.awaitingResearchActivity,
  };
}

export function emptyInsights(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.awaitingResearchActivity
): WorkspaceInsights {
  return {
    topPositiveFactors: [],
    topNegativeFactors: [],
    keyRisks: [],
    catalysts: [],
    aiSummary: message,
    recommendedActions: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyTimelineView(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noTimeline
): ResearchTimelineView {
  return { entries: [], empty: true, emptyMessage: message };
}

export function emptyDecisionView(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noDecisions
): DecisionJournalView {
  return { entries: [], empty: true, emptyMessage: message };
}

export function emptySnapshotTimelineView(
  message: IntegrationEmptyMessage = INTEGRATION_EMPTY.noSnapshots
): SnapshotTimelineView {
  return { snapshots: [], empty: true, emptyMessage: message };
}
