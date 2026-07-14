/**
 * Institutional Earnings Calendar — public exports (Sprint 9B.R1).
 */

export type {
  EarningsExchange,
  ResultSession,
  CalendarViewId,
  MarketCapBucket,
  CountdownStatus,
  EarningsProximity,
  CalendarSortField,
  SortDirection,
  EarningsCalendarEvent,
  EarningsCountdownView,
  EarningsCalendarFilters,
  CalendarQueryOptions,
  PaginatedCalendar,
  EarningsCalendarMetrics,
  EarningsProximityInfo,
  CalendarSeedContext,
} from "./InstitutionalEarningsModels";

export {
  EMPTY_MESSAGES,
  CALENDAR_VIEW_LABELS,
} from "./InstitutionalEarningsModels";

export {
  getIstDateKey,
  parseDateKey,
  daysUntilResult,
  buildEarningsCountdown,
  isUpcomingEvent,
} from "./EarningsCountdown";

export {
  annotateMembership,
  matchesView,
  applyEarningsFilters,
  sortCalendarEvents,
  paginateEvents,
  filterCalendar as filterCalendarEvents,
  uniqueSectors,
  uniqueIndustries,
} from "./EarningsFilters";

export {
  inferMarketCapBucket,
  classifyHighImpact,
  computeCoveragePercent,
  buildCoverageMetrics,
} from "./EarningsCoverageEngine";

export type { CoverageUniverseInput } from "./EarningsCoverageEngine";

export {
  buildWatchlistEarningsSurface,
  buildPortfolioEarningsSurface,
  toPortfolioEarningsRows,
  resolveEarningsProximity,
  resolveEarningsProximityForSymbol,
} from "./EarningsWatchlist";

export type {
  WatchlistEarningsSurface,
  PortfolioEarningsSurface,
  PortfolioEarningsRow,
} from "./EarningsWatchlist";

export {
  UpcomingEarningsMetricsTracker,
  formatMetricValue,
} from "./UpcomingEarningsMetrics";

export type { MetricsTrackerSnapshot } from "./UpcomingEarningsMetrics";

export {
  toEarningsCardView,
  buildCalendarSection,
  buildDashboardEarningsView,
  buildResultsPageCalendarView,
  toUpcomingResultDto,
} from "./EarningsCalendarPresentation";

export type {
  EarningsCardView,
  CalendarSectionView,
  DashboardEarningsView,
  ResultsPageCalendarView,
} from "./EarningsCalendarPresentation";

export {
  InstitutionalEarningsCalendar,
  DEFAULT_EARNINGS_CALENDAR_SEED,
  normalizeCalendarSeed,
} from "./InstitutionalEarningsCalendar";

export type { RawCalendarSeed } from "./InstitutionalEarningsCalendar";

export {
  EarningsCalendarService,
  getEarningsCalendarService,
  resetEarningsCalendarService,
  getUpcomingEarnings,
  getTodayEarnings,
  getPortfolioEarnings,
  getWatchlistEarnings,
  filterCalendar,
  getCalendarMetrics,
  buildCoverageMetricsForEvents,
} from "./EarningsCalendarService";

export type { EarningsCalendarServiceOptions } from "./EarningsCalendarService";
