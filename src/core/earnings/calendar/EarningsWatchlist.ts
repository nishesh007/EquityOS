/**
 * Watchlist / portfolio earnings surface helpers.
 */

import { buildEarningsCountdown, daysUntilResult } from "./EarningsCountdown";
import { annotateMembership, sortCalendarEvents } from "./EarningsFilters";
import type {
  EarningsCalendarEvent,
  EarningsProximity,
  EarningsProximityInfo,
} from "./InstitutionalEarningsModels";
import { EMPTY_MESSAGES } from "./InstitutionalEarningsModels";

export interface WatchlistEarningsSurface {
  upcoming: EarningsCalendarEvent[];
  resultsTomorrow: EarningsCalendarEvent[];
  highPriority: EarningsCalendarEvent[];
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioEarningsSurface {
  upcoming: EarningsCalendarEvent[];
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioEarningsRow {
  event: EarningsCalendarEvent;
  daysRemaining: number | null;
  countdownLabel: string;
  expectedEvent: string;
}

const PRE_EARNINGS_WINDOW_DAYS = 5;
const POST_EARNINGS_WINDOW_DAYS = 1;
const COOLING_PERIOD_DAYS = 5;

export function buildWatchlistEarningsSurface(
  events: readonly EarningsCalendarEvent[],
  watchlistSymbols: readonly string[],
  now = new Date()
): WatchlistEarningsSurface {
  const annotated = annotateMembership(events, [], watchlistSymbols, []);
  const watchlistEvents = annotated.filter((e) => e.inWatchlist);
  const upcoming = sortCalendarEvents(
    watchlistEvents.filter(
      (e) => buildEarningsCountdown(e.resultDate, e.resultTime, now).isUpcoming
    ),
    "result_date",
    "asc",
    now
  );
  const resultsTomorrow = upcoming.filter(
    (e) => daysUntilResult(e.resultDate, now) === 1
  );
  const highPriority = upcoming.filter(
    (e) => e.highImpact || e.highConviction || e.fno
  );

  const empty = upcoming.length === 0;
  return {
    upcoming,
    resultsTomorrow,
    highPriority,
    empty,
    emptyMessage: empty ? EMPTY_MESSAGES.noWatchlist : "",
  };
}

export function buildPortfolioEarningsSurface(
  events: readonly EarningsCalendarEvent[],
  portfolioSymbols: readonly string[],
  now = new Date()
): PortfolioEarningsSurface {
  const annotated = annotateMembership(events, portfolioSymbols, [], []);
  const upcoming = sortCalendarEvents(
    annotated.filter(
      (e) =>
        e.inPortfolio &&
        buildEarningsCountdown(e.resultDate, e.resultTime, now).isUpcoming
    ),
    "result_date",
    "asc",
    now
  );
  const empty = upcoming.length === 0;
  return {
    upcoming,
    empty,
    emptyMessage: empty ? EMPTY_MESSAGES.noPortfolio : "",
  };
}

export function toPortfolioEarningsRows(
  events: readonly EarningsCalendarEvent[],
  now = new Date()
): PortfolioEarningsRow[] {
  return events.map((event) => {
    const countdown = buildEarningsCountdown(
      event.resultDate,
      event.resultTime,
      now
    );
    return {
      event,
      daysRemaining: countdown.daysRemaining,
      countdownLabel: countdown.label,
      expectedEvent: `${event.quarter} ${event.financialYear} · ${sessionLabel(event.resultSession)}`,
    };
  });
}

function sessionLabel(
  session: EarningsCalendarEvent["resultSession"]
): string {
  switch (session) {
    case "pre_market":
      return "Pre Market";
    case "market_hours":
      return "Market Hours";
    case "post_market":
      return "Post Market";
    default:
      return "Scheduled";
  }
}

/**
 * Earnings proximity for Opportunity Engine presentation (does not affect scoring).
 */
export function resolveEarningsProximity(
  resultDate: string | null | undefined,
  now = new Date()
): EarningsProximityInfo {
  if (!resultDate) {
    return {
      proximity: "none",
      label: "No Upcoming Earnings",
      resultDate: null,
      quarter: null,
      daysRemaining: null,
    };
  }

  const days = daysUntilResult(resultDate, now);
  if (days == null) {
    return {
      proximity: "none",
      label: "No Upcoming Earnings",
      resultDate,
      quarter: null,
      daysRemaining: null,
    };
  }

  let proximity: EarningsProximity = "none";
  let label = "No Upcoming Earnings";

  if (days === 0) {
    proximity = "earnings_today";
    label = "Earnings Today";
  } else if (days > 0 && days <= PRE_EARNINGS_WINDOW_DAYS) {
    proximity = "pre_earnings";
    label = "Pre Earnings";
  } else if (days < 0 && Math.abs(days) <= POST_EARNINGS_WINDOW_DAYS) {
    proximity = "post_earnings";
    label = "Post Earnings";
  } else if (
    days < 0 &&
    Math.abs(days) <= POST_EARNINGS_WINDOW_DAYS + COOLING_PERIOD_DAYS
  ) {
    proximity = "cooling_period";
    label = "Cooling Period";
  } else if (days > PRE_EARNINGS_WINDOW_DAYS) {
    proximity = "pre_earnings";
    label = "Pre Earnings";
  }

  return {
    proximity,
    label,
    resultDate,
    quarter: null,
    daysRemaining: days,
  };
}

export function resolveEarningsProximityForSymbol(
  events: readonly EarningsCalendarEvent[],
  symbol: string,
  now = new Date()
): EarningsProximityInfo {
  const key = symbol.trim().toUpperCase();
  const match = events.find((e) => e.ticker.toUpperCase() === key);
  if (!match) {
    return resolveEarningsProximity(null, now);
  }
  const info = resolveEarningsProximity(match.resultDate, now);
  return {
    ...info,
    quarter: match.quarter,
  };
}
