import { describe, expect, it } from "vitest";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import {
  ENTRY_AT_MARKET_TOLERANCE,
  planInstitutionalEntry,
  planInstitutionalEntryFromRecommendation,
} from "./institutional-entry";

function baseCandidate(
  overrides: Partial<OpportunityCandidate> = {}
): OpportunityCandidate {
  return {
    id: "INFY:swing",
    symbol: "INFY",
    company: "Infosys",
    category: "swing",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 90,
    entryZone: { low: 1480, high: 1520 },
    stopLoss: 1420,
    target1: 1600,
    target2: 1680,
    riskReward: 3,
    confidencePercent: 88,
    reason: "setup",
    firstDetectedAt: "2026-07-25T04:00:00.000Z",
    lastDetectedAt: "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: "2026-07-25T04:00:00.000Z",
    quote: {
      symbol: "INFY",
      price: 1550,
      change: 10,
      changePercent: 0.6,
      open: 1540,
      high: 1560,
      low: 1530,
      previousClose: 1540,
      vwap: 1542,
      volume: 1_000_000,
      deliveryPercent: 40,
      weekHigh52: 1800,
      weekLow52: 1200,
      marketCap: "6L Cr",
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
      stale: false,
      quoteAge: 0,
    },
    scanMetrics: {
      cmp: 1550,
      ema20: 1490,
      ema50: 1450,
      atr: 25,
      vwap: 1542,
    },
    strategySignal: {
      strategy: "EMA Pullback",
      strategyId: "ema-pullback",
      category: "Swing",
      timeframe: "1D",
      signal: "BUY",
      entry: 1500,
      stopLoss: 1420,
      target: 1680,
      target1: 1600,
      target2: 1680,
      holdingPeriod: "2–8 weeks",
      confidence: 88,
      conviction: 90,
      risk: 80,
      reward: 180,
      riskReward: 2.25,
      reasons: [],
      evidence: [],
      tags: [],
      marketContext: "Bullish",
      marketRegime: "Strong Bull",
      eligibility: { eligible: true, score: 80, reasons: [] },
      timestamp: "2026-07-25T04:00:00.000Z",
    },
    ...overrides,
  };
}

function baseRecommendation(
  overrides: Partial<SharedRecommendation> = {}
): SharedRecommendation {
  return {
    id: "INFY:swing",
    symbol: "INFY",
    company: "Infosys",
    category: "swing",
    action: "BUY",
    primaryStrategy: "EMA Pullback",
    primaryStrategyId: "ema-pullback",
    matchedStrategies: ["EMA Pullback"],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 100,
    conflictPercent: 0,
    opportunityScore: 90,
    frameworkScore: 90,
    confidence: 88,
    conviction: 90,
    entry: 1550, // deliberately equals LTP — planner must not echo this
    stopLoss: 1420,
    targets: [1600, 1680],
    risk: 80,
    reward: 180,
    riskReward: 2.25,
    holdingPeriod: "2–8 weeks",
    marketContext: "Bullish",
    marketRegime: "Strong Bull",
    riskMode: "Neutral",
    eligibility: { eligible: true, score: 80, reasons: [] },
    reasons: [],
    evidence: [],
    matchedFrameworks: {
      technical: [],
      fundamental: [],
      valuation: [],
      growth: [],
    },
    validation: {
      valid: true,
      score: 100,
      checks: {
        tradeLevels: true,
        institutionalTradeLevels: true,
        confidence: true,
        opportunityScore: true,
        agreement: true,
        marketContext: true,
        marketRegime: true,
        eligibility: true,
      },
      reasons: [],
    },
    longTermRanking: null,
    timestamp: "2026-07-25T04:00:00.000Z",
    source: "StrategyEngine",
    ...overrides,
  };
}

describe("planInstitutionalEntry", () => {
  it("does not use live LTP as the entry when a structural anchor exists", () => {
    const candidate = baseCandidate();
    const recommendation = baseRecommendation({ entry: 1550 });
    const plan = planInstitutionalEntry(
      "swing",
      candidate,
      recommendation,
      1550
    );

    expect(plan.ideal).not.toBe(1550);
    // Swing prefers EMA20 pullback (1490)
    expect(plan.ideal).toBeCloseTo(1490, 0);
    expect(plan.mode).toBe("zone");
    expect(plan.low).not.toBeNull();
    expect(plan.high).not.toBeNull();
    expect(plan.low!).toBeLessThan(plan.ideal);
    expect(plan.high!).toBeGreaterThan(plan.ideal);
  });

  it("anchors intraday on VWAP when available", () => {
    const plan = planInstitutionalEntry(
      "intraday",
      baseCandidate({ category: "intraday" }),
      baseRecommendation({ category: "intraday", entry: 1550 }),
      1550
    );
    expect(plan.ideal).toBeCloseTo(1542, 0);
    expect(Math.abs(plan.ideal - 1550) / 1550).toBeGreaterThan(
      ENTRY_AT_MARKET_TOLERANCE
    );
  });

  it("anchors BTST on previous close", () => {
    const plan = planInstitutionalEntry(
      "btst",
      baseCandidate({ category: "relative_volume" }),
      baseRecommendation({ category: "relative_volume", entry: 1550 }),
      1550
    );
    expect(plan.ideal).toBeCloseTo(1540, 0);
  });

  it("always returns a zone for long_term", () => {
    const plan = planInstitutionalEntry(
      "long_term",
      baseCandidate({ category: "ai_high_conviction" }),
      baseRecommendation({ category: "ai_high_conviction", entry: 1550 }),
      1550
    );
    expect(plan.mode).toBe("zone");
    expect(plan.low).not.toBeNull();
    expect(plan.high).not.toBeNull();
  });

  it("computes expected upside from ideal entry to primary target", () => {
    const plan = planInstitutionalEntry(
      "swing",
      baseCandidate(),
      baseRecommendation({ targets: [1600] }),
      1550
    );
    expect(plan.expectedUpsidePercent).not.toBeNull();
    expect(plan.expectedUpsidePercent!).toBeGreaterThan(0);
  });

  it("flags market-at-ideal when LTP sits inside tolerance", () => {
    const candidate = baseCandidate({
      quote: {
        ...baseCandidate().quote!,
        price: 1490,
        vwap: 1490,
        open: 1490,
        previousClose: 1490,
      },
      scanMetrics: { cmp: 1490, ema20: 1490, ema50: 1490, atr: 5 },
      strategySignal: {
        ...baseCandidate().strategySignal!,
        entry: 1490,
      },
      entryZone: { low: 1485, high: 1495 },
    });
    const plan = planInstitutionalEntry(
      "swing",
      candidate,
      baseRecommendation({ entry: 1490 }),
      1490
    );
    expect(plan.atMarket).toBe(true);
  });
});

describe("planInstitutionalEntryFromRecommendation", () => {
  it("still builds a strategy band without candidate context", () => {
    const plan = planInstitutionalEntryFromRecommendation(
      "scalping",
      baseRecommendation({ entry: 100, targets: [101.5] })
    );
    expect(plan.mode).toBe("zone");
    expect(plan.low).toBeLessThan(plan.ideal);
    expect(plan.high).toBeGreaterThan(plan.ideal);
    expect(plan.expectedUpsidePercent).not.toBeNull();
  });
});
