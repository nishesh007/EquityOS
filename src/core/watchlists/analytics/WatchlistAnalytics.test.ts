/**
 * Watchlist Analytics — tests (Sprint 10B.R5).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { createWatchlist, ensureDefaultWatchlists, resetInstitutionalWatchlists } from "../index";
import { recordTimelineEvent, resetWatchlistWorkspace } from "../workspace";
import {
  BENCHMARK_KINDS,
  WATCHLIST_ANALYTICS_EMPTY,
  emptyAnalyticsBundle,
  getAIReview,
  getAnalyticsView,
  getBenchmark,
  getPerformance,
  getScorecard,
  getWatchlistAnalytics,
  getWatchlistAnalyticsHealth,
  getWatchlistHistory,
  isSprint10BR5Frozen,
  resetWatchlistAnalytics,
  scoreToGrade,
  type WatchlistAnalyticsContext,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function snap(
  symbol: string,
  overrides: Partial<WatchlistItemSnapshot> = {}
): WatchlistItemSnapshot {
  return {
    symbol,
    name: symbol,
    price: 100,
    changePercent: 1.2,
    convictionScore: 72,
    trustScore: 68,
    validationStatus: "passed",
    ...overrides,
  };
}

function ctx(
  watchlistId: string,
  symbols: string[] = ["INFY", "TCS", "SBIN"],
  overrides: Partial<WatchlistAnalyticsContext> = {}
): WatchlistAnalyticsContext {
  const snapshots: Record<string, WatchlistItemSnapshot> = {
    INFY: snap("INFY", { changePercent: 3.5, convictionScore: 82, price: 110 }),
    TCS: snap("TCS", { changePercent: -1.2, convictionScore: 85, trustScore: 80 }),
    SBIN: snap("SBIN", { changePercent: -4.1, convictionScore: 28, trustScore: 35 }),
  };
  return {
    watchlistId,
    symbols,
    snapshots,
    priorSnapshots: {
      INFY: snap("INFY", { price: 100, changePercent: 1 }),
      TCS: snap("TCS", { price: 102, changePercent: 0.5 }),
      SBIN: snap("SBIN", { price: 105, changePercent: -1 }),
    },
    sectorBySymbol: { INFY: "IT", TCS: "IT", SBIN: "Banking" },
    marketCapBySymbol: { INFY: 150_000, TCS: 200_000, SBIN: 15_000 },
    metricsBySymbol: {
      INFY: { momentum: 12, pe: 18 },
      TCS: { momentum: 8, pe: 22 },
      SBIN: { momentum: -5, pe: 14 },
    },
    benchmarkReturns: { nifty: 1.2, sensex: 1.0, sector_index: 1.5, custom: 0.8 },
    workspaceId: "ws-analytics",
    now: NOW,
    ...overrides,
  };
}

describe("Sprint 10B.R5 — Watchlist Analytics", () => {
  let watchlistId: string;

  beforeEach(() => {
    resetWatchlistAnalytics();
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
    ensureDefaultWatchlists(NOW);
    const wl = createWatchlist({
      name: "Analytics Desk",
      symbols: ["INFY", "TCS", "SBIN"],
      now: NOW,
    });
    watchlistId = wl.id;
  });

  afterEach(() => {
    resetWatchlistAnalytics();
    resetWatchlistWorkspace();
    resetInstitutionalWatchlists();
  });

  describe("performance", () => {
    it("computes return win rate and hit ratio", () => {
      const perf = getPerformance(ctx(watchlistId));
      expect(perf.empty).toBe(false);
      expect(perf.aggregateReturn).not.toBe(0);
      expect(perf.winRate).toBeGreaterThan(0);
      expect(perf.symbols.length).toBe(3);
      expect(perf.hitRatio).toBeGreaterThanOrEqual(0);
    });

    it("computes relative performance vs benchmark", () => {
      const perf = getPerformance(ctx(watchlistId));
      expect(perf.relativePerformance).toBeDefined();
      expect(perf.averageGain).toBeGreaterThanOrEqual(0);
      expect(perf.lossRate).toBeGreaterThanOrEqual(0);
    });

    it("tracks per-symbol return since added", () => {
      const perf = getPerformance(ctx(watchlistId));
      const infy = perf.symbols.find((s) => s.ticker === "INFY");
      expect(infy?.returnSinceAdded).toBeGreaterThan(0);
      expect(infy?.relativePerformance).toBeDefined();
    });

    it("returns no performance empty state", () => {
      const perf = getPerformance({ symbols: [], now: NOW });
      expect(perf.empty).toBe(true);
      expect(perf.emptyMessage).toBe(WATCHLIST_ANALYTICS_EMPTY.noPerformanceData);
    });
  });

  describe("analytics", () => {
    it("identifies best and worst performers", () => {
      const view = getAnalyticsView(ctx(watchlistId));
      expect(view.empty).toBe(false);
      expect(view.bestPerformer?.ticker).toBe("INFY");
      expect(view.worstPerformer?.ticker).toBe("SBIN");
    });

    it("computes conviction trust and risk distribution", () => {
      const view = getAnalyticsView(ctx(watchlistId));
      expect(view.averageConviction).toBeGreaterThan(0);
      expect(view.averageTrust).toBeGreaterThan(0);
      expect(view.riskDistribution.high).toBeGreaterThanOrEqual(0);
    });

    it("identifies most improved and deteriorated", () => {
      const view = getAnalyticsView(ctx(watchlistId));
      expect(view.mostImproved).toBeTruthy();
      expect(view.mostDeteriorated).toBeTruthy();
    });

    it("builds sector and market-cap allocation", () => {
      const view = getAnalyticsView(ctx(watchlistId));
      expect(view.sectorAllocation.length).toBeGreaterThan(0);
      expect(view.marketCapAllocation.length).toBeGreaterThan(0);
      expect(view.sectorAllocation.some((s) => s.label === "IT")).toBe(true);
    });
  });

  describe("benchmark", () => {
    it("compares against nifty sensex sector and custom", () => {
      const bench = getBenchmark(ctx(watchlistId));
      expect(bench.empty).toBe(false);
      expect(bench.benchmarks).toHaveLength(BENCHMARK_KINDS.length);
      expect(bench.benchmarks.some((b) => b.kind === "nifty")).toBe(true);
    });

    it("computes relative alpha and beta", () => {
      const bench = getBenchmark(ctx(watchlistId));
      for (const row of bench.benchmarks) {
        expect(row.relativeAlpha).toBeDefined();
        expect(row.relativeBeta).toBeDefined();
      }
    });

    it("returns no benchmark empty state without performance", () => {
      const bench = getBenchmark({ symbols: [], now: NOW });
      expect(bench.empty).toBe(true);
      expect(bench.emptyMessage).toBe(WATCHLIST_ANALYTICS_EMPTY.noBenchmark);
    });
  });

  describe("AI review", () => {
    it("explains winners and losers", () => {
      const review = getAIReview(ctx(watchlistId));
      expect(review.empty).toBe(false);
      expect(review.whyWinnersWorked.length).toBeGreaterThan(0);
      expect(review.whyLosersFailed.length).toBeGreaterThan(0);
    });

    it("surfaces success factors mistakes and improvements", () => {
      const review = getAIReview(ctx(watchlistId));
      expect(review.commonSuccessFactors.length).toBeGreaterThan(0);
      expect(review.suggestedImprovements.length).toBeGreaterThan(0);
      expect(review.researchQualityReview.length).toBeGreaterThan(0);
    });

    it("returns no review empty state", () => {
      const review = getAIReview({ symbols: [], now: NOW });
      expect(review.empty).toBe(true);
      expect(review.emptyMessage).toBe(WATCHLIST_ANALYTICS_EMPTY.noReview);
    });
  });

  describe("scorecard", () => {
    it("grades research selection risk diversification and consistency", () => {
      const card = getScorecard(ctx(watchlistId));
      expect(card.empty).toBe(false);
      expect(["A", "B", "C", "D", "F"]).toContain(card.overallGrade);
      expect(card.scores.overall).toBeGreaterThan(0);
    });

    it("maps scores to letter grades", () => {
      expect(scoreToGrade(90)).toBe("A");
      expect(scoreToGrade(45)).toBe("D");
    });

    it("exposes individual quality dimension grades", () => {
      const card = getScorecard(ctx(watchlistId));
      expect(["A", "B", "C", "D", "F"]).toContain(card.researchQuality);
      expect(["A", "B", "C", "D", "F"]).toContain(card.selectionQuality);
      expect(["A", "B", "C", "D", "F"]).toContain(card.riskQuality);
    });
  });

  describe("history", () => {
    it("composes timeline and change history", () => {
      recordTimelineEvent({
        watchlistId,
        kind: "added",
        ticker: "INFY",
        summary: "Added INFY",
        now: NOW,
      });
      const history = getWatchlistHistory(ctx(watchlistId));
      expect(history.addedTimeline.length).toBeGreaterThan(0);
      expect(history.performanceHistory.length).toBeGreaterThan(0);
    });

    it("returns awaiting history empty state", () => {
      resetWatchlistWorkspace();
      const history = getWatchlistHistory({
        watchlistId,
        symbols: [],
        now: NOW,
      });
      expect(history.empty).toBe(true);
      expect(history.emptyMessage).toBe(WATCHLIST_ANALYTICS_EMPTY.awaitingHistory);
    });

    it("includes alert history from context", () => {
      const history = getWatchlistHistory(
        ctx(watchlistId, ["INFY"], {
          alertHistory: [{ ticker: "INFY", title: "Price alert", at: NOW.toISOString() }],
        })
      );
      expect(history.alertHistory.some((e) => e.ticker === "INFY")).toBe(true);
    });
  });

  describe("presentation", () => {
    it("empty bundle surfaces route hints", () => {
      const bundle = emptyAnalyticsBundle();
      expect(bundle.empty).toBe(true);
      expect(bundle.surfaceHints.watchlist).toBe("/watchlist");
      expect(bundle.surfaceHints.dashboard).toBe("/");
    });

    it("getWatchlistAnalytics composes full bundle", () => {
      const bundle = getWatchlistAnalytics(ctx(watchlistId));
      expect(bundle.empty).toBe(false);
      expect(bundle.performance.symbols.length).toBe(3);
      expect(bundle.benchmark.benchmarks.length).toBe(4);
      expect(bundle.scorecard.overallGrade).toBeTruthy();
    });
  });

  describe("regression", () => {
    it("analytics health reports readiness and grade", () => {
      const health = getWatchlistAnalyticsHealth(ctx(watchlistId));
      expect(health.ready).toBe(true);
      expect(health.benchmarkCount).toBe(4);
      expect(health.sprint10BR5Frozen).toBe(true);
      expect(isSprint10BR5Frozen()).toBe(true);
    });

    it("reset clears analytics orchestrator", () => {
      getWatchlistAnalytics(ctx(watchlistId));
      resetWatchlistAnalytics();
      expect(getWatchlistAnalyticsHealth(ctx(watchlistId)).ready).toBe(true);
    });

    it("research history links symbols from workspace bridge", () => {
      const history = getWatchlistHistory(ctx(watchlistId));
      expect(history.researchHistory.length).toBeGreaterThan(0);
    });
  });
});
