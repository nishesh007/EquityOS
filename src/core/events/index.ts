/**
 * Event Intelligence domain barrel (Sprint 10D.1 / 10D.2).
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
} from "@/src/core/events/EventDrawerPresenter";

export { earningsRepository } from "@/src/core/events/repositories/earningsRepository";
export { corporateActionRepository } from "@/src/core/events/repositories/corporateActionRepository";
export { economicEventRepository } from "@/src/core/events/repositories/eventRepository";
