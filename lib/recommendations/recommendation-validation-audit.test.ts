import { describe, expect, it } from "vitest";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { auditRecommendationValidation } from "@/lib/recommendations/recommendation-validation-audit";

function candidate(
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
    timeHorizon: "2–8 weeks",
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
    ...overrides,
  };
}

function state(
  items: OpportunityCandidate[]
): OpportunityEngineState {
  return {
    tradingDate: "2026-07-19",
    lastScannedAt: "2026-07-19T09:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: items.length,
    categories: {
      ...emptyOpportunityCategories(),
      swing: items,
    },
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

describe("auditRecommendationValidation", () => {
  it("counts valid vs rejected candidates", () => {
    const valid = candidate();
    const invalidSignal = candidate({
      id: "BAD:swing",
      symbol: "BAD",
      stopLoss: 105,
      target1: 90,
      target2: 85,
      entryZone: { low: 100, high: 102 },
      strategySignal: {
        ...candidate().strategySignal!,
        stopLoss: 105,
        target: 90,
        target1: 90,
        target2: 85,
      },
    });
    const invertedPresentationTwin = candidate({
      id: "JIND:swing",
      symbol: "JINDWORLD",
      strategySignal: {
        ...candidate().strategySignal!,
        entry: 38,
        stopLoss: 36.32,
        target: 41.61,
        target1: 39.72,
        target2: 41.61,
      },
    });

    const audit = auditRecommendationValidation(
      state([valid, invalidSignal, invertedPresentationTwin])
    );

    expect(audit.scannedCandidates).toBe(3);
    expect(audit.strategyEngineAccepted).toBe(2);
    expect(audit.strategyEngineRejected).toBe(1);
    expect(audit.publishable).toBeGreaterThanOrEqual(2);
    expect(audit.rejected).toBeGreaterThanOrEqual(1);
  });
});
