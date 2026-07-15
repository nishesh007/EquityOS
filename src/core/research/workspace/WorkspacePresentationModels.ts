/**
 * Institutional Research Workspace — presentation models (Sprint 10A.R1).
 * Empty states & cards. Never surface null / undefined / NaN.
 */

import {
  WORKSPACE_EMPTY,
  WORKSPACE_PANEL_LABELS,
  assertNoSentinelText,
  safeWorkspaceText,
  type ResearchWorkspaceRecord,
  type WorkspaceEmptyMessage,
  type WorkspacePanelId,
} from "./WorkspaceModels";
import type { WorkspaceLayoutState } from "./WorkspaceLayout";
import type { ResearchSession } from "./WorkspaceSession";
import {
  emptyWorkspaceMetrics,
  type ResearchWorkspaceMetrics,
} from "./WorkspaceMetrics";

export { WORKSPACE_EMPTY, assertNoSentinelText };
export type { WorkspaceEmptyMessage };

export interface WorkspaceCard {
  id: string;
  title: string;
  subtitle: string;
  kind: "active" | "recent" | "pinned" | "favorite" | "archived" | "session";
  tags: string[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WorkspaceActivity {
  id: string;
  action: string;
  target: string;
  at: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface ResearchWorkspaceView {
  active: WorkspaceCard | null;
  recent: WorkspaceCard[];
  sessions: WorkspaceCard[];
  pinned: WorkspaceCard[];
  favorites: WorkspaceCard[];
  panels: Array<{
    id: WorkspacePanelId;
    label: string;
    visible: boolean;
    route: string;
  }>;
  layout: WorkspaceLayoutState | null;
  metrics: ResearchWorkspaceMetrics;
  recentActivity: WorkspaceActivity[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
  surfaceHints: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
  };
}

export function emptyWorkspaceCard(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): WorkspaceCard {
  return {
    id: "",
    title: message,
    subtitle: message,
    kind: "recent",
    tags: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWorkspaceCard(
  input?: Partial<WorkspaceCard> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): WorkspaceCard {
  if (!input) return emptyWorkspaceCard(message);
  const id = safeWorkspaceText(input.id, "");
  const empty = !id || Boolean(input.empty);
  return {
    id,
    title: safeWorkspaceText(input.title, message),
    subtitle: safeWorkspaceText(input.subtitle, message),
    kind: normalizeKind(input.kind),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => safeWorkspaceText(t, "")).filter(Boolean)
      : [],
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingResearch,
  };
}

export function workspaceToCard(
  record: ResearchWorkspaceRecord,
  kind?: WorkspaceCard["kind"]
): WorkspaceCard {
  if (record.empty) {
    return emptyWorkspaceCard(record.emptyMessage);
  }
  return normalizeWorkspaceCard({
    id: record.id,
    title: record.name,
    subtitle: `${record.sessionIds.length} sessions · ${record.status}`,
    kind:
      kind ??
      (record.status === "archived"
        ? "archived"
        : record.pinned
          ? "pinned"
          : record.favorite
            ? "favorite"
            : "recent"),
    tags: [record.status],
    empty: false,
  });
}

export function sessionToCard(session: ResearchSession): WorkspaceCard {
  if (session.empty) {
    return emptyWorkspaceCard(session.emptyMessage);
  }
  return normalizeWorkspaceCard({
    id: session.id,
    title: session.name,
    subtitle: session.ticker
      ? `${session.ticker} · research ${session.researchCount}`
      : `research ${session.researchCount}`,
    kind: session.pinned ? "pinned" : session.favorite ? "favorite" : "session",
    tags: [session.status, ...(session.ticker ? [session.ticker] : [])],
    empty: false,
  });
}

export function emptyWorkspaceActivity(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingResearch
): WorkspaceActivity {
  return {
    id: "",
    action: message,
    target: "—",
    at: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWorkspaceActivity(
  input?: Partial<WorkspaceActivity> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingResearch
): WorkspaceActivity {
  if (!input) return emptyWorkspaceActivity(message);
  const id = safeWorkspaceText(input.id, "");
  const empty = !id || Boolean(input.empty);
  return {
    id,
    action: safeWorkspaceText(input.action, message),
    target: safeWorkspaceText(input.target, "—"),
    at: safeWorkspaceText(input.at, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingResearch,
  };
}

export function emptyResearchWorkspaceView(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): ResearchWorkspaceView {
  return {
    active: null,
    recent: [],
    sessions: [],
    pinned: [],
    favorites: [],
    panels: [],
    layout: null,
    metrics: emptyWorkspaceMetrics(),
    recentActivity: [],
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

export function panelLabel(id: WorkspacePanelId): string {
  return WORKSPACE_PANEL_LABELS[id];
}

function normalizeKind(value?: string | null): WorkspaceCard["kind"] {
  const text = safeWorkspaceText(value, "recent");
  if (
    text === "active" ||
    text === "recent" ||
    text === "pinned" ||
    text === "favorite" ||
    text === "archived" ||
    text === "session"
  ) {
    return text;
  }
  return "recent";
}
