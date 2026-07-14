/**
 * Institutional Earnings Calendar — unit tests (Sprint 9B.R1).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildEarningsCountdown,
  buildDashboardEarningsView,
  buildPortfolioEarningsSurface,
  buildWatchlistEarningsSurface,
  daysUntilResult,
  EMPTY_MESSAGES,
  filterCalendar,
  getCalendarMetrics,
  getEarningsCalendarService,
  getPortfolioEarnings,
  getTodayEarnings,
  getUpcomingEarnings,
  getWatchlistEarnings,
  InstitutionalEarningsCalendar,
  normalizeCalendarSeed,
  paginateEvents,
  resetEarningsCalendarService,
  resolveEarningsProximity,
  sortCalendarEvents,
  toEarningsCardView,
  toUpcomingResultDto,
  type EarningsCalendarEvent,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z"); // ~12:00 IST

const SAMPLE_SEED = [
  {
    companyName: "Reliance Industries",
    ticker: "RELIANCE",
    exchange: "NSE" as const,
    sector: "Conglomerate",
    industry: "Oil & Gas",
    marketCap: "₹19.5L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-15",
    resultTime: "04:00 PM",
    resultSession: "post_market" as const,
    previousResultDate: "2026-04-22",
    highImpact: true,
    fno: true,
    highConviction: true,
  },
  {
    companyName: "HDFC Bank",
    ticker: "HDFCBANK",
    exchange: "NSE" as const,
    sector: "Banking",
    industry: "Private Banks",
    marketCap: "₹13.2L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-16",
    resultTime: "11:00 AM",
    resultSession: "market_hours" as const,
    highImpact: true,
    fno: true,
  },
  {
    companyName: "Wipro",
    ticker: "WIPRO",
    exchange: "BSE" as const,
    sector: "IT",
    industry: "IT Services",
    marketCap: "₹2.6L Cr",
    quarter: "Q1",
    financialYear: "FY26",
    resultDate: "2026-07-20",
    resultTime: "06:00 AM",
    resultSession: "pre_market" as const,
    fno: true,
  },
  {
    companyName: "Expired Co",
    ticker: "OLDCO",
    exchange: "NSE" as const,
    sector: "Auto",
    industry: "Auto",
    marketCap: "₹1.0L Cr",
    quarter: "Q4",
    financialYear: "FY25",
    resultDate: "2026-07-01",
    resultSession: "post_market" as const,
  },
];

function makeService() {
  resetEarningsCalendarService();
  const service = getEarningsCalendarService({
    seed: SAMPLE_SEED,
    universeSize: 10,
  });
  service.setMembership({
    portfolioSymbols: ["RELIANCE", "HDFCBANK"],
    watchlistSymbols: ["WIPRO", "HDFCBANK"],
  });
  return service;
}

describe("InstitutionalEarningsCalendar", () => {
  beforeEach(() => {
    resetEarningsCalendarService();
  });

  afterEach(() => {
    resetEarningsCalendarService();
  });

  it("generates normalized calendar events from seed", () => {
    const calendar = new InstitutionalEarningsCalendar(SAMPLE_SEED);
    const events = calendar.all();
    expect(events.length).toBe(4);
    expect(events[0]?.ticker).toBe("RELIANCE");
    expect(events[0]?.marketCapBucket).toBe("large");
    expect(events[0]?.highImpact).toBe(true);
  });

  it("normalizes quarter and financial year", () => {
    const event = normalizeCalendarSeed({
      companyName: "Infosys",
      ticker: "INFY",
      sector: "IT",
      marketCap: "₹7.8L Cr",
      quarter: "Q1 FY26",
      resultDate: "2026-07-21",
    });
    expect(event.quarter).toBe("Q1");
    expect(event.financialYear).toBe("FY26");
  });
});

describe("Countdown", () => {
  it("labels today / tomorrow / days", () => {
    expect(buildEarningsCountdown("2026-07-15", null, NOW).label).toBe("Today");
    expect(buildEarningsCountdown("2026-07-16", null, NOW).label).toBe(
      "Tomorrow"
    );
    expect(buildEarningsCountdown("2026-07-20", null, NOW).label).toBe("5 Days");
  });

  it("labels hours and minutes for same-day timed results", () => {
    const morning = new Date("2026-07-15T04:00:00.000Z"); // 09:30 IST
    const hours = buildEarningsCountdown("2026-07-15", "04:00 PM", morning);
    expect(hours.status).toBe("hours");
    expect(hours.label).toMatch(/Hours/);

    const late = new Date("2026-07-15T10:00:00.000Z"); // 15:30 IST
    const minutes = buildEarningsCountdown("2026-07-15", "04:00 PM", late);
    expect(minutes.status).toBe("minutes");
  });

  it("labels result released and expired", () => {
    const after = new Date("2026-07-15T11:00:00.000Z"); // 16:30 IST
    expect(
      buildEarningsCountdown("2026-07-15", "04:00 PM", after).label
    ).toBe("Result Released");
    expect(buildEarningsCountdown("2026-07-01", null, NOW).label).toBe(
      "Expired"
    );
  });

  it("computes days until result in IST", () => {
    expect(daysUntilResult("2026-07-15", NOW)).toBe(0);
    expect(daysUntilResult("2026-07-16", NOW)).toBe(1);
    expect(daysUntilResult("2026-07-01", NOW)).toBe(-14);
  });
});

describe("Filtering and sorting", () => {
  it("filters by exchange, sector, portfolio, watchlist, fno", () => {
    const service = makeService();
    const nse = service.filterCalendar({
      filters: { exchange: "NSE" },
      now: NOW,
    });
    expect(nse.every((e) => e.exchange === "NSE")).toBe(true);

    const portfolio = service.getPortfolioEarnings({ now: NOW });
    expect(portfolio.map((e) => e.ticker).sort()).toEqual([
      "HDFCBANK",
      "RELIANCE",
    ]);

    const watchlist = service.getWatchlistEarnings({ now: NOW });
    expect(watchlist.map((e) => e.ticker).sort()).toEqual([
      "HDFCBANK",
      "WIPRO",
    ]);

    const fno = service.filterCalendar({
      filters: { fnoOnly: true, upcomingOnly: true },
      now: NOW,
    });
    expect(fno.every((e) => e.fno)).toBe(true);
  });

  it("supports calendar views", () => {
    const service = makeService();
    expect(service.getTodayEarnings({ now: NOW })).toHaveLength(1);
    expect(service.getTomorrowEarnings({ now: NOW })).toHaveLength(1);
    expect(
      service.filterCalendar({
        filters: { view: "next_7_days" },
        now: NOW,
      }).length
    ).toBeGreaterThanOrEqual(3);
  });

  it("sorts by result date and paginates", () => {
    const service = makeService();
    const sorted = sortCalendarEvents(
      service.getAllEvents(NOW),
      "result_date",
      "asc",
      NOW
    );
    expect(sorted[0]?.resultDate <= sorted[1]?.resultDate).toBe(true);

    const page = paginateEvents(sorted, 1, 2);
    expect(page.items).toHaveLength(2);
    expect(page.totalPages).toBe(2);
  });

  it("public filterCalendar API works", () => {
    makeService();
    const filtered = filterCalendar({
      filters: { sector: "IT", upcomingOnly: true },
      now: NOW,
    });
    expect(filtered.every((e) => e.sector === "IT")).toBe(true);
  });
});

describe("Portfolio and watchlist integration", () => {
  it("surfaces portfolio earnings rows", () => {
    const service = makeService();
    const surface = buildPortfolioEarningsSurface(
      service.getAllEvents(NOW),
      ["RELIANCE", "HDFCBANK"],
      NOW
    );
    expect(surface.empty).toBe(false);
    expect(surface.upcoming.length).toBe(2);

    const empty = buildPortfolioEarningsSurface(
      service.getAllEvents(NOW),
      ["UNKNOWN"],
      NOW
    );
    expect(empty.emptyMessage).toBe(EMPTY_MESSAGES.noPortfolio);
  });

  it("surfaces watchlist upcoming / tomorrow / high priority", () => {
    const service = makeService();
    const surface = buildWatchlistEarningsSurface(
      service.getAllEvents(NOW),
      ["WIPRO", "HDFCBANK"],
      NOW
    );
    expect(surface.upcoming.length).toBe(2);
    expect(surface.resultsTomorrow.map((e) => e.ticker)).toContain("HDFCBANK");
    expect(surface.highPriority.length).toBeGreaterThan(0);
  });
});

describe("Dashboard and results presentation", () => {
  it("builds dashboard earnings view with sections", () => {
    const service = makeService();
    const view = service.getDashboardView(NOW);
    expect(view.today.empty).toBe(false);
    expect(view.tomorrow.empty).toBe(false);
    expect(view.portfolio.empty).toBe(false);
    expect(view.watchlist.empty).toBe(false);
    expect(view.metrics.companiesCovered).toBe(4);
  });

  it("builds results page view with empty-state safety", () => {
    const service = makeService();
    const page = service.getResultsPageView({
      now: NOW,
      page: 1,
      pageSize: 2,
      filters: { exchange: "BSE" },
    });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.empty).toBe(false);

    const empty = service.getResultsPageView({
      now: NOW,
      filters: { sector: "DoesNotExist" },
    });
    expect(empty.empty).toBe(true);
    expect(empty.emptyMessage).toBe(EMPTY_MESSAGES.noUpcoming);
  });

  it("card views never expose nullish display junk", () => {
    const event = normalizeCalendarSeed(SAMPLE_SEED[0]!);
    const card = toEarningsCardView(event, NOW);
    expect(card.companyName).toBeTruthy();
    expect(card.countdown.label).toBeTruthy();
    expect(card.sessionLabel).toBe("Post Market");
    expect(JSON.stringify(card)).not.toContain("undefined");
    expect(JSON.stringify(card)).not.toContain("NaN");
  });

  it("maps to legacy UpcomingResult DTO", () => {
    const event = normalizeCalendarSeed(SAMPLE_SEED[0]!);
    const dto = toUpcomingResultDto(event);
    expect(dto.symbol).toBe("RELIANCE");
    expect(dto.date).toBe("2026-07-15");
  });

  it("buildDashboardEarningsView marks empty sections", () => {
    const view = buildDashboardEarningsView({
      upcoming: [],
      today: [],
      tomorrow: [],
      next7Days: [],
      portfolio: [],
      watchlist: [],
      highImpact: [],
      metrics: {
        companiesCovered: 0,
        todaysEarnings: 0,
        tomorrowsEarnings: 0,
        nextWeekEarnings: 0,
        portfolioEarnings: 0,
        watchlistEarnings: 0,
        highImpactResults: 0,
        coveragePercent: 0,
        coverageLabel: "Awaiting Exchange Schedule",
      },
      now: NOW,
    });
    expect(view.today.emptyMessage).toBe(EMPTY_MESSAGES.noToday);
    expect(view.portfolio.emptyMessage).toBe(EMPTY_MESSAGES.noPortfolio);
    expect(view.metricsReady).toBe(false);
  });
});

describe("Metrics and proximity", () => {
  it("tracks coverage metrics", () => {
    makeService();
    const metrics = getCalendarMetrics(NOW);
    expect(metrics.todaysEarnings).toBe(1);
    expect(metrics.tomorrowsEarnings).toBe(1);
    expect(metrics.portfolioEarnings).toBe(2);
    expect(metrics.watchlistEarnings).toBe(2);
    expect(metrics.coveragePercent).toBeGreaterThan(0);
    expect(metrics.coverageLabel).toContain("Coverage");
  });

  it("exposes earnings proximity windows", () => {
    expect(resolveEarningsProximity("2026-07-15", NOW).proximity).toBe(
      "earnings_today"
    );
    expect(resolveEarningsProximity("2026-07-18", NOW).proximity).toBe(
      "pre_earnings"
    );
    expect(resolveEarningsProximity("2026-07-14", NOW).proximity).toBe(
      "post_earnings"
    );
    expect(resolveEarningsProximity("2026-07-10", NOW).proximity).toBe(
      "cooling_period"
    );
  });

  it("public getters return upcoming sets", () => {
    makeService();
    expect(getUpcomingEarnings({ now: NOW }).length).toBeGreaterThan(0);
    expect(getTodayEarnings({ now: NOW })[0]?.ticker).toBe("RELIANCE");
    expect(getPortfolioEarnings({ now: NOW }).length).toBe(2);
    expect(getWatchlistEarnings({ now: NOW }).length).toBe(2);
  });
});

describe("Empty states", () => {
  it("returns awaiting schedule when calendar is empty", () => {
    resetEarningsCalendarService();
    const service = getEarningsCalendarService({ seed: [], universeSize: 10 });
    const page = service.filterCalendarPage({ now: NOW });
    expect(page.emptyMessage).toBe(EMPTY_MESSAGES.awaitingSchedule);
  });

  it("never serializes null/undefined/NaN into card text fields", () => {
    const sparse: EarningsCalendarEvent = {
      id: "x",
      companyName: "",
      ticker: "X",
      exchange: "NSE",
      sector: "",
      industry: "",
      marketCap: "",
      marketCapBucket: "unknown",
      quarter: "",
      financialYear: "",
      resultDate: "2026-07-20",
      resultTime: null,
      resultSession: "post_market",
      previousResultDate: null,
      highImpact: false,
      fno: false,
      highConviction: false,
      inPortfolio: false,
      inWatchlist: false,
    };
    const card = toEarningsCardView(sparse, NOW);
    expect(card.companyName).toBe("X");
    expect(card.sector).toBe("—");
    expect(card.resultTime).toBe("—");
    expect(card.previousResultDate).toBe("—");
  });
});
