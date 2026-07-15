/**
 * Institutional Screener Workspace — tests (Sprint 9D.R7).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  WORKSPACE_EMPTY,
  assertNoSentinelText,
  archiveRun,
  compareScreens,
  compareRuns,
  compareStrategies,
  deleteRun,
  duplicateRun,
  emptySavedScreenRecord,
  emptyScreenComparisonResult,
  emptyWorkspaceView,
  getTimeline,
  listHistory,
  listSavedScreens,
  loadScreen,
  normalizeComparisonTickerDelta,
  normalizeSavedScreenRecord,
  normalizeScreenTimelineEntry,
  openResearch,
  portfolioVsMarket,
  recordRun,
  registerAIScreener,
  reloadRun,
  resetScreenWorkspace,
  saveScreen,
  archiveScreen,
  favoriteScreen,
  getWorkspaceView,
  pinScreen,
  watchlistVsMarket,
  compareScreens as compareScreensPublic,
  listSavedScreens as listSavedScreensPublic,
  loadScreen as loadScreenPublic,
  openResearch as openResearchPublic,
  getTimeline as getTimelinePublic,
  saveScreen as saveScreenPublic,
} from "../index";
import {
  normalizeInstitutionalScoresSummary,
  normalizeResearchBridgeTarget,
  normalizeScoreDelta,
} from "./WorkspacePresentationModels";
import { ScreenWorkspace } from "./ScreenWorkspace";

describe("Sprint 9D.R7 — Institutional Screener Workspace", () => {
  beforeEach(() => {
    resetScreenWorkspace();
    registerAIScreener({ force: true });
  });

  afterEach(() => {
    resetScreenWorkspace();
  });

  it("workspace view is empty before first scan", () => {
    const view = getWorkspaceView();
    expect(view.empty).toBe(true);
    expect(view.emptyMessage).toBe(WORKSPACE_EMPTY.awaitingFirstScan);
    expect(view.savedResults).toEqual([]);
    expect(emptyWorkspaceView().emptyMessage).toBe(
      WORKSPACE_EMPTY.awaitingFirstScan
    );
  });

  it("workspace view populates after saveScreen", () => {
    saveScreen({
      name: "Momentum Leaders",
      topTickers: ["HAL", "BEL"],
      trustAvg: 80,
      validationAvg: 75,
      tags: ["momentum"],
      institutionalScores: { institutional: 82, trust: 80, validation: 75 },
    });
    const view = getWorkspaceView();
    expect(view.empty).toBe(false);
    expect(view.savedResults.length).toBeGreaterThanOrEqual(1);
    expect(view.recentScreens.length).toBeGreaterThanOrEqual(1);
    expect(view.recentActivity.some((a) => a.action === "save_screen")).toBe(
      true
    );
  });

  it("saveScreen / loadScreen / listSavedScreens round-trip", () => {
    const saved = saveScreen({
      id: "screen-alpha",
      name: "Alpha Screen",
      strategyId: "strat-1",
      screenId: "multi-factor",
      topTickers: ["INFY", "TCS"],
      trustAvg: 70,
      validationAvg: 68,
      origin: "strategy",
    });
    expect(saved.id).toBe("screen-alpha");
    expect(saved.empty).toBe(false);
    expect(loadScreen("screen-alpha")?.name).toBe("Alpha Screen");
    expect(listSavedScreens().map((s) => s.id)).toContain("screen-alpha");
  });

  it("history record / reload / duplicate / archive / delete", () => {
    const run = recordRun({
      topResults: ["HAL", "BEL"],
      trustAvg: 88,
      validationAvg: 84,
      executionTimeMs: 120,
      strategyId: "strat-1",
      labels: ["live"],
    });
    expect(run.empty).toBe(false);
    expect(listHistory().length).toBe(1);

    const reloaded = reloadRun(run.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.labels).toContain("reloaded");
    expect(listHistory().length).toBe(2);

    const dup = duplicateRun(run.id);
    expect(dup).not.toBeNull();
    expect(dup!.labels).toContain("duplicate");

    const archived = archiveRun(run.id, true);
    expect(archived?.archived).toBe(true);
    expect(listHistory().every((r) => r.id !== run.id)).toBe(true);
    expect(listHistory({ includeArchived: true }).some((r) => r.id === run.id)).toBe(
      true
    );

    expect(deleteRun(run.id)).toBe(true);
    expect(listHistory({ includeArchived: true }).some((r) => r.id === run.id)).toBe(
      false
    );
  });

  it("comparison identifies winners / losers / unchanged", () => {
    const result = compareScreens(
      {
        label: "Left",
        tickers: [
          { ticker: "HAL", score: 70 },
          { ticker: "BEL", score: 80 },
          { ticker: "INFY", score: 60 },
        ],
      },
      {
        label: "Right",
        tickers: [
          { ticker: "HAL", score: 85 },
          { ticker: "BEL", score: 70 },
          { ticker: "INFY", score: 60 },
        ],
      }
    );
    expect(result.empty).toBe(false);
    expect(result.winners.map((w) => w.ticker)).toContain("HAL");
    expect(result.losers.map((l) => l.ticker)).toContain("BEL");
    expect(result.unchanged.map((u) => u.ticker)).toContain("INFY");
    expect(result.summary).toContain("improved");
  });

  it("timeline Improved / Declined / Unchanged", () => {
    const entries = getTimeline("HAL", [
      {
        institutionalScore: 70,
        trust: 80,
        validation: 75,
        momentum: 60,
        growth: 50,
        quality: 70,
        risk: 40,
        aiConviction: 65,
      },
      {
        institutionalScore: 85,
        trust: 70,
        validation: 75,
        momentum: 60,
        growth: 55,
        quality: 70,
        risk: 35,
        aiConviction: 70,
      },
    ]);
    const byMetric = Object.fromEntries(entries.map((e) => [e.metric, e]));
    expect(byMetric["Institutional Score"].status).toBe("Improved");
    expect(byMetric.Trust.status).toBe("Declined");
    expect(byMetric.Validation.status).toBe("Unchanged");
    expect(byMetric.Momentum.status).toBe("Unchanged");
    expect(byMetric["AI Conviction"].status).toBe("Improved");
    expect(byMetric["Institutional Score"].drivers.length).toBeGreaterThan(0);
  });

  it("openResearch returns deep-link targets", () => {
    const company = openResearch("hal") as ReturnType<typeof normalizeResearchBridgeTarget>;
    expect(company.empty).toBe(false);
    expect(company.ticker).toBe("HAL");
    expect(company.path).toBe("/company/HAL");
    expect(company.intent).toBe("Company Research");

    const report = openResearch("INFY", {
      intent: "AI Research Report",
    }) as ReturnType<typeof normalizeResearchBridgeTarget>;
    expect(report.path).toContain("/ai/research");
    expect(report.path).toContain("INFY");

    const all = openResearch("TCS", { all: true });
    expect(Array.isArray(all)).toBe(true);
    expect((all as unknown[]).length).toBeGreaterThanOrEqual(9);
    const paths = (all as Array<{ path: string }>).map((t) => t.path);
    expect(paths.some((p) => p.includes("/opportunities"))).toBe(true);
    expect(paths.some((p) => p.includes("/results"))).toBe(true);
  });

  it("favorite / pin / archive update saved screen flags", () => {
    saveScreen({ id: "flags-1", name: "Flags", topTickers: ["HAL"] });
    expect(favoriteScreen("flags-1")?.favorite).toBe(true);
    expect(pinScreen("flags-1")?.pinned).toBe(true);
    expect(archiveScreen("flags-1")?.archived).toBe(true);
    expect(listSavedScreens()).toHaveLength(0);
    expect(listSavedScreens({ includeArchived: true })[0].archived).toBe(true);
    const view = getWorkspaceView();
    expect(view.favorites.length + view.pinned.length).toBeGreaterThanOrEqual(0);
  });

  it("presentation normalize rejects null / undefined / NaN sentinels", () => {
    const scores = normalizeInstitutionalScoresSummary({
      institutional: Number.NaN,
      trust: undefined,
      validation: null as unknown as number,
      momentum: Number.NaN,
    });
    expect(scores.institutional).toBe(0);
    expect(scores.trust).toBe(0);
    expect(scores.validation).toBe(0);
    expect(Number.isNaN(scores.momentum)).toBe(false);

    const record = normalizeSavedScreenRecord({
      id: "x",
      name: "undefined",
      runAt: null as unknown as string,
      trustAvg: Number.NaN,
      topTickers: [null as unknown as string, "hal"],
      empty: false,
    });
    assertNoSentinelText(record.name);
    assertNoSentinelText(record.runAt);
    expect(record.trustAvg).toBe(0);
    expect(record.topTickers).toEqual(["HAL"]);

    const delta = normalizeComparisonTickerDelta({
      ticker: "nan",
      leftScore: Number.NaN,
      rightScore: undefined,
      delta: null as unknown as number,
    });
    expect(delta.ticker).toBe("NAN");
    expect(delta.status).toBe("Unchanged");

    const timeline = normalizeScreenTimelineEntry({
      ticker: "HAL",
      metric: "Trust",
      previous: Number.NaN,
      current: 10,
      empty: false,
    });
    expect(timeline.previous).toBe(0);
    expect(timeline.status).toBe("Improved");
    expect(normalizeScoreDelta("Improved")).toBe("Improved");
    expect(normalizeScoreDelta(undefined, -3)).toBe("Declined");
  });

  it("empty states match WORKSPACE_EMPTY constants", () => {
    expect(WORKSPACE_EMPTY.noSavedScreens).toBe("No Saved Screens");
    expect(WORKSPACE_EMPTY.noHistory).toBe("No History");
    expect(WORKSPACE_EMPTY.noComparisons).toBe("No Comparisons");
    expect(WORKSPACE_EMPTY.awaitingFirstScan).toBe("Awaiting First Scan");
    expect(emptySavedScreenRecord().emptyMessage).toBe(
      WORKSPACE_EMPTY.noSavedScreens
    );
    expect(emptyScreenComparisonResult().emptyMessage).toBe(
      WORKSPACE_EMPTY.noComparisons
    );
  });

  it("public AIScreener workspace APIs are functions", () => {
    expect(typeof saveScreenPublic).toBe("function");
    expect(typeof loadScreenPublic).toBe("function");
    expect(typeof listSavedScreensPublic).toBe("function");
    expect(typeof compareScreensPublic).toBe("function");
    expect(typeof openResearchPublic).toBe("function");
    expect(typeof getTimelinePublic).toBe("function");
    expect(typeof favoriteScreen).toBe("function");
    expect(typeof archiveScreen).toBe("function");
    expect(typeof pinScreen).toBe("function");
    expect(typeof getWorkspaceView).toBe("function");
  });

  it("public APIs never throw on bad input", () => {
    expect(() => saveScreenPublic({ name: null })).not.toThrow();
    expect(loadScreenPublic("missing")).toBeNull();
    expect(Array.isArray(listSavedScreensPublic())).toBe(true);
    expect(compareScreensPublic({}, {}).empty).toBe(true);
    expect(
      (openResearchPublic("") as { empty: boolean }).empty
    ).toBe(true);
    expect(getTimelinePublic("", []).length).toBeGreaterThan(0);
    expect(favoriteScreen("missing")).toBeNull();
    expect(archiveScreen("missing")).toBeNull();
  });

  it("ScreenWorkspace class orchestrates compare + research + timeline", () => {
    const ws = new ScreenWorkspace();
    const saved = ws.saveScreen({
      name: "Class Screen",
      topTickers: ["RELIANCE"],
    });
    expect(ws.loadScreen(saved.id)?.name).toBe("Class Screen");
    const cmp = ws.compareScreens(
      { tickers: [{ ticker: "RELIANCE", score: 50 }] },
      { tickers: [{ ticker: "RELIANCE", score: 70 }] }
    );
    expect(cmp.winners[0]?.ticker).toBe("RELIANCE");
    const research = ws.openResearch("RELIANCE", {
      intent: "Opportunity Page",
    }) as { path: string };
    expect(research.path).toContain("/opportunities");
    const timeline = ws.getTimeline("RELIANCE", [
      { institutionalScore: 40 },
      { institutionalScore: 55 },
    ]);
    expect(timeline.some((e) => e.status === "Improved")).toBe(true);
  });

  it("resetScreenWorkspace clears saved + history", () => {
    saveScreen({ name: "Temp", topTickers: ["X"] });
    recordRun({ topResults: ["X"], executionTimeMs: 1 });
    expect(listSavedScreens().length).toBe(1);
    expect(listHistory().length).toBe(1);
    resetScreenWorkspace();
    expect(listSavedScreens()).toEqual([]);
    expect(listHistory()).toEqual([]);
    expect(getWorkspaceView().empty).toBe(true);
  });

  it("regression: shared templates compose without crashing workspace view", () => {
    registerAIScreener({ force: true });
    const view = getWorkspaceView();
    expect(view.sharedTemplates).toBeDefined();
    expect(Array.isArray(view.sharedTemplates)).toBe(true);
  });

  it("regression: ranking-style score deltas preserve ticker casing safety", () => {
    const result = compareScreens(
      { scores: { hal: 10, bel: 20 } },
      { scores: { HAL: 30, bel: 15 } }
    );
    expect(result.winners.find((w) => w.ticker === "HAL")?.delta).toBe(20);
    expect(result.losers.find((l) => l.ticker === "BEL")?.status).toBe(
      "Declined"
    );
  });

  it("recent / pinned / favorite list helpers via listSavedScreens filters", () => {
    saveScreen({ id: "r1", name: "R1", pinned: true });
    saveScreen({ id: "r2", name: "R2", favorite: true });
    saveScreen({ id: "r3", name: "R3" });
    expect(listSavedScreens({ pinnedOnly: true }).map((s) => s.id)).toEqual([
      "r1",
    ]);
    expect(listSavedScreens({ favoriteOnly: true }).map((s) => s.id)).toEqual([
      "r2",
    ]);
    expect(listSavedScreens({ recentOnly: true }).length).toBeGreaterThanOrEqual(
      3
    );
  });

  it("portfolioVsMarket style comparison via compareScreens labels", () => {
    const result = compareScreens(
      { label: "Market", tickers: [{ ticker: "NIFTY", score: 50 }] },
      { label: "Portfolio", tickers: [{ ticker: "NIFTY", score: 65 }] }
    );
    expect(result.leftLabel).toBe("Market");
    expect(result.rightLabel).toBe("Portfolio");
    expect(result.winners).toHaveLength(1);
  });

  it("timeline awaiting first scan when insufficient snapshots", () => {
    const entries = getTimeline("HAL", [{ institutionalScore: 50 }]);
    expect(entries[0].empty).toBe(true);
    expect(entries[0].emptyMessage).toBe(WORKSPACE_EMPTY.awaitingFirstScan);
  });

  it("research bridge intents cover institutional destinations", () => {
    const all = openResearch("SBIN", { all: true }) as Array<{
      intent: string;
      path: string;
    }>;
    const intents = all.map((t) => t.intent);
    expect(intents).toContain("Validation Report");
    expect(intents).toContain("Trust Report");
    expect(intents).toContain("Earnings History");
    expect(intents).toContain("Alert History");
    expect(intents).toContain("Institutional Notes");
  });

  it("saved payload stores institutional score summary metadata", () => {
    const saved = saveScreen({
      name: "Meta",
      topTickers: ["HDFCBANK"],
      institutionalScores: {
        institutional: 77,
        trust: 71,
        validation: 69,
        momentum: 66,
        growth: 64,
        quality: 72,
        risk: 58,
        aiConviction: 74,
      },
      tags: ["banks"],
      origin: "institutional",
    });
    expect(saved.institutionalScores.institutional).toBe(77);
    expect(saved.institutionalScores.aiConviction).toBe(74);
    expect(saved.origin).toBe("institutional");
    expect(saved.tags).toContain("banks");
  });

  it("history getRun returns recorded payload", () => {
    const run = recordRun({
      marketSnapshot: "bullish",
      sectorSnapshot: "banks-lead",
      topResults: ["HDFCBANK", "ICICIBANK"],
      executionTimeMs: 45,
      screenId: "opportunity",
    });
    const loaded = listHistory().find((r) => r.id === run.id);
    expect(loaded?.marketSnapshot).toBe("bullish");
    expect(loaded?.sectorSnapshot).toBe("banks-lead");
    expect(loaded?.topResults).toContain("HDFCBANK");
  });

  it("empty comparison when both sides have no tickers", () => {
    const result = compareScreens({ label: "A" }, { label: "B" });
    expect(result.empty).toBe(true);
    expect(result.emptyMessage).toBe(WORKSPACE_EMPTY.noComparisons);
  });

  it("activity log captures pin / favorite / archive", () => {
    const saved = saveScreen({ id: "act-1", name: "Activity Screen" });
    favoriteScreen(saved.id);
    pinScreen(saved.id);
    archiveScreen(saved.id);
    const actions = getWorkspaceView().recentActivity.map((a) => a.action);
    expect(actions).toContain("favorite_screen");
    expect(actions).toContain("pin_screen");
    expect(actions).toContain("archive_screen");
  });

  it("compareRuns / compareStrategies / portfolioVsMarket helpers", () => {
    const left = { tickers: [{ ticker: "A", score: 40 }] };
    const right = { tickers: [{ ticker: "A", score: 55 }] };
    expect(compareRuns(left, right).winners).toHaveLength(1);
    expect(compareStrategies(left, right).rightLabel).toBe("Strategy B");
    expect(portfolioVsMarket(right, left).leftLabel).toBe("Market");
    expect(watchlistVsMarket(right, left).rightLabel).toBe("Watchlist");
  });

  it("registerAIScreener then workspace public APIs stay callable", () => {
    registerAIScreener({ force: true });
    const saved = saveScreenPublic({
      name: "API Regression",
      topTickers: ["LT"],
    });
    expect(saved.empty).toBe(false);
    expect(loadScreenPublic(saved.id)?.topTickers).toContain("LT");
    expect(listSavedScreensPublic().length).toBeGreaterThanOrEqual(1);
  });
});
