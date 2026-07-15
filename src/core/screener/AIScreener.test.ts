/**
 * Institutional AI Screener — unit tests (Sprint 9D.R1).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCREEN_ENGINE_EMPTY,
  SCREEN_TYPES,
  assertNoSentinelText,
  buildScreenSnapshot,
  clearCache,
  emptyScreenRunResults,
  emptyScreenSnapshot,
  getAIScreener,
  getMetrics,
  getResults,
  getScreen,
  listScreens,
  normalizeScreenMatch,
  registerAIScreener,
  registerBuiltinScreens,
  registerScreen,
  resetAIScreener,
  resolveScreenType,
  resolveScreenWeights,
  runScreen,
  safeScreenNumber,
  safeScreenText,
  setScreenEnabled,
  ScreenCache,
  ScreenMetricsTracker,
  ScreenRunner,
  type ScreenUniverseCandidate,
  type ScreenEngineScores,
} from "./index";

const UNIVERSE: ScreenUniverseCandidate[] = [
  {
    ticker: "RELIANCE",
    company: "Reliance Industries",
    sector: "Energy",
    industry: "Oil & Gas",
    price: 2800,
    marketCap: 1_800_000,
  },
  {
    ticker: "TCS",
    company: "Tata Consultancy Services",
    sector: "Technology",
    industry: "IT Services",
    price: 3800,
    marketCap: 1_400_000,
  },
  {
    ticker: "INFY",
    company: "Infosys",
    sector: "Technology",
    industry: "IT Services",
    price: 1600,
    marketCap: 660_000,
  },
];

const SCORES: ScreenEngineScores[] = [
  {
    ticker: "RELIANCE",
    aiScore: 82,
    trustScore: 75,
    validationScore: 70,
    confidence: 68,
    opportunityScore: 80,
    reasonSummary: "Strong momentum with institutional trust",
  },
  {
    ticker: "TCS",
    aiScore: 71,
    trustScore: 88,
    validationScore: 85,
    confidence: 80,
    opportunityScore: 65,
    reasonSummary: "Quality compounder",
  },
  {
    ticker: "INFY",
    aiScore: 40,
    trustScore: 50,
    validationScore: 45,
    confidence: 42,
    opportunityScore: 35,
    reasonSummary: "Below momentum threshold",
  },
];

describe("Institutional AI Screener (9D.R1)", () => {
  beforeEach(() => {
    resetAIScreener();
    registerAIScreener();
  });

  afterEach(() => {
    resetAIScreener();
  });

  describe("Registry", () => {
    it("registers builtin screens covering all screen types", () => {
      const result = registerBuiltinScreens();
      expect(result.total).toBeGreaterThanOrEqual(SCREEN_TYPES.length);
      const categories = new Set(listScreens().map((s) => s.category));
      for (const type of SCREEN_TYPES) {
        expect(categories.has(type)).toBe(true);
      }
    });

    it("registerScreen is idempotent without force", () => {
      const first = registerScreen({
        id: "custom-alpha",
        name: "Custom Alpha",
        description: "Test custom",
        category: "Custom",
        universe: "custom",
        rules: [],
        sortOrder: "aiScore",
        resultLimit: 10,
        cacheTtlMs: 1000,
      });
      expect(first.registered).toBe(true);

      const second = registerScreen({
        id: "custom-alpha",
        name: "Custom Alpha 2",
        description: "Should skip",
        category: "Custom",
        universe: "custom",
        rules: [],
        sortOrder: "aiScore",
        resultLimit: 10,
        cacheTtlMs: 1000,
      });
      expect(second.skipped).toBe(true);
      expect(getScreen("custom-alpha")?.name).toBe("Custom Alpha");
    });

    it("supports enable / disable", () => {
      registerScreen({
        id: "toggle-me",
        name: "Toggle",
        description: "",
        category: "Custom",
        universe: "nse-bse",
        rules: [],
        sortOrder: "aiScore",
        resultLimit: 5,
        cacheTtlMs: 1000,
      });
      expect(setScreenEnabled("toggle-me", false)?.enabled).toBe(false);
      expect(getScreen("toggle-me")?.enabled).toBe(false);
      expect(setScreenEnabled("toggle-me", true)?.enabled).toBe(true);
    });

    it("lists built-in vs custom origins", () => {
      registerScreen({
        id: "marketplace-ready",
        name: "Marketplace Ready",
        description: "",
        category: "Custom",
        universe: "custom",
        rules: [],
        sortOrder: "aiScore",
        resultLimit: 5,
        cacheTtlMs: 1000,
        origin: "marketplace",
      });
      expect(listScreens({ origin: "built-in" }).length).toBeGreaterThan(0);
      expect(listScreens({ origin: "marketplace" }).some((s) => s.id === "marketplace-ready")).toBe(
        true
      );
    });

    it("stores versioning fields on definitions", () => {
      const screen = getScreen("momentum-leaders");
      expect(screen?.version).toBeTruthy();
      expect(screen?.createdAt).toBeTruthy();
      expect(screen?.updatedAt).toBeTruthy();
    });
  });

  describe("Models", () => {
    it("resolves screen types and weights safely", () => {
      expect(resolveScreenType("Momentum")).toBe("Momentum");
      expect(resolveScreenType("Nope")).toBe("Custom");
      expect(resolveScreenWeights({ aiScore: 0.5 }).aiScore).toBe(0.5);
      expect(resolveScreenWeights({ aiScore: Number.NaN }).aiScore).toBeGreaterThan(0);
    });

    it("safeScreenText / safeScreenNumber never emit sentinels", () => {
      expect(safeScreenText(null, "—")).toBe("—");
      expect(safeScreenText("undefined", "—")).toBe("—");
      expect(safeScreenText("NaN", "—")).toBe("—");
      expect(safeScreenNumber(Number.NaN, 0)).toBe(0);
      expect(safeScreenNumber(undefined, 3)).toBe(3);
      expect(assertNoSentinelText("RELIANCE")).toBe(true);
      expect(assertNoSentinelText("null")).toBe(false);
    });

    it("normalizeScreenMatch fills empty fields without null/undefined/NaN strings", () => {
      const row = normalizeScreenMatch({
        ticker: "rel",
        company: null as unknown as string,
        sector: undefined,
        industry: "NaN",
        price: Number.NaN,
        aiScore: 70,
      });
      expect(row.ticker).toBe("REL");
      expect(row.company).toBe("—");
      expect(row.sector).toBe("—");
      expect(row.industry).toBe("—");
      expect(Number.isFinite(row.price)).toBe(true);
      expect(row.reasonSummary).not.toMatch(/null|undefined|NaN/);
    });
  });

  describe("Runner", () => {
    it("returns No Universe Selected when universe empty", () => {
      const snap = runScreen("momentum-leaders", { universe: [] });
      expect(snap.empty).toBe(true);
      expect(snap.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.noUniverseSelected);
    });

    it("filters by rules and ranks matches", () => {
      const snap = runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      expect(snap.empty).toBe(false);
      expect(snap.totalMatches).toBeGreaterThanOrEqual(1);
      expect(snap.results[0]?.rank).toBe(1);
      expect(snap.results.every((r) => r.aiScore >= 60)).toBe(true);
      expect(snap.results.some((r) => r.ticker === "INFY")).toBe(false);
    });

    it("returns No Matches when nothing passes filters", () => {
      const snap = runScreen("momentum-leaders", {
        universe: [{ ticker: "LOW" }],
        engineScores: [{ ticker: "LOW", aiScore: 10 }],
        force: true,
      });
      expect(snap.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.noMatches);
      expect(snap.results).toEqual([]);
    });

    it("returns Awaiting Scan for disabled / unknown screens", () => {
      setScreenEnabled("momentum-leaders", false);
      const disabled = runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      expect(disabled.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.awaitingScan);

      const unknown = runScreen("does-not-exist", { force: true });
      expect(unknown.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.awaitingScan);
    });

    it("composes trust and validation scores into results", () => {
      const snap = runScreen("quality-compounders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      expect(snap.results.length).toBeGreaterThan(0);
      const tcs = snap.results.find((r) => r.ticker === "TCS");
      expect(tcs?.trustScore).toBe(88);
      expect(tcs?.validationScore).toBe(85);
      expect(tcs?.reasonSummary).toBeTruthy();
    });
  });

  describe("Caching", () => {
    it("serves cached results on second run", () => {
      runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      const second = runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
      });
      expect(second.cacheHit).toBe(true);
      const metrics = getMetrics();
      expect(metrics.cacheHit).toBeGreaterThanOrEqual(1);
    });

    it("clearCache forces a miss on next run", () => {
      runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      clearCache("momentum-leaders");
      const next = runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
      });
      expect(next.cacheHit).toBe(false);
    });

    it("ScreenCache tracks hit/miss stats", () => {
      const cache = new ScreenCache();
      expect(cache.get("a", "1")).toBeNull();
      cache.set(
        "a",
        "1",
        emptyScreenRunResults("a", "A", SCREEN_ENGINE_EMPTY.noMatches),
        { ttlMs: 60_000 }
      );
      expect(cache.get("a", "1")?.screenId).toBe("a");
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.writes).toBe(1);
    });
  });

  describe("Metrics", () => {
    it("records symbols scanned, matches, scan time, confidence", () => {
      runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      const metrics = getMetrics();
      expect(metrics.symbolsScanned).toBe(UNIVERSE.length);
      expect(metrics.matches).toBeGreaterThan(0);
      expect(metrics.scanTimeMs).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheMiss).toBeGreaterThanOrEqual(1);
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.runs).toBe(1);
    });

    it("ScreenMetricsTracker resets cleanly", () => {
      const tracker = new ScreenMetricsTracker();
      tracker.recordScan({
        symbolsScanned: 10,
        matches: 2,
        scanTimeMs: 5,
        fromCache: false,
        averageConfidence: 50,
      });
      tracker.reset();
      expect(tracker.getMetrics().runs).toBe(0);
      expect(tracker.getMetrics().symbolsScanned).toBe(0);
    });
  });

  describe("Result generation & empty states", () => {
    it("getResults returns awaiting before any scan", () => {
      const results = getResults();
      expect(results.empty).toBe(true);
      expect(results.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.awaitingScan);
    });

    it("getResults returns last run after scan", () => {
      runScreen("momentum-leaders", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      const results = getResults("momentum-leaders");
      expect(results.empty).toBe(false);
      expect(results.totalMatches).toBe(results.results.length);
      for (const row of results.results) {
        expect(row.ticker).toBeTruthy();
        expect(assertNoSentinelText(row.company)).toBe(true);
        expect(Number.isFinite(row.aiScore)).toBe(true);
        expect(Number.isFinite(row.rank)).toBe(true);
      }
    });

    it("empty helpers emit institutional empty copy only", () => {
      expect(emptyScreenRunResults().emptyMessage).toBe(
        SCREEN_ENGINE_EMPTY.awaitingScan
      );
      expect(emptyScreenSnapshot(SCREEN_ENGINE_EMPTY.noMatches).emptyMessage).toBe(
        SCREEN_ENGINE_EMPTY.noMatches
      );
      const snap = buildScreenSnapshot({
        definition: null,
        run: emptyScreenRunResults("", "", SCREEN_ENGINE_EMPTY.noUniverseSelected),
        metrics: { symbolsScanned: 0, scanTimeMs: 0, cacheHit: false },
      });
      expect(snap.emptyMessage).toBe(SCREEN_ENGINE_EMPTY.noUniverseSelected);
    });
  });

  describe("Public API & regression", () => {
    it("exposes registerScreen / runScreen / getResults / getMetrics / clearCache", () => {
      expect(typeof registerScreen).toBe("function");
      expect(typeof runScreen).toBe("function");
      expect(typeof getResults).toBe("function");
      expect(typeof getMetrics).toBe("function");
      expect(typeof clearCache).toBe("function");
    });

    it("registerAIScreener is idempotent", () => {
      const first = registerAIScreener();
      expect(first.skipped).toBe(true); // already registered in beforeEach
      expect(first.integrations.opportunity).toBe(true);
      expect(first.integrations.trust).toBe(true);
      expect(first.integrations.filterEngine).toBe(true);
      const forced = registerAIScreener({ force: true });
      expect(forced.registered).toBe(true);
      const second = registerAIScreener();
      expect(second.skipped).toBe(true);
    });

    it("getAIScreener returns a ScreenRunner instance", () => {
      expect(getAIScreener()).toBeInstanceOf(ScreenRunner);
    });

    it("respects resultLimit from definition", () => {
      registerScreen(
        {
          id: "limit-two",
          name: "Limit Two",
          description: "",
          category: "Custom",
          universe: "custom",
          rules: [],
          sortOrder: "aiScore",
          resultLimit: 2,
          cacheTtlMs: 1000,
        },
        { force: true }
      );
      const snap = runScreen("limit-two", {
        universe: UNIVERSE,
        engineScores: SCORES,
        force: true,
      });
      expect(snap.results.length).toBeLessThanOrEqual(2);
    });

    it("never surfaces null/undefined/NaN in serialized result fields", () => {
      const snap = runScreen("swing-setups", {
        universe: [
          {
            ticker: "RELIANCE",
            company: undefined,
            sector: null,
            industry: "NaN",
            price: Number.NaN,
          },
        ],
        engineScores: [
          {
            ticker: "RELIANCE",
            aiScore: 90,
            trustScore: 90,
            validationScore: 90,
            confidence: 90,
          },
        ],
        force: true,
      });
      expect(snap.results.length).toBeGreaterThan(0);
      for (const row of snap.results) {
        expect(row.company).toBe("—");
        expect(row.sector).toBe("—");
        expect(row.industry).toBe("—");
        expect(Number.isNaN(row.price)).toBe(false);
        expect(assertNoSentinelText(row.reasonSummary)).toBe(true);
        expect(row.matchedRules.every((r) => assertNoSentinelText(r))).toBe(true);
      }
    });
  });
});
