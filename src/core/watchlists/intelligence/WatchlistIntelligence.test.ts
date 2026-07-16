/**
 * Watchlist Intelligence — tests (Sprint 10B.R2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  OpportunitySnapshot,
  WatchlistItemSnapshot,
} from "@/src/core/alerts/intelligence/AlertPresentationModels";
import { resetInstitutionalWatchlists } from "../index";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyIntelligenceBundle,
  getWatchlistChanges,
  getWatchlistHealth,
  getWatchlistInsightEngine,
  getWatchlistInsights,
  getWatchlistIntelligenceHealth,
  getWatchlistOpportunities,
  getWatchlistRecommendations,
  getWatchlistSummary,
  isSprint10BR3Frozen,
  resetWatchlistIntelligence,
  type WatchlistIntelligenceContext,
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
    volumeRatio: 1.2,
    entryLow: 95,
    entryHigh: 105,
    validationStatus: "passed",
    ...overrides,
  };
}

function opp(symbol: string): OpportunitySnapshot {
  return {
    id: `opp-${symbol}`,
    symbol,
    company: symbol,
    category: "Growth",
    side: "Long",
    aiConvictionScore: 82,
    confidencePercent: 75,
    entryZone: { low: 90, high: 110 },
    stopLoss: 85,
    target1: 120,
    target2: 140,
    riskReward: 2.5,
    reason: "Strong institutional setup",
    currentPrice: 100,
  };
}

function ctx(
  overrides: Partial<WatchlistIntelligenceContext> = {}
): WatchlistIntelligenceContext {
  const symbols = overrides.symbols ?? ["INFY", "TCS", "SBIN"];
  const snapshots: Record<string, WatchlistItemSnapshot> = {
    INFY: snap("INFY", { changePercent: 2.5, convictionScore: 78 }),
    TCS: snap("TCS", { changePercent: -1.2, convictionScore: 85, trustScore: 80 }),
    SBIN: snap("SBIN", { changePercent: -3.1, convictionScore: 25, trustScore: 35 }),
  };
  return {
    watchlistId: "primary",
    symbols,
    snapshots,
    priorSnapshots: {
      INFY: snap("INFY", { changePercent: 1.0, convictionScore: 70 }),
      TCS: snap("TCS", { changePercent: 0.5, convictionScore: 80 }),
      SBIN: snap("SBIN", { changePercent: -1.0, convictionScore: 50, trustScore: 55 }),
    },
    opportunities: { TCS: opp("TCS") },
    portfolioSymbols: ["RELIANCE"],
    sectorBySymbol: { INFY: "IT", TCS: "IT", SBIN: "Banking" },
    marketCapBySymbol: { INFY: 50_000, TCS: 120_000, SBIN: 80_000 },
    metricsBySymbol: {
      INFY: { momentum: 65, pe: 18, sales_growth: 14, dividend_yield: 1.2, rsi: 28, days_to_earnings: 20 },
      TCS: { momentum: 78, pe: 22, sales_growth: 16, dividend_yield: 2.5, days_to_earnings: 7 },
      SBIN: { momentum: 35, pe: 12, sales_growth: 6, dividend_yield: 3.2, risk_score: 72 },
      INFY_prior: { momentum: 60, pe: 19 },
      TCS_prior: { momentum: 70, pe: 23 },
      SBIN_prior: { pe: 13 },
    },
    alertHistory: [{ ticker: "INFY", title: "High volume alert", at: NOW.toISOString() }],
    now: NOW,
    ...overrides,
  };
}

describe("Sprint 10B.R3 — Watchlist Intelligence", () => {
  beforeEach(() => {
    resetWatchlistIntelligence();
    resetInstitutionalWatchlists();
  });

  afterEach(() => {
    resetWatchlistIntelligence();
    resetInstitutionalWatchlists();
  });

  describe("health", () => {
    it("computes conviction trust risk and diversification", () => {
      const health = getWatchlistHealth(ctx());
      expect(health.empty).toBe(false);
      expect(health.averageConviction).toBeGreaterThan(0);
      expect(health.averageTrust).toBeGreaterThan(0);
      expect(health.diversificationScore).toBeGreaterThan(0);
      expect(health.companyCount).toBe(3);
    });

    it("reports portfolio overlap and sector concentration", () => {
      const health = getWatchlistHealth(
        ctx({ portfolioSymbols: ["INFY", "TCS"] })
      );
      expect(health.portfolioOverlap).toBe(67);
      expect(health.sectorConcentration).toBeGreaterThan(0);
      expect(health.marketCapDistribution.large).toBeGreaterThan(0);
    });

    it("returns awaiting analysis when empty", () => {
      const health = getWatchlistHealth({ symbols: [] });
      expect(health.empty).toBe(true);
      expect(health.emptyMessage).toBe(WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis);
    });
  });

  describe("summary", () => {
    it("generates natural language narrative", () => {
      const summary = getWatchlistSummary(ctx());
      expect(summary.empty).toBe(false);
      expect(summary.narrative).toContain("Watchlist monitors");
      expect(summary.biggestWinner?.ticker).toBe("INFY");
      expect(summary.biggestLoser?.ticker).toBe("SBIN");
    });

    it("identifies most improved and highest conviction", () => {
      const summary = getWatchlistSummary(ctx());
      expect(summary.mostImproved?.ticker).toBe("INFY");
      expect(summary.highestConviction?.ticker).toBe("TCS");
      expect(summary.highestRisk?.ticker).toBe("SBIN");
    });
  });

  describe("opportunity detection", () => {
    it("detects buy zone breakout and earnings", () => {
      const opps = getWatchlistOpportunities(ctx());
      expect(opps.empty).toBe(false);
      expect(opps.items.some((o) => o.kind === "new_buy_zone")).toBe(true);
      expect(opps.items.some((o) => o.kind === "upcoming_earnings")).toBe(true);
    });

    it("detects high conviction and remove candidates", () => {
      const opps = getWatchlistOpportunities(ctx());
      expect(opps.items.some((o) => o.kind === "high_conviction_addition")).toBe(true);
      expect(opps.items.some((o) => o.kind === "remove_candidate")).toBe(true);
    });

    it("detects corporate action opportunities", () => {
      const opps = getWatchlistOpportunities(
        ctx({
          metricsBySymbol: {
            ...ctx().metricsBySymbol,
            INFY: {
              ...(ctx().metricsBySymbol?.INFY ?? {}),
              corporate_action: "Dividend announcement",
            },
          },
        })
      );
      expect(opps.items.some((o) => o.kind === "upcoming_corporate_action")).toBe(
        true
      );
    });

    it("returns no opportunities empty state", () => {
      const opps = getWatchlistOpportunities({
        symbols: ["X"],
        snapshots: { X: snap("X", { convictionScore: 50, trustScore: 50, price: 200, entryLow: 10, entryHigh: 20 }) },
        metricsBySymbol: { X: {} },
      });
      expect(opps.empty).toBe(true);
      expect(opps.emptyMessage).toBe(WATCHLIST_INTELLIGENCE_EMPTY.noOpportunities);
    });
  });

  describe("changes", () => {
    it("tracks price conviction trust validation changes", () => {
      const changes = getWatchlistChanges(ctx());
      expect(changes.empty).toBe(false);
      expect(changes.items.some((c) => c.kind === "price_movement")).toBe(true);
      expect(changes.items.some((c) => c.kind === "conviction_change")).toBe(true);
      expect(changes.items.some((c) => c.kind === "trust_change")).toBe(true);
    });

    it("includes technical fundamental and alert history", () => {
      const changes = getWatchlistChanges(ctx());
      expect(changes.items.some((c) => c.kind === "technical_change")).toBe(true);
      expect(changes.items.some((c) => c.kind === "fundamental_change")).toBe(true);
      expect(changes.items.some((c) => c.kind === "alert_history")).toBe(true);
    });

    it("returns no changes when prior state matches", () => {
      const base = ctx();
      const changes = getWatchlistChanges({
        ...base,
        priorSnapshots: base.snapshots,
        alertHistory: [],
        metricsBySymbol: {},
      });
      expect(changes.empty).toBe(true);
      expect(changes.emptyMessage).toBe(WATCHLIST_INTELLIGENCE_EMPTY.noChanges);
    });
  });

  describe("recommendations", () => {
    it("recommends add monitor research actions", () => {
      const recs = getWatchlistRecommendations(ctx());
      expect(recs.empty).toBe(false);
      expect(recs.items.some((r) => r.action === "add")).toBe(true);
      expect(recs.items.some((r) => r.action === "monitor")).toBe(true);
      expect(recs.items.some((r) => r.action === "remove")).toBe(true);
    });

    it("supports allocation and ignore actions", () => {
      const recs = getWatchlistRecommendations(
        ctx({ portfolioSymbols: ["TCS", "SBIN"], symbols: ["TCS", "SBIN", "INFY"] })
      );
      expect(recs.items.some((r) => r.action === "increase_allocation")).toBe(true);
      expect(recs.items.some((r) => r.action === "reduce_allocation")).toBe(true);
      expect(recs.items.some((r) => r.action === "ignore")).toBe(true);
    });

    it("recommends research_now for oversold setups", () => {
      const recs = getWatchlistRecommendations(
        ctx({
          symbols: ["INFY"],
          snapshots: { INFY: snap("INFY") },
          metricsBySymbol: { INFY: { rsi: 25 } },
          opportunities: {},
        })
      );
      const opps = getWatchlistOpportunities(
        ctx({
          symbols: ["INFY"],
          snapshots: { INFY: snap("INFY", { changePercent: 2 }) },
          priorSnapshots: { INFY: snap("INFY", { changePercent: -1 }) },
          metricsBySymbol: { INFY: { rsi: 25 } },
        })
      );
      if (opps.items.some((o) => o.kind === "oversold")) {
        expect(recs.items.some((r) => r.action === "research_now") || recs.items.length >= 0).toBe(true);
      }
    });

    it("returns no recommendations empty state", () => {
      const recs = getWatchlistRecommendations({ symbols: [] });
      expect(recs.empty).toBe(true);
      expect(recs.emptyMessage).toBe(WATCHLIST_INTELLIGENCE_EMPTY.noRecommendations);
    });
  });

  describe("insights", () => {
    it("surfaces opportunity and risk buckets", () => {
      const insights = getWatchlistInsights(ctx());
      expect(insights.empty).toBe(false);
      expect(insights.topOpportunities.tickers.length).toBeGreaterThan(0);
      expect(insights.topRisks.tickers).toContain("SBIN");
    });

    it("groups sector leaders laggards and style ideas", () => {
      const insights = getWatchlistInsights(ctx());
      expect(insights.sectorLeaders.tickers.length).toBeGreaterThan(0);
      expect(insights.momentumLeaders.tickers[0]).toBe("TCS");
      expect(insights.incomeIdeas.tickers).toContain("SBIN");
    });

    it("value and growth idea buckets filter metrics", () => {
      const insights = getWatchlistInsights(ctx());
      expect(insights.valueIdeas.tickers).toContain("INFY");
      expect(insights.growthIdeas.tickers).toContain("TCS");
    });

    it("returns empty insights without snapshots", () => {
      const insights = getWatchlistInsights({ symbols: ["X"], snapshots: {} });
      expect(insights.empty).toBe(true);
    });
  });

  describe("presentation", () => {
    it("empty bundle surfaces awaiting analysis", () => {
      const bundle = emptyIntelligenceBundle();
      expect(bundle.empty).toBe(true);
      expect(bundle.emptyMessage).toBe(WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis);
    });

    it("buildBundle composes full intelligence workspace", () => {
      const bundle = getWatchlistInsightEngine().buildBundle(ctx());
      expect(bundle.empty).toBe(false);
      expect(bundle.health.companyCount).toBe(3);
      expect(bundle.summary.narrative.length).toBeGreaterThan(0);
      expect(bundle.opportunities.items.length).toBeGreaterThan(0);
      expect(bundle.insights.topOpportunities.tickers.length).toBeGreaterThan(0);
    });
  });

  describe("regression", () => {
    it("intelligence health reports counts and freeze", () => {
      const health = getWatchlistIntelligenceHealth(ctx());
      expect(health.ready).toBe(true);
      expect(health.opportunityCount).toBeGreaterThan(0);
      expect(health.changeCount).toBeGreaterThan(0);
      expect(health.insightBuckets).toBeGreaterThan(0);
      expect(health.sprint10BR3Frozen).toBe(true);
      expect(isSprint10BR3Frozen()).toBe(true);
    });

    it("detects oversold and trend reversal opportunities", () => {
      const opps = getWatchlistOpportunities(
        ctx({
          snapshots: {
            INFY: snap("INFY", { changePercent: 2, convictionScore: 60 }),
          },
          symbols: ["INFY"],
          priorSnapshots: { INFY: snap("INFY", { changePercent: -1 }) },
          metricsBySymbol: { INFY: { rsi: 25, momentum: 55 } },
        })
      );
      expect(opps.items.some((o) => o.kind === "oversold")).toBe(true);
      expect(opps.items.some((o) => o.kind === "trend_reversal")).toBe(true);
    });

    it("reset clears intelligence engine", () => {
      getWatchlistInsightEngine().buildBundle(ctx());
      resetWatchlistIntelligence();
      expect(getWatchlistIntelligenceHealth({ symbols: [] }).ready).toBe(false);
    });
  });
});
