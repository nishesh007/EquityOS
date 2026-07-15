/**
 * Institutional Research Workspace — layout presentation models (Sprint 10A.R2).
 * Multi-tab terminal empty states. Never surface null / undefined / NaN.
 */

import {
  resolvePanelRoute,
  safeWorkspaceNumber,
  safeWorkspaceText,
  type WorkspacePanelId,
} from "../WorkspaceModels";

export const LAYOUT_EMPTY = {
  noOpenTabs: "No Open Tabs",
  noSavedLayout: "No Saved Layout",
  noSessionHistory: "No Session History",
  awaitingWorkspace: "Awaiting Workspace",
} as const;

export type LayoutEmptyMessage =
  (typeof LAYOUT_EMPTY)[keyof typeof LAYOUT_EMPTY];

export const TAB_KINDS = [
  "company",
  "research",
  "earnings",
  "alerts",
  "screener",
  "portfolio",
  "opportunity",
  "notes",
] as const;

export type WorkspaceTabKind = (typeof TAB_KINDS)[number];

export const TAB_KIND_LABELS: Record<WorkspaceTabKind, string> = {
  company: "Company",
  research: "Research",
  earnings: "Earnings",
  alerts: "Alerts",
  screener: "Screener",
  portfolio: "Portfolio",
  opportunity: "Opportunity",
  notes: "Notes",
};

export const DOCK_REGIONS = ["left", "right", "bottom", "center"] as const;
export type DockRegion = (typeof DOCK_REGIONS)[number];

export const LAYOUT_PRESETS = [
  "default",
  "research",
  "trading",
  "portfolio",
  "compact",
] as const;
export type LayoutPresetId = (typeof LAYOUT_PRESETS)[number];

export interface WorkspaceTab {
  id: string;
  workspaceId: string;
  kind: WorkspaceTabKind;
  title: string;
  route: string;
  ticker: string | null;
  pinned: boolean;
  order: number;
  scrollTop: number;
  filters: Record<string, string>;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface DockPaneState {
  region: DockRegion;
  sizePct: number;
  collapsed: boolean;
  fullscreen: boolean;
  tabIds: string[];
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface DockLayoutState {
  workspaceId: string;
  left: DockPaneState;
  right: DockPaneState;
  bottom: DockPaneState;
  center: DockPaneState;
  updatedAt: string;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface SavedWorkspaceLayout {
  id: string;
  workspaceId: string;
  name: string;
  preset: LayoutPresetId;
  tabIds: string[];
  dock: DockLayoutState;
  activeTabId: string | null;
  createdAt: string;
  updatedAt: string;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface WorkspaceHistoryEntry {
  id: string;
  kind:
    | "tab"
    | "company"
    | "research"
    | "layout"
    | "navigation"
    | "session";
  label: string;
  target: string;
  route: string;
  at: string;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface WorkspaceHistoryView {
  recentTabs: WorkspaceHistoryEntry[];
  recentCompanies: WorkspaceHistoryEntry[];
  recentResearch: WorkspaceHistoryEntry[];
  recentLayouts: WorkspaceHistoryEntry[];
  navigation: WorkspaceHistoryEntry[];
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface PersistedWorkspaceSession {
  workspaceId: string;
  tabIds: string[];
  activeTabId: string | null;
  layoutId: string | null;
  preset: LayoutPresetId;
  scrollPositions: Record<string, number>;
  filters: Record<string, Record<string, string>>;
  dock: DockLayoutState | null;
  restoredAt: string | null;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
}

export interface MultiTabWorkspaceView {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  dock: DockLayoutState | null;
  savedLayouts: SavedWorkspaceLayout[];
  history: WorkspaceHistoryView;
  persistence: PersistedWorkspaceSession | null;
  empty: boolean;
  emptyMessage: LayoutEmptyMessage;
  surfaceHints: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
  };
}

export function emptyTab(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noOpenTabs
): WorkspaceTab {
  return {
    id: "",
    workspaceId: "",
    kind: "research",
    title: message,
    route: "/research",
    ticker: null,
    pinned: false,
    order: 0,
    scrollTop: 0,
    filters: {},
    closed: true,
    createdAt: "—",
    updatedAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeTab(
  input?: Partial<WorkspaceTab> | null,
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noOpenTabs
): WorkspaceTab {
  if (!input) return emptyTab(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  const kind = normalizeTabKind(input.kind);
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    kind,
    title: empty && !id ? message : safeWorkspaceText(input.title, TAB_KIND_LABELS[kind]),
    route: safeWorkspaceText(input.route, resolveTabRoute(kind, ticker)),
    ticker,
    pinned: Boolean(input.pinned),
    order: Math.max(0, Math.floor(safeWorkspaceNumber(input.order, 0))),
    scrollTop: Math.max(0, Math.floor(safeWorkspaceNumber(input.scrollTop, 0))),
    filters: normalizeFilters(input.filters),
    closed: Boolean(input.closed),
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as LayoutEmptyMessage) ||
        message
      : LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function emptyDockPane(
  region: DockRegion,
  message: LayoutEmptyMessage = LAYOUT_EMPTY.awaitingWorkspace
): DockPaneState {
  return {
    region,
    sizePct: region === "center" ? 50 : 25,
    collapsed: false,
    fullscreen: false,
    tabIds: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeDockPane(
  region: DockRegion,
  input?: Partial<DockPaneState> | null
): DockPaneState {
  if (!input) return emptyDockPane(region);
  const tabIds = Array.isArray(input.tabIds)
    ? input.tabIds.map((t) => safeWorkspaceText(t, "").toLowerCase()).filter(Boolean)
    : [];
  return {
    region,
    sizePct: Math.min(100, Math.max(0, safeWorkspaceNumber(input.sizePct, 25))),
    collapsed: Boolean(input.collapsed),
    fullscreen: Boolean(input.fullscreen),
    tabIds,
    empty: tabIds.length === 0,
    emptyMessage:
      tabIds.length === 0 ? LAYOUT_EMPTY.noOpenTabs : LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function emptyDockLayout(
  workspaceId = "",
  message: LayoutEmptyMessage = LAYOUT_EMPTY.awaitingWorkspace
): DockLayoutState {
  return {
    workspaceId: safeWorkspaceText(workspaceId, "").toLowerCase(),
    left: emptyDockPane("left", message),
    right: emptyDockPane("right", message),
    bottom: emptyDockPane("bottom", message),
    center: emptyDockPane("center", message),
    updatedAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeDockLayout(
  input?: Partial<DockLayoutState> | null,
  message: LayoutEmptyMessage = LAYOUT_EMPTY.awaitingWorkspace
): DockLayoutState {
  if (!input) return emptyDockLayout("", message);
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  const empty = !workspaceId || Boolean(input.empty);
  return {
    workspaceId,
    left: normalizeDockPane("left", input.left),
    right: normalizeDockPane("right", input.right),
    bottom: normalizeDockPane("bottom", input.bottom),
    center: normalizeDockPane("center", input.center),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as LayoutEmptyMessage) ||
        message
      : LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function emptySavedLayout(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noSavedLayout
): SavedWorkspaceLayout {
  return {
    id: "",
    workspaceId: "",
    name: message,
    preset: "default",
    tabIds: [],
    dock: emptyDockLayout(),
    activeTabId: null,
    createdAt: "—",
    updatedAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeSavedLayout(
  input?: Partial<SavedWorkspaceLayout> | null,
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noSavedLayout
): SavedWorkspaceLayout {
  if (!input) return emptySavedLayout(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    name: empty && !id ? message : safeWorkspaceText(input.name, message),
    preset: normalizePreset(input.preset),
    tabIds: Array.isArray(input.tabIds)
      ? input.tabIds.map((t) => safeWorkspaceText(t, "").toLowerCase()).filter(Boolean)
      : [],
    dock: normalizeDockLayout(input.dock, message),
    activeTabId: input.activeTabId
      ? safeWorkspaceText(input.activeTabId, "")
      : null,
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as LayoutEmptyMessage) ||
        message
      : LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function emptyHistoryEntry(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noSessionHistory
): WorkspaceHistoryEntry {
  return {
    id: "",
    kind: "navigation",
    label: message,
    target: "—",
    route: "/research",
    at: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeHistoryEntry(
  input?: Partial<WorkspaceHistoryEntry> | null,
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noSessionHistory
): WorkspaceHistoryEntry {
  if (!input) return emptyHistoryEntry(message);
  const id = safeWorkspaceText(input.id, "");
  const empty = !id || Boolean(input.empty);
  return {
    id,
    kind: normalizeHistoryKind(input.kind),
    label: safeWorkspaceText(input.label, message),
    target: safeWorkspaceText(input.target, "—"),
    route: safeWorkspaceText(input.route, "/research"),
    at: safeWorkspaceText(input.at, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as LayoutEmptyMessage) ||
        message
      : LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function emptyHistoryView(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.noSessionHistory
): WorkspaceHistoryView {
  return {
    recentTabs: [],
    recentCompanies: [],
    recentResearch: [],
    recentLayouts: [],
    navigation: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyPersistedSession(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.awaitingWorkspace
): PersistedWorkspaceSession {
  return {
    workspaceId: "",
    tabIds: [],
    activeTabId: null,
    layoutId: null,
    preset: "default",
    scrollPositions: {},
    filters: {},
    dock: null,
    restoredAt: null,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyMultiTabView(
  message: LayoutEmptyMessage = LAYOUT_EMPTY.awaitingWorkspace
): MultiTabWorkspaceView {
  return {
    tabs: [],
    activeTabId: null,
    dock: null,
    savedLayouts: [],
    history: emptyHistoryView(message),
    persistence: null,
    empty: true,
    emptyMessage: message,
    surfaceHints: {
      research: "/research",
      dashboard: "/",
      company: "/company",
      results: "/results",
    },
  };
}

export function resolveTabRoute(
  kind: WorkspaceTabKind,
  ticker?: string | null
): string {
  const panel = tabKindToPanel(kind);
  return resolvePanelRoute(panel, ticker);
}

export function tabKindToPanel(kind: WorkspaceTabKind): WorkspacePanelId {
  switch (kind) {
    case "company":
      return "company";
    case "research":
      return "research";
    case "earnings":
      return "earnings";
    case "alerts":
      return "alerts";
    case "screener":
      return "screener";
    case "portfolio":
      return "portfolio";
    case "opportunity":
      return "opportunity";
    case "notes":
      return "notes";
    default:
      return "research";
  }
}

export function normalizeTabKind(value?: string | null): WorkspaceTabKind {
  const text = safeWorkspaceText(value, "research");
  return (TAB_KINDS as readonly string[]).includes(text)
    ? (text as WorkspaceTabKind)
    : "research";
}

export function normalizePreset(value?: string | null): LayoutPresetId {
  const text = safeWorkspaceText(value, "default");
  return (LAYOUT_PRESETS as readonly string[]).includes(text)
    ? (text as LayoutPresetId)
    : "default";
}

function normalizeHistoryKind(
  value?: string | null
): WorkspaceHistoryEntry["kind"] {
  const text = safeWorkspaceText(value, "navigation");
  if (
    text === "tab" ||
    text === "company" ||
    text === "research" ||
    text === "layout" ||
    text === "navigation" ||
    text === "session"
  ) {
    return text;
  }
  return "navigation";
}

function normalizeFilters(
  input?: Record<string, string> | null
): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const k = safeWorkspaceText(key, "");
    const v = safeWorkspaceText(value, "");
    if (k && v) out[k] = v;
  }
  return out;
}
