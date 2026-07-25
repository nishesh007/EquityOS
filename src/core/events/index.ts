/**
 * Event Intelligence domain barrel (Sprint 10D.1).
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
