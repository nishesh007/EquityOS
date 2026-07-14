/**
 * Institutional Earnings Calendar — in-memory calendar store and query engine.
 * Single source of truth for upcoming earnings events.
 */

import { classifyHighImpact, inferMarketCapBucket } from "./EarningsCoverageEngine";
import {
  annotateMembership,
  applyEarningsFilters,
  filterCalendar,
  paginateEvents,
  sortCalendarEvents,
} from "./EarningsFilters";
import { isUpcomingEvent } from "./EarningsCountdown";
import type {
  CalendarQueryOptions,
  CalendarSeedContext,
  EarningsCalendarEvent,
  EarningsExchange,
  MarketCapBucket,
  PaginatedCalendar,
  ResultSession,
} from "./InstitutionalEarningsModels";
import { EMPTY_MESSAGES } from "./InstitutionalEarningsModels";

export interface RawCalendarSeed {
  id?: string;
  companyName: string;
  ticker: string;
  exchange?: EarningsExchange;
  sector: string;
  industry?: string;
  marketCap: string;
  marketCapBucket?: MarketCapBucket;
  quarter: string;
  financialYear?: string;
  resultDate: string;
  resultTime?: string | null;
  resultSession?: ResultSession;
  previousResultDate?: string | null;
  highImpact?: boolean;
  fno?: boolean;
  highConviction?: boolean;
}

/** Institutional seed calendar — expands legacy static upcoming results. */
export const DEFAULT_EARNINGS_CALENDAR_SEED: RawCalendarSeed[] = [
  {
    id: "earn-reliance",
    companyName: "Reliance Industries",
    ticker: "RELIANCE",
    exchange: "NSE",
    sector: "Conglomerate",
    industry: "Oil & Gas",
    marketCap: "₹19.5L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-18",
    resultTime: "04:00 PM",
    resultSession: "post_market",
    previousResultDate: "2026-04-22",
    highImpact: true,
    fno: true,
    highConviction: true,
  },
  {
    id: "earn-hdfcbank",
    companyName: "HDFC Bank",
    ticker: "HDFCBANK",
    exchange: "NSE",
    sector: "Banking",
    industry: "Private Banks",
    marketCap: "₹13.2L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-19",
    resultTime: "11:00 AM",
    resultSession: "market_hours",
    previousResultDate: "2026-04-19",
    highImpact: true,
    fno: true,
    highConviction: true,
  },
  {
    id: "earn-infy",
    companyName: "Infosys",
    ticker: "INFY",
    exchange: "NSE",
    sector: "IT",
    industry: "IT Services",
    marketCap: "₹7.8L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-21",
    resultTime: "04:30 PM",
    resultSession: "post_market",
    previousResultDate: "2026-04-17",
    highImpact: true,
    fno: true,
  },
  {
    id: "earn-tatamotors",
    companyName: "Tata Motors",
    ticker: "TATAMOTORS",
    exchange: "NSE",
    sector: "Auto",
    industry: "Automobiles",
    marketCap: "₹3.4L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-22",
    resultTime: "02:00 PM",
    resultSession: "market_hours",
    previousResultDate: "2026-05-13",
    highImpact: true,
    fno: true,
  },
  {
    id: "earn-asianpaint",
    companyName: "Asian Paints",
    ticker: "ASIANPAINT",
    exchange: "NSE",
    sector: "FMCG",
    industry: "Paints",
    marketCap: "₹2.8L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-24",
    resultTime: "01:00 PM",
    resultSession: "market_hours",
    previousResultDate: "2026-05-09",
    fno: true,
  },
  {
    id: "earn-bajfinance",
    companyName: "Bajaj Finance",
    ticker: "BAJFINANCE",
    exchange: "NSE",
    sector: "NBFC",
    industry: "Consumer Finance",
    marketCap: "₹4.6L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-25",
    resultTime: "05:00 PM",
    resultSession: "post_market",
    previousResultDate: "2026-04-29",
    highImpact: true,
    fno: true,
    highConviction: true,
  },
  {
    id: "earn-tcs",
    companyName: "Tata Consultancy Services",
    ticker: "TCS",
    exchange: "NSE",
    sector: "IT",
    industry: "IT Services",
    marketCap: "₹14.1L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-15",
    resultTime: "04:00 PM",
    resultSession: "post_market",
    previousResultDate: "2026-04-10",
    highImpact: true,
    fno: true,
    highConviction: true,
  },
  {
    id: "earn-sbin",
    companyName: "State Bank of India",
    ticker: "SBIN",
    exchange: "NSE",
    sector: "Banking",
    industry: "Public Banks",
    marketCap: "₹7.1L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-08-01",
    resultTime: "12:00 PM",
    resultSession: "market_hours",
    previousResultDate: "2026-05-09",
    highImpact: true,
    fno: true,
  },
  {
    id: "earn-maruti",
    companyName: "Maruti Suzuki",
    ticker: "MARUTI",
    exchange: "NSE",
    sector: "Auto",
    industry: "Passenger Vehicles",
    marketCap: "₹4.2L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-28",
    resultTime: "03:00 PM",
    resultSession: "market_hours",
    previousResultDate: "2026-04-25",
    fno: true,
  },
  {
    id: "earn-wipro",
    companyName: "Wipro",
    ticker: "WIPRO",
    exchange: "BSE",
    sector: "IT",
    industry: "IT Services",
    marketCap: "₹2.6L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-17",
    resultTime: "06:00 AM",
    resultSession: "pre_market",
    previousResultDate: "2026-04-16",
    fno: true,
  },
  {
    id: "earn-lt",
    companyName: "Larsen & Toubro",
    ticker: "LT",
    exchange: "NSE",
    sector: "Infrastructure",
    industry: "Engineering & Construction",
    marketCap: "₹5.0L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-30",
    resultTime: "04:30 PM",
    resultSession: "post_market",
    previousResultDate: "2026-05-08",
    highImpact: true,
    fno: true,
  },
  {
    id: "earn-bharti",
    companyName: "Bharti Airtel",
    ticker: "BHARTIARTL",
    exchange: "NSE",
    sector: "Telecom",
    industry: "Telecom Services",
    marketCap: "₹10.8L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-08-05",
    resultTime: "04:00 PM",
    resultSession: "post_market",
    previousResultDate: "2026-05-14",
    highImpact: true,
    fno: true,
  },
];

function parseFinancialYear(
  quarter: string,
  financialYear?: string
): { quarter: string; financialYear: string } {
  if (financialYear) {
    return { quarter: quarter.replace(/\s*FY\d+/i, "").trim() || quarter, financialYear };
  }
  const match = /^(Q[1-4])\s*(FY\d{2,4})?$/i.exec(quarter.trim());
  if (match) {
    return {
      quarter: match[1].toUpperCase(),
      financialYear: match[2]?.toUpperCase() ?? "—",
    };
  }
  return { quarter, financialYear: "—" };
}

export function normalizeCalendarSeed(
  seed: RawCalendarSeed,
  context: CalendarSeedContext = {}
): EarningsCalendarEvent {
  const portfolio = new Set(
    (context.portfolioSymbols ?? []).map((s) => s.toUpperCase())
  );
  const watchlist = new Set(
    (context.watchlistSymbols ?? []).map((s) => s.toUpperCase())
  );
  const conviction = new Set(
    (context.highConvictionSymbols ?? []).map((s) => s.toUpperCase())
  );
  const ticker = seed.ticker.trim().toUpperCase();
  const { quarter, financialYear } = parseFinancialYear(
    seed.quarter,
    seed.financialYear
  );
  const marketCapBucket =
    seed.marketCapBucket ?? inferMarketCapBucket(seed.marketCap);

  const base: EarningsCalendarEvent = {
    id: seed.id ?? `earn-${ticker.toLowerCase()}`,
    companyName: seed.companyName.trim(),
    ticker,
    exchange: seed.exchange ?? "NSE",
    sector: seed.sector.trim() || "—",
    industry: (seed.industry ?? seed.sector).trim() || "—",
    marketCap: seed.marketCap.trim() || "—",
    marketCapBucket,
    quarter,
    financialYear,
    resultDate: seed.resultDate,
    resultTime: seed.resultTime ?? null,
    resultSession: seed.resultSession ?? "post_market",
    previousResultDate: seed.previousResultDate ?? null,
    highImpact: Boolean(seed.highImpact),
    fno: Boolean(seed.fno),
    highConviction: Boolean(seed.highConviction) || conviction.has(ticker),
    inPortfolio: portfolio.has(ticker),
    inWatchlist: watchlist.has(ticker),
  };

  return {
    ...base,
    highImpact: classifyHighImpact(base),
  };
}

export class InstitutionalEarningsCalendar {
  private events: EarningsCalendarEvent[] = [];

  constructor(seed: readonly RawCalendarSeed[] = DEFAULT_EARNINGS_CALENDAR_SEED) {
    this.load(seed);
  }

  load(seed: readonly RawCalendarSeed[], context: CalendarSeedContext = {}): void {
    this.events = seed.map((row) => normalizeCalendarSeed(row, context));
  }

  replace(events: readonly EarningsCalendarEvent[]): void {
    this.events = [...events];
  }

  all(context?: CalendarSeedContext): EarningsCalendarEvent[] {
    if (!context) return [...this.events];
    return annotateMembership(
      this.events,
      context.portfolioSymbols,
      context.watchlistSymbols,
      context.highConvictionSymbols
    );
  }

  getByTicker(ticker: string): EarningsCalendarEvent | null {
    const key = ticker.trim().toUpperCase();
    return this.events.find((e) => e.ticker === key) ?? null;
  }

  query(options: CalendarQueryOptions = {}): EarningsCalendarEvent[] {
    return filterCalendar(this.events, options);
  }

  queryPage(options: CalendarQueryOptions = {}): PaginatedCalendar {
    const sorted = this.query(options);
    const page = paginateEvents(
      sorted,
      options.page ?? 1,
      options.pageSize ?? 20
    );
    const empty = page.total === 0;
    let emptyMessage: string = EMPTY_MESSAGES.noUpcoming;
    if (empty) {
      if (options.filters?.portfolioOnly || options.filters?.view === "portfolio") {
        emptyMessage = EMPTY_MESSAGES.noPortfolio;
      } else if (
        options.filters?.watchlistOnly ||
        options.filters?.view === "watchlist"
      ) {
        emptyMessage = EMPTY_MESSAGES.noWatchlist;
      } else if (
        options.filters?.highImpactOnly ||
        options.filters?.view === "high_impact"
      ) {
        emptyMessage = EMPTY_MESSAGES.noHighImpact;
      } else if (this.events.length === 0) {
        emptyMessage = EMPTY_MESSAGES.awaitingSchedule;
      } else {
        emptyMessage = EMPTY_MESSAGES.noUpcoming;
      }
    }

    return {
      ...page,
      empty,
      emptyMessage,
    };
  }

  upcoming(now = new Date(), options: CalendarQueryOptions = {}): EarningsCalendarEvent[] {
    const annotated = annotateMembership(
      this.events,
      options.portfolioSymbols,
      options.watchlistSymbols,
      options.highConvictionSymbols
    );
    const filtered = applyEarningsFilters(
      annotated,
      { ...(options.filters ?? {}), upcomingOnly: true },
      now
    );
    return sortCalendarEvents(
      filtered.filter((e) => isUpcomingEvent(e.resultDate, e.resultTime, now)),
      options.sortBy ?? "result_date",
      options.sortDirection ?? "asc",
      now
    );
  }
}
