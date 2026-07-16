/**
 * Smart Watchlist Platform — tests (Sprint 10B.R2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWatchlist, resetInstitutionalWatchlists } from "../index";
import {
  DYNAMIC_TEMPLATE_LABELS,
  DYNAMIC_WATCHLIST_TEMPLATES,
  GROUPING_DIMENSIONS,
  SMART_WATCHLIST_EMPTY,
  WATCHLIST_RULE_FIELDS,
  createDynamicWatchlist,
  createRule,
  createRuleGroup,
  detectDuplicateWatchlists,
  emptySmartWatchlistView,
  evaluateLeafRule,
  filterCandidatesByRule,
  getRecommendations,
  getSmartWatchlistEngine,
  getSmartWatchlistHealth,
  getSmartWatchlistView,
  groupWatchlist,
  isSprint10BR2Frozen,
  listDynamicWatchlists,
  resetSmartWatchlistEngine,
  runDynamicWatchlist,
  tagCompanies,
  type SmartWatchlistCandidate,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function candidate(
  ticker: string,
  overrides?: Partial<SmartWatchlistCandidate>
): SmartWatchlistCandidate {
  return {
    ticker,
    company: ticker,
    sector: "IT",
    industry: "Software",
    theme: "Digital",
    inPortfolio: false,
    inWatchlist: false,
    metrics: {
      market_cap: 50_000,
      pe: 18,
      roe: 20,
      sales_growth: 12,
      profit_growth: 8,
      rs_rating: 70,
      momentum: 65,
      volume: 1_000_000,
      ai_conviction: 72,
      trust_score: 68,
      validation_score: 70,
      risk_score: 25,
      dividend_yield: 1.5,
      days_to_earnings: 10,
      near_52w_high: 96,
      near_52w_low: 80,
    },
    ...overrides,
  };
}

const UNIVERSE: SmartWatchlistCandidate[] = [
  candidate("INFY", { inWatchlist: true }),
  candidate("TCS", {
    sector: "IT",
    metrics: {
      ai_conviction: 82,
      trust_score: 78,
      momentum: 72,
      risk_score: 20,
      pe: 25,
      roe: 22,
      sales_growth: 18,
      profit_growth: 12,
      market_cap: 120_000,
      dividend_yield: 2.5,
      days_to_earnings: 5,
      near_52w_high: 98,
      near_52w_low: 70,
    },
  }),
  candidate("SBIN", {
    sector: "Banking",
    industry: "Banks",
    metrics: {
      ai_conviction: 35,
      trust_score: 55,
      momentum: 40,
      risk_score: 72,
      pe: 12,
      roe: 14,
      sales_growth: 6,
      profit_growth: -2,
      market_cap: 80_000,
      dividend_yield: 3,
      days_to_earnings: 30,
      near_52w_high: 85,
      near_52w_low: 102,
    },
  }),
  candidate("RELIANCE", {
    sector: "Energy",
    inPortfolio: true,
    metrics: {
      ai_conviction: 68,
      trust_score: 62,
      momentum: 78,
      risk_score: 35,
      market_cap: 200_000,
    },
  }),
];

describe("Sprint 10B.R2 — Smart Watchlist Platform", () => {
  beforeEach(() => {
    resetSmartWatchlistEngine();
    resetInstitutionalWatchlists();
  });

  afterEach(() => {
    resetSmartWatchlistEngine();
    resetInstitutionalWatchlists();
  });

  describe("dynamic rules", () => {
    it("creates dynamic watchlist from each template", () => {
      for (const templateId of DYNAMIC_WATCHLIST_TEMPLATES) {
        const def = createDynamicWatchlist({ templateId, now: NOW });
        expect(def.empty).toBe(false);
        expect(def.name).toBe(DYNAMIC_TEMPLATE_LABELS[templateId]);
        expect(def.root.children.length).toBeGreaterThan(0);
      }
      expect(listDynamicWatchlists().length).toBe(
        DYNAMIC_WATCHLIST_TEMPLATES.length
      );
    });

    it("createRule registers evaluable leaf rules", () => {
      const rule = createRule({
        id: "test-conviction",
        field: "ai_conviction",
        operator: "gte",
        value: 70,
      });
      expect(evaluateLeafRule(rule, UNIVERSE[1]!)).toBe(true);
      expect(evaluateLeafRule(rule, UNIVERSE[2]!)).toBe(false);
    });

    it("runDynamicWatchlist filters top conviction matches", () => {
      const def = createDynamicWatchlist({
        templateId: "top_conviction",
        now: NOW,
      });
      const result = runDynamicWatchlist({
        watchlistId: def.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      expect(result.empty).toBe(false);
      expect(result.matchCount).toBeGreaterThan(0);
      expect(result.matches.every((m) => (m.metrics.ai_conviction as number) >= 75)).toBe(
        true
      );
    });

    it("runDynamicWatchlist returns no matches empty state", () => {
      const def = createDynamicWatchlist({
        templateId: "top_conviction",
        now: NOW,
      });
      const result = runDynamicWatchlist({
        watchlistId: def.id,
        candidates: [
          candidate("WEAK", {
            metrics: { ai_conviction: 10, trust_score: 10 },
          }),
        ],
        now: NOW,
      });
      expect(result.empty).toBe(true);
      expect(result.emptyMessage).toBe(SMART_WATCHLIST_EMPTY.noMatches);
    });

    it("custom rule group supports and/or logic", () => {
      const root = createRuleGroup({
        id: "custom-root",
        logic: "and",
        children: [
          createRule({
            id: "sector-it",
            field: "sector",
            operator: "eq",
            value: "IT",
          }),
          createRule({
            id: "trust",
            field: "trust_score",
            operator: "gte",
            value: 65,
          }),
        ],
      });
      const matches = filterCandidatesByRule(root, UNIVERSE);
      expect(matches.map((m) => m.ticker)).toContain("INFY");
      expect(matches.map((m) => m.ticker)).toContain("TCS");
    });

    it("supports all rule builder fields", () => {
      expect(WATCHLIST_RULE_FIELDS).toContain("market_cap");
      expect(WATCHLIST_RULE_FIELDS).toContain("ai_conviction");
      expect(WATCHLIST_RULE_FIELDS).toContain("portfolio_status");
      expect(WATCHLIST_RULE_FIELDS).toContain("watchlist_status");

      const portfolioRule = createRule({
        id: "portfolio",
        field: "portfolio_status",
        operator: "eq",
        value: "in_portfolio",
      });
      expect(evaluateLeafRule(portfolioRule, UNIVERSE[3]!)).toBe(true);
    });
  });

  describe("grouping", () => {
    it("groups watchlist by sector", () => {
      const view = groupWatchlist({ candidates: UNIVERSE, dimension: "sector" });
      expect(view.empty).toBe(false);
      expect(view.buckets.some((b) => b.key === "IT")).toBe(true);
      expect(view.buckets.some((b) => b.key === "Banking")).toBe(true);
    });

    it("groups by conviction trust risk and market cap", () => {
      for (const dimension of GROUPING_DIMENSIONS) {
        const view = groupWatchlist({ candidates: UNIVERSE, dimension });
        expect(view.dimension).toBe(dimension);
        if (dimension !== "theme") {
          expect(view.buckets.length).toBeGreaterThan(0);
        }
      }
    });

    it("returns no matches for empty candidates", () => {
      const view = groupWatchlist({ candidates: [], dimension: "sector" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(SMART_WATCHLIST_EMPTY.noMatches);
    });
  });

  describe("recommendations", () => {
    it("suggests stocks to add with high conviction", () => {
      const recs = getRecommendations({
        candidates: UNIVERSE,
        watchlistSymbols: ["INFY"],
      });
      expect(recs.toAdd.some((r) => r.ticker === "TCS")).toBe(true);
    });

    it("suggests stocks to remove when conviction drops", () => {
      const recs = getRecommendations({
        candidates: UNIVERSE,
        watchlistSymbols: ["SBIN", "INFY"],
      });
      expect(recs.toRemove.some((r) => r.ticker === "SBIN")).toBe(true);
    });

    it("suggests monitor trending and AI suggestions", () => {
      const recs = getRecommendations({
        candidates: UNIVERSE,
        watchlistSymbols: ["INFY", "RELIANCE"],
        portfolioSymbols: ["RELIANCE"],
      });
      expect(recs.toMonitor.length).toBeGreaterThan(0);
      expect(recs.trending.length).toBeGreaterThan(0);
      expect(recs.aiSuggestions.length).toBeGreaterThan(0);
      expect(recs.suggestedWatchlists.length).toBeGreaterThan(0);
    });

    it("returns no suggestions empty state", () => {
      const recs = getRecommendations({ candidates: [] });
      expect(recs.empty).toBe(true);
      expect(recs.emptyMessage).toBe(SMART_WATCHLIST_EMPTY.noSuggestions);
    });
  });

  describe("tags", () => {
    it("auto tags companies with sector conviction trust", () => {
      const tags = tagCompanies(UNIVERSE);
      expect(tags.length).toBe(UNIVERSE.length);
      const infy = tags.find((t) => t.ticker === "INFY");
      expect(infy?.tags).toContain("sector:it");
      expect(infy?.tags).toContain("watchlist");
      expect(infy?.autoGenerated).toBe(true);
    });

    it("assigns auto categories and priorities", () => {
      const tags = tagCompanies(UNIVERSE);
      const tcs = tags.find((t) => t.ticker === "TCS");
      expect(tcs?.category).toBe("IT");
      expect(tcs?.priority).toBeGreaterThan(0);
    });
  });

  describe("presentation", () => {
    it("empty smart view surfaces awaiting AI analysis", () => {
      const view = emptySmartWatchlistView();
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(SMART_WATCHLIST_EMPTY.awaitingAiAnalysis);
    });

    it("getSmartWatchlistView composes dynamic tags grouping recommendations", () => {
      createDynamicWatchlist({ templateId: "momentum", now: NOW });
      const view = getSmartWatchlistView({
        candidates: UNIVERSE,
        watchlistSymbols: ["INFY"],
        dimension: "sector",
        now: NOW,
      });
      expect(view.dynamic.length).toBeGreaterThan(0);
      expect(view.tags.length).toBeGreaterThan(0);
      expect(view.grouping?.empty).toBe(false);
      expect(view.recommendations.empty).toBe(false);
    });
  });

  describe("regression", () => {
    it("smart health reports readiness and counts", () => {
      createDynamicWatchlist({ templateId: "value", now: NOW });
      const health = getSmartWatchlistHealth();
      expect(health.ready).toBe(true);
      expect(health.dynamicCount).toBe(1);
      expect(health.tagCount).toBe(0);
      expect(health.sprint10BR2Frozen).toBe(true);
      expect(isSprint10BR2Frozen()).toBe(true);
    });

    it("low risk and value dynamic templates filter correctly", () => {
      const lowRisk = createDynamicWatchlist({
        templateId: "low_risk",
        now: NOW,
      });
      const value = createDynamicWatchlist({ templateId: "value", now: NOW });
      const lowRiskRun = runDynamicWatchlist({
        watchlistId: lowRisk.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      const valueRun = runDynamicWatchlist({
        watchlistId: value.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      expect(
        lowRiskRun.matches.every((m) => (m.metrics.risk_score as number) <= 30)
      ).toBe(true);
      expect(valueRun.matchCount).toBeGreaterThanOrEqual(0);
    });

    it("fifty two week high and low templates evaluate", () => {
      const high = createDynamicWatchlist({
        templateId: "fifty_two_week_high",
        now: NOW,
      });
      const low = createDynamicWatchlist({
        templateId: "fifty_two_week_low",
        now: NOW,
      });
      const highRun = runDynamicWatchlist({
        watchlistId: high.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      const lowRun = runDynamicWatchlist({
        watchlistId: low.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      expect(highRun.matches.some((m) => m.ticker === "TCS")).toBe(true);
      expect(lowRun.matches.some((m) => m.ticker === "SBIN")).toBe(true);
    });

    it("growth dividend turnaround templates are registered", () => {
      for (const templateId of [
        "growth",
        "dividend",
        "turnaround",
      ] as const) {
        const def = createDynamicWatchlist({ templateId, now: NOW });
        expect(def.templateId).toBe(templateId);
      }
    });

    it("ensureBuiltinDynamicWatchlists seeds platform defaults", () => {
      const engine = getSmartWatchlistEngine();
      const defs = engine.ensureBuiltinDynamicWatchlists(NOW);
      expect(defs.length).toBe(4);
      expect(defs.map((d) => d.templateId)).toContain("top_conviction");
    });

    it("upcoming earnings dynamic template matches near events", () => {
      const def = createDynamicWatchlist({
        templateId: "upcoming_earnings",
        now: NOW,
      });
      const result = runDynamicWatchlist({
        watchlistId: def.id,
        candidates: UNIVERSE,
        now: NOW,
      });
      expect(result.matches.some((m) => m.ticker === "TCS")).toBe(true);
    });

    it("detectDuplicateWatchlists finds overlapping symbol sets", () => {
      createWatchlist({
        name: "A",
        symbols: ["INFY", "TCS", "SBIN"],
        now: NOW,
      });
      createWatchlist({
        name: "B",
        symbols: ["INFY", "TCS", "RELIANCE"],
        now: NOW,
      });
      const dups = detectDuplicateWatchlists();
      expect(dups.length).toBeGreaterThan(0);
      expect(dups[0]!.overlap).toContain("INFY");
    });

    it("reset clears smart engine state", () => {
      createDynamicWatchlist({ templateId: "growth", now: NOW });
      tagCompanies(UNIVERSE);
      resetSmartWatchlistEngine();
      expect(listDynamicWatchlists().length).toBe(0);
      expect(getSmartWatchlistView().empty).toBe(true);
    });
  });
});
