/**
 * Event Intelligence domain barrel (Sprint 10D.1–10D.4).
 */

export {
  addDays,
  countActiveFilters,
  createEmptyEventFilters,
  endOfMonth,
  eventsForView,
  extractFilterOptions,
  filterEvents,
  formatDisplayDate,
  formatShortDate,
  formatWeekday,
  getEventCategory,
  groupEventsByDate,
  isSameMonth,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  timelineBucket,
  toDateKey,
} from "@/src/core/events/EventFilters";

export { buildEventSeedCatalog } from "@/src/core/events/EventSeedData";

export {
  deriveEventBadges,
  toEventDrawerView,
} from "@/src/core/events/EventDrawerPresenter";
export type {
  EventBadgeKind,
  EventDrawerView,
  MacroDrawerView,
} from "@/src/core/events/EventDrawerPresenter";

export {
  analyzeEventIntelligence,
  confidenceEngine,
  eventIntelligenceEngine,
  historicalInsightEngine,
  impactScoreEngine,
  marketBiasEngine,
  preparationChecklistEngine,
  riskEngine,
  sectorImpactEngine,
  summaryEngine,
} from "@/src/core/events/intelligence";

export { earningsRepository } from "@/src/core/events/repositories/earningsRepository";
export { corporateActionRepository } from "@/src/core/events/repositories/corporateActionRepository";
export {
  economicEventRepository,
  listMacroEvents,
  macroEventRepository,
} from "@/src/core/events/repositories/macroEventRepository";
export { economicIndicatorRepository } from "@/src/core/events/repositories/economicIndicatorRepository";
export { historicalMacroRepository } from "@/src/core/events/repositories/historicalMacroRepository";

export {
  eventLinkingService,
  eventCountdown,
  deriveAwarenessKinds,
  linkEventsToSymbol,
  findEventById,
  eventHref,
  portfolioEventService,
  buildPortfolioEventInsights,
  watchlistEventService,
  buildWatchlistEventInsights,
  recommendationEventService,
  buildRecommendationEventWarning,
  dashboardEventService,
  buildDashboardEventBuckets,
  alertPreparationService,
  prepareAlertDrafts,
  myEventsStore,
} from "@/src/core/events/integration";
