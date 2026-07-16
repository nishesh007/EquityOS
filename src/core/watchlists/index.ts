/**
 * Institutional Watchlist Platform — public exports (Sprint 10B.R1–R5).
 * Multi-watchlist architecture for /watchlist, /dashboard, /research, /results, /company.
 */

export {
  WATCHLIST_EMPTY,
  WATCHLIST_KINDS,
  WATCHLIST_KIND_LABELS,
  WATCHLIST_SURFACE_ROUTES,
  safeWatchlistText,
  safeWatchlistNumber,
  normalizeSymbols,
  isWatchlistKind,
  emptyWatchlistRecord,
  normalizeWatchlistRecord,
  assertNoSentinelText,
} from "./WatchlistModels";
export type {
  WatchlistEmptyMessage,
  WatchlistKind,
  WatchlistStatus,
  WatchlistSortField,
  WatchlistSortDirection,
  WatchlistMetadata,
  WatchlistRecord,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistQuery,
} from "./WatchlistModels";

export {
  DEFAULT_WATCHLIST_SYMBOLS,
  PORTFOLIO_WATCHLIST_SYMBOLS,
  SECTOR_WATCHLIST_DEFINITIONS,
  THEME_WATCHLIST_DEFINITIONS,
  BUILTIN_WATCHLIST_DEFINITIONS,
  definitionToRecordId,
  isBuiltinDefinitionId,
} from "./WatchlistDefinition";
export type { WatchlistDefinition } from "./WatchlistDefinition";

export {
  registerWatchlistDefinition,
  registerBuiltinWatchlistDefinitions,
  loadWatchlistDefinitions,
  ensureBuiltinWatchlists,
  createWatchlistRecord,
  getWatchlistRecord,
  updateWatchlistRecord,
  archiveWatchlistRecord,
  restoreWatchlistRecord,
  deleteWatchlistRecord,
  cloneWatchlistRecord,
  duplicateWatchlistRecord,
  pinWatchlistRecord,
  favoriteWatchlistRecord,
  searchWatchlists,
  sortWatchlistRecords,
  filterWatchlists,
  cacheWatchlistMetricsKey,
  getCachedWatchlistMetricsKey,
  getWatchlistCacheCount,
  resetWatchlistRegistry,
  WatchlistRegistry,
} from "./WatchlistRegistry";

export {
  emptyWatchlistMetrics,
  computeWatchlistMetrics,
  getWatchlistMetricsExecutionMs,
  resetWatchlistMetrics,
  assertWatchlistMetricLabelsSafe,
  WatchlistMetricsTracker,
} from "./WatchlistMetrics";
export type {
  WatchlistMetricsBundle,
  WatchlistMetricsInput,
} from "./WatchlistMetrics";

export {
  WATCHLIST_EMPTY as PRESENTATION_WATCHLIST_EMPTY,
  emptyWatchlistCard,
  normalizeWatchlistCard,
  watchlistToCard,
  emptyWatchlistPlatformView,
  buildWatchlistPlatformView,
  archiveEmptyView,
} from "./WatchlistPresentationModels";
export type {
  WatchlistCard,
  WatchlistPlatformView,
} from "./WatchlistPresentationModels";

export {
  WatchlistEngine,
  getWatchlistEngine,
  resetWatchlistEngine,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  cloneWatchlist,
  archiveWatchlist,
  restoreWatchlist,
  getWatchlists,
  getMetrics,
  getWatchlistPlatformView,
  ensureDefaultWatchlists,
} from "./WatchlistEngine";
export type { WatchlistEngineContext } from "./WatchlistEngine";

export {
  INSTITUTIONAL_WATCHLIST_EMPTY,
  SPRINT_10B_R1_FROZEN,
  InstitutionalWatchlists,
  getInstitutionalWatchlists,
  resetInstitutionalWatchlists,
  isSprint10BR1Frozen,
  getInstitutionalWatchlistHealth,
  getInstitutionalWatchlistSummary,
} from "./InstitutionalWatchlists";
export type {
  InstitutionalWatchlistHealth,
  InstitutionalWatchlistSummary,
} from "./InstitutionalWatchlists";

/** Sprint 10B.R2 — smart watchlists, dynamic rules, AI organization */
export {
  SMART_WATCHLIST_EMPTY,
  DYNAMIC_WATCHLIST_TEMPLATES,
  DYNAMIC_TEMPLATE_LABELS,
  WATCHLIST_RULE_FIELDS,
  GROUPING_DIMENSIONS,
  createDynamicWatchlist,
  createRule,
  createRuleGroup,
  runDynamicWatchlist,
  getRecommendations,
  groupWatchlist,
  tagCompanies,
  getSmartWatchlistView,
  getSmartWatchlistHealth,
  getSmartWatchlistEngine,
  resetSmartWatchlistEngine,
  isSprint10BR2Frozen,
  SPRINT_10B_R2_FROZEN,
} from "./smart";
export type {
  SmartWatchlistEmptyMessage,
  DynamicWatchlistTemplateId,
  SmartWatchlistCandidate,
  DynamicWatchlistDefinition,
  DynamicWatchlistRunResult,
  CompanyTag,
  WatchlistGroupingView,
  WatchlistRecommendationsView,
  SmartWatchlistView,
  SmartWatchlistHealth,
} from "./smart";

/** Sprint 10B.R3 — watchlist intelligence, AI insights, opportunity monitoring */
export {
  WATCHLIST_INTELLIGENCE_EMPTY,
  OPPORTUNITY_KINDS,
  INTELLIGENCE_RECOMMENDATION_ACTIONS,
  CHANGE_KINDS,
  getWatchlistSummary,
  getWatchlistInsights,
  getWatchlistHealth,
  getWatchlistOpportunities,
  getWatchlistRecommendations,
  getWatchlistChanges,
  getWatchlistInsightEngine,
  getWatchlistIntelligenceHealth,
  resetWatchlistIntelligence,
  isSprint10BR3Frozen,
  SPRINT_10B_R3_FROZEN,
  emptyIntelligenceBundle,
} from "./intelligence";
export type {
  WatchlistIntelligenceEmptyMessage,
  WatchlistIntelligenceContext,
  WatchlistHealthView,
  WatchlistSummaryView,
  WatchlistOpportunitiesView,
  WatchlistChangesView,
  IntelligenceRecommendationsView,
  WatchlistInsightsView,
  WatchlistIntelligenceBundle,
} from "./intelligence";

/** Sprint 10B.R4 — portfolio, alerts, research, action center */
export {
  WORKSPACE_EMPTY,
  ACTION_CENTER_ACTIONS,
  TIMELINE_EVENT_KINDS,
  WATCHLIST_WORKSPACE_ROUTES,
  getWatchlistWorkspace,
  getPortfolioBridge,
  getWatchlistTimeline,
  getWatchlistActions,
  shareWatchlist,
  moveToPortfolio,
  getWatchlistAlerts,
  getWatchlistResearch,
  getWatchlistWorkspaceHealth,
  resetWatchlistWorkspace,
  isSprint10BR4Frozen,
  SPRINT_10B_R4_FROZEN,
  emptyWatchlistWorkspace,
} from "./workspace";
export type {
  WorkspaceEmptyMessage,
  WatchlistWorkspaceContext,
  WatchlistWorkspaceView,
  PortfolioBridgeView,
  WatchlistAlertsView,
  WatchlistResearchView,
  WatchlistActionsView,
  WatchlistTimelineView,
  WatchlistCollaborationView,
} from "./workspace";

/** Sprint 10B.R5 — analytics, performance, benchmarks, scorecard */
export {
  WATCHLIST_ANALYTICS_EMPTY,
  BENCHMARK_KINDS,
  SCORECARD_GRADES,
  getWatchlistAnalytics,
  getPerformance,
  getBenchmark,
  getScorecard,
  getAIReview,
  getWatchlistHistory,
  getAnalyticsView,
  getWatchlistAnalyticsHealth,
  resetWatchlistAnalytics,
  isSprint10BR5Frozen,
  SPRINT_10B_R5_FROZEN,
  emptyAnalyticsBundle,
} from "./analytics";
export type {
  WatchlistAnalyticsEmptyMessage,
  WatchlistAnalyticsContext,
  WatchlistAnalyticsBundle,
  WatchlistPerformanceView,
  WatchlistAnalyticsView,
  WatchlistHistoryView,
  WatchlistBenchmarkView,
  WatchlistAIReviewView,
  WatchlistScorecardView,
} from "./analytics";
