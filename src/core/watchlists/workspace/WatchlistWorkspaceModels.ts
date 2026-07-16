/**
 * Watchlist Workspace — domain models (Sprint 10B.R4).
 * Portfolio, alerts, research, action center, collaboration.
 */

import { WATCHLIST_SURFACE_ROUTES, safeWatchlistText } from "../WatchlistModels";

export const WORKSPACE_EMPTY = {
  noPortfolioLinks: "No Portfolio Links",
  noResearch: "No Research",
  noAlerts: "No Alerts",
  noActivity: "No Activity",
  noSharedUsers: "No Shared Users",
} as const;

export type WorkspaceEmptyMessage =
  (typeof WORKSPACE_EMPTY)[keyof typeof WORKSPACE_EMPTY];

export const ACTION_CENTER_ACTIONS = [
  "buy_candidate",
  "reduce",
  "exit",
  "monitor",
  "move_to_portfolio",
  "remove",
  "pin",
  "favorite",
  "archive",
] as const;

export type ActionCenterActionId = (typeof ACTION_CENTER_ACTIONS)[number];

export const TIMELINE_EVENT_KINDS = [
  "added",
  "removed",
  "ai_recommendation",
  "alert_triggered",
  "research_updated",
  "earnings_completed",
  "portfolio_moved",
] as const;

export type TimelineEventKind = (typeof TIMELINE_EVENT_KINDS)[number];

export const WATCHLIST_WORKSPACE_ROUTES = {
  ...WATCHLIST_SURFACE_ROUTES,
  portfolio: "/portfolio",
} as const;

export interface WatchlistWorkspaceContext {
  watchlistId?: string | null;
  symbols?: string[] | null;
  portfolioSymbols?: string[] | null;
  portfolioWeights?: Record<string, number> | null;
  workspaceId?: string | null;
  ticker?: string | null;
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  now?: Date | null;
}

export interface PortfolioBridgeView {
  watchlistId: string;
  overlap: string[];
  overlapPercent: number;
  missingHoldings: string[];
  watchlistCandidates: string[];
  upgradeCandidates: string[];
  exitCandidates: string[];
  allocationImpact: Array<{ ticker: string; currentWeight: number; projectedWeight: number }>;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistAlertItem {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  status: "active" | "upcoming" | "dismissed" | "snoozed" | "pinned";
  createdAt: string;
  snoozedUntil: string | null;
}

export interface WatchlistAlertsView {
  existing: WatchlistAlertItem[];
  upcoming: WatchlistAlertItem[];
  history: WatchlistAlertItem[];
  pinned: WatchlistAlertItem[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistResearchLink {
  ticker: string;
  route: string;
  summary: string;
  health: string;
  latestNote: string;
  decisionCount: number;
}

export interface WatchlistResearchView {
  openResearchRoute: string;
  latestReportRoute: string;
  summary: string;
  health: string;
  links: WatchlistResearchLink[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistActionItem {
  id: string;
  ticker: string;
  action: ActionCenterActionId;
  label: string;
  reason: string;
  priority: number;
}

export interface WatchlistActionsView {
  actions: WatchlistActionItem[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistTimelineEntry {
  id: string;
  watchlistId: string;
  kind: TimelineEventKind;
  ticker: string;
  summary: string;
  at: string;
  actor: string;
}

export interface WatchlistTimelineView {
  entries: WatchlistTimelineEntry[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistCollaborator {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  readOnly: boolean;
}

export interface WatchlistComment {
  id: string;
  watchlistId: string;
  author: string;
  body: string;
  mentions: string[];
  at: string;
}

export interface WatchlistCollaborationView {
  shared: boolean;
  collaborators: WatchlistCollaborator[];
  comments: WatchlistComment[];
  activityLog: string[];
  readOnly: boolean;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WatchlistWorkspaceView {
  watchlistId: string;
  portfolio: PortfolioBridgeView;
  alerts: WatchlistAlertsView;
  research: WatchlistResearchView;
  actions: WatchlistActionsView;
  timeline: WatchlistTimelineView;
  collaboration: WatchlistCollaborationView;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
  surfaceHints: typeof WATCHLIST_WORKSPACE_ROUTES;
}

export function safeWorkspaceText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function emptyPortfolioBridge(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noPortfolioLinks
): PortfolioBridgeView {
  return {
    watchlistId: "",
    overlap: [],
    overlapPercent: 0,
    missingHoldings: [],
    watchlistCandidates: [],
    upgradeCandidates: [],
    exitCandidates: [],
    allocationImpact: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyWatchlistWorkspace(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noActivity
): WatchlistWorkspaceView {
  return {
    watchlistId: "",
    portfolio: emptyPortfolioBridge(),
    alerts: { existing: [], upcoming: [], history: [], pinned: [], empty: true, emptyMessage: WORKSPACE_EMPTY.noAlerts },
    research: {
      openResearchRoute: WATCHLIST_WORKSPACE_ROUTES.research,
      latestReportRoute: WATCHLIST_WORKSPACE_ROUTES.results,
      summary: message,
      health: message,
      links: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noResearch,
    },
    actions: { actions: [], empty: true, emptyMessage: WORKSPACE_EMPTY.noActivity },
    timeline: { entries: [], empty: true, emptyMessage: WORKSPACE_EMPTY.noActivity },
    collaboration: {
      shared: false,
      collaborators: [],
      comments: [],
      activityLog: [],
      readOnly: false,
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noSharedUsers,
    },
    empty: true,
    emptyMessage: message,
    surfaceHints: { ...WATCHLIST_WORKSPACE_ROUTES },
  };
}
