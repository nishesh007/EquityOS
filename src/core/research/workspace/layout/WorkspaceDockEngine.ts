/**
 * Institutional Research Workspace — docking engine (Sprint 10A.R2).
 * Left / right / bottom panels, resizable, collapsible, fullscreen.
 */

import { safeWorkspaceNumber, safeWorkspaceText } from "../WorkspaceModels";
import {
  LAYOUT_EMPTY,
  emptyDockLayout,
  normalizeDockLayout,
  normalizeDockPane,
  type DockLayoutState,
  type DockRegion,
} from "./LayoutPresentationModels";

const docks = new Map<string, DockLayoutState>();

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function createDockLayout(
  workspaceId: string,
  now?: Date | null
): DockLayoutState {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptyDockLayout("", LAYOUT_EMPTY.awaitingWorkspace);

  const layout = normalizeDockLayout({
    workspaceId: id,
    left: {
      region: "left",
      sizePct: 22,
      collapsed: false,
      fullscreen: false,
      tabIds: [],
    },
    right: {
      region: "right",
      sizePct: 22,
      collapsed: false,
      fullscreen: false,
      tabIds: [],
    },
    bottom: {
      region: "bottom",
      sizePct: 28,
      collapsed: true,
      fullscreen: false,
      tabIds: [],
    },
    center: {
      region: "center",
      sizePct: 56,
      collapsed: false,
      fullscreen: false,
      tabIds: [],
    },
    updatedAt: stamp(now),
    empty: false,
  });
  docks.set(id, layout);
  return layout;
}

export function getDockLayout(workspaceId: string): DockLayoutState | null {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return null;
  return docks.get(id) ?? null;
}

export function ensureDockLayout(
  workspaceId: string,
  now?: Date | null
): DockLayoutState {
  return getDockLayout(workspaceId) ?? createDockLayout(workspaceId, now);
}

export function dockTab(
  workspaceId: string,
  tabId: string,
  region: DockRegion,
  now?: Date | null
): DockLayoutState {
  const layout = ensureDockLayout(workspaceId, now);
  const tid = safeWorkspaceText(tabId, "").toLowerCase();
  if (!tid) return layout;

  const next = normalizeDockLayout({
    ...layout,
    left: stripTab(layout.left, tid),
    right: stripTab(layout.right, tid),
    bottom: stripTab(layout.bottom, tid),
    center: stripTab(layout.center, tid),
    empty: false,
  });

  const pane = { ...next[region], tabIds: [...next[region].tabIds, tid] };
  next[region] = normalizeDockPane(region, pane);
  next.updatedAt = stamp(now);
  next.empty = false;
  docks.set(layout.workspaceId, next);
  return next;
}

export function resizePane(
  workspaceId: string,
  region: DockRegion,
  sizePct: number,
  now?: Date | null
): DockLayoutState {
  const layout = ensureDockLayout(workspaceId, now);
  const pane = normalizeDockPane(region, {
    ...layout[region],
    sizePct: Math.min(100, Math.max(5, safeWorkspaceNumber(sizePct, 25))),
  });
  const next = normalizeDockLayout({
    ...layout,
    [region]: pane,
    updatedAt: stamp(now),
    empty: false,
  });
  docks.set(layout.workspaceId, next);
  return next;
}

export function collapsePane(
  workspaceId: string,
  region: DockRegion,
  collapsed = true,
  now?: Date | null
): DockLayoutState {
  const layout = ensureDockLayout(workspaceId, now);
  const pane = normalizeDockPane(region, {
    ...layout[region],
    collapsed: Boolean(collapsed),
    fullscreen: collapsed ? false : layout[region].fullscreen,
  });
  const next = normalizeDockLayout({
    ...layout,
    [region]: pane,
    updatedAt: stamp(now),
    empty: false,
  });
  docks.set(layout.workspaceId, next);
  return next;
}

export function fullscreenPane(
  workspaceId: string,
  region: DockRegion,
  enabled = true,
  now?: Date | null
): DockLayoutState {
  const layout = ensureDockLayout(workspaceId, now);
  const regions: DockRegion[] = ["left", "right", "bottom", "center"];
  const next = normalizeDockLayout({
    ...layout,
    updatedAt: stamp(now),
    empty: false,
  });

  for (const r of regions) {
    next[r] = normalizeDockPane(r, {
      ...layout[r],
      fullscreen: enabled ? r === region : false,
      collapsed: enabled && r !== region ? true : layout[r].collapsed,
    });
  }

  docks.set(layout.workspaceId, next);
  return next;
}

export function setDockSnapshot(
  workspaceId: string,
  dock: DockLayoutState,
  now?: Date | null
): DockLayoutState {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  const next = normalizeDockLayout({
    ...dock,
    workspaceId: id,
    updatedAt: stamp(now),
    empty: false,
  });
  docks.set(id, next);
  return next;
}

export function resetDocks(): void {
  docks.clear();
}

function stripTab(
  pane: DockLayoutState["left"],
  tabId: string
): DockLayoutState["left"] {
  return normalizeDockPane(pane.region, {
    ...pane,
    tabIds: pane.tabIds.filter((id) => id !== tabId),
  });
}

export class WorkspaceDockEngine {
  createDockLayout = createDockLayout;
  getDockLayout = getDockLayout;
  dockTab = dockTab;
  resizePane = resizePane;
  collapsePane = collapsePane;
  fullscreenPane = fullscreenPane;
  reset = resetDocks;
}
