/**
 * Sprint 10C.R6 — workspace engine.
 *
 * Manages named dashboard workspaces (profiles): widget placements, sizes,
 * visibility, docking region and order. Pure presentation state — the engine
 * never touches AI engines, APIs or portfolio/watchlist logic.
 *
 * Persistence goes to localStorage (injectable for tests / SSR-safe).
 * Every mutating public API auto-saves.
 */

import {
  DASHBOARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type WidgetPlacement,
} from "../layouts/dashboardTemplates";
import {
  WORKSPACE_REGIONS,
  WORKSPACE_SIZES,
  type WorkspaceRegion,
  type WorkspaceSize,
} from "../widgets/widgetRegistry";

export interface Workspace {
  id: string;
  name: string;
  /** Template this workspace was created from (reset target). */
  templateId: string;
  placements: WidgetPlacement[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceStore {
  version: 1;
  activeId: string;
  workspaces: Workspace[];
}

export type WorkspaceStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const STORAGE_KEY = "equityos.workspace.store";
const DEFAULT_WORKSPACE_ID = "default";

function browserStorage(): WorkspaceStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `ws-${Date.now().toString(36)}-${idCounter}`;
}

function clonePlacements(
  placements: readonly WidgetPlacement[]
): WidgetPlacement[] {
  return placements.map((placement) => ({ ...placement }));
}

function defaultWorkspace(): Workspace {
  const template = getTemplate(DEFAULT_TEMPLATE_ID) ?? DASHBOARD_TEMPLATES[0];
  const now = Date.now();
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: "My Workspace",
    templateId: template.id,
    placements: clonePlacements(template.placements),
    createdAt: now,
    updatedAt: now,
  };
}

function defaultStore(): WorkspaceStore {
  const workspace = defaultWorkspace();
  return { version: 1, activeId: workspace.id, workspaces: [workspace] };
}

// ---------------------------------------------------------------------------
// Validation (used by persistence and import)
// ---------------------------------------------------------------------------

function isValidPlacement(value: unknown): value is WidgetPlacement {
  if (!value || typeof value !== "object") return false;
  const placement = value as WidgetPlacement;
  return (
    typeof placement.widgetId === "string" &&
    placement.widgetId.length > 0 &&
    WORKSPACE_REGIONS.includes(placement.region as WorkspaceRegion) &&
    typeof placement.order === "number" &&
    Number.isFinite(placement.order) &&
    WORKSPACE_SIZES.includes(placement.size as WorkspaceSize) &&
    typeof placement.visible === "boolean" &&
    typeof placement.pinned === "boolean" &&
    typeof placement.collapsed === "boolean"
  );
}

function sanitizeWorkspace(value: unknown): Workspace | null {
  if (!value || typeof value !== "object") return null;
  const workspace = value as Workspace;
  if (typeof workspace.id !== "string" || workspace.id.length === 0) return null;
  if (typeof workspace.name !== "string" || workspace.name.trim().length === 0) {
    return null;
  }
  if (!Array.isArray(workspace.placements)) return null;
  const placements = workspace.placements.filter(isValidPlacement);
  if (placements.length === 0) return null;
  return {
    id: workspace.id,
    name: workspace.name.trim(),
    templateId:
      typeof workspace.templateId === "string" && getTemplate(workspace.templateId)
        ? workspace.templateId
        : DEFAULT_TEMPLATE_ID,
    placements: clonePlacements(placements),
    createdAt:
      typeof workspace.createdAt === "number" ? workspace.createdAt : Date.now(),
    updatedAt:
      typeof workspace.updatedAt === "number" ? workspace.updatedAt : Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Store persistence
// ---------------------------------------------------------------------------

/** Load the persisted workspace store; falls back to a valid default. */
export function loadWorkspaceStore(
  storage: WorkspaceStorage | undefined = browserStorage()
): WorkspaceStore {
  if (!storage) return defaultStore();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as WorkspaceStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.workspaces)) {
      return defaultStore();
    }
    const workspaces = parsed.workspaces
      .map(sanitizeWorkspace)
      .filter((workspace): workspace is Workspace => workspace !== null);
    if (workspaces.length === 0) return defaultStore();
    const activeId = workspaces.some((w) => w.id === parsed.activeId)
      ? parsed.activeId
      : workspaces[0].id;
    return { version: 1, activeId, workspaces };
  } catch {
    return defaultStore();
  }
}

/** Persist the store (auto-save). Returns false when storage is missing. */
export function saveWorkspaceStore(
  store: WorkspaceStore,
  storage: WorkspaceStorage | undefined = browserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Workspace lifecycle — public APIs
// ---------------------------------------------------------------------------

/** Deterministic default workspace (SSR-safe initial render). */
export function getDefaultWorkspace(): Workspace {
  const workspace = defaultWorkspace();
  workspace.createdAt = 0;
  workspace.updatedAt = 0;
  return workspace;
}

/** Public API — create a workspace profile from a template and activate it. */
export function createWorkspace(
  name: string,
  templateId: string = DEFAULT_TEMPLATE_ID,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Unknown template "${templateId}"`);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Workspace name cannot be empty");
  const now = Date.now();
  const workspace: Workspace = {
    id: nextId(),
    name: trimmed,
    templateId: template.id,
    placements: clonePlacements(template.placements),
    createdAt: now,
    updatedAt: now,
  };
  const store = loadWorkspaceStore(storage);
  store.workspaces.push(workspace);
  store.activeId = workspace.id;
  saveWorkspaceStore(store, storage);
  return workspace;
}

/** Public API — upsert a workspace and persist (auto-save). */
export function saveWorkspace(
  workspace: Workspace,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace {
  const stamped: Workspace = { ...workspace, updatedAt: Date.now() };
  const store = loadWorkspaceStore(storage);
  const index = store.workspaces.findIndex((w) => w.id === stamped.id);
  if (index >= 0) store.workspaces[index] = stamped;
  else store.workspaces.push(stamped);
  saveWorkspaceStore(store, storage);
  return stamped;
}

/** Public API — load a workspace by id (null when absent). */
export function loadWorkspace(
  id: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace | null {
  const store = loadWorkspaceStore(storage);
  return store.workspaces.find((workspace) => workspace.id === id) ?? null;
}

export function listWorkspaces(
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace[] {
  return loadWorkspaceStore(storage).workspaces;
}

export function getActiveWorkspace(
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace {
  const store = loadWorkspaceStore(storage);
  return (
    store.workspaces.find((workspace) => workspace.id === store.activeId) ??
    store.workspaces[0]
  );
}

export function setActiveWorkspace(
  id: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace | null {
  const store = loadWorkspaceStore(storage);
  const workspace = store.workspaces.find((w) => w.id === id);
  if (!workspace) return null;
  store.activeId = id;
  saveWorkspaceStore(store, storage);
  return workspace;
}

export function duplicateWorkspace(
  id: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace | null {
  const source = loadWorkspace(id, storage);
  if (!source) return null;
  const now = Date.now();
  const copy: Workspace = {
    ...source,
    id: nextId(),
    name: `${source.name} (Copy)`,
    placements: clonePlacements(source.placements),
    createdAt: now,
    updatedAt: now,
  };
  const store = loadWorkspaceStore(storage);
  store.workspaces.push(copy);
  store.activeId = copy.id;
  saveWorkspaceStore(store, storage);
  return copy;
}

export function renameWorkspace(
  id: string,
  name: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const workspace = loadWorkspace(id, storage);
  if (!workspace) return null;
  return saveWorkspace({ ...workspace, name: trimmed }, storage);
}

/** Delete a workspace. The last remaining workspace cannot be deleted. */
export function deleteWorkspace(
  id: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): boolean {
  const store = loadWorkspaceStore(storage);
  if (store.workspaces.length <= 1) return false;
  const index = store.workspaces.findIndex((w) => w.id === id);
  if (index < 0) return false;
  store.workspaces.splice(index, 1);
  if (store.activeId === id) store.activeId = store.workspaces[0].id;
  saveWorkspaceStore(store, storage);
  return true;
}

/** Public API — reset a workspace's placements back to its template. */
export function resetWorkspace(
  id?: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace {
  const target = id
    ? loadWorkspace(id, storage) ?? getActiveWorkspace(storage)
    : getActiveWorkspace(storage);
  const template = getTemplate(target.templateId) ?? DASHBOARD_TEMPLATES[0];
  return saveWorkspace(
    { ...target, placements: clonePlacements(template.placements) },
    storage
  );
}

/** Apply a template's placements to a workspace (keeps id and name). */
export function applyTemplate(
  workspaceId: string,
  templateId: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace | null {
  const workspace = loadWorkspace(workspaceId, storage);
  const template = getTemplate(templateId);
  if (!workspace || !template) return null;
  return saveWorkspace(
    {
      ...workspace,
      templateId: template.id,
      placements: clonePlacements(template.placements),
    },
    storage
  );
}

// ---------------------------------------------------------------------------
// Import / export — JSON only
// ---------------------------------------------------------------------------

export interface WorkspaceExport {
  format: "equityos-workspace";
  version: 1;
  workspace: Workspace;
}

/** Public API — serialize a workspace as a portable JSON backup. */
export function exportWorkspace(
  id?: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): string {
  const workspace = id
    ? loadWorkspace(id, storage)
    : getActiveWorkspace(storage);
  if (!workspace) throw new Error(`Unknown workspace "${id}"`);
  const payload: WorkspaceExport = {
    format: "equityos-workspace",
    version: 1,
    workspace,
  };
  return JSON.stringify(payload, null, 2);
}

/** Public API — restore a workspace from a JSON backup and activate it. */
export function importWorkspace(
  json: string,
  storage: WorkspaceStorage | undefined = browserStorage()
): Workspace {
  let parsed: WorkspaceExport;
  try {
    parsed = JSON.parse(json) as WorkspaceExport;
  } catch {
    throw new Error("Import failed: not valid JSON");
  }
  if (
    !parsed ||
    parsed.format !== "equityos-workspace" ||
    parsed.version !== 1
  ) {
    throw new Error("Import failed: not an EquityOS workspace backup");
  }
  const workspace = sanitizeWorkspace(parsed.workspace);
  if (!workspace) {
    throw new Error("Import failed: workspace payload is invalid");
  }
  const restored: Workspace = { ...workspace, id: nextId() };
  const store = loadWorkspaceStore(storage);
  store.workspaces.push(restored);
  store.activeId = restored.id;
  saveWorkspaceStore(store, storage);
  return restored;
}

// ---------------------------------------------------------------------------
// Widget operations — pure functions over a workspace
// ---------------------------------------------------------------------------

function reindex(placements: WidgetPlacement[]): WidgetPlacement[] {
  const byRegion = new Map<WorkspaceRegion, number>();
  return placements.map((placement) => {
    const order = byRegion.get(placement.region) ?? 0;
    byRegion.set(placement.region, order + 1);
    return { ...placement, order };
  });
}

/** Placements of one region in display order (pinned first). */
export function placementsForRegion(
  workspace: Workspace,
  region: WorkspaceRegion
): WidgetPlacement[] {
  return workspace.placements
    .filter((placement) => placement.region === region)
    .sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order
    );
}

/**
 * Public API — move a widget: reorder within its region or dock it into
 * another region at the given index. Returns a new workspace.
 */
export function moveWidget(
  workspace: Workspace,
  widgetId: string,
  target: { region?: WorkspaceRegion; index: number }
): Workspace {
  const moving = workspace.placements.find((p) => p.widgetId === widgetId);
  if (!moving) return workspace;
  const region = target.region ?? moving.region;
  const rest = workspace.placements.filter((p) => p.widgetId !== widgetId);
  const inRegion = rest
    .filter((p) => p.region === region)
    .sort((a, b) => a.order - b.order);
  const index = Math.max(0, Math.min(target.index, inRegion.length));
  inRegion.splice(index, 0, { ...moving, region });
  const outOfRegion = rest.filter((p) => p.region !== region);
  return {
    ...workspace,
    placements: reindex([
      ...outOfRegion.sort((a, b) => a.order - b.order),
      ...inRegion,
    ]),
  };
}

/** Public API — swap the positions of two widgets. */
export function swapWidgets(
  workspace: Workspace,
  aId: string,
  bId: string
): Workspace {
  const a = workspace.placements.find((p) => p.widgetId === aId);
  const b = workspace.placements.find((p) => p.widgetId === bId);
  if (!a || !b) return workspace;
  return {
    ...workspace,
    placements: workspace.placements.map((placement) => {
      if (placement.widgetId === aId) {
        return { ...placement, region: b.region, order: b.order };
      }
      if (placement.widgetId === bId) {
        return { ...placement, region: a.region, order: a.order };
      }
      return placement;
    }),
  };
}

/** Public API — resize a widget (snap to workspace grid sizes). */
export function resizeWidget(
  workspace: Workspace,
  widgetId: string,
  size: WorkspaceSize
): Workspace {
  if (!WORKSPACE_SIZES.includes(size)) {
    throw new Error(`Unknown widget size "${size}"`);
  }
  return {
    ...workspace,
    placements: workspace.placements.map((placement) =>
      placement.widgetId === widgetId ? { ...placement, size } : placement
    ),
  };
}

function patchWidget(
  workspace: Workspace,
  widgetId: string,
  patch: Partial<WidgetPlacement>
): Workspace {
  return {
    ...workspace,
    placements: workspace.placements.map((placement) =>
      placement.widgetId === widgetId ? { ...placement, ...patch } : placement
    ),
  };
}

export function setWidgetVisible(
  workspace: Workspace,
  widgetId: string,
  visible: boolean
): Workspace {
  return patchWidget(workspace, widgetId, { visible });
}

export function setWidgetPinned(
  workspace: Workspace,
  widgetId: string,
  pinned: boolean
): Workspace {
  return patchWidget(workspace, widgetId, { pinned });
}

export function setWidgetCollapsed(
  workspace: Workspace,
  widgetId: string,
  collapsed: boolean
): Workspace {
  return patchWidget(workspace, widgetId, { collapsed });
}

/** All hidden widget placements (for the "restore hidden" menu). */
export function hiddenWidgets(workspace: Workspace): WidgetPlacement[] {
  return workspace.placements.filter((placement) => !placement.visible);
}

/** Public API — restore every hidden widget in one step. */
export function restoreHiddenWidgets(workspace: Workspace): Workspace {
  return {
    ...workspace,
    placements: workspace.placements.map((placement) =>
      placement.visible ? placement : { ...placement, visible: true }
    ),
  };
}

/** Add a widget from the library into a workspace (no-op when present). */
export function addWidgetToWorkspace(
  workspace: Workspace,
  placement: WidgetPlacement
): Workspace {
  if (workspace.placements.some((p) => p.widgetId === placement.widgetId)) {
    return setWidgetVisible(workspace, placement.widgetId, true);
  }
  const order =
    workspace.placements.filter((p) => p.region === placement.region).length;
  return {
    ...workspace,
    placements: [...workspace.placements, { ...placement, order }],
  };
}

/** Remove a widget from a workspace entirely. */
export function removeWidgetFromWorkspace(
  workspace: Workspace,
  widgetId: string
): Workspace {
  return {
    ...workspace,
    placements: reindex(
      workspace.placements
        .filter((placement) => placement.widgetId !== widgetId)
        .sort((a, b) => a.order - b.order)
    ),
  };
}
