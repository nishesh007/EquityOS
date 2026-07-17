/**
 * Sprint 10C.R6 — workspace engine barrel.
 */

export {
  createWorkspace,
  saveWorkspace,
  loadWorkspace,
  listWorkspaces,
  loadWorkspaceStore,
  saveWorkspaceStore,
  getActiveWorkspace,
  setActiveWorkspace,
  getDefaultWorkspace,
  duplicateWorkspace,
  renameWorkspace,
  deleteWorkspace,
  resetWorkspace,
  applyTemplate,
  exportWorkspace,
  importWorkspace,
  moveWidget,
  swapWidgets,
  resizeWidget,
  setWidgetVisible,
  setWidgetPinned,
  setWidgetCollapsed,
  hiddenWidgets,
  restoreHiddenWidgets,
  addWidgetToWorkspace,
  removeWidgetFromWorkspace,
  placementsForRegion,
  type Workspace,
  type WorkspaceStore,
  type WorkspaceStorage,
  type WorkspaceExport,
} from "./workspaceEngine";

export {
  WORKSPACE_SHORTCUTS,
  matchShortcut,
  type WorkspaceShortcut,
  type WorkspaceShortcutId,
  type ShortcutKeyEvent,
} from "./workspaceShortcuts";

export { WorkspaceDashboard } from "./WorkspaceDashboard";
