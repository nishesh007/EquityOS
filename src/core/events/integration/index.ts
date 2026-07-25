/**
 * Event platform integration barrel (Sprint 10D.5).
 */

export {
  eventLinkingService,
  eventCountdown,
  deriveAwarenessKinds,
  linkEventsToSymbol,
  findEventById,
  eventHref,
} from "@/src/core/events/integration/eventLinkingService";

export {
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
} from "@/src/core/events/integration/portfolioEventService";

export { myEventsStore } from "@/src/core/events/integration/myEventsStore";
