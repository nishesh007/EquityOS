/**
 * Institutional Research Workspace — public exports (Sprint 10A.R1).
 * Composition foundation for /research, /dashboard, /company, /results.
 */

export {
  WORKSPACE_EMPTY,
  WORKSPACE_PANELS,
  WORKSPACE_PANEL_LABELS,
  WORKSPACE_PANEL_ROUTES,
  safeWorkspaceText,
  safeWorkspaceNumber,
  assertNoSentinelText,
  isWorkspacePanelId,
  resolvePanelRoute,
  emptyWorkspaceRecord,
  normalizeWorkspaceRecord,
} from "./WorkspaceModels";
export type {
  WorkspaceEmptyMessage,
  WorkspacePanelId,
  WorkspaceStatus,
  SessionStatus,
  ResearchWorkspaceRecord,
  CreateWorkspaceInput,
  OpenWorkspaceOptions,
} from "./WorkspaceModels";

export {
  defaultPanels,
  emptyLayout,
  normalizeLayout,
  createLayout,
  getLayout,
  persistLayout,
  setActivePanel,
  togglePanelVisibility,
  cacheUsageBytes,
  resetLayouts,
  getLayoutCacheCount,
  WorkspaceLayoutEngine,
} from "./WorkspaceLayout";
export type {
  WorkspacePanelState,
  WorkspaceLayoutState,
} from "./WorkspaceLayout";

export {
  emptySession,
  normalizeSession,
  createSession,
  getSession,
  openSession,
  closeSession,
  duplicateSession,
  pinSession,
  favoriteSession,
  renameSession,
  archiveSession,
  restoreSession,
  deleteSession,
  listSessions,
  incrementResearchCount,
  resetSessions,
  WorkspaceSessionEngine,
} from "./WorkspaceSession";
export type {
  ResearchSession,
  CreateSessionInput,
} from "./WorkspaceSession";

export {
  createWorkspace as registryCreateWorkspace,
  getWorkspace,
  openWorkspace as registryOpenWorkspace,
  closeWorkspace as registryCloseWorkspace,
  renameWorkspace as registryRenameWorkspace,
  archiveWorkspace as registryArchiveWorkspace,
  restoreWorkspace as registryRestoreWorkspace,
  deleteWorkspace,
  listWorkspaces as registryListWorkspaces,
  getActiveWorkspace,
  listRecentWorkspaces,
  attachSession,
  resetRegistry,
  WorkspaceRegistry,
} from "./WorkspaceRegistry";

export {
  emptyWorkspaceMetrics,
  recordExecutionTime,
  getWorkspaceMetrics as readWorkspaceMetrics,
  getCacheUsage,
  getMemoryUsage,
  resetMetrics,
  assertMetricLabelsSafe,
  WorkspaceMetricsTracker,
} from "./WorkspaceMetrics";
export type { ResearchWorkspaceMetrics } from "./WorkspaceMetrics";

export {
  emptyWorkspaceCard,
  normalizeWorkspaceCard,
  workspaceToCard,
  sessionToCard,
  emptyWorkspaceActivity,
  normalizeWorkspaceActivity,
  emptyResearchWorkspaceView,
  panelLabel,
} from "./WorkspacePresentationModels";
export type {
  WorkspaceCard,
  WorkspaceActivity,
  ResearchWorkspaceView,
} from "./WorkspacePresentationModels";

export {
  ResearchWorkspace,
  getResearchWorkspace,
  resetResearchWorkspace,
  createWorkspace,
  openWorkspace,
  closeWorkspace,
  renameWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  listWorkspaces,
  getWorkspaceMetrics,
  getResearchWorkspaceView,
  getSessionById,
} from "./ResearchWorkspace";
