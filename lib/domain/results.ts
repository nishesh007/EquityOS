/**
 * Domain contracts for earnings results data.
 * Upcoming calendar is served by Institutional Earnings Calendar (Sprint 9B.R1).
 */

import type { ResultsSummary, UpcomingResult } from "@/types";
import type {
  CalendarQueryOptions,
  EarningsCalendarEvent,
  EarningsCalendarMetrics,
} from "@/src/core/earnings/calendar";

export interface ResultsDataService {
  fetchUpcoming(): Promise<UpcomingResult[]>;
  fetchSummary(symbol: string): Promise<ResultsSummary | null>;
}

export interface InstitutionalEarningsCalendarService {
  getUpcomingEarnings(options?: CalendarQueryOptions): EarningsCalendarEvent[];
  getTodayEarnings(options?: CalendarQueryOptions): EarningsCalendarEvent[];
  getPortfolioEarnings(options?: CalendarQueryOptions): EarningsCalendarEvent[];
  getWatchlistEarnings(options?: CalendarQueryOptions): EarningsCalendarEvent[];
  filterCalendar(options?: CalendarQueryOptions): EarningsCalendarEvent[];
  getCalendarMetrics(now?: Date): EarningsCalendarMetrics;
}

export type { ResultsSummary, UpcomingResult };
