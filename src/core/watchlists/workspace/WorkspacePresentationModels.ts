/**
 * Institutional Workspace — presentation models (Sprint 10B.R7).
 */

import { WATCHLIST_SURFACE_ROUTES, safeWatchlistText } from "../WatchlistModels";
import type { WatchlistRecord } from "../WatchlistModels";

export const WORKSPACE_PRODUCTIVITY_EMPTY = {
  noSavedWatchlists: "No Saved Watchlists",
  noTimeline: "No Timeline",
  noFavorites: "No Favorites",
  noActivity: "No Activity",
  awaitingWorkspace: "Awaiting Workspace",
} as const;

export type WorkspaceProductivityEmptyMessage =
  (typeof WORKSPACE_PRODUCTIVITY_EMPTY)[keyof typeof WORKSPACE_PRODUCTIVITY_EMPTY];

export const WORKSPACE_HISTORY_KINDS = [
  "created",
  "modified",
  "ai_updated",
  "research_updated",
  "alert_triggered",
  "exported",
  "archived",
] as const;

export type WorkspaceHistoryKind = (typeof WORKSPACE_HISTORY_KINDS)[number];

export const QUICK_ACTIONS = [
  "save",
  "duplicate",
  "archive",
  "restore",
  "clone",
  "favorite",
  "pin",
  "rename",
  "open_research",
  "compare",
] as const;

export type QuickActionId = (typeof QUICK_ACTIONS)[number];

export interface InstitutionalWorkspaceContext {
  watchlistId?: string | null;
  symbols?: string[] | null;
  snapshots?: Record<string, import("@/src/core/alerts/intelligence/AlertPresentationModels").WatchlistItemSnapshot> | null;
  portfolioSymbols?: string[] | null;
  sectorBySymbol?: Record<string, string> | null;
  workspaceId?: string | null;
  ticker?: string | null;
  searchQuery?: string | null;
  compareWatchlistId?: string | null;
  compareSymbols?: string[] | null;
  now?: Date | null;
}

export interface SavedWatchlistItem {
  id: string;
  name: string;
  symbols: string[];
  pinned: boolean;
  favorite: boolean;
  status: WatchlistRecord["status"];
  updatedAt: string;
}

export interface SavedWatchlistsView {
  items: SavedWatchlistItem[];
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
}

export interface WorkspaceHistoryEntry {
  id: string;
  watchlistId: string;
  kind: WorkspaceHistoryKind | string;
  summary: string;
  at: string;
  actor: string;
}

export interface WorkspaceHistoryView {
  entries: WorkspaceHistoryEntry[];
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
}

export interface WorkspaceComparisonRow {
  label: string;
  left: string;
  right: string;
}

export interface WorkspaceComparisonView {
  leftId: string;
  rightId: string;
  rows: WorkspaceComparisonRow[];
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
}

export interface ResearchBridgeLink {
  kind: "research" | "company" | "earnings" | "reports" | "notes" | "decision_journal";
  label: string;
  route: string;
  ticker?: string;
}

export interface WorkspaceResearchBridgeView {
  watchlistId: string;
  links: ResearchBridgeLink[];
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
}

export interface RecentActivityItem {
  watchlistId: string;
  name: string;
  action: string;
  at: string;
}

export interface ProductivityView {
  recentWatchlists: SavedWatchlistItem[];
  pinnedWatchlists: SavedWatchlistItem[];
  favoriteWatchlists: SavedWatchlistItem[];
  searchResults: SavedWatchlistItem[];
  quickActions: QuickActionId[];
  shortcuts: Record<string, string>;
  recentActivity: RecentActivityItem[];
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
}

export interface InstitutionalWorkspaceBundle {
  saved: SavedWatchlistsView;
  history: WorkspaceHistoryView;
  timeline: WorkspaceHistoryView;
  comparison: WorkspaceComparisonView;
  research: WorkspaceResearchBridgeView;
  productivity: ProductivityView;
  empty: boolean;
  emptyMessage: WorkspaceProductivityEmptyMessage;
  surfaceHints: typeof WATCHLIST_SURFACE_ROUTES & { portfolio: string };
}

export function safeInstitutionalText(
  value: string | null | undefined,
  fallback: string
): string {
  return safeWatchlistText(value, fallback);
}

export function emptySavedWatchlists(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.noSavedWatchlists
): SavedWatchlistsView {
  return { items: [], empty: true, emptyMessage: message };
}

export function emptyWorkspaceHistory(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.noTimeline
): WorkspaceHistoryView {
  return { entries: [], empty: true, emptyMessage: message };
}

export function emptyWorkspaceComparison(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace
): WorkspaceComparisonView {
  return { leftId: "", rightId: "", rows: [], empty: true, emptyMessage: message };
}

export function emptyWorkspaceResearchBridge(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace
): WorkspaceResearchBridgeView {
  return { watchlistId: "", links: [], empty: true, emptyMessage: message };
}

export function emptyProductivityView(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.noActivity
): ProductivityView {
  return {
    recentWatchlists: [],
    pinnedWatchlists: [],
    favoriteWatchlists: [],
    searchResults: [],
    quickActions: [],
    shortcuts: {},
    recentActivity: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyInstitutionalWorkspace(
  message: WorkspaceProductivityEmptyMessage = WORKSPACE_PRODUCTIVITY_EMPTY.awaitingWorkspace
): InstitutionalWorkspaceBundle {
  return {
    saved: emptySavedWatchlists(),
    history: emptyWorkspaceHistory(),
    timeline: emptyWorkspaceHistory(),
    comparison: emptyWorkspaceComparison(),
    research: emptyWorkspaceResearchBridge(),
    productivity: emptyProductivityView(),
    empty: true,
    emptyMessage: message,
    surfaceHints: { ...WATCHLIST_SURFACE_ROUTES, portfolio: "/portfolio" },
  };
}
