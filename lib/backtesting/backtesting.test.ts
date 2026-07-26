import { describe, expect, it } from "vitest";
import {
  BacktestingFramework,
  createBacktestSession,
  createDatasetSlice,
  createEmptyDatasetQuality,
  createEntryRule,
  createStopLossRule,
  createTargetRule,
  evaluateRule,
  InMemoryBacktestSessionStore,
  markSessionRunning,
  runBacktestExecution,
  computeBacktestStatistics,
} from "@/lib/backtesting";
import type {
  BacktestConfiguration,
  HistoricalDatasetBundle,
} from "@/lib/backtesting";

function config(
  overrides: Partial<BacktestConfiguration> = {}
): BacktestConfiguration {
  return {
    strategyId: "swing_demo",
    strategyLabel: "Swing Demo",
    universe: { symbols: ["RELIANCE"], label: "Demo" },
    dateRange: {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-10T23:59:59.000Z",
      label: "Jan sample",
    },
    rules: [
      createEntryRule("entry_1", { bandBps: 100 }),
      createTargetRule("target_1"),
      createStopLossRule("stop_1"),
    ],
    initialCapital: 100_000,
    positionSize: 10,
    maxOpenPositions: 1,
    ...overrides,
  };
}

function sampleDataset(): HistoricalDatasetBundle {
  return {
    slice: createDatasetSlice({
      id: "slice_1",
      symbol: "RELIANCE",
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-05T00:00:00.000Z",
      quality: createEmptyDatasetQuality("fixture"),
    }),
    ohlcv: [
      {
        symbol: "RELIANCE",
        timestamp: "2026-01-02T10:00:00.000Z",
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1_000_000,
      },
      {
        symbol: "RELIANCE",
        timestamp: "2026-01-03T10:00:00.000Z",
        open: 100,
        high: 108,
        low: 100,
        close: 107,
        volume: 1_200_000,
      },
      {
        symbol: "RELIANCE",
        timestamp: "2026-01-04T10:00:00.000Z",
        open: 107,
        high: 110,
        low: 106,
        close: 109,
        volume: 900_000,
      },
    ],
    corporateActions: [],
    events: [],
    regimes: [],
    recommendations: [
      {
        recommendationId: "rec_1",
        symbol: "RELIANCE",
        company: "Reliance Industries",
        action: "BUY",
        entry: 100,
        stopLoss: 95,
        targets: [108, 112],
        asOf: "2026-01-02T09:00:00.000Z",
        marketRegime: "bull",
      },
    ],
    quality: {
      completeness: 100,
      gaps: 0,
      warnings: [],
      source: "fixture",
    },
  };
}

describe("backtest session engine", () => {
  it("creates queued sessions and transitions to running", () => {
    const session = createBacktestSession(config());
    expect(session.status).toBe("queued");
    expect(session.version).toBe(1);
    const running = markSessionRunning(session);
    expect(running.status).toBe("running");
    expect(running.startedAt).toBeTruthy();
  });
});

describe("rule engine", () => {
  it("evaluates entry / target / stop independently of strategy", () => {
    const entry = evaluateRule({
      rule: createEntryRule("e1", { entry: 100, bandBps: 50 }),
      market: {
        symbol: "X",
        asOf: "2026-01-01T00:00:00.000Z",
        price: 100.2,
      },
    });
    expect(entry.triggered).toBe(true);

    const target = evaluateRule({
      rule: createTargetRule("t1", { targets: [105] }),
      market: {
        symbol: "X",
        asOf: "2026-01-01T00:00:00.000Z",
        price: 104,
        high: 106,
      },
    });
    expect(target.triggered).toBe(true);
    expect(target.targetIndex).toBe(0);

    const stop = evaluateRule({
      rule: createStopLossRule("s1", { stopLoss: 95 }),
      market: {
        symbol: "X",
        asOf: "2026-01-01T00:00:00.000Z",
        price: 96,
        low: 94,
      },
    });
    expect(stop.triggered).toBe(true);
  });
});

describe("execution pipeline + analytics integration", () => {
  it("runs historical → entry → exit → metrics without duplicating formulas", () => {
    const session = createBacktestSession(config());
    const result = runBacktestExecution({
      session,
      dataset: sampleDataset(),
    });

    expect(result.session.status).toBe("completed");
    expect(result.trades.length).toBeGreaterThanOrEqual(1);
    const closed = result.trades.filter((t) => t.status === "closed");
    expect(closed.length).toBeGreaterThanOrEqual(1);
    expect(closed[0]?.hitTarget).toBe(true);

    const stats = computeBacktestStatistics(closed);
    expect(stats.totalTrades).toBe(closed.length);
    expect(stats.winRate).toBe(result.statistics.winRate);
    expect(result.frames.length).toBeGreaterThan(0);
  });
});

describe("session storage contracts", () => {
  it("saves, lists, compares, and deletes sessions", async () => {
    const store = new InMemoryBacktestSessionStore();
    const framework = new BacktestingFramework({ store });

    const a = await framework.createAndRun(config(), sampleDataset());
    const b = await framework.createAndRun(
      config({ strategyId: "alt", strategyLabel: "Alt" }),
      sampleDataset()
    );

    const listed = await framework.listSessions();
    expect(listed.length).toBe(2);

    const comparison = await store.compareSessions(a.session.id, b.session.id);
    expect(comparison).not.toBeNull();
    expect(comparison?.leftSessionId).toBe(a.session.id);

    await expect(store.deleteSession(a.session.id)).resolves.toBe(true);
    await expect(store.loadSession(a.session.id)).resolves.toBeNull();
  });
});
