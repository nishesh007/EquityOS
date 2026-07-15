/**
 * Institutional Screener Workspace — public exports (Sprint 9D.R7).
 */

export {
  WORKSPACE_EMPTY,
  QUICK_ACTIONS,
  SCORE_DELTAS,
  emptyInstitutionalScoresSummary,
  normalizeInstitutionalScoresSummary,
  emptySavedScreenRecord,
  normalizeSavedScreenRecord,
  emptyScreenHistoryRun,
  normalizeScreenHistoryRun,
  emptyComparisonTickerDelta,
  normalizeComparisonTickerDelta,
  emptyScreenComparisonResult,
  normalizeScreenComparisonResult,
  emptyScreenTimelineEntry,
  normalizeScreenTimelineEntry,
  emptyResearchBridgeTarget,
  normalizeResearchBridgeTarget,
  emptyWorkspaceCard,
  normalizeWorkspaceCard,
  emptyWorkspaceActivity,
  normalizeWorkspaceActivity,
  emptyWorkspaceView,
  normalizeScoreDelta,
} from "./WorkspacePresentationModels";
export type {
  WorkspaceEmptyMessage,
  QuickAction,
  ScoreDelta,
  WorkspaceScreenOrigin,
  InstitutionalScoresSummary,
  SavedScreenRecord,
  ScreenHistoryRun,
  ComparisonTickerDelta,
  ScreenComparisonResult,
  ScreenTimelineEntry,
  ResearchBridgeIntent,
  ResearchBridgeTarget,
  WorkspaceCard,
  WorkspaceActivity,
  WorkspaceView,
} from "./WorkspacePresentationModels";

export {
  saveScreen,
  loadScreen,
  listSavedScreens,
  deleteSavedScreen,
  pinSavedScreen,
  favoriteSavedScreen,
  archiveSavedScreen,
  listRecentSavedScreens,
  listPinnedSavedScreens,
  listFavoriteSavedScreens,
  resetSavedScreens,
  SavedScreenEngine,
} from "./SavedScreenEngine";
export type { SaveScreenInput } from "./SavedScreenEngine";

export {
  recordRun,
  listHistory,
  getRun,
  reloadRun,
  duplicateRun,
  archiveRun,
  deleteRun,
  resetHistory,
  ScreenHistoryEngine,
} from "./ScreenHistoryEngine";
export type { RecordRunInput } from "./ScreenHistoryEngine";

export {
  compareScreens,
  compareRuns,
  compareStrategies,
  compareSectorSnapshots,
  portfolioVsMarket,
  watchlistVsMarket,
  ScreenComparisonEngine,
} from "./ScreenComparisonEngine";
export type { ComparableSide } from "./ScreenComparisonEngine";

export {
  openResearch,
  listResearchBridgeIntents,
  ResearchBridgeEngine,
} from "./ResearchBridgeEngine";
export type { OpenResearchOptions } from "./ResearchBridgeEngine";

export {
  getTimeline,
  TIMELINE_METRICS,
  ScreenTimelineEngine,
} from "./ScreenTimelineEngine";
export type {
  TimelineMetric,
  TimelineSnapshot,
} from "./ScreenTimelineEngine";

export {
  ScreenWorkspace,
  getScreenWorkspace,
  resetScreenWorkspace,
  getWorkspaceView,
  saveScreenWorkspace,
  loadScreenWorkspace,
  listSavedScreensWorkspace,
  compareScreensWorkspace,
  openResearchWorkspace,
  getTimelineWorkspace,
  archiveScreenWorkspace,
  favoriteScreenWorkspace,
  pinScreenWorkspace,
} from "./ScreenWorkspace";
