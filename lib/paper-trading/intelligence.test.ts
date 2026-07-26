import { describe, expect, it } from "vitest";
import {
  buildAiIntelligenceModel,
  classifyFailureReason,
  computeAiQualityScores,
  computeConfidenceAccuracy,
  computeFailureAnalysis,
  generateAiInsights,
} from "@/lib/paper-trading/intelligence";
import type { PaperTrade } from "@/lib/paper-trading/types";

function makeTrade(
  overrides: Partial<PaperTrade> &
    Pick<PaperTrade, "id" | "pnl" | "returnPercent">
): PaperTrade {
  return {
    strategy: "swing",
    status: "target_1_hit",
    symbol: "TCS",
    company: "Tata Consultancy",
    shares: 100,
    entryPrice: 100,
    entryAt: "2026-07-02T04:00:00.000Z",
    currentPrice: 110,
    targetsHit: 1,
    stopLoss: 95,
    targets: [105, 108, 112],
    confidence: 92,
    conviction: 90,
    riskReward: 2.1,
    recommendationScore: 80,
    exitPrice: 110,
    exitAt: "2026-07-05T10:00:00.000Z",
    exitReason: "target_1",
    holdingMs: 86_400_000,
    recommendation: {
      recommendationId: `rec-${overrides.id}`,
      symbol: "TCS",
      company: "Tata Consultancy",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction: 90,
      confidence: 92,
      opportunityScore: 80,
      riskReward: 2.1,
      entry: 100,
      stopLoss: 95,
      targets: [105, 108, 112],
      holdingPeriod: "5 – 10 Days",
      reasons: ["Strong momentum"],
      evidence: [],
      marketContext: "Risk-on",
      marketRegime: "Bullish",
      timestamp: "2026-07-02T03:50:00.000Z",
      aiExplanation: "Bullish swing setup",
    },
    timeline: [],
    updatedAt: "2026-07-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("paper-trading AI intelligence (11E.3)", () => {
  const trades: PaperTrade[] = [
    makeTrade({
      id: "w1",
      pnl: 800,
      returnPercent: 8,
      confidence: 93,
      exitReason: "target_1",
    }),
    makeTrade({
      id: "l1",
      symbol: "RELIANCE",
      company: "Reliance",
      pnl: -300,
      returnPercent: -3,
      confidence: 76,
      status: "stop_loss_hit",
      exitReason: "stop_loss",
      riskReward: 1.0,
      recommendation: {
        ...makeTrade({ id: "l1", pnl: -300, returnPercent: -3 }).recommendation,
        recommendationId: "rec-l1",
        marketRegime: "Bearish",
        marketContext: "High volatility risk-off",
        reasons: ["Momentum fading"],
        confidence: 76,
      },
    }),
    makeTrade({
      id: "l2",
      symbol: "INFY",
      company: "Infosys",
      strategy: "intraday",
      pnl: -150,
      returnPercent: -1.5,
      confidence: 88,
      status: "expired",
      exitReason: "recommendation_expired",
      recommendation: {
        ...makeTrade({ id: "l2", pnl: -150, returnPercent: -1.5 })
          .recommendation,
        recommendationId: "rec-l2",
        primaryStrategyId: "intraday",
        marketRegime: "Sideways",
        marketContext: "Low volatility range",
        confidence: 88,
      },
    }),
  ];

  it("classifies failure reasons", () => {
    expect(classifyFailureReason(trades[1])).toBe("stop_loss_hit");
    expect(classifyFailureReason(trades[2])).toBe("recommendation_expired");
  });

  it("computes confidence buckets and failure frequencies", () => {
    const buckets = computeConfidenceAccuracy(trades);
    expect(buckets).toHaveLength(5);
    expect(buckets.find((b) => b.bucket === "90-95")?.trades).toBeGreaterThan(0);

    const failures = computeFailureAnalysis(trades);
    expect(failures.some((f) => f.count > 0)).toBe(true);
  });

  it("builds quality scores with explanations", () => {
    const quality = computeAiQualityScores(trades);
    expect(quality.overallAiQualityScore).toBeGreaterThanOrEqual(0);
    expect(quality.explanations.recommendationAccuracy.length).toBeGreaterThan(
      10
    );
  });

  it("generates dynamic insights from model data", () => {
    const model = buildAiIntelligenceModel(trades, [
      "rec-w1",
      "rec-l1",
      "rec-l2",
    ]);
    expect(model.insights.length).toBeGreaterThan(0);
    expect(model.insights.every((i) => i.text.length > 20)).toBe(true);
    expect(model.health.recommendationsExecuted).toBe(3);
    expect(model.strategyIntelligence).toHaveLength(3);

    const regenerated = generateAiInsights(model);
    expect(regenerated.length).toBeGreaterThan(0);
  });
});
