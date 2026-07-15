/**
 * Institutional Research Workspace — domain models (Sprint 10A.R1).
 * Composition foundation only — no duplicated research engines.
 */

export const WORKSPACE_EMPTY = {
  noWorkspace: "No Workspace",
  noActiveResearch: "No Active Research",
  noRecentSessions: "No Recent Sessions",
  awaitingResearch: "Awaiting Research",
} as const;

export type WorkspaceEmptyMessage =
  (typeof WORKSPACE_EMPTY)[keyof typeof WORKSPACE_EMPTY];

export const WORKSPACE_PANELS = [
  "research",
  "company",
  "financials",
  "technical",
  "valuation",
  "earnings",
  "alerts",
  "screener",
  "portfolio",
  "opportunity",
  "notes",
] as const;

export type WorkspacePanelId = (typeof WORKSPACE_PANELS)[number];

export const WORKSPACE_PANEL_LABELS: Record<WorkspacePanelId, string> = {
  research: "Research",
  company: "Company",
  financials: "Financials",
  technical: "Technical",
  valuation: "Valuation",
  earnings: "Earnings",
  alerts: "Alerts",
  screener: "Screener",
  portfolio: "Portfolio",
  opportunity: "Opportunity",
  notes: "Notes",
};

/** Existing platform routes — compose, do not rebuild modules. */
export const WORKSPACE_PANEL_ROUTES: Record<WorkspacePanelId, string> = {
  research: "/ai/research",
  company: "/company",
  financials: "/company",
  technical: "/company",
  valuation: "/company",
  earnings: "/results?earnings=1",
  alerts: "/results?alerts=1",
  screener: "/screener",
  portfolio: "/portfolio",
  opportunity: "/opportunities",
  notes: "/company",
};

export type WorkspaceStatus =
  | "active"
  | "closed"
  | "archived"
  | "deleted";

export type SessionStatus =
  | "open"
  | "closed"
  | "archived"
  | "deleted";

export interface ResearchWorkspaceRecord {
  id: string;
  name: string;
  status: WorkspaceStatus;
  activeSessionId: string | null;
  sessionIds: string[];
  pinned: boolean;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  cachedStateKey: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface CreateWorkspaceInput {
  id?: string | null;
  name?: string | null;
  ticker?: string | null;
  panels?: WorkspacePanelId[] | null;
  now?: Date | null;
}

export interface OpenWorkspaceOptions {
  sessionId?: string | null;
  ticker?: string | null;
  now?: Date | null;
}

export function safeWorkspaceText(
  value: string | null | undefined,
  fallback: string
): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function safeWorkspaceNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function assertNoSentinelText(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed !== "" &&
    trimmed !== "null" &&
    trimmed !== "undefined" &&
    trimmed !== "NaN"
  );
}

export function isWorkspacePanelId(value: string | null | undefined): value is WorkspacePanelId {
  return (WORKSPACE_PANELS as readonly string[]).includes(
    safeWorkspaceText(value, "")
  );
}

export function resolvePanelRoute(
  panel: WorkspacePanelId,
  ticker?: string | null
): string {
  const symbol = safeWorkspaceText(ticker, "").toUpperCase();
  const base = WORKSPACE_PANEL_ROUTES[panel];

  if (
    panel === "company" ||
    panel === "financials" ||
    panel === "technical" ||
    panel === "valuation" ||
    panel === "notes"
  ) {
    if (!symbol) return "/research";
    const tab =
      panel === "company"
        ? "overview"
        : panel === "notes"
          ? "notes"
          : panel;
    return `/company/${encodeURIComponent(symbol)}?tab=${tab}`;
  }

  if (panel === "research" && symbol) {
    return `/ai/research?ticker=${encodeURIComponent(symbol)}`;
  }

  if ((panel === "earnings" || panel === "alerts") && symbol) {
    return `${base}&ticker=${encodeURIComponent(symbol)}`;
  }

  if ((panel === "screener" || panel === "portfolio" || panel === "opportunity") && symbol) {
    return `${base}?ticker=${encodeURIComponent(symbol)}`;
  }

  return base;
}

export function emptyWorkspaceRecord(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): ResearchWorkspaceRecord {
  return {
    id: "",
    name: message,
    status: "closed",
    activeSessionId: null,
    sessionIds: [],
    pinned: false,
    favorite: false,
    createdAt: "—",
    updatedAt: "—",
    lastOpenedAt: null,
    cachedStateKey: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWorkspaceRecord(
  input?: Partial<ResearchWorkspaceRecord> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): ResearchWorkspaceRecord {
  if (!input) return emptyWorkspaceRecord(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    name: empty && !id ? message : safeWorkspaceText(input.name, message),
    status: normalizeWorkspaceStatus(input.status),
    activeSessionId: input.activeSessionId
      ? safeWorkspaceText(input.activeSessionId, "")
      : null,
    sessionIds: normalizeIdList(input.sessionIds),
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    lastOpenedAt: input.lastOpenedAt
      ? safeWorkspaceText(input.lastOpenedAt, "—")
      : null,
    cachedStateKey: safeWorkspaceText(input.cachedStateKey, id ? `cache:${id}` : ""),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingResearch,
  };
}

function normalizeWorkspaceStatus(value?: string | null): WorkspaceStatus {
  const text = safeWorkspaceText(value, "closed");
  if (
    text === "active" ||
    text === "closed" ||
    text === "archived" ||
    text === "deleted"
  ) {
    return text;
  }
  return "closed";
}

function normalizeIdList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => safeWorkspaceText(v, "").toLowerCase()).filter(Boolean);
}
