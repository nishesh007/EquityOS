import { describe, expect, it, beforeEach } from "vitest";
import { assertUniformMarketSnapshotTimestamp } from "@/lib/market-orchestrator/marketsSnapshotGuard";
import { compareDashboardMarketsIntelligence } from "@/lib/market-orchestrator/dashboard-markets-parity";
import {
  clearMarketSnapshotCache,
  getCachedMarketSnapshot,
  MARKET_SNAPSHOT_TTL_MS,
} from "@/lib/market-orchestrator/marketsSnapshot";
import type { MarketSnapshot } from "@/lib/market-orchestrator/types";
import type { MarketBreadth, MarketPulse } from "@/types";

const TS = "2026-07-27T10:00:00.000Z";

function buildIntelligence(timestamp: string) {
  return {
    context: {
      marketTrend: "Bullish",
      marketStrength: 72,
      contextScore: 70,
      contextConfidence: 80,
      riskMode: "Risk-On",
      volatilityRegime: "Normal",
      volatilityScore: 40,
      breadthScore: 68,
      breadthQuality: "Strong",
      advanceCount: 320,
      declineCount: 180,
      advanceDeclineRatio: 1.78,
      sectorBreadth: 65,
      momentum: 71,
      liquidity: 60,
      institutionalParticipation: 55,
      leadingSectors: ["IT"],
      weakSectors: ["Realty"],
      summary: ["Bullish breadth"],
      warnings: [],
      components: {
        trend: "Bullish",
        volatility: "Normal",
        breadthScore: 68,
        breadthQuality: "Strong",
        advanceDeclineRatio: 1.78,
        marketStrength: 72,
        riskMode: "Risk-On",
        momentumHint: 71,
        liquidityHint: 60,
        institutionalParticipation: 55,
        leadingSectors: ["IT"],
        weakSectors: ["Realty"],
        healthScore: 70,
        qualityGrade: "A",
      },
      timestamp,
    },
    regime: {
      regime: "Bullish",
      confidence: 78,
      confidenceGrade: "A",
      priority: 1,
      reasons: ["Strong breadth"],
      triggeredRules: ["breadth-strong"],
      positiveReasons: ["Strong breadth"],
      negativeReasons: [],
      summary: ["Bullish regime"],
      components: {
        trendStrength: 70,
        momentum: 71,
        volatility: 40,
        breadth: 68,
        risk: "Risk-On",
        contributions: [],
      },
      timestamp,
    },
    confidence: 78,
    confidenceGrade: "A",
    pipelineHealth: 90,
    pipelineHealthGrade: "A",
    eligibleStrategyCount: 4,
    timestamp,
    source: "context-regime" as const,
  };
}

function buildSnapshot(timestamp: string): MarketSnapshot {
  const intelligence = buildIntelligence(timestamp);
  const pulse: MarketPulse = {
    indiaVix: 12,
    indiaVixChange: -0.2,
    marketTrend: "Bullish",
    breadthScore: 68,
    institutionalFlow: { fii: 100, dii: 50, asOf: "2026-07-27" },
    putCallRatio: 0.9,
  };
  const breadth = {
    advances: 320,
    declines: 180,
    unchanged: 20,
    newHighs: 12,
    newLows: 3,
    sectors: [],
    gainers: [],
    losers: [],
    mostActive: [],
    weekHighs: [],
    weekLows: [],
    lastUpdated: timestamp,
  } as MarketBreadth;

  return {
    indices: [],
    pulse,
    intelligence,
    breadth,
    heatmap: null,
    timestamp,
    marketStatus: "open",
    marketStatusLabel: "Open",
    tradingDate: "2026-07-27",
    session: {
      sessionId: "2026-07-27",
      phase: "ready",
      sessionValid: true,
      freshness: {
        sessionDate: "2026-07-27",
        generatedAt: timestamp,
        marketCloseTime: "2026-07-27T10:00:00.000Z",
        sourceTimestamp: timestamp,
        ageMinutes: 0,
      },
    },
  };
}

/**
 * Simulate Dashboard vs Markets consumers reading the same process snapshot.
 */
function dashboardIntelligenceFromCanonical(snapshot: MarketSnapshot) {
  return {
    context: snapshot.intelligence!.context,
    regime: snapshot.intelligence!.regime,
    timestamp: snapshot.timestamp,
  };
}

function marketsIntelligenceFromCanonical(snapshot: MarketSnapshot) {
  return {
    context: snapshot.intelligence!.context,
    regime: snapshot.intelligence!.regime,
    timestamp: snapshot.timestamp,
  };
}

describe("Dashboard ≡ Markets Context / Regime identity", () => {
  beforeEach(() => {
    clearMarketSnapshotCache();
  });

  it("returns identical Context, Regime, and timestamp from one MarketSnapshot", () => {
    const snapshot = buildSnapshot(TS);
    expect(assertUniformMarketSnapshotTimestamp(snapshot)).toBe(true);

    const dashboard = dashboardIntelligenceFromCanonical(snapshot);
    const markets = marketsIntelligenceFromCanonical(snapshot);

    expect(dashboard.timestamp).toBe(markets.timestamp);
    expect(dashboard.timestamp).toBe(TS);
    expect(dashboard.context).toEqual(markets.context);
    expect(dashboard.regime).toEqual(markets.regime);
    expect(dashboard.context.breadthScore).toBe(68);
    expect(dashboard.regime.regime).toBe("Bullish");
    expect(dashboard.context.timestamp).toBe(dashboard.regime.timestamp);
    expect(dashboard.context.timestamp).toBe(dashboard.timestamp);
  });

  it("getCachedMarketSnapshot stays null until a snapshot is stored via loader path", () => {
    expect(getCachedMarketSnapshot()).toBeNull();
    expect(MARKET_SNAPSHOT_TTL_MS).toBe(2 * 60 * 1000);
  });

  it("compareDashboardMarketsIntelligence validates full parity", () => {
    const snapshot = buildSnapshot(TS);
    const dashboard = {
      intelligence: snapshot.intelligence!,
      timestamp: snapshot.timestamp,
    };
    const result = compareDashboardMarketsIntelligence(dashboard, snapshot);
    expect(result.identical).toBe(true);
    expect(result.timestampMatch).toBe(true);
    expect(result.contextMatch).toBe(true);
    expect(result.regimeMatch).toBe(true);
    expect(result.timestamp).toBe(TS);
  });

  it("compareDashboardMarketsIntelligence detects Context drift", () => {
    const snapshot = buildSnapshot(TS);
    const drifted = {
      intelligence: {
        ...snapshot.intelligence!,
        context: {
          ...snapshot.intelligence!.context,
          breadthScore: 1,
        },
      },
      timestamp: snapshot.timestamp,
    };
    const result = compareDashboardMarketsIntelligence(drifted, snapshot);
    expect(result.identical).toBe(false);
    expect(result.contextMatch).toBe(false);
    expect(result.regimeMatch).toBe(true);
    expect(result.timestampMatch).toBe(true);
  });
});