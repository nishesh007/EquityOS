/**
 * Executive AI Screener Hub — regression & composition tests (Sprint 9D.R8).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createStrategy,
  discoverIdeas,
  exportExecutiveScreenerReport,
  getExecutiveScreenerSummary,
  getExecutiveScreenerView,
  getHomeScreenerStrip,
  getMetrics,
  isSprint9DFrozen,
  registerAIScreener,
  resetAIScreener,
  runMultiFactorScreen,
  saveScreen,
  type DiscoveryCandidate,
  type DiscoveryResult,
} from "../index";
import {
  EXECUTIVE_QUICK_ACTIONS,
  EXECUTIVE_SCREENER_EMPTY,
  SPRINT_9D_STATUS,
  assertNoSentinel,
  getExecutiveScreenerDashboard,
  resetExecutiveScreenerStack,
} from "./index";

const NOW = new Date("2026-07-16T06:00:00.000Z");

function makeCandidate(
  ticker: string,
  overrides: Partial<DiscoveryCandidate> = {}
): DiscoveryCandidate {
  return {
    ticker,
    company: `${ticker} Ltd`,
    sector: overrides.sector ?? "IT",
    industry: "Software",
    domain: "opportunity",
    tags: ["swing", "opportunity"],
    themeTags: ["it", "ai"],
    aiConviction: 82,
    opportunityScore: 78,
    trustScore: 74,
    validationScore: 72,
    confidence: 76,
    momentum: 70,
    technical: 68,
    growth: 72,
    quality: 70,
    risk: 55,
    fundamentalStrength: 70,
    liquidity: 65,
    sectorStrength: 68,
    themeStrength: 72,
    marketBreadth: 60,
    ...overrides,
  };
}

function runDiscovery(): DiscoveryResult {
  return discoverIdeas(
    [
      makeCandidate("TCS", { sector: "IT", aiConviction: 88 }),
      makeCandidate("INFY", { sector: "IT", aiConviction: 80 }),
      makeCandidate("RELIANCE", { sector: "Energy", aiConviction: 76 }),
      makeCandidate("HDFCBANK", { sector: "Banks", aiConviction: 70 }),
    ],
    { resultLimit: 8, minDiscoveryScore: 20 }
  );
}

describe("Executive AI Screener Hub (9D.R8)", () => {
  beforeEach(() => {
    resetAIScreener();
    resetExecutiveScreenerStack();
    registerAIScreener();
  });

  afterEach(() => {
    resetExecutiveScreenerStack();
    resetAIScreener();
  });

  describe("Empty states", () => {
    it("shows awaiting scan when empty", () => {
      const view = getExecutiveScreenerView({ now: NOW });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(EXECUTIVE_SCREENER_EMPTY.awaitingScan);
      expect(view.overview.emptyMessage).toBe(
        EXECUTIVE_SCREENER_EMPTY.awaitingScan
      );
      expect(view.homeStrip.emptyMessage).toBe(
        EXECUTIVE_SCREENER_EMPTY.awaitingScan
      );
    });

    it("never presents null undefined or NaN labels", () => {
      const view = getExecutiveScreenerView({ now: NOW });
      for (const card of view.overview.cards) {
        expect(assertNoSentinel(card.value)).not.toMatch(/null|undefined|NaN/i);
        expect(assertNoSentinel(card.label)).toBeTruthy();
      }
      expect(assertNoSentinel(view.homeStrip.executiveSummary)).toBeTruthy();
    });

    it("exposes empty messaging constants", () => {
      expect(EXECUTIVE_SCREENER_EMPTY.noScreeningResults).toBe(
        "No Screening Results"
      );
      expect(EXECUTIVE_SCREENER_EMPTY.noSavedStrategies).toBe(
        "No Saved Strategies"
      );
      expect(EXECUTIVE_SCREENER_EMPTY.noOpportunities).toBe("No Opportunities");
      expect(EXECUTIVE_SCREENER_EMPTY.noResearch).toBe("No Research");
    });
  });

  describe("Executive overview & metrics", () => {
    it("summarizes health, institutional score, and coverage from composed input", () => {
      const discovery = runDiscovery();
      createStrategy({
        id: "exec-strat-1",
        name: "Momentum Leaders",
        description: "R8 test strategy",
      });
      saveScreen({
        id: "saved-exec-1",
        name: "High Conviction Scan",
        topTickers: ["TCS", "INFY"],
        institutionalScores: {
          institutional: 81,
          trust: 78,
          validation: 76,
          momentum: 70,
          growth: 72,
          quality: 74,
          risk: 40,
          aiConviction: 84,
        },
        trustAvg: 78,
        validationAvg: 76,
      });

      const view = getExecutiveScreenerView({
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 100,
          matches: 28,
          scanTimeMs: 12,
          cacheHit: 3,
          cacheMiss: 1,
          averageConfidence: 71,
          runs: 4,
          lastScanAt: NOW.toISOString(),
        },
        universeSize: 100,
      });

      expect(view.empty).toBe(false);
      expect(view.overview.cards.length).toBeGreaterThanOrEqual(12);
      expect(view.overview.institutionalScore).toBeGreaterThan(0);
      expect(view.overview.universeCoverage).toBeGreaterThan(0);
      expect(view.overview.screenSuccessRate).toBeGreaterThan(0);
      expect(view.overview.opportunityCount).toBeGreaterThan(0);
      expect(view.health.overallHealthScore).toBeGreaterThan(0);
      expect(view.health.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it("counts strategies and saved screens in rankings", () => {
      createStrategy({
        id: "exec-strat-2",
        name: "Quality Compounders",
        description: "R8",
      });
      saveScreen({
        id: "saved-exec-2",
        name: "Portfolio Screen",
        topTickers: ["HDFCBANK"],
        institutionalScores: {
          institutional: 70,
          trust: 68,
          validation: 66,
          momentum: 60,
          growth: 62,
          quality: 75,
          risk: 35,
          aiConviction: 72,
        },
        trustAvg: 68,
        validationAvg: 66,
        favorite: true,
      });

      const view = getExecutiveScreenerView({
        now: NOW,
        operational: {
          symbolsScanned: 10,
          matches: 3,
          scanTimeMs: 5,
          cacheHit: 0,
          cacheMiss: 1,
          averageConfidence: 60,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      });

      expect(view.topStrategies.length).toBeGreaterThan(0);
      expect(view.topSavedScreens.length).toBeGreaterThan(0);
      expect(view.topSavedScreens[0]?.label).toContain("Portfolio");
    });
  });

  describe("Dashboard composition", () => {
    it("surfaces top ideas, discoveries, sectors, and quick actions", () => {
      const discovery = runDiscovery();
      const view = getExecutiveScreenerView({
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 40,
          matches: 12,
          scanTimeMs: 8,
          cacheHit: 1,
          cacheMiss: 1,
          averageConfidence: 68,
          runs: 2,
          lastScanAt: NOW.toISOString(),
        },
      });

      expect(view.topInstitutionalIdeas.length).toBeGreaterThan(0);
      expect(view.recentDiscoveries.length).toBeGreaterThan(0);
      expect(view.quickActions).toEqual([...EXECUTIVE_QUICK_ACTIONS]);
      expect(view.quickActions).toContain("run_screen");
      expect(view.quickActions).toContain("export");
      expect(view.sectorRotation.empty).toBe(false);
    });

    it("builds home strip with executive summary and opportunity labels", () => {
      const discovery = runDiscovery();
      const options = {
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 20,
          matches: 6,
          scanTimeMs: 4,
          cacheHit: 0,
          cacheMiss: 1,
          averageConfidence: 65,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      };
      const strip = getHomeScreenerStrip(options);
      expect(strip.empty).toBe(false);
      expect(strip.executiveSummary).not.toBe(
        EXECUTIVE_SCREENER_EMPTY.awaitingScan
      );
      expect(strip.todaysBestOpportunities).not.toMatch(/null|NaN/i);
      expect(getExecutiveScreenerSummary(options)).toBe(strip.executiveSummary);
    });
  });

  describe("Reports & export", () => {
    it("builds executive report with toc and sections", () => {
      const discovery = runDiscovery();
      const view = getExecutiveScreenerView({
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 50,
          matches: 15,
          scanTimeMs: 9,
          cacheHit: 2,
          cacheMiss: 1,
          averageConfidence: 70,
          runs: 3,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(view.report.empty).toBe(false);
      expect(view.report.tableOfContents.length).toBeGreaterThan(0);
      expect(view.report.sections.length).toBeGreaterThan(0);
      expect(view.report.markdown).toContain("Executive Screener Report");
      expect(view.report.printLayout).toContain("EXECUTIVE SCREENER REPORT");
    });

    it("exports markdown via Sprint 9F ACL-aware exporter", () => {
      const discovery = runDiscovery();
      const result = exportExecutiveScreenerReport("MARKDOWN", {
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 50,
          matches: 15,
          scanTimeMs: 9,
          cacheHit: 2,
          cacheMiss: 1,
          averageConfidence: 70,
          runs: 3,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(result.ok).toBe(true);
      expect(result.format).toBe("MARKDOWN");
      expect(result.content.length).toBeGreaterThan(20);
      expect(result.filename).toMatch(/\.md$/i);
    });

    it("exports print layout", () => {
      const discovery = runDiscovery();
      const result = exportExecutiveScreenerReport("PRINT", {
        now: NOW,
        discovery,
        operational: {
          symbolsScanned: 30,
          matches: 10,
          scanTimeMs: 6,
          cacheHit: 1,
          cacheMiss: 1,
          averageConfidence: 66,
          runs: 2,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(result.ok).toBe(true);
      expect(result.format).toBe("PRINT");
      expect(result.content.length).toBeGreaterThan(10);
    });

    it("supports preview mode and subscriber ACL denial path", () => {
      const discovery = runDiscovery();
      const preview = getExecutiveScreenerView({
        now: NOW,
        discovery,
        previewMode: true,
        operational: {
          symbolsScanned: 30,
          matches: 10,
          scanTimeMs: 6,
          cacheHit: 1,
          cacheMiss: 1,
          averageConfidence: 66,
          runs: 2,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(preview.report.previewMode).toBe(true);
      expect(preview.report.title).toContain("Preview");

      const denied = getExecutiveScreenerDashboard().exportMarkdown(
        {
          now: NOW,
          discovery,
          operational: {
            symbolsScanned: 30,
            matches: 10,
            scanTimeMs: 6,
            cacheHit: 1,
            cacheMiss: 1,
            averageConfidence: 66,
            runs: 2,
            lastScanAt: NOW.toISOString(),
          },
        },
        {
          userId: "guest",
          role: "free",
          subscriptionTier: "none",
        }
      );
      expect(denied.ok).toBe(false);
      expect(denied.deniedReason.length).toBeGreaterThan(0);
      expect(denied.previewOnly || denied.upgradeRequired).toBe(true);
    });
  });

  describe("Performance, caching & freeze", () => {
    it("composes quickly and reuses operational metrics", () => {
      runMultiFactorScreen({
        universe: [
          { ticker: "TCS", metrics: { rsi: 55 } },
          { ticker: "INFY", metrics: { rsi: 48 } },
        ],
        resultLimit: 2,
      });
      const start = Date.now();
      const view = getExecutiveScreenerView({
        now: NOW,
        discovery: runDiscovery(),
        operational: getMetrics(),
      });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(view.sprintFrozen).toBe(true);
      expect(isSprint9DFrozen()).toBe(true);
      expect(SPRINT_9D_STATUS.frozen).toBe(true);
      expect(SPRINT_9D_STATUS.complete).toBe(true);
    });

    it("reset stack clears executive singleton without throwing", () => {
      getExecutiveScreenerView({ now: NOW });
      resetExecutiveScreenerStack();
      expect(() => getExecutiveScreenerView({ now: NOW })).not.toThrow();
    });
  });

  describe("Research empty state", () => {
    it("shows no research when bridge targets absent", () => {
      const view = getExecutiveScreenerView({
        now: NOW,
        discovery: runDiscovery(),
        research: [],
        operational: {
          symbolsScanned: 20,
          matches: 5,
          scanTimeMs: 4,
          cacheHit: 0,
          cacheMiss: 1,
          averageConfidence: 60,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(view.recentResearch).toEqual([]);
      const researchSection = view.report.sections.find((s) => s.id === "ideas");
      expect(researchSection).toBeTruthy();
    });
  });

  describe("Presentation & caching regression", () => {
    it("presentation helpers never emit sentinel strings", () => {
      expect(assertNoSentinel("null")).toBe("—");
      expect(assertNoSentinel("undefined")).toBe("—");
      expect(assertNoSentinel("NaN")).toBe("—");
      expect(assertNoSentinel("Healthy")).toBe("Healthy");
    });

    it("no strategies ranking stays empty without creating noise", () => {
      const view = getExecutiveScreenerView({
        now: NOW,
        strategies: [],
        operational: {
          symbolsScanned: 10,
          matches: 2,
          scanTimeMs: 3,
          cacheHit: 0,
          cacheMiss: 1,
          averageConfidence: 55,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(view.topStrategies).toEqual([]);
      const strategiesSection = view.report.sections.find(
        (s) => s.id === "strategies"
      );
      expect(strategiesSection?.body.join(" ")).toContain(
        EXECUTIVE_SCREENER_EMPTY.noSavedStrategies
      );
    });

    it("PDF export is ACL-gated and returns a payload when allowed", () => {
      const result = exportExecutiveScreenerReport("PDF", {
        now: NOW,
        discovery: runDiscovery(),
        operational: {
          symbolsScanned: 40,
          matches: 12,
          scanTimeMs: 7,
          cacheHit: 1,
          cacheMiss: 1,
          averageConfidence: 68,
          runs: 2,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(result.ok).toBe(true);
      expect(result.format).toBe("PDF");
      expect(result.filename).toMatch(/\.pdf$/i);
    });

    it("repeat getView is stable for same operational snapshot (cache-friendly)", () => {
      const options = {
        now: NOW,
        discovery: runDiscovery(),
        operational: {
          symbolsScanned: 25,
          matches: 8,
          scanTimeMs: 5,
          cacheHit: 4,
          cacheMiss: 1,
          averageConfidence: 67,
          runs: 2,
          lastScanAt: NOW.toISOString(),
        },
      };
      const a = getExecutiveScreenerView(options);
      const b = getExecutiveScreenerView(options);
      expect(a.health.overallHealthScore).toBe(b.health.overallHealthScore);
      expect(a.overview.opportunityCount).toBe(b.overview.opportunityCount);
      expect(a.report.tableOfContents).toEqual(b.report.tableOfContents);
    });

    it("wires research bridge items into recent research ranking", () => {
      const view = getExecutiveScreenerView({
        now: NOW,
        discovery: runDiscovery(),
        research: [
          {
            ticker: "TCS",
            intent: "Company Research",
            path: "/company/TCS",
            label: "TCS Research",
            empty: false,
            emptyMessage: "Awaiting First Scan",
          },
        ],
        operational: {
          symbolsScanned: 15,
          matches: 4,
          scanTimeMs: 3,
          cacheHit: 0,
          cacheMiss: 1,
          averageConfidence: 62,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(view.recentResearch.length).toBe(1);
      expect(view.recentResearch[0]?.label).toContain("TCS");
    });

    it("home strip exposes theme and sector summary fields", () => {
      const strip = getHomeScreenerStrip({
        now: NOW,
        discovery: runDiscovery(),
        operational: {
          symbolsScanned: 18,
          matches: 5,
          scanTimeMs: 4,
          cacheHit: 1,
          cacheMiss: 0,
          averageConfidence: 64,
          runs: 1,
          lastScanAt: NOW.toISOString(),
        },
      });
      expect(strip.themeSummary).toBeTruthy();
      expect(strip.sectorSummary).toBeTruthy();
      expect(strip.institutionalActivity).toBeTruthy();
      expect(strip.opportunityCount).toBeGreaterThan(0);
    });
  });
});
