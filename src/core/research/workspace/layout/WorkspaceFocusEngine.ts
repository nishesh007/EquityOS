/**
 * Institutional Research Workspace — focus engine (Sprint 10A.R2).
 * Active tab / pane focus and fullscreen coordination.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import type { DockRegion, WorkspaceTab } from "./LayoutPresentationModels";
import { fullscreenPane, ensureDockLayout } from "./WorkspaceDockEngine";
import {
  focusTab,
  getActiveTab,
} from "./WorkspaceTabEngine";

let focusedWorkspaceId: string | null = null;

export function setWorkspaceFocus(workspaceId: string): string {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  focusedWorkspaceId = id || null;
  return focusedWorkspaceId ?? "";
}

export function getFocusedWorkspaceId(): string | null {
  return focusedWorkspaceId;
}

export function focusWorkspaceTab(tabId: string): WorkspaceTab {
  const tab = focusTab(tabId);
  if (!tab.empty) {
    focusedWorkspaceId = tab.workspaceId;
    ensureDockLayout(tab.workspaceId);
  }
  return tab;
}

export function focusDockRegion(
  workspaceId: string,
  region: DockRegion,
  fullscreen = false
): { workspaceId: string; region: DockRegion; tab: WorkspaceTab | null } {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  focusedWorkspaceId = id || null;
  if (!id) {
    return { workspaceId: "", region, tab: null };
  }
  if (fullscreen) {
    fullscreenPane(id, region, true);
  }
  return {
    workspaceId: id,
    region,
    tab: getActiveTab(id),
  };
}

export function clearFocus(): void {
  focusedWorkspaceId = null;
}

export function resetFocus(): void {
  clearFocus();
}

export class WorkspaceFocusEngine {
  setWorkspaceFocus = setWorkspaceFocus;
  focusWorkspaceTab = focusWorkspaceTab;
  focusDockRegion = focusDockRegion;
  getFocusedWorkspaceId = getFocusedWorkspaceId;
  reset = resetFocus;
}
