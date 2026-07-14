/**
 * Earnings calendar filters and view slicing.
 */

import { buildEarningsCountdown, daysUntilResult, getIstDateKey } from "./EarningsCountdown";
import type {
  CalendarQueryOptions,
  CalendarSortField,
  CalendarViewId,
  EarningsCalendarEvent,
  EarningsCalendarFilters,
  SortDirection,
} from "./InstitutionalEarningsModels";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function symbolSet(symbols: readonly string[] | undefined): Set<string> {
  return new Set((symbols ?? []).map(normalizeSymbol));
}

export function annotateMembership(
  events: readonly EarningsCalendarEvent[],
  portfolioSymbols: readonly string[] = [],
  watchlistSymbols: readonly string[] = [],
  highConvictionSymbols: readonly string[] = []
): EarningsCalendarEvent[] {
  const portfolio = symbolSet(portfolioSymbols);
  const watchlist = symbolSet(watchlistSymbols);
  const conviction = symbolSet(highConvictionSymbols);

  return events.map((event) => ({
    ...event,
    inPortfolio: portfolio.has(normalizeSymbol(event.ticker)),
    inWatchlist: watchlist.has(normalizeSymbol(event.ticker)),
    highConviction:
      event.highConviction || conviction.has(normalizeSymbol(event.ticker)),
  }));
}

function matchesSearch(event: EarningsCalendarEvent, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    event.companyName.toLowerCase().includes(q) ||
    event.ticker.toLowerCase().includes(q) ||
    event.sector.toLowerCase().includes(q) ||
    event.industry.toLowerCase().includes(q)
  );
}

function isInThisQuarter(resultDate: string, now: Date): boolean {
  const days = daysUntilResult(resultDate, now);
  if (days == null || days < 0) return false;
  // Indian FY quarters approximate: ~90-day window for "this quarter" upcoming
  return days <= 100;
}

export function matchesView(
  event: EarningsCalendarEvent,
  view: CalendarViewId,
  now: Date
): boolean {
  const days = daysUntilResult(event.resultDate, now);
  if (days == null) return false;

  switch (view) {
    case "today":
      return days === 0;
    case "tomorrow":
      return days === 1;
    case "next_7_days":
      return days >= 0 && days <= 7;
    case "next_30_days":
      return days >= 0 && days <= 30;
    case "this_quarter":
      return isInThisQuarter(event.resultDate, now);
    case "portfolio":
      return event.inPortfolio && days >= 0;
    case "watchlist":
      return event.inWatchlist && days >= 0;
    case "high_impact":
      return event.highImpact && days >= 0;
    default:
      return true;
  }
}

export function applyEarningsFilters(
  events: readonly EarningsCalendarEvent[],
  filters: EarningsCalendarFilters = {},
  now = new Date()
): EarningsCalendarEvent[] {
  return events.filter((event) => {
    if (filters.exchange && event.exchange !== filters.exchange) return false;
    if (filters.sector && event.sector !== filters.sector) return false;
    if (filters.industry && event.industry !== filters.industry) return false;
    if (
      filters.marketCapBucket &&
      event.marketCapBucket !== filters.marketCapBucket
    ) {
      return false;
    }
    if (filters.portfolioOnly && !event.inPortfolio) return false;
    if (filters.watchlistOnly && !event.inWatchlist) return false;
    if (filters.fnoOnly && !event.fno) return false;
    if (filters.highConvictionOnly && !event.highConviction) return false;
    if (filters.highImpactOnly && !event.highImpact) return false;
    if (filters.upcomingOnly) {
      if (!buildEarningsCountdown(event.resultDate, event.resultTime, now).isUpcoming) {
        return false;
      }
    }
    if (filters.search && !matchesSearch(event, filters.search)) return false;
    if (filters.view && !matchesView(event, filters.view, now)) return false;
    return true;
  });
}

function impactRank(event: EarningsCalendarEvent): number {
  let score = 0;
  if (event.highImpact) score += 100;
  if (event.highConviction) score += 40;
  if (event.fno) score += 20;
  if (event.marketCapBucket === "large") score += 30;
  else if (event.marketCapBucket === "mid") score += 15;
  return score;
}

export function sortCalendarEvents(
  events: readonly EarningsCalendarEvent[],
  sortBy: CalendarSortField = "result_date",
  sortDirection: SortDirection = "asc",
  now = new Date()
): EarningsCalendarEvent[] {
  const dir = sortDirection === "asc" ? 1 : -1;
  return [...events].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "company":
        cmp = a.companyName.localeCompare(b.companyName);
        break;
      case "market_cap":
        cmp =
          marketCapOrder(a.marketCapBucket) - marketCapOrder(b.marketCapBucket);
        break;
      case "countdown": {
        const da = daysUntilResult(a.resultDate, now) ?? 9999;
        const db = daysUntilResult(b.resultDate, now) ?? 9999;
        cmp = da - db;
        break;
      }
      case "impact":
        cmp = impactRank(b) - impactRank(a);
        break;
      case "result_date":
      default:
        cmp = a.resultDate.localeCompare(b.resultDate);
        if (cmp === 0) {
          cmp = (a.resultTime ?? "").localeCompare(b.resultTime ?? "");
        }
        break;
    }
    if (cmp === 0) cmp = a.ticker.localeCompare(b.ticker);
    return cmp * dir;
  });
}

function marketCapOrder(bucket: EarningsCalendarEvent["marketCapBucket"]): number {
  switch (bucket) {
    case "large":
      return 0;
    case "mid":
      return 1;
    case "small":
      return 2;
    case "micro":
      return 3;
    default:
      return 4;
  }
}

export function paginateEvents(
  events: readonly EarningsCalendarEvent[],
  page = 1,
  pageSize = 20
): {
  items: EarningsCalendarEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const safePageSize = Math.max(1, pageSize);
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    items: events.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

export function filterCalendar(
  events: readonly EarningsCalendarEvent[],
  options: CalendarQueryOptions = {}
): EarningsCalendarEvent[] {
  const now = options.now ?? new Date();
  const annotated = annotateMembership(
    events,
    options.portfolioSymbols,
    options.watchlistSymbols,
    options.highConvictionSymbols
  );
  const filtered = applyEarningsFilters(annotated, options.filters ?? {}, now);
  return sortCalendarEvents(
    filtered,
    options.sortBy ?? "result_date",
    options.sortDirection ?? "asc",
    now
  );
}

export function uniqueSectors(events: readonly EarningsCalendarEvent[]): string[] {
  return [...new Set(events.map((e) => e.sector).filter(Boolean))].sort();
}

export function uniqueIndustries(
  events: readonly EarningsCalendarEvent[]
): string[] {
  return [...new Set(events.map((e) => e.industry).filter(Boolean))].sort();
}

export { getIstDateKey };
