/**
 * Institutional Watchlist Platform — public exports (Sprint 10B.R1).
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
