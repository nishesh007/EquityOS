import { describe, expect, it } from "vitest";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  applyHistoricalWinRateFilter,
  assessHistoricalWinRate,
  WIN_RATE_MIN_SAMPLE,
} from "@/lib/recommendations/win-rate-filter";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

function makeRec(
  overrides: Partial<SharedRecommendation> &
    Pick<SharedRecommendation, "id" | "symbol" | "conviction" | "primaryStrategyId">
): SharedRecommendation {
  return {
    company: `${overrides.symbol} Ltd`,
    category: "swing",
    action: "BUY",
    primaryStrategy: "Swing",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 80,
    conflictPercent: 0,
    opportunityScore: overrides.conviction,
    frameworkScore: 70,
    confidence: overrides.conviction,
    entry: 100,
    stopLoss: 95,
    targets: [105, 110, 115],
    risk: 5,
    reward: 10,
    riskReward: overrides.riskReward ?? 2,
    holdingPeriod: "3–10 days",
    marketContext: "Bullish",
    marketRegime: "Bullish",
    riskMode: "Normal",
    eligibility: { eligible: true, score: 80, reasons: [] },
    reasons: ["Volume Surge"],
    evidence: ["volume surge"],
    matchedFrameworks: {
      technical: [],
      fundamental: [],
      valuation: [],
      growth: [],
    },
    validation: {
      valid: true,
      score: 90,
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
    timestamp: "2026-07-28T10:00:00.000Z",
    source: "OpportunityEngine",
    ...overrides,
  };
}

function makeTrade(
  overrides: Partial<PaperTrade> & { id: string; pnl: number; strategy?: PaperTrade["strategy"] }
): PaperTrade {
  const { id, pnl, strategy = "swing", ...rest } = overrides;
  return {
    id,
    strategy,
    status: pnl > 0 ? "target_1_hit" : "stop_loss_hit",
    symbol: "HIST",
    company: "Hist",
    shares: 100,
    entryPrice: 100,
    entryAt: "2026-07-01T04:00:00.000Z",
    currentPrice: 100,
    targetsHit: pnl > 0 ? 1 : 0,
    stopLoss: 95,
    targets: [105, 110, 115],
    confidence: 70,
    conviction: 70,
    riskReward: 2,
    recommendationScore: 70,
    exitPrice: 100,
    exitAt: "2026-07-02T04:00:00.000Z",
    exitReason: pnl > 0 ? "target_1" : "stop_loss",
    pnl,
    returnPercent: pnl > 0 ? 2 : -2,
    holdingMs: 86_400_000,
    recommendation: {
      recommendationId: `r-${id}`,
      symbol: "HIST",
      company: "Hist",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction: 70,
      confidence: 70,
      opportunityScore: 70,
      riskReward: 2,
      entry: 100,
      stopLoss: 95,
      targets: [105, 110, 115],
      holdingPeriod: "3–10 days",
      reasons: [],
      evidence: ["volume surge"],
      marketContext: "Bullish",
      marketRegime: "Bullish",
      timestamp: "2026-07-01T04:00:00.000Z",
      aiExplanation: "",
    },
    timeline: [],
    updatedAt: "2026-07-02T04:00:00.000Z",
    ...rest,
  };
}

describe("Historical Win Rate Filter", () => {
  it("marks estimated when sample < 20", () => {
    const trades = Array.from({ length: 5 }, (_, i) =>
      makeTrade({ id: `t${i}`, pnl: i % 2 === 0 ? 100 : -50 })
    );
    const assessment = assessHistoricalWinRate(
      makeRec({
        id: "a",
        symbol: "AAA",
        conviction: 70,
        primaryStrategyId: "swing",
      }),
      trades
    );
    expect(assessment.sampleSize).toBeLessThan(WIN_RATE_MIN_SAMPLE);
    expect(assessment.expectedWinRateEstimated).toBe(true);
  });

  it("sorts by win rate when sample is sufficient", () => {
    const strong = Array.from({ length: 32 }, (_, i) =>
      makeTrade({ id: `s${i}`, pnl: 100, strategy: "swing" })
    );
    const weak = Array.from({ length: 32 }, (_, i) =>
      makeTrade({ id: `w${i}`, pnl: -50, strategy: "intraday" })
    );
    const ranked = applyHistoricalWinRateFilter(
      [
        makeRec({
          id: "weak",
          symbol: "WEAK",
          conviction: 95,
          primaryStrategyId: "intraday",
          category: "intraday",
        }),
        makeRec({
          id: "strong",
          symbol: "STRONG",
          conviction: 60,
          primaryStrategyId: "swing",
          category: "swing",
        }),
      ],
      { trades: [...strong, ...weak], market: { asOf: "2026-07-28T12:00:00.000Z" } }
    );
    expect(ranked[0].id).toBe("strong");
    expect(ranked[0].expectedWinRateEstimated).toBe(false);
  });
});
