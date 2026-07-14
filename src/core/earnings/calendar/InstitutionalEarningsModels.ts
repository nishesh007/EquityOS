/**
 * Institutional Earnings Calendar — domain models (Sprint 9B.R1).
 * Single source of truth contracts for upcoming earnings events.
 */

export type EarningsExchange = "NSE" | "BSE";

export type ResultSession = "pre_market" | "market_hours" | "post_market";

export type CalendarViewId =
  | "today"
  | "tomorrow"
  | "next_7_days"
  | "next_30_days"
  | "this_quarter"
  | "portfolio"
  | "watchlist"
  | "high_impact";

export type MarketCapBucket = "large" | "mid" | "small" | "micro" | "unknown";

export type CountdownStatus =
  | "today"
  | "tomorrow"
  | "days"
  | "hours"
  | "minutes"
  | "result_released"
  | "expired";

export type EarningsProximity =
  | "pre_earnings"
  | "earnings_today"
  | "post_earnings"
  | "cooling_period"
  | "none";

export type CalendarSortField =
  | "result_date"
  | "company"
  | "market_cap"
  | "countdown"
  | "impact";

export type SortDirection = "asc" | "desc";

export interface EarningsCalendarEvent {
  id: string;
  companyName: string;
  ticker: string;
  exchange: EarningsExchange;
  sector: string;
  industry: string;
  marketCap: string;
  marketCapBucket: MarketCapBucket;
  quarter: string;
  financialYear: string;
  resultDate: string;
  resultTime: string | null;
  resultSession: ResultSession;
  previousResultDate: string | null;
  highImpact: boolean;
  fno: boolean;
  highConviction: boolean;
  inPortfolio: boolean;
  inWatchlist: boolean;
}

export interface EarningsCountdownView {
  status: CountdownStatus;
  label: string;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  isUpcoming: boolean;
  isReleased: boolean;
  isExpired: boolean;
}

export interface EarningsCalendarFilters {
  exchange?: EarningsExchange | null;
  sector?: string | null;
  industry?: string | null;
  marketCapBucket?: MarketCapBucket | null;
  portfolioOnly?: boolean;
  watchlistOnly?: boolean;
  fnoOnly?: boolean;
  highConvictionOnly?: boolean;
  highImpactOnly?: boolean;
  upcomingOnly?: boolean;
  search?: string | null;
  view?: CalendarViewId | null;
}

export interface CalendarQueryOptions {
  filters?: EarningsCalendarFilters;
  sortBy?: CalendarSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
  now?: Date;
  portfolioSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
  highConvictionSymbols?: readonly string[];
}

export interface PaginatedCalendar {
  items: EarningsCalendarEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  empty: boolean;
  emptyMessage: string;
}

export interface EarningsCalendarMetrics {
  companiesCovered: number;
  todaysEarnings: number;
  tomorrowsEarnings: number;
  nextWeekEarnings: number;
  portfolioEarnings: number;
  watchlistEarnings: number;
  highImpactResults: number;
  coveragePercent: number;
  coverageLabel: string;
}

export interface EarningsProximityInfo {
  proximity: EarningsProximity;
  label: string;
  resultDate: string | null;
  quarter: string | null;
  daysRemaining: number | null;
}

export interface CalendarSeedContext {
  portfolioSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
  highConvictionSymbols?: readonly string[];
  now?: Date;
}

export const EMPTY_MESSAGES = {
  noUpcoming: "No Upcoming Earnings",
  calendarUpdating: "Calendar Updating",
  awaitingSchedule: "Awaiting Exchange Schedule",
  noPortfolio: "No Portfolio Earnings",
  noWatchlist: "No Watchlist Earnings",
  noHighImpact: "No High Impact Results",
  noToday: "No Earnings Today",
  noTomorrow: "No Earnings Tomorrow",
} as const;

export const CALENDAR_VIEW_LABELS: Record<CalendarViewId, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  next_7_days: "Next 7 Days",
  next_30_days: "Next 30 Days",
  this_quarter: "This Quarter",
  portfolio: "Portfolio Earnings",
  watchlist: "Watchlist Earnings",
  high_impact: "High Impact Earnings",
};
