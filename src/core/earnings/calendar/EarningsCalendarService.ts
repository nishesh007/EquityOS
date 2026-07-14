/**
 * Earnings Calendar Service — public façade for Institutional Earnings Calendar.
 */

import {
  buildDashboardEarningsView,
  buildResultsPageCalendarView,
  toUpcomingResultDto,
  type DashboardEarningsView,
  type ResultsPageCalendarView,
} from "./EarningsCalendarPresentation";
import { buildCoverageMetrics } from "./EarningsCoverageEngine";
import {
  InstitutionalEarningsCalendar,
  DEFAULT_EARNINGS_CALENDAR_SEED,
  type RawCalendarSeed,
} from "./InstitutionalEarningsCalendar";
import {
  buildPortfolioEarningsSurface,
  buildWatchlistEarningsSurface,
  resolveEarningsProximityForSymbol,
  toPortfolioEarningsRows,
  type PortfolioEarningsRow,
  type PortfolioEarningsSurface,
  type WatchlistEarningsSurface,
} from "./EarningsWatchlist";
import { UpcomingEarningsMetricsTracker } from "./UpcomingEarningsMetrics";
import type {
  CalendarQueryOptions,
  CalendarSeedContext,
  EarningsCalendarEvent,
  EarningsCalendarFilters,
  EarningsCalendarMetrics,
  EarningsProximityInfo,
  PaginatedCalendar,
} from "./InstitutionalEarningsModels";

const DEFAULT_UNIVERSE_SIZE = 50;

export interface EarningsCalendarServiceOptions {
  seed?: readonly RawCalendarSeed[];
  universeSize?: number;
}

export class EarningsCalendarService {
  private readonly calendar: InstitutionalEarningsCalendar;
  private readonly metrics = new UpcomingEarningsMetricsTracker();
  private universeSize: number;
  private portfolioSymbols: string[] = [];
  private watchlistSymbols: string[] = [];
  private highConvictionSymbols: string[] = [];

  constructor(options: EarningsCalendarServiceOptions = {}) {
    this.calendar = new InstitutionalEarningsCalendar(
      options.seed ?? DEFAULT_EARNINGS_CALENDAR_SEED
    );
    this.universeSize = options.universeSize ?? DEFAULT_UNIVERSE_SIZE;
  }

  setMembership(context: CalendarSeedContext): void {
    this.portfolioSymbols = [...(context.portfolioSymbols ?? [])];
    this.watchlistSymbols = [...(context.watchlistSymbols ?? [])];
    this.highConvictionSymbols = [...(context.highConvictionSymbols ?? [])];
  }

  setUniverseSize(size: number): void {
    this.universeSize = Number.isFinite(size) && size > 0 ? size : DEFAULT_UNIVERSE_SIZE;
  }

  private context(): CalendarSeedContext {
    return {
      portfolioSymbols: this.portfolioSymbols,
      watchlistSymbols: this.watchlistSymbols,
      highConvictionSymbols: this.highConvictionSymbols,
    };
  }

  private queryOptions(
    overrides: CalendarQueryOptions = {}
  ): CalendarQueryOptions {
    return {
      ...overrides,
      portfolioSymbols: overrides.portfolioSymbols ?? this.portfolioSymbols,
      watchlistSymbols: overrides.watchlistSymbols ?? this.watchlistSymbols,
      highConvictionSymbols:
        overrides.highConvictionSymbols ?? this.highConvictionSymbols,
    };
  }

  getAllEvents(now = new Date()): EarningsCalendarEvent[] {
    return this.calendar.all({ ...this.context(), now });
  }

  getUpcomingEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    const now = options.now ?? new Date();
    return this.calendar.upcoming(now, this.queryOptions(options));
  }

  getTodayEarnings(options: CalendarQueryOptions = {}): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: { ...(options.filters ?? {}), view: "today" },
    });
  }

  getTomorrowEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: { ...(options.filters ?? {}), view: "tomorrow" },
    });
  }

  getNext7DaysEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: { ...(options.filters ?? {}), view: "next_7_days" },
    });
  }

  getNext30DaysEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: { ...(options.filters ?? {}), view: "next_30_days" },
    });
  }

  getPortfolioEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: {
        ...(options.filters ?? {}),
        view: "portfolio",
        upcomingOnly: true,
      },
    });
  }

  getWatchlistEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: {
        ...(options.filters ?? {}),
        view: "watchlist",
        upcomingOnly: true,
      },
    });
  }

  getHighImpactEarnings(
    options: CalendarQueryOptions = {}
  ): EarningsCalendarEvent[] {
    return this.filterCalendar({
      ...options,
      filters: {
        ...(options.filters ?? {}),
        view: "high_impact",
        upcomingOnly: true,
      },
    });
  }

  filterCalendar(options: CalendarQueryOptions = {}): EarningsCalendarEvent[] {
    return this.calendar.query(this.queryOptions(options));
  }

  filterCalendarPage(options: CalendarQueryOptions = {}): PaginatedCalendar {
    return this.calendar.queryPage(this.queryOptions(options));
  }

  getCalendarMetrics(now = new Date()): EarningsCalendarMetrics {
    const events = this.getAllEvents(now);
    return this.metrics.record(events, {
      universeSize: this.universeSize,
      portfolioSymbols: this.portfolioSymbols,
      watchlistSymbols: this.watchlistSymbols,
      now,
    });
  }

  getWatchlistSurface(now = new Date()): WatchlistEarningsSurface {
    return buildWatchlistEarningsSurface(
      this.getAllEvents(now),
      this.watchlistSymbols,
      now
    );
  }

  getPortfolioSurface(now = new Date()): PortfolioEarningsSurface {
    return buildPortfolioEarningsSurface(
      this.getAllEvents(now),
      this.portfolioSymbols,
      now
    );
  }

  getPortfolioRows(now = new Date()): PortfolioEarningsRow[] {
    return toPortfolioEarningsRows(this.getPortfolioEarnings({ now }), now);
  }

  getEarningsProximity(
    symbol: string,
    now = new Date()
  ): EarningsProximityInfo {
    return resolveEarningsProximityForSymbol(this.getAllEvents(now), symbol, now);
  }

  getDashboardView(now = new Date()): DashboardEarningsView {
    const metrics = this.getCalendarMetrics(now);
    return buildDashboardEarningsView({
      upcoming: this.getUpcomingEarnings({ now }),
      today: this.getTodayEarnings({ now }),
      tomorrow: this.getTomorrowEarnings({ now }),
      next7Days: this.getNext7DaysEarnings({ now }),
      portfolio: this.getPortfolioEarnings({ now }),
      watchlist: this.getWatchlistEarnings({ now }),
      highImpact: this.getHighImpactEarnings({ now }),
      metrics,
      now,
    });
  }

  getResultsPageView(
    options: CalendarQueryOptions = {}
  ): ResultsPageCalendarView {
    const now = options.now ?? new Date();
    const page = this.filterCalendarPage({
      ...options,
      now,
      filters: {
        upcomingOnly: true,
        ...(options.filters ?? {}),
      },
    });
    return buildResultsPageCalendarView(page, this.getCalendarMetrics(now), now);
  }

  /** Compatibility bridge for existing UpcomingResult consumers. */
  toUpcomingResults(now = new Date()) {
    return this.getUpcomingEarnings({ now }).map(toUpcomingResultDto);
  }

  applyFilters(filters: EarningsCalendarFilters, now = new Date()) {
    return this.filterCalendar({ filters, now });
  }
}

let singleton: EarningsCalendarService | null = null;

export function getEarningsCalendarService(
  options?: EarningsCalendarServiceOptions
): EarningsCalendarService {
  if (!singleton || options) {
    singleton = new EarningsCalendarService(options);
  }
  return singleton;
}

export function resetEarningsCalendarService(): void {
  singleton = null;
}

/** Public API — getUpcomingEarnings() */
export function getUpcomingEarnings(
  options?: CalendarQueryOptions
): EarningsCalendarEvent[] {
  return getEarningsCalendarService().getUpcomingEarnings(options);
}

/** Public API — getTodayEarnings() */
export function getTodayEarnings(
  options?: CalendarQueryOptions
): EarningsCalendarEvent[] {
  return getEarningsCalendarService().getTodayEarnings(options);
}

/** Public API — getPortfolioEarnings() */
export function getPortfolioEarnings(
  options?: CalendarQueryOptions
): EarningsCalendarEvent[] {
  return getEarningsCalendarService().getPortfolioEarnings(options);
}

/** Public API — getWatchlistEarnings() */
export function getWatchlistEarnings(
  options?: CalendarQueryOptions
): EarningsCalendarEvent[] {
  return getEarningsCalendarService().getWatchlistEarnings(options);
}

/** Public API — filterCalendar() */
export function filterCalendar(
  options?: CalendarQueryOptions
): EarningsCalendarEvent[] {
  return getEarningsCalendarService().filterCalendar(options);
}

/** Public API — getCalendarMetrics() */
export function getCalendarMetrics(now?: Date): EarningsCalendarMetrics {
  return getEarningsCalendarService().getCalendarMetrics(now);
}

export function buildCoverageMetricsForEvents(
  events: readonly EarningsCalendarEvent[],
  options: {
    universeSize: number;
    portfolioSymbols?: readonly string[];
    watchlistSymbols?: readonly string[];
    now?: Date;
  }
): EarningsCalendarMetrics {
  return buildCoverageMetrics({
    universeSize: options.universeSize,
    events,
    portfolioSymbols: options.portfolioSymbols,
    watchlistSymbols: options.watchlistSymbols,
    now: options.now,
  });
}
