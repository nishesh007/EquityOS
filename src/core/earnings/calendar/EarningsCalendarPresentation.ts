/**
 * Presentation view models for Institutional Earnings Calendar UI.
 * Never exposes undefined / null / NaN to the UI — uses empty-state copy.
 */

import { buildEarningsCountdown } from "./EarningsCountdown";
import { classifyHighImpact } from "./EarningsCoverageEngine";
import type {
  CalendarViewId,
  EarningsCalendarEvent,
  EarningsCalendarMetrics,
  EarningsCountdownView,
  PaginatedCalendar,
  ResultSession,
} from "./InstitutionalEarningsModels";
import {
  CALENDAR_VIEW_LABELS,
  EMPTY_MESSAGES,
} from "./InstitutionalEarningsModels";

export interface EarningsCardView {
  id: string;
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: string;
  quarter: string;
  financialYear: string;
  resultDate: string;
  resultTime: string;
  sessionLabel: string;
  countdown: EarningsCountdownView;
  previousResultDate: string;
  highImpact: boolean;
  fno: boolean;
  highConviction: boolean;
  inPortfolio: boolean;
  inWatchlist: boolean;
  badges: string[];
}

export interface CalendarSectionView {
  id: CalendarViewId;
  title: string;
  items: EarningsCardView[];
  empty: boolean;
  emptyMessage: string;
}

export interface DashboardEarningsView {
  upcoming: CalendarSectionView;
  today: CalendarSectionView;
  tomorrow: CalendarSectionView;
  next7Days: CalendarSectionView;
  portfolio: CalendarSectionView;
  watchlist: CalendarSectionView;
  highImpact: CalendarSectionView;
  metrics: EarningsCalendarMetrics;
  metricsReady: boolean;
}

export interface ResultsPageCalendarView {
  items: EarningsCardView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  empty: boolean;
  emptyMessage: string;
  metrics: EarningsCalendarMetrics;
}

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "NaN") {
    return fallback;
  }
  return trimmed;
}

function sessionLabel(session: ResultSession): string {
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

export function toEarningsCardView(
  event: EarningsCalendarEvent,
  now = new Date()
): EarningsCardView {
  const countdown = buildEarningsCountdown(
    event.resultDate,
    event.resultTime,
    now
  );
  const badges: string[] = [];
  if (event.exchange) badges.push(event.exchange);
  if (event.sector) badges.push(event.sector);
  if (event.quarter) badges.push(event.quarter);
  if (event.inPortfolio) badges.push("Portfolio");
  if (event.inWatchlist) badges.push("Watchlist");
  if (event.fno) badges.push("F&O");
  if (event.highConviction) badges.push("High Conviction");
  if (classifyHighImpact(event)) badges.push("High Impact");

  return {
    id: safeText(event.id, event.ticker),
    companyName: safeText(event.companyName, event.ticker),
    ticker: safeText(event.ticker, "—"),
    exchange: safeText(event.exchange, "—"),
    sector: safeText(event.sector, "—"),
    industry: safeText(event.industry, "—"),
    marketCap: safeText(event.marketCap, "—"),
    quarter: safeText(event.quarter, "—"),
    financialYear: safeText(event.financialYear, "—"),
    resultDate: safeText(event.resultDate, "—"),
    resultTime: safeText(event.resultTime, "—"),
    sessionLabel: sessionLabel(event.resultSession),
    countdown,
    previousResultDate: safeText(event.previousResultDate, "—"),
    highImpact: Boolean(event.highImpact),
    fno: Boolean(event.fno),
    highConviction: Boolean(event.highConviction),
    inPortfolio: Boolean(event.inPortfolio),
    inWatchlist: Boolean(event.inWatchlist),
    badges,
  };
}

function emptyMessageForView(view: CalendarViewId): string {
  switch (view) {
    case "today":
      return EMPTY_MESSAGES.noToday;
    case "tomorrow":
      return EMPTY_MESSAGES.noTomorrow;
    case "portfolio":
      return EMPTY_MESSAGES.noPortfolio;
    case "watchlist":
      return EMPTY_MESSAGES.noWatchlist;
    case "high_impact":
      return EMPTY_MESSAGES.noHighImpact;
    default:
      return EMPTY_MESSAGES.noUpcoming;
  }
}

export function buildCalendarSection(
  view: CalendarViewId,
  events: readonly EarningsCalendarEvent[],
  now = new Date(),
  limit?: number
): CalendarSectionView {
  const sliced = limit != null ? events.slice(0, limit) : [...events];
  const items = sliced.map((e) => toEarningsCardView(e, now));
  const empty = items.length === 0;
  return {
    id: view,
    title: CALENDAR_VIEW_LABELS[view],
    items,
    empty,
    emptyMessage: empty ? emptyMessageForView(view) : "",
  };
}

export function buildDashboardEarningsView(input: {
  upcoming: readonly EarningsCalendarEvent[];
  today: readonly EarningsCalendarEvent[];
  tomorrow: readonly EarningsCalendarEvent[];
  next7Days: readonly EarningsCalendarEvent[];
  portfolio: readonly EarningsCalendarEvent[];
  watchlist: readonly EarningsCalendarEvent[];
  highImpact: readonly EarningsCalendarEvent[];
  metrics: EarningsCalendarMetrics;
  now?: Date;
}): DashboardEarningsView {
  const now = input.now ?? new Date();
  return {
    upcoming: buildCalendarSection("next_30_days", input.upcoming, now, 8),
    today: buildCalendarSection("today", input.today, now, 6),
    tomorrow: buildCalendarSection("tomorrow", input.tomorrow, now, 6),
    next7Days: buildCalendarSection("next_7_days", input.next7Days, now, 8),
    portfolio: buildCalendarSection("portfolio", input.portfolio, now, 6),
    watchlist: buildCalendarSection("watchlist", input.watchlist, now, 6),
    highImpact: buildCalendarSection("high_impact", input.highImpact, now, 6),
    metrics: input.metrics,
    metricsReady: input.metrics.companiesCovered > 0,
  };
}

export function buildResultsPageCalendarView(
  page: PaginatedCalendar,
  metrics: EarningsCalendarMetrics,
  now = new Date()
): ResultsPageCalendarView {
  return {
    items: page.items.map((e) => toEarningsCardView(e, now)),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
    totalPages: page.totalPages,
    empty: page.empty,
    emptyMessage: page.empty
      ? page.emptyMessage || EMPTY_MESSAGES.noUpcoming
      : "",
    metrics,
  };
}

/** Map institutional event → legacy UpcomingResult DTO for existing dashboard paths. */
export function toUpcomingResultDto(event: EarningsCalendarEvent): {
  id: string;
  company: string;
  symbol: string;
  date: string;
  quarter: string;
  sector: string;
  marketCap: string;
} {
  return {
    id: event.id,
    company: safeText(event.companyName, event.ticker),
    symbol: safeText(event.ticker, "—"),
    date: safeText(event.resultDate, ""),
    quarter: safeText(event.quarter, "—"),
    sector: safeText(event.sector, "—"),
    marketCap: safeText(event.marketCap, "—"),
  };
}
