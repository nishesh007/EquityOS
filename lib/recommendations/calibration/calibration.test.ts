import { describe, expect, it } from "vitest";
import {
  buildCalibrationReport,
  computeBucketMetrics,
  estimateExcursions,
  runRecommendationCalibration,
} from "@/lib/recommendations/calibration/engine";
import type { PaperTrade } from "@/lib/paper-trading";
import { QUALITY_GATE_THRESHOLDS } from "@/lib/recommendations/quality-gate";

function makeTrade(
  overrides: Partial<PaperTrade> & {
    id: string;
    pnl: number;
    returnPercent: number;
    conviction?: number;
    riskReward?: number;
    regime?: string;
  }
): PaperTrade {
  const {
    id,
    pnl,
    returnPercent,
    conviction = 70,
    riskReward = 2,
    regime = "Bullish",
    ...rest
  } = overrides;
  return {
    id,
    strategy: "swing",
    status: "closed",
    symbol: "TEST",
    company: "Test",
    shares: 10,
    entryPrice: 100,
    entryAt: "2026-07-01T04:00:00.000Z",
    currentPrice: 100 + returnPercent,
    targetsHit: pnl > 0 ? 1 : 0,
    stopLoss: 95,
    targets: [105, 110, 115],
    confidence: conviction,
    conviction,
    riskReward,
    recommendationScore: conviction,
    exitPrice: 100 + returnPercent,
    exitAt: "2026-07-02T04:00:00.000Z",
    exitReason: pnl > 0 ? "target_1" : "stop_loss",
    pnl,
    returnPercent,
    holdingMs: 24 * 60 * 60 * 1000,
    recommendation: {
      recommendationId: `rec:${id}`,
      symbol: "TEST",
      company: "Test",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction,
      confidence: conviction,
      opportunityScore: conviction,
      riskReward,
      entry: 100,
      stopLoss: 95,
      targets: [105, 110, 115],
      holdingPeriod: "2–8 weeks",
      reasons: [],
      evidence: [],
      marketContext: regime,
      marketRegime: regime,
      timestamp: "2026-07-01T04:00:00.000Z",
      aiExplanation: "",
    },
    timeline: [
      {
        id: "e1",
        type: "buy_executed",
        label: "BUY",
        timestamp: "2026-07-01T04:00:00.000Z",
        price: 100,
      },
      {
        id: "e2",
        type: "closed",
        label: "Closed",
        timestamp: "2026-07-02T04:00:00.000Z",
        price: 100 + returnPercent,
      },
    ],
    updatedAt: "2026-07-02T04:00:00.000Z",
    ...rest,
  };
}

describe("Recommendation Calibration Engine", () => {
  it("estimates MFE/MAE from timeline", () => {
    const trade = makeTrade({
      id: "t1",
      pnl: 50,
      returnPercent: 5,
      timeline: [
        {
          id: "a",
          type: "buy_executed",
          label: "BUY",
          timestamp: "2026-07-01T04:00:00.000Z",
          price: 100,
        },
        {
          id: "b",
          type: "target_1_hit",
          label: "T1",
          timestamp: "2026-07-01T08:00:00.000Z",
          price: 108,
        },
        {
          id: "c",
          type: "closed",
          label: "Closed",
          timestamp: "2026-07-02T04:00:00.000Z",
          price: 105,
        },
      ],
    });
    const { mfe, mae } = estimateExcursions(trade);
    expect(mfe).toBeGreaterThanOrEqual(8);
    expect(mae).toBeLessThanOrEqual(0);
  });

  it("computes expectancy and profit factor", () => {
    const metrics = computeBucketMetrics([
      makeTrade({ id: "w1", pnl: 200, returnPercent: 4, conviction: 80 }),
      makeTrade({ id: "w2", pnl: 100, returnPercent: 2, conviction: 80 }),
      makeTrade({ id: "l1", pnl: -50, returnPercent: -1, conviction: 80 }),
    ]);
    expect(metrics.trades).toBe(3);
    expect(metrics.winRate).toBeCloseTo(66.67, 0);
    expect(metrics.expectancy).toBeGreaterThan(0);
    expect(metrics.profitFactor).toBeGreaterThan(1);
  });

  it("suggests raising conviction when low buckets underperform", () => {
    const trades: PaperTrade[] = [];
    for (let i = 0; i < 4; i++) {
      trades.push(
        makeTrade({
          id: `low-${i}`,
          pnl: -100,
          returnPercent: -3,
          conviction: 58,
          regime: "Bullish",
        })
      );
    }
    for (let i = 0; i < 4; i++) {
      trades.push(
        makeTrade({
          id: `high-${i}`,
          pnl: 150,
          returnPercent: 4,
          conviction: 78,
          regime: "Bullish",
        })
      );
    }

    const report = buildCalibrationReport(trades);
    expect(report.closedTrades).toBe(8);
    expect(report.currentThresholds.minConviction).toBe(
      QUALITY_GATE_THRESHOLDS.minConviction
    );
    expect(report.bestBucket).not.toBeNull();
    expect(report.worstBucket).not.toBeNull();
    const convictionSuggestion = report.suggestions.find(
      (s) => s.key === "minConviction"
    );
    expect(convictionSuggestion).toBeTruthy();
    expect(convictionSuggestion!.suggested).toBeGreaterThan(
      QUALITY_GATE_THRESHOLDS.minConviction
    );
    expect(report.suggestedThresholds.minConviction).toBe(
      convictionSuggestion!.suggested
    );
  });

  it("prints live calibration validation summary", () => {
    const report = runRecommendationCalibration();
    const best = report.bestBucket;
    const worst = report.worstBucket;
    // eslint-disable-next-line no-console
    console.log("\n=== Calibration Validation ===");
    // eslint-disable-next-line no-console
    console.log(
      "Best performing bucket:",
      best
        ? `${best.dimension}:${best.key} expectancy=${best.expectancy}% winRate=${best.winRate}% n=${best.trades}`
        : "(none — insufficient sample)"
    );
    // eslint-disable-next-line no-console
    console.log(
      "Worst performing bucket:",
      worst
        ? `${worst.dimension}:${worst.key} expectancy=${worst.expectancy}% winRate=${worst.winRate}% n=${worst.trades}`
        : "(none — insufficient sample)"
    );
    // eslint-disable-next-line no-console
    console.log(
      "Suggested threshold changes:",
      report.suggestions.length === 0
        ? "(none)"
        : report.suggestions
            .map(
              (s) =>
                `${s.key}: ${s.current} → ${s.suggested} (${s.expectedImpact})`
            )
            .join(" | ")
    );
    // eslint-disable-next-line no-console
    console.log(
      "Expected impact:",
      report.suggestions.map((s) => s.expectedImpact).join(" · ") ||
        "No threshold changes suggested at current sample size."
    );
    // eslint-disable-next-line no-console
    console.log(
      `Closed trades=${report.closedTrades} confidence=${report.confidence}`
    );
    expect(report.currentThresholds).toEqual(QUALITY_GATE_THRESHOLDS);
    expect(report.suggestedThresholds).toBeDefined();
  });
});
