import { describe, expect, it } from "vitest";
import { assertUniformMarketSnapshotTimestamp } from "@/lib/market-orchestrator/marketsSnapshotGuard";
import {
  getMarketsRefreshIntervalMs,
  resolveMarketsRefreshMode,
  MARKETS_REFRESH_MS_OPEN,
} from "@/lib/market-orchestrator/marketsRefreshPolicy";
import type { MarketSnapshot } from "@/lib/market-orchestrator/types";
import type { MarketBreadth, MarketIndex, MarketPulse } from "@/types";

const TS = "2026-07-27T10:00:00.000Z";

function emptyPulse(): MarketPulse {
  return {
    indiaVix: 0,
    indiaVixChange: 0,
    marketTrend: "Neutral",
    breadthScore: 50,
    institutionalFlow: { fii: 0, dii: 0, asOf: "Unavailable" },
    putCallRatio: 0,
  };
}

function emptyBreadth(lastUpdated: string): MarketBreadth {
  return {
    advances: 1,
    declines: 1,
    unchanged: 0,
    advanceDeclineRatio: 1,
    newHighs: 0,
    newLows: 0,
    marketMood: "Neutral",
    sectors: [],
    gainers: [],
    losers: [],
    mostActive: [],
    weekHighs: [],
    weekLows: [],
    lastUpdated,
  };
}

function buildSnapshot(
  overrides: Partial<MarketSnapshot> = {}
): MarketSnapshot {
  return {
    indices: [] as MarketIndex[],
    pulse: emptyPulse(),
    intelligence: {
      context: {
        marketTrend: "Neutral",
        marketStrength: 50,
        contextScore: 50,
        contextConfidence: 50,
        riskMode: "Balanced",
        volatilityRegime: "Normal",
        volatilityScore: 50,
        breadthScore: 50,
        breadthQuality: "Mixed",
        advanceCount: 1,
        declineCount: 1,
        advanceDeclineRatio: 1,
        sectorBreadth: 50,
        momentum: 50,
        liquidity: 50,
        institutionalParticipation: 50,
        leadingSectors: [],
        weakSectors: [],
        summary: [],
        warnings: [],
        components: {
          trend: "Neutral",
          volatility: "Normal",
          breadthScore: 50,
          breadthQuality: "Mixed",
          advanceDeclineRatio: 1,
          marketStrength: 50,
          riskMode: "Balanced",
          momentumHint: 50,
          liquidityHint: 50,
          institutionalParticipation: 50,
          leadingSectors: [],
          weakSectors: [],
          healthScore: 50,
          qualityGrade: "B",
        },
        timestamp: TS,
      },
      regime: {
        regime: "Neutral",
        confidence: 50,
        confidenceGrade: "B",
        priority: 1,
        reasons: [],
        triggeredRules: [],
        positiveReasons: [],
        negativeReasons: [],
        summary: [],
        components: {
          trendStrength: 50,
          momentum: 50,
          volatility: 50,
          breadth: 50,
          risk: "Balanced",
          contributions: [],
        },
        timestamp: TS,
      },
      confidence: 50,
      confidenceGrade: "B",
      pipelineHealth: null,
      pipelineHealthGrade: null,
      eligibleStrategyCount: 0,
      timestamp: TS,
      source: "context-regime",
    },
    breadth: emptyBreadth(TS),
    heatmap: {
      universe: "nse",
      universeLabel: "NSE",
      totalStocks: 0,
      quotedStocks: 0,
      sectorCount: 0,
      marketAvgChangePercent: 0,
      sectors: [],
      moneyInflowSectors: [],
      moneyOutflowSectors: [],
      dataSource: "test",
      lastUpdated: TS,
      quoteCoveragePercent: 0,
      periodCoveragePercent: 0,
    },
    timestamp: TS,
    marketStatus: "open",
    marketStatusLabel: "Open",
    tradingDate: "2026-07-27",
    ...overrides,
  };
}

describe("MarketSnapshot timestamp uniformity", () => {
  it("passes when every widget slice shares the page timestamp", () => {
    const snapshot = buildSnapshot();
    expect(assertUniformMarketSnapshotTimestamp(snapshot)).toBe(true);
    expect(snapshot.breadth.lastUpdated).toBe(snapshot.timestamp);
    expect(snapshot.heatmap?.lastUpdated).toBe(snapshot.timestamp);
    expect(snapshot.intelligence?.timestamp).toBe(snapshot.timestamp);
    expect(snapshot.intelligence?.context?.timestamp).toBe(snapshot.timestamp);
    expect(snapshot.intelligence?.regime?.timestamp).toBe(snapshot.timestamp);
  });

  it("fails when breadth diverges", () => {
    const snapshot = buildSnapshot({
      breadth: emptyBreadth("2026-07-26T10:00:00.000Z"),
    });
    expect(assertUniformMarketSnapshotTimestamp(snapshot)).toBe(false);
  });

  it("fails when heatmap diverges", () => {
    const snapshot = buildSnapshot({
      heatmap: {
        universe: "nse",
        universeLabel: "NSE",
        totalStocks: 0,
        quotedStocks: 0,
        sectorCount: 0,
        marketAvgChangePercent: 0,
        sectors: [],
        moneyInflowSectors: [],
        moneyOutflowSectors: [],
        dataSource: "test",
        lastUpdated: "2026-07-26T10:00:00.000Z",
        quoteCoveragePercent: 0,
        periodCoveragePercent: 0,
      },
    });
    expect(assertUniformMarketSnapshotTimestamp(snapshot)).toBe(false);
  });
});

describe("Markets refresh policy", () => {
  it("polls every 2 minutes while open (weekday mid-session IST)", () => {
    // Monday 2026-07-27 11:00 IST = 05:30 UTC
    const open = new Date("2026-07-27T05:30:00.000Z");
    expect(resolveMarketsRefreshMode(open)).toBe("poll");
    expect(getMarketsRefreshIntervalMs(open)).toBe(MARKETS_REFRESH_MS_OPEN);
  });

  it("uses static mode on weekend", () => {
    // Saturday
    const weekend = new Date("2026-07-25T05:30:00.000Z");
    expect(resolveMarketsRefreshMode(weekend)).toBe("static");
    expect(getMarketsRefreshIntervalMs(weekend)).toBe(0);
  });
});
