import { describe, expect, it, beforeEach } from "vitest";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  __resetInstitutionalDashboardCacheForTests,
  selectInstitutionalStrategyDashboard,
  parseInstitutionalStrategyId,
  NO_HIGH_CONVICTION_MESSAGE,
} from "./institutional-strategy-dashboard";

function makeCandidate(
  overrides: Partial<OpportunityCandidate> &
    Pick<OpportunityCandidate, "symbol" | "category">
): OpportunityCandidate {
  const conviction = overrides.aiConvictionScore ?? 90;
  return {
    id: `${overrides.symbol}:${overrides.category}`,
    company: overrides.company ?? `${overrides.symbol} Ltd`,
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: conviction,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 116,
    riskReward: 3.2,
    confidencePercent: conviction,
    reason: "Validated setup",
    opportunityScore: conviction,
    pipelineEligible: true,
    marketTrend: "Bullish",
    marketRegime: "Strong Bull",
    quote: {
      symbol: overrides.symbol,
      price: 101.5,
      change: 1.2,
      changePercent: 1.2,
      open: 100,
      high: 102,
      low: 99,
      previousClose: 100,
      vwap: 100.5,
      volume: 1_000_000,
      deliveryPercent: 40,
      weekHigh52: 120,
      weekLow52: 80,
      marketCap: "1L Cr",
      exchange: "NSE",
      marketStatus: "open",
      marketStatusLabel: "Open",
      lastTradeTime: "2026-07-25T04:00:00.000Z",
      lastTradeTimeIST: "09:30",
      lastUpdated: "2026-07-25T04:00:00.000Z",
      lastUpdatedIST: "09:30",
      lastSuccessfulUpdate: "2026-07-25T04:00:00.000Z",
      lastSuccessfulUpdateIST: "09:30",
      availability: "live",
      provider: "test",
      source: "live",
    },
    strategySignal: {
      strategy: "Test Strategy",
      strategyId:
        overrides.category === "intraday" ? "orb" : "ema-pullback",
      category: "Swing",
      timeframe: "1D",
      signal: "BUY",
      entry: 101,
      stopLoss: 95,
      target: 116,
      target1: 110,
      target2: 116,
      holdingPeriod: "3–10 days",
      confidence: conviction,
      conviction,
      risk: 6,
      reward: 15,
      riskReward: 2.5,
      reasons: ["Trend confirmed"],
      evidence: ["EMA support"],
      tags: [],
      marketContext: "Bullish",
      marketRegime: "Strong Bull",
      eligibility: {
        eligible: true,
        score: 82,
        reasons: ["Regime compatible"],
      },
      timestamp: "2026-07-25T04:00:00.000Z",
    },
    firstDetectedAt: "2026-07-25T04:00:00.000Z",
    lastDetectedAt: "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: "2026-07-25T04:00:00.000Z",
    ...overrides,
  };
}

function stateFromCategories(
  partial: Partial<OpportunityEngineState["categories"]>
): OpportunityEngineState {
  return {
    tradingDate: "2026-07-25",
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: 10,
    categories: {
      ...emptyOpportunityCategories(),
      ...partial,
    },
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

describe("institutional strategy dashboard ranking", () => {
  beforeEach(() => {
    __resetInstitutionalDashboardCacheForTests();
  });

  it("returns seven slots from a single master pool snapshot", () => {
    const slots = selectInstitutionalStrategyDashboard(
      stateFromCategories({
        intraday: [
          makeCandidate({ symbol: "TCS", category: "intraday", aiConvictionScore: 88 }),
        ],
        swing: [
          makeCandidate({ symbol: "INFY", category: "swing", aiConvictionScore: 91 }),
        ],
        relative_volume: [
          makeCandidate({
            symbol: "RELIANCE",
            category: "relative_volume",
            aiConvictionScore: 86,
          }),
        ],
        breakout: [
          makeCandidate({
            symbol: "HDFCBANK",
            category: "breakout",
            aiConvictionScore: 87,
          }),
        ],
        momentum: [
          makeCandidate({
            symbol: "ITC",
            category: "momentum",
            aiConvictionScore: 89,
          }),
        ],
        ai_high_conviction: [
          makeCandidate({
            symbol: "ASIANPAINT",
            category: "ai_high_conviction",
            aiConvictionScore: 92,
          }),
        ],
      })
    );

    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.strategyId)).toEqual([
      "intraday",
      "swing",
      "btst",
      "scalping",
      "short_term",
      "medium_term",
      "long_term",
    ]);
    expect(slots.find((s) => s.strategyId === "intraday")?.pick?.symbol).toBe(
      "TCS"
    );
    expect(slots.find((s) => s.strategyId === "swing")?.pick?.symbol).toBe(
      "INFY"
    );
    expect(slots.find((s) => s.strategyId === "btst")?.pick?.symbol).toBe(
      "RELIANCE"
    );
    expect(slots.find((s) => s.strategyId === "short_term")?.pick?.symbol).toBe(
      "HDFCBANK"
    );
    expect(slots.find((s) => s.strategyId === "medium_term")?.pick?.symbol).toBe(
      "ITC"
    );
    expect(slots.find((s) => s.strategyId === "long_term")?.pick?.symbol).toBe(
      "ASIANPAINT"
    );
  });

  it("picks only the highest conviction candidate per strategy", () => {
    const slots = selectInstitutionalStrategyDashboard(
      stateFromCategories({
        swing: [
          makeCandidate({
            symbol: "WEAK",
            category: "swing",
            aiConvictionScore: 86,
          }),
          makeCandidate({
            symbol: "STRONG",
            category: "swing",
            aiConvictionScore: 95,
          }),
        ],
      })
    );

    expect(slots.find((s) => s.strategyId === "swing")?.pick?.symbol).toBe(
      "STRONG"
    );
    expect(slots.find((s) => s.strategyId === "swing")?.pick?.conviction).toBe(
      95
    );
  });

  it("leaves a slot empty below the high-conviction gate", () => {
    const slots = selectInstitutionalStrategyDashboard(
      stateFromCategories({
        swing: [
          makeCandidate({
            symbol: "LOW",
            category: "swing",
            aiConvictionScore: 70,
          }),
        ],
      })
    );

    const swing = slots.find((s) => s.strategyId === "swing");
    expect(swing?.pick).toBeNull();
    expect(swing?.lastScanTime).toBe("2026-07-25T04:00:00.000Z");
    expect(NO_HIGH_CONVICTION_MESSAGE).toContain("High Conviction");
  });

  it("ranks scalping separately from intraday within the same category", () => {
    const scalp = makeCandidate({
      symbol: "SCALP1",
      category: "intraday",
      aiConvictionScore: 90,
      strategySignal: {
        strategy: "Scalping",
        strategyId: "scalping",
        category: "Scalp",
        timeframe: "5m",
        signal: "BUY",
        entry: 100,
        stopLoss: 99,
        target: 101.5,
        target1: 101,
        target2: 101.5,
        holdingPeriod: "minutes",
        confidence: 90,
        conviction: 90,
        risk: 1,
        reward: 1.5,
        riskReward: 1.5,
        reasons: ["VWAP"],
        evidence: [],
        tags: ["scalp"],
        marketContext: "Bullish",
        marketRegime: "Strong Bull",
        eligibility: { eligible: true, score: 80, reasons: [] },
        timestamp: "2026-07-25T04:00:00.000Z",
      },
    });
    const day = makeCandidate({
      symbol: "DAY1",
      category: "intraday",
      aiConvictionScore: 88,
    });

    const slots = selectInstitutionalStrategyDashboard(
      stateFromCategories({ intraday: [scalp, day] })
    );

    expect(slots.find((s) => s.strategyId === "scalping")?.pick?.symbol).toBe(
      "SCALP1"
    );
    expect(slots.find((s) => s.strategyId === "intraday")?.pick?.symbol).toBe(
      "DAY1"
    );
  });

  it("parses strategy query ids", () => {
    expect(parseInstitutionalStrategyId("intraday")).toBe("intraday");
    expect(parseInstitutionalStrategyId("short-term")).toBe("short_term");
    expect(parseInstitutionalStrategyId("nope")).toBeNull();
  });
});
