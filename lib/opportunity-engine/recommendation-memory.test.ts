import { describe, expect, it } from "vitest";
import {
  listActiveRecommendationCandidates,
  listRecommendationHistory,
  replayRecommendation,
  syncRecommendationMemory,
  transitionRecommendation,
} from "@/lib/opportunity-engine/recommendation-memory";
import {
  emptyOpportunityCategories,
} from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";

function candidate(symbol: string): OpportunityCandidate {
  return {
    id: `${symbol}:swing`,
    symbol,
    company: `${symbol} Limited`,
    category: "swing",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 88,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 116,
    riskReward: 2.5,
    confidencePercent: 84,
    reason: "Institutional setup",
    strategySignal: {
      strategy: "EMA Pullback",
      strategyId: "ema-pullback",
      signal: "BUY",
      entry: 100,
      stopLoss: 95,
      target: 116,
      target1: 110,
      target2: 116,
      confidence: 84,
      risk: 5,
      reward: 16,
      riskReward: 3.2,
      reasons: ["Institutional setup"],
      evidence: ["EMA trend confirmed"],
      tags: ["Swing", "BUY"],
      marketRegime: "Strong Bull",
      eligibility: {
        eligible: true,
        score: 82,
        reasons: ["Regime compatible"],
      },
      timestamp: "2026-07-17T03:45:00.000Z",
    },
    firstDetectedAt: "2026-07-17T03:45:00.000Z",
    lastDetectedAt: "2026-07-17T03:45:00.000Z",
    lastUpdatedAt: "2026-07-17T03:45:00.000Z",
  };
}

function state(candidates: OpportunityCandidate[]): OpportunityEngineState {
  return {
    tradingDate: "2026-07-17",
    lastScannedAt: "2026-07-17T03:45:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: candidates.length,
    categories: {
      ...emptyOpportunityCategories(),
      swing: candidates,
    },
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

describe("permanent recommendation memory", () => {
  it("retains expired recommendations while active dashboard filters them out", () => {
    const generated = syncRecommendationMemory(
      state([candidate("INFY")]),
      "2026-07-17T03:45:00.000Z"
    );
    const nextState = {
      ...state([]),
      recommendations: generated,
    };
    const retained = syncRecommendationMemory(
      nextState,
      "2026-07-17T04:00:00.000Z"
    );
    const retainedState = { ...nextState, recommendations: retained };

    expect(retained).toHaveLength(1);
    expect(retained[0].status).toBe("EXPIRED");
    expect(listActiveRecommendationCandidates(retainedState)).toEqual([]);
    expect(listRecommendationHistory(retainedState)).toHaveLength(1);
    expect(replayRecommendation(retainedState, retained[0].recommendationId))
      .toBe(retained[0]);
  });

  it("creates a new immutable record when an expired setup qualifies again", () => {
    const firstState = state([candidate("INFY")]);
    const generated = syncRecommendationMemory(
      firstState,
      "2026-07-17T03:45:00.000Z"
    );
    const expired = syncRecommendationMemory(
      { ...state([]), recommendations: generated },
      "2026-07-17T04:00:00.000Z"
    );
    const regenerated = syncRecommendationMemory(
      { ...firstState, recommendations: expired },
      "2026-07-17T04:15:00.000Z"
    );

    expect(regenerated).toHaveLength(2);
    expect(regenerated.map((record) => record.status)).toEqual([
      "EXPIRED",
      "ACTIVE",
    ]);
    expect(regenerated[0].recommendationId).not.toBe(
      regenerated[1].recommendationId
    );
    expect(regenerated[0].candidate).toEqual(generated[0].candidate);
  });

  it("records ACTIVE to EXPIRED to ARCHIVED without deleting the snapshot", () => {
    const generated = syncRecommendationMemory(
      state([candidate("INFY")]),
      "2026-07-17T03:45:00.000Z"
    );
    const originalCandidate = generated[0].candidate;
    const archived = transitionRecommendation(
      generated,
      generated[0].recommendationId,
      "ARCHIVED",
      "Retention archive",
      "2026-07-18T03:45:00.000Z"
    );

    expect(archived).toHaveLength(1);
    expect(archived[0].status).toBe("ARCHIVED");
    expect(archived[0].candidate).toBe(originalCandidate);
    expect(archived[0].lifecycleEvents.map((event) => event.status)).toEqual([
      "ACTIVE",
      "EXPIRED",
      "ARCHIVED",
    ]);
  });

  it("does not regenerate an invalidated setup while it remains in the scan", () => {
    const sourceState = state([candidate("INFY")]);
    const generated = syncRecommendationMemory(
      sourceState,
      "2026-07-17T03:45:00.000Z"
    );
    const invalidated = transitionRecommendation(
      generated,
      generated[0].recommendationId,
      "INVALIDATED",
      "Validation failed",
      "2026-07-17T03:50:00.000Z"
    );
    const reconciled = syncRecommendationMemory(
      { ...sourceState, recommendations: invalidated },
      "2026-07-17T04:00:00.000Z"
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("INVALIDATED");
  });
});
