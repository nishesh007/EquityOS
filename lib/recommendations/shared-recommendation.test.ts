import { describe, expect, it } from "vitest";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { selectSharedRecommendations } from "./shared-recommendation";

function candidate(): OpportunityCandidate {
  return {
    id: "INFY:swing",
    symbol: "INFY",
    company: "Infosys",
    category: "swing",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 86,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 116,
    riskReward: 3.2,
    confidencePercent: 84,
    reason: "Validated setup",
    opportunityScore: 88,
    pipelineEligible: true,
    marketTrend: "Bullish",
    marketRegime: "Strong Bull",
    strategySignal: {
      strategy: "EMA Pullback",
      strategyId: "ema-pullback",
      category: "Swing",
      timeframe: "1D",
      signal: "BUY",
      entry: 100,
      stopLoss: 95,
      target: 116,
      target1: 110,
      target2: 116,
      holdingPeriod: "3–10 days",
      confidence: 84,
      conviction: 86,
      risk: 5,
      reward: 16,
      riskReward: 3.2,
      reasons: ["Trend confirmed"],
      evidence: ["EMA support"],
      tags: ["swing"],
      marketContext: "Bullish",
      marketRegime: "Strong Bull",
      eligibility: {
        eligible: true,
        score: 82,
        reasons: ["Regime compatible"],
      },
      timestamp: "2026-07-19T09:00:00.000Z",
    },
    firstDetectedAt: "2026-07-19T09:00:00.000Z",
    lastDetectedAt: "2026-07-19T09:00:00.000Z",
    lastUpdatedAt: "2026-07-19T09:00:00.000Z",
  };
}

function state(item: OpportunityCandidate): OpportunityEngineState {
  return {
    tradingDate: "2026-07-19",
    lastScannedAt: "2026-07-19T09:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: 1,
    categories: {
      ...emptyOpportunityCategories(),
      swing: [item],
    },
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

describe("shared recommendation projection", () => {
  it("publishes one validated Strategy Engine recommendation", () => {
    const recommendations = selectSharedRecommendations(state(candidate()));

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      symbol: "INFY",
      action: "BUY",
      opportunityScore: 88,
      confidence: 84,
      source: "StrategyEngine",
      validation: { valid: true, score: 100 },
    });
  });

  it("blocks a recommendation whose trade levels fail validation", () => {
    const invalid = candidate();
    const invalidSignal = invalid.strategySignal;
    if (!invalidSignal) throw new Error("Fixture must include a strategy signal");
    invalid.strategySignal = {
      ...invalidSignal,
      stopLoss: 105,
    };

    const invalidState = state(invalid);
    invalidState.scanCount = 2;
    expect(selectSharedRecommendations(invalidState)).toEqual([]);
  });
});
