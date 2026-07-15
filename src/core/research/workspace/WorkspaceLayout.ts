/**
 * Institutional Research Workspace — persistent layout (Sprint 10A.R1).
 * Panel visibility, order, and cached layout state.
 */

import {
  WORKSPACE_EMPTY,
  WORKSPACE_PANEL_LABELS,
  WORKSPACE_PANELS,
  isWorkspacePanelId,
  resolvePanelRoute,
  safeWorkspaceNumber,
  safeWorkspaceText,
  type WorkspaceEmptyMessage,
  type WorkspacePanelId,
} from "./WorkspaceModels";

export interface WorkspacePanelState {
  id: WorkspacePanelId;
  label: string;
  visible: boolean;
  order: number;
  widthPct: number;
  route: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WorkspaceLayoutState {
  workspaceId: string;
  panels: WorkspacePanelState[];
  activePanel: WorkspacePanelId;
  ticker: string | null;
  updatedAt: string;
  cached: boolean;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

const layouts = new Map<string, WorkspaceLayoutState>();

let seq = 0;

function nextStamp(now?: Date | null): string {
  const d = now ?? new Date();
  return d.toISOString();
}

export function defaultPanels(ticker?: string | null): WorkspacePanelState[] {
  return WORKSPACE_PANELS.map((id, index) => ({
    id,
    label: WORKSPACE_PANEL_LABELS[id],
    visible: true,
    order: index,
    widthPct: Math.round(100 / WORKSPACE_PANELS.length),
    route: resolvePanelRoute(id, ticker),
    empty: false,
    emptyMessage: WORKSPACE_EMPTY.awaitingResearch,
  }));
}

export function emptyLayout(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): WorkspaceLayoutState {
  return {
    workspaceId: "",
    panels: [],
    activePanel: "research",
    ticker: null,
    updatedAt: "—",
    cached: false,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeLayout(
  input?: Partial<WorkspaceLayoutState> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noWorkspace
): WorkspaceLayoutState {
  if (!input) return emptyLayout(message);
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  const empty = !workspaceId || Boolean(input.empty);
  const panels = Array.isArray(input.panels)
    ? input.panels.map(normalizePanel).sort((a, b) => a.order - b.order)
    : [];
  return {
    workspaceId,
    panels,
    activePanel: normalizePanelId(input.activePanel),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    cached: Boolean(input.cached),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingResearch,
  };
}

export function createLayout(
  workspaceId: string,
  options?: { ticker?: string | null; now?: Date | null; panels?: WorkspacePanelId[] | null }
): WorkspaceLayoutState {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyLayout(WORKSPACE_EMPTY.noWorkspace);

  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;
  let panels = defaultPanels(ticker);

  if (Array.isArray(options?.panels) && options.panels.length > 0) {
    const wanted = new Set(
      options.panels.filter(isWorkspacePanelId)
    );
    panels = panels.map((p) => ({
      ...p,
      visible: wanted.has(p.id),
    }));
  }

  const layout = normalizeLayout({
    workspaceId: id,
    panels,
    activePanel: "research",
    ticker,
    updatedAt: nextStamp(options?.now),
    cached: true,
    empty: false,
  });

  layouts.set(id, layout);
  seq += 1;
  return layout;
}

export function getLayout(workspaceId: string): WorkspaceLayoutState | null {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return null;
  return layouts.get(id) ?? null;
}

export function persistLayout(
  workspaceId: string,
  patch?: Partial<WorkspaceLayoutState> | null,
  now?: Date | null
): WorkspaceLayoutState {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyLayout(WORKSPACE_EMPTY.noWorkspace);

  const current = layouts.get(id) ?? createLayout(id, { now });
  const next = normalizeLayout({
    ...current,
    ...patch,
    workspaceId: id,
    updatedAt: nextStamp(now),
    cached: true,
    empty: false,
  });
  layouts.set(id, next);
  return next;
}

export function setActivePanel(
  workspaceId: string,
  panel: WorkspacePanelId,
  now?: Date | null
): WorkspaceLayoutState {
  return persistLayout(workspaceId, { activePanel: panel }, now);
}

export function togglePanelVisibility(
  workspaceId: string,
  panel: WorkspacePanelId,
  visible?: boolean,
  now?: Date | null
): WorkspaceLayoutState {
  const current = getLayout(workspaceId) ?? createLayout(workspaceId, { now });
  const panels = current.panels.map((p) =>
    p.id === panel
      ? { ...p, visible: visible == null ? !p.visible : Boolean(visible) }
      : p
  );
  return persistLayout(workspaceId, { panels }, now);
}

export function cacheUsageBytes(): number {
  let bytes = 0;
  for (const layout of layouts.values()) {
    bytes += JSON.stringify(layout).length;
  }
  return bytes;
}

export function resetLayouts(): void {
  layouts.clear();
  seq = 0;
}

export function getLayoutCacheCount(): number {
  return layouts.size;
}

export function getLayoutSeq(): number {
  return seq;
}

function normalizePanel(
  input?: Partial<WorkspacePanelState> | null
): WorkspacePanelState {
  const id = normalizePanelId(input?.id);
  return {
    id,
    label: safeWorkspaceText(input?.label, WORKSPACE_PANEL_LABELS[id]),
    visible: input?.visible !== false,
    order: Math.max(0, Math.floor(safeWorkspaceNumber(input?.order, 0))),
    widthPct: Math.max(0, safeWorkspaceNumber(input?.widthPct, 0)),
    route: safeWorkspaceText(input?.route, resolvePanelRoute(id)),
    empty: Boolean(input?.empty),
    emptyMessage:
      (safeWorkspaceText(
        input?.emptyMessage,
        WORKSPACE_EMPTY.awaitingResearch
      ) as WorkspaceEmptyMessage) || WORKSPACE_EMPTY.awaitingResearch,
  };
}

function normalizePanelId(value?: string | null): WorkspacePanelId {
  const text = safeWorkspaceText(value, "research");
  return isWorkspacePanelId(text) ? text : "research";
}

export class WorkspaceLayoutEngine {
  createLayout = createLayout;
  getLayout = getLayout;
  persistLayout = persistLayout;
  setActivePanel = setActivePanel;
  togglePanelVisibility = togglePanelVisibility;
  reset = resetLayouts;
}
