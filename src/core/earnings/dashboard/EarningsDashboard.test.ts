/**
 * Institutional Earnings Dashboard — unit tests (Sprint 9B.R5).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import { resetEarningsPreviewEngine } from "@/src/core/earnings/intelligence";
import {
  DASHBOARD_EMPTY,
  filterEarnings,
  getDashboard,
  getEarningsDashboardEngine,
  getHighConvictionEarnings,
  getPortfolioEarnings,
  getRankedEarnings,
  getWatchlistEarnings,
  resetEarningsDashboardEngine,
  sortEarnings,
  toRankedCardPresentation,
} from "./index";

describe("Earnings Dashboard Ranking", () => {
  beforeEach(() => {
    resetEarningsCalendarService();
    resetEarningsPreviewEngine();
    resetEarningsDashboardEngine();
    getEarningsCalendarService({
      seed: DEFAULT_EARNINGS_CALENDAR_SEED,
      universeSize: 50,
    }).setMembership({
      portfolioSymbols: ["RELIANCE", "HDFCBANK", "INFY", "TCS"],
      watchlistSymbols: ["WIPRO", "SBIN", "LT", "MARUTI"],
    });
  });

  afterEach(() => {
    resetEarningsDashboardEngine();
    resetEarningsPreviewEngine();
    resetEarningsCalendarService();
  });

  it("calculates institutional scorecards and ranks earnings", () => {
    const ranked = getRankedEarnings("institutional_rank");
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[0]!.scorecard.institutionalScore).toBeGreaterThanOrEqual(
      ranked[1]?.scorecard.institutionalScore ?? 0
    );
    expect(ranked[0]!.scorecard.aiConfidence).toBeGreaterThanOrEqual(0);
    expect(ranked[0]!.scorecard.beatProbability).toBeGreaterThanOrEqual(0);
  });

  it("filters by smart filters including portfolio and conviction", () => {
    const ranked = getRankedEarnings();
    const portfolio = filterEarnings(ranked, {
      smartFilters: ["portfolio"],
    });
    expect(portfolio.every((i) => i.event.inPortfolio)).toBe(true);

    const large = filterEarnings(ranked, { smartFilters: ["large_cap"] });
    expect(
      large.every((i) => i.event.marketCapBucket === "large")
    ).toBe(true);

    const highBeat = filterEarnings(ranked, {
      smartFilters: ["high_beat_probability"],
    });
    expect(
      highBeat.every((i) => i.scorecard.beatProbability >= 60)
    ).toBe(true);
  });

  it("sorts by beat probability, confidence, and alphabetical", () => {
    const ranked = getRankedEarnings();
    const byBeat = sortEarnings(ranked, "beat_probability");
    expect(byBeat[0]!.scorecard.beatProbability).toBeGreaterThanOrEqual(
      byBeat[1]?.scorecard.beatProbability ?? 0
    );

    const byName = sortEarnings(ranked, "alphabetical");
    expect(
      byName[0]!.event.companyName <= byName[1]!.event.companyName
    ).toBe(true);
  });

  it("builds dashboard metrics and empty-safe presentation", () => {
    const dashboard = getDashboard({ sortBy: "institutional_rank", pageSize: 5 });
    expect(dashboard.metrics.upcomingEarnings).toBeGreaterThan(0);
    expect(dashboard.metrics.averageAiConfidence).toBeTruthy();
    expect(dashboard.metrics.portfolioExposure).toBeTruthy();
    expect(dashboard.items.length).toBeLessThanOrEqual(5);

    const card = toRankedCardPresentation(dashboard.items[0]!);
    expect(JSON.stringify(card)).not.toContain("undefined");
    expect(JSON.stringify(card)).not.toContain("NaN");
    expect(card.institutionalScoreLabel).toBeTruthy();
  });

  it("integrates portfolio and watchlist rails", () => {
    expect(getPortfolioEarnings().every((i) => i.event.inPortfolio)).toBe(true);
    expect(getWatchlistEarnings().every((i) => i.event.inWatchlist)).toBe(true);
    expect(Array.isArray(getHighConvictionEarnings())).toBe(true);
  });

  it("returns empty-state copy when filters match nothing", () => {
    const dashboard = getDashboard({
      filters: { smartFilters: ["portfolio"], sector: "DoesNotExist" },
    });
    expect(dashboard.empty).toBe(true);
    expect(dashboard.emptyMessage).toMatch(
      /No Matching Filters|No Portfolio Earnings|No Upcoming Earnings/
    );
  });

  it("caches scorecards and supports incremental precompute", () => {
    const engine = getEarningsDashboardEngine();
    const events = getEarningsCalendarService().getUpcomingEarnings();
    engine.precomputeVisible(events.slice(0, 3));
    const first = engine.scoreEvent(events[0]!);
    const second = engine.scoreEvent(events[0]!);
    expect(second.scorecard).toEqual(first.scorecard);
  });

  it("exposes public API surface", () => {
    expect(getDashboard().metrics.ready).toBe(true);
    expect(getRankedEarnings().length).toBeGreaterThan(0);
    expect(getPortfolioEarnings().length).toBeGreaterThan(0);
    expect(getWatchlistEarnings().length).toBeGreaterThan(0);
    expect(DASHBOARD_EMPTY.noUpcoming).toBe("No Upcoming Earnings");
  });
});
