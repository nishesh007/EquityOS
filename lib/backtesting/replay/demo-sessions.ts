/**
 * Deterministic demo replay sessions for Sprint 11B.2.
 * Fixed timestamps/prices — same process always yields the same replay.
 */

import {
  createEntryRule,
  createStopLossRule,
  createTargetRule,
} from "@/lib/backtesting/rules";
import { computeBacktestStatistics } from "@/lib/backtesting/metrics";
import { createDatasetSlice } from "@/lib/backtesting/dataset";
import type { HistoricalDatasetBundle } from "@/lib/backtesting/dataset/types";
import type {
  BacktestSession,
  BacktestTrade,
} from "@/lib/backtesting/types";
import { buildReplayBundle, type ReplayBundle } from "@/lib/backtesting/replay/engine";

function sessionBase(
  partial: Omit<BacktestSession, "summary" | "trades" | "version" | "updatedAt"> & {
    trades: BacktestTrade[];
  }
): BacktestSession {
  const statistics = computeBacktestStatistics(partial.trades);
  return {
    ...partial,
    updatedAt: partial.createdAt,
    version: 1,
    summary: {
      tradeCount: partial.trades.length,
      openCount: partial.trades.filter((t) => t.status === "open").length,
      closedCount: partial.trades.filter((t) => t.status === "closed").length,
      skippedCount: 0,
      statistics,
      notes: ["Deterministic demo session for Historical Replay Center"],
    },
  };
}

const RELIANCE_BARS = [
  ["2026-01-02T03:45:00.000Z", 2480, 2495, 2470, 2488, 2_100_000],
  ["2026-01-03T03:45:00.000Z", 2488, 2510, 2482, 2502, 2_400_000],
  ["2026-01-06T03:45:00.000Z", 2502, 2525, 2495, 2518, 2_200_000],
  ["2026-01-07T03:45:00.000Z", 2518, 2548, 2510, 2540, 2_800_000],
  ["2026-01-08T03:45:00.000Z", 2540, 2555, 2528, 2532, 2_500_000],
  ["2026-01-09T03:45:00.000Z", 2532, 2568, 2525, 2560, 3_100_000],
  ["2026-01-10T03:45:00.000Z", 2560, 2575, 2548, 2555, 2_700_000],
  ["2026-01-13T03:45:00.000Z", 2555, 2588, 2550, 2580, 2_900_000],
  ["2026-01-14T03:45:00.000Z", 2580, 2595, 2568, 2572, 2_600_000],
  ["2026-01-15T03:45:00.000Z", 2572, 2610, 2565, 2604, 3_400_000],
] as const;

function ohlcvFromTuple(
  symbol: string,
  row: readonly [string, number, number, number, number, number]
) {
  const [timestamp, open, high, low, close, volume] = row;
  return { symbol, timestamp, open, high, low, close, volume };
}

function relianceDataset(): HistoricalDatasetBundle {
  const ohlcv = RELIANCE_BARS.map((row) => ohlcvFromTuple("RELIANCE", row));
  return {
    slice: createDatasetSlice({
      id: "demo_reliance_jan2026",
      symbol: "RELIANCE",
      start: ohlcv[0].timestamp,
      end: ohlcv[ohlcv.length - 1].timestamp,
      asOf: ohlcv[ohlcv.length - 1].timestamp,
      quality: {
        completeness: 100,
        gaps: 0,
        warnings: [],
        source: "demo-fixture",
      },
    }),
    ohlcv,
    corporateActions: [
      {
        id: "ca_div_1",
        symbol: "RELIANCE",
        kind: "dividend",
        exDate: "2026-01-09T03:45:00.000Z",
        amount: 10,
        currency: "INR",
        notes: "Interim dividend",
      },
    ],
    events: [
      {
        id: "ev_earn_1",
        symbol: "RELIANCE",
        title: "Q3 FY26 Earnings Release",
        eventType: "earnings",
        at: "2026-01-08T03:45:00.000Z",
        importance: "high",
      },
      {
        id: "ev_macro_1",
        title: "CPI Print",
        eventType: "macro",
        at: "2026-01-13T03:45:00.000Z",
        importance: "medium",
      },
    ],
    regimes: [
      {
        at: "2026-01-02T03:45:00.000Z",
        regime: "bull",
        confidence: 72,
        label: "Constructive",
      },
    ],
    recommendations: [
      {
        recommendationId: "rec_rel_swing_1",
        symbol: "RELIANCE",
        company: "Reliance Industries",
        action: "BUY",
        strategyId: "swing_momentum",
        conviction: 78,
        confidence: 74,
        recommendationScore: 81,
        riskLabel: "Moderate",
        technicalSummary:
          "Price reclaimed 20-DMA with rising delivery; RSI constructive without overbought stretch.",
        fundamentalSummary:
          "Retail + Jio cash flows stable; balance sheet supports growth capex.",
        valuationSummary:
          "Trading near historical mean PE; upside skewed if energy + consumer beat.",
        catalysts: ["Q3 earnings", "Jio ARPU commentary", "Retail same-store trends"],
        entry: 2500,
        stopLoss: 2460,
        targets: [2540, 2580, 2620],
        asOf: "2026-01-03T03:45:00.000Z",
        marketRegime: "bull",
      },
    ],
    quality: {
      completeness: 100,
      gaps: 0,
      warnings: [],
      source: "demo-fixture",
    },
  };
}

function relianceTrades(sessionId: string): BacktestTrade[] {
  return [
    {
      id: "btt_rel_1",
      sessionId,
      symbol: "RELIANCE",
      company: "Reliance Industries",
      status: "closed",
      recommendationId: "rec_rel_swing_1",
      entryAt: "2026-01-06T03:45:00.000Z",
      exitAt: "2026-01-13T03:45:00.000Z",
      entryPrice: 2518,
      exitPrice: 2580,
      shares: 20,
      returnPercent: ((2580 - 2518) / 2518) * 100,
      pnl: (2580 - 2518) * 20,
      holdingMs:
        new Date("2026-01-13T03:45:00.000Z").getTime() -
        new Date("2026-01-06T03:45:00.000Z").getTime(),
      exitReason: "target",
      hitTarget: true,
      hitStopLoss: false,
      targetIndex: 1,
      rulesApplied: ["entry_1", "target_1"],
      timeline: [
        {
          id: "e1",
          type: "entry",
          label: "BUY filled",
          at: "2026-01-06T03:45:00.000Z",
          price: 2518,
        },
        {
          id: "e2",
          type: "target_1",
          label: "TARGET 1",
          at: "2026-01-07T03:45:00.000Z",
          price: 2540,
        },
        {
          id: "e3",
          type: "target_2",
          label: "TARGET 2",
          at: "2026-01-13T03:45:00.000Z",
          price: 2580,
        },
        {
          id: "e4",
          type: "sell",
          label: "SELL / scale out",
          at: "2026-01-13T03:45:00.000Z",
          price: 2580,
        },
      ],
    },
  ];
}

function tcsDataset(): HistoricalDatasetBundle {
  const rows = [
    ["2026-02-02T03:45:00.000Z", 4120, 4155, 4105, 4140, 1_500_000],
    ["2026-02-03T03:45:00.000Z", 4140, 4168, 4128, 4132, 1_400_000],
    ["2026-02-04T03:45:00.000Z", 4132, 4148, 4088, 4095, 1_800_000],
    ["2026-02-05T03:45:00.000Z", 4095, 4110, 4050, 4062, 2_100_000],
    ["2026-02-06T03:45:00.000Z", 4062, 4088, 4035, 4075, 1_900_000],
    ["2026-02-09T03:45:00.000Z", 4075, 4102, 4060, 4090, 1_600_000],
  ] as const;
  const ohlcv = rows.map((row) => ohlcvFromTuple("TCS", row));
  return {
    slice: createDatasetSlice({
      id: "demo_tcs_feb2026",
      symbol: "TCS",
      start: ohlcv[0].timestamp,
      end: ohlcv[ohlcv.length - 1].timestamp,
      quality: {
        completeness: 100,
        gaps: 0,
        warnings: [],
        source: "demo-fixture",
      },
    }),
    ohlcv,
    corporateActions: [
      {
        id: "ca_bonus_1",
        symbol: "TCS",
        kind: "bonus",
        exDate: "2026-02-06T03:45:00.000Z",
        ratio: "1:1",
        notes: "Bonus issue record",
      },
    ],
    events: [
      {
        id: "ev_split_note",
        symbol: "TCS",
        title: "Board notes capital action",
        eventType: "corporate_action",
        at: "2026-02-03T03:45:00.000Z",
        importance: "medium",
      },
    ],
    regimes: [
      {
        at: "2026-02-02T03:45:00.000Z",
        regime: "volatile",
        confidence: 64,
        label: "Choppy",
      },
    ],
    recommendations: [
      {
        recommendationId: "rec_tcs_swing_1",
        symbol: "TCS",
        company: "Tata Consultancy Services",
        action: "BUY",
        strategyId: "mean_reversion",
        conviction: 62,
        confidence: 58,
        recommendationScore: 64,
        riskLabel: "Elevated",
        technicalSummary: "Failed breakout; watching 4050 support zone.",
        fundamentalSummary: "Deal TCV steady; margin watch into guidance.",
        valuationSummary: "Premium to IT peers; limited multiple expansion.",
        catalysts: ["Large deal commentary", "Bonus listing flows"],
        entry: 4130,
        stopLoss: 4040,
        targets: [4180, 4220, 4280],
        asOf: "2026-02-02T03:45:00.000Z",
        marketRegime: "volatile",
      },
    ],
    quality: {
      completeness: 100,
      gaps: 0,
      warnings: [],
      source: "demo-fixture",
    },
  };
}

function tcsTrades(sessionId: string): BacktestTrade[] {
  return [
    {
      id: "btt_tcs_1",
      sessionId,
      symbol: "TCS",
      company: "Tata Consultancy Services",
      status: "closed",
      recommendationId: "rec_tcs_swing_1",
      entryAt: "2026-02-03T03:45:00.000Z",
      exitAt: "2026-02-05T03:45:00.000Z",
      entryPrice: 4132,
      exitPrice: 4050,
      shares: 10,
      returnPercent: ((4050 - 4132) / 4132) * 100,
      pnl: (4050 - 4132) * 10,
      holdingMs:
        new Date("2026-02-05T03:45:00.000Z").getTime() -
        new Date("2026-02-03T03:45:00.000Z").getTime(),
      exitReason: "stop_loss",
      hitTarget: false,
      hitStopLoss: true,
      rulesApplied: ["entry_1", "stop_1"],
      timeline: [
        {
          id: "t1",
          type: "entry",
          label: "BUY filled",
          at: "2026-02-03T03:45:00.000Z",
          price: 4132,
        },
        {
          id: "t2",
          type: "stop_loss",
          label: "STOP LOSS",
          at: "2026-02-05T03:45:00.000Z",
          price: 4050,
        },
        {
          id: "t3",
          type: "sell",
          label: "SELL",
          at: "2026-02-05T03:45:00.000Z",
          price: 4050,
        },
      ],
    },
  ];
}

function buildDemoCatalog(): ReplayBundle[] {
  const rules = [
    createEntryRule("entry_1", { bandBps: 80 }),
    createTargetRule("target_1"),
    createStopLossRule("stop_1"),
  ];

  const relianceId = "bts_demo_reliance_001";
  const relianceSession = sessionBase({
    id: relianceId,
    createdAt: "2026-01-16T08:00:00.000Z",
    startedAt: "2026-01-16T08:00:01.000Z",
    completedAt: "2026-01-16T08:00:02.000Z",
    durationMs: 1000,
    strategyId: "swing_momentum",
    strategyLabel: "Swing Momentum",
    universe: { symbols: ["RELIANCE"], label: "Single-name" },
    startDate: "2026-01-02T00:00:00.000Z",
    endDate: "2026-01-15T23:59:59.000Z",
    configuration: {
      strategyId: "swing_momentum",
      strategyLabel: "Swing Momentum",
      universe: { symbols: ["RELIANCE"], label: "Single-name" },
      dateRange: {
        start: "2026-01-02T00:00:00.000Z",
        end: "2026-01-15T23:59:59.000Z",
        label: "Jan 2026",
      },
      rules,
      initialCapital: 100_000,
      positionSize: 20,
      maxOpenPositions: 1,
    },
    status: "completed",
    trades: relianceTrades(relianceId),
  });

  const tcsId = "bts_demo_tcs_002";
  const tcsSession = sessionBase({
    id: tcsId,
    createdAt: "2026-02-10T08:00:00.000Z",
    startedAt: "2026-02-10T08:00:01.000Z",
    completedAt: "2026-02-10T08:00:02.000Z",
    durationMs: 1000,
    strategyId: "mean_reversion",
    strategyLabel: "Mean Reversion",
    universe: { symbols: ["TCS"], label: "Single-name" },
    startDate: "2026-02-02T00:00:00.000Z",
    endDate: "2026-02-09T23:59:59.000Z",
    configuration: {
      strategyId: "mean_reversion",
      strategyLabel: "Mean Reversion",
      universe: { symbols: ["TCS"], label: "Single-name" },
      dateRange: {
        start: "2026-02-02T00:00:00.000Z",
        end: "2026-02-09T23:59:59.000Z",
        label: "Feb 2026",
      },
      rules,
      initialCapital: 100_000,
      positionSize: 10,
      maxOpenPositions: 1,
    },
    status: "completed",
    trades: tcsTrades(tcsId),
  });

  return [
    buildReplayBundle({ session: relianceSession, dataset: relianceDataset() }),
    buildReplayBundle({ session: tcsSession, dataset: tcsDataset() }),
  ];
}

const DEMO_BUNDLES = buildDemoCatalog();

export function listDemoReplayBundles(): readonly ReplayBundle[] {
  return DEMO_BUNDLES;
}

export function getDemoReplayBundle(sessionId: string): ReplayBundle | null {
  return DEMO_BUNDLES.find((bundle) => bundle.session.id === sessionId) ?? null;
}
