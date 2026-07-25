/**
 * Pure filter / search / date helpers for Event Intelligence (Sprint 10D.1).
 */

import { getEventCategory, getEventTypeLabel } from "@/constants/eventTypes";
import type {
  EventFilterState,
  EventIntelligenceEvent,
  EventQuickRange,
  EventViewMode,
} from "@/types/event";

export function createEmptyEventFilters(): EventFilterState {
  return {
    dateRange: { from: null, to: null },
    eventTypes: [],
    sectors: [],
    industries: [],
    marketCaps: [],
    importance: [],
    exchanges: [],
    quickRanges: [],
    company: "",
    ticker: "",
    filterSearch: "",
    quarters: [],
    highDividendOnly: false,
  };
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function startOfWeek(key: string): string {
  const date = parseDateKey(key);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

export function startOfMonth(key: string): string {
  const date = parseDateKey(key);
  date.setDate(1);
  return toDateKey(date);
}

export function endOfMonth(key: string): string {
  const date = parseDateKey(key);
  date.setMonth(date.getMonth() + 1, 0);
  return toDateKey(date);
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function formatDisplayDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatWeekday(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-IN", { weekday: "short" });
}

function matchesQuickRange(
  event: EventIntelligenceEvent,
  range: EventQuickRange,
  today: string
): boolean {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const category = getEventCategory(event.eventType);
  const isEarnings =
    event.eventType === "quarterly_results" ||
    event.eventType === "annual_results";

  switch (range) {
    case "upcoming":
      return event.date >= today && event.status !== "completed";
    case "completed":
      return event.status === "completed" || event.date < today;
    case "today":
      return event.date === today;
    case "this_week":
      return event.date >= weekStart && event.date <= weekEnd;
    case "this_month":
      return event.date >= monthStart && event.date <= monthEnd;
    case "upcoming_earnings":
      return (
        (isEarnings || category === "results") &&
        event.date >= today &&
        event.status !== "completed"
      );
    case "completed_earnings":
      return isEarnings && (event.status === "completed" || event.date < today);
    case "conference_calls":
      return event.eventType === "conference_call";
    case "high_dividend":
      return (
        event.eventType === "dividend" &&
        (event.corporateActionDetail?.kind === "dividend"
          ? (event.corporateActionDetail.yieldPct ?? 0) >= 2
          : event.importance === "high" || event.importance === "critical")
      );
    default:
      return true;
  }
}

function matchesSearchQuery(
  event: EventIntelligenceEvent,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    event.title,
    event.company ?? "",
    event.ticker ?? "",
    event.sector ?? "",
    event.industry ?? "",
    getEventTypeLabel(event.eventType),
    ...event.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterEvents(
  events: readonly EventIntelligenceEvent[],
  filters: EventFilterState,
  searchQuery: string,
  today: string = toDateKey(new Date())
): EventIntelligenceEvent[] {
  const companyQ = filters.company.trim().toLowerCase();
  const tickerQ = filters.ticker.trim().toLowerCase();
  const panelQ = filters.filterSearch.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.dateRange.from && event.date < filters.dateRange.from) {
      return false;
    }
    if (filters.dateRange.to && event.date > filters.dateRange.to) {
      return false;
    }
    if (
      filters.eventTypes.length > 0 &&
      !filters.eventTypes.includes(event.eventType)
    ) {
      return false;
    }
    if (
      filters.sectors.length > 0 &&
      (!event.sector || !filters.sectors.includes(event.sector))
    ) {
      return false;
    }
    if (
      filters.industries.length > 0 &&
      (!event.industry || !filters.industries.includes(event.industry))
    ) {
      return false;
    }
    if (
      filters.marketCaps.length > 0 &&
      !filters.marketCaps.includes(event.marketCap)
    ) {
      return false;
    }
    if (
      filters.importance.length > 0 &&
      !filters.importance.includes(event.importance)
    ) {
      return false;
    }
    if (
      filters.exchanges.length > 0 &&
      !filters.exchanges.includes(event.exchange)
    ) {
      return false;
    }
    if (filters.quickRanges.length > 0) {
      const anyQuick = filters.quickRanges.some((range) =>
        matchesQuickRange(event, range, today)
      );
      if (!anyQuick) return false;
    }
    if (companyQ && !(event.company ?? "").toLowerCase().includes(companyQ)) {
      return false;
    }
    if (tickerQ && !(event.ticker ?? "").toLowerCase().includes(tickerQ)) {
      return false;
    }
    if (panelQ) {
      const panelHay = [
        event.title,
        event.company ?? "",
        event.ticker ?? "",
        event.sector ?? "",
        getEventTypeLabel(event.eventType),
      ]
        .join(" ")
        .toLowerCase();
      if (!panelHay.includes(panelQ)) return false;
    }
    if (filters.quarters.length > 0) {
      const quarter = event.earningsDetail?.quarter;
      if (!quarter || !filters.quarters.includes(quarter)) return false;
    }
    if (filters.highDividendOnly) {
      if (!matchesQuickRange(event, "high_dividend", today)) return false;
    }
    if (!matchesSearchQuery(event, searchQuery)) return false;
    return true;
  });
}

export function eventsForView(
  events: readonly EventIntelligenceEvent[],
  view: EventViewMode,
  selectedDate: string
): EventIntelligenceEvent[] {
  switch (view) {
    case "day":
      return events.filter((e) => e.date === selectedDate);
    case "week": {
      const start = startOfWeek(selectedDate);
      const end = addDays(start, 6);
      return events.filter((e) => e.date >= start && e.date <= end);
    }
    case "month": {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      return events.filter((e) => e.date >= start && e.date <= end);
    }
    case "timeline":
    case "agenda":
      return [...events].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time ?? "").localeCompare(b.time ?? "");
      });
    default:
      return [...events];
  }
}

export function groupEventsByDate(
  events: readonly EventIntelligenceEvent[]
): Map<string, EventIntelligenceEvent[]> {
  const map = new Map<string, EventIntelligenceEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  return map;
}

export function countActiveFilters(filters: EventFilterState): number {
  let count = 0;
  if (filters.dateRange.from || filters.dateRange.to) count += 1;
  if (filters.eventTypes.length) count += 1;
  if (filters.sectors.length) count += 1;
  if (filters.industries.length) count += 1;
  if (filters.marketCaps.length) count += 1;
  if (filters.importance.length) count += 1;
  if (filters.exchanges.length) count += 1;
  if (filters.quickRanges.length) count += 1;
  if (filters.company.trim()) count += 1;
  if (filters.ticker.trim()) count += 1;
  if (filters.filterSearch.trim()) count += 1;
  if (filters.quarters.length) count += 1;
  if (filters.highDividendOnly) count += 1;
  return count;
}

export function extractFilterOptions(
  events: readonly EventIntelligenceEvent[]
): {
  sectors: string[];
  industries: string[];
  exchanges: string[];
} {
  const sectors = new Set<string>();
  const industries = new Set<string>();
  const exchanges = new Set<string>();
  for (const event of events) {
    if (event.sector) sectors.add(event.sector);
    if (event.industry) industries.add(event.industry);
    exchanges.add(event.exchange);
  }
  return {
    sectors: [...sectors].sort(),
    industries: [...industries].sort(),
    exchanges: [...exchanges].sort(),
  };
}

export function timelineBucket(
  date: string,
  today: string
): "today" | "tomorrow" | "future" | "past" {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  if (date > today) return "future";
  return "past";
}

export { getEventCategory };
