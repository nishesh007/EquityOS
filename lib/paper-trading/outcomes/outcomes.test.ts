import { describe, expect, it } from "vitest";
import {
  applyPriceExcursion,
  buildTradeOutcomeReport,
  mapPaperExitReason,
  runTradeOutcomeEngine,
  toTradeOutcomeRecord,
} from "@/lib/paper-trading/outcomes";
import type { PaperTrade } from "@/lib/paper-trading/types";

function makeTrade(
  overrides: Partial<PaperTrade> & {
    id: string;
    pnl: number;
    returnPercent: number;
    exitReason?: PaperTrade["exitReason"];
  }
): PaperTrade {
  const {
    id,
    pnl,
    returnPercent,
    exitReason = "target_1",
    ...rest
  } = overrides;
  return {
    id,
    strategy: "swing",
    status: exitReason === "stop_loss" ? "stop_loss_hit" : "target_1_hit",
    symbol: "TEST",
    company: "Test Co",
    shares: 100,
    entryPrice: 100,
    entryAt: "2026-07-01T04:00:00.000Z",
    currentPrice: 100 + returnPercent,
    targetsHit: exitReason?.startsWith("target_") ? 1 : 0,
    stopLoss: 95,
    targets: [105, 110, 115],
    confidence: 70,
    conviction: 72,
    riskReward: 2,
    recommendationScore: 70,
    exitPrice: 100 + returnPercent,
    exitAt: "2026-07-03T04:00:00.000Z",
    exitReason,
    pnl,
    returnPercent,
    holdingMs: 2 * 86_400_000,
    sessionId: "2026-07-01",
    scanId: "2026-07-01:1",
    horizon: "3–10 days",
    mfePercent: Math.max(0, returnPercent + 1),
    maePercent: Math.min(0, returnPercent - 1),
    maxDrawdownPercent: Math.abs(Math.min(0, returnPercent - 1)),
    timeToFirstTargetMs: exitReason?.startsWith("target_")
      ? 86_400_000
      : null,
    timeToStopLossMs: exitReason === "stop_loss" ? 86_400_000 : null,
    recommendation: {
      recommendationId: `rec:${id}`,
      symbol: "TEST",
      company: "Test Co",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction: 72,
      confidence: 70,
      opportunityScore: 70,
      riskReward: 2,
      entry: 100,
      stopLoss: 95,
      targets: [105, 110, 115],
      holdingPeriod: "3–10 days",
      reasons: [],
      evidence: [],
      marketContext: "Bullish",
      marketRegime: "Bullish",
      timestamp: "2026-07-01T04:00:00.000Z",
      aiExplanation: "",
      sessionId: "2026-07-01",
      scanId: "2026-07-01:1",
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
        type: exitReason === "stop_loss" ? "stop_loss_hit" : "target_1_hit",
        label: "Exit",
        timestamp: "2026-07-03T04:00:00.000Z",
        price: 100 + returnPercent,
      },
    ],
    updatedAt: "2026-07-03T04:00:00.000Z",
    ...rest,
  };
}

describe("Trade Outcome Engine", () => {
  it("maps paper exit reasons to outcome taxonomy", () => {
    expect(mapPaperExitReason("target_2")).toBe("TARGET_2");
    expect(mapPaperExitReason("stop_loss")).toBe("STOP_LOSS");
    expect(mapPaperExitReason("market_close")).toBe("TIME_EXIT");
    expect(mapPaperExitReason("recommendation_expired")).toBe("INVALIDATED");
  });

  it("tracks running MFE/MAE/drawdown on mark-to-market", () => {
    const trade = makeTrade({
      id: "open",
      pnl: 0,
      returnPercent: 0,
      status: "open",
      exitReason: undefined,
      exitPrice: undefined,
      exitAt: undefined,
      mfePercent: 0,
      maePercent: 0,
      maxDrawdownPercent: 0,
    });
    const up = applyPriceExcursion(trade, 108);
    expect(up.mfePercent).toBeGreaterThanOrEqual(8);
    const down = applyPriceExcursion({ ...trade, ...up }, 102);
    expect(down.maxDrawdownPercent).toBeGreaterThan(0);
    expect(down.maePercent).toBeLessThanOrEqual(0);
  });

  it("builds strategy outcome report with exit distribution", () => {
    const trades = [
      makeTrade({
        id: "w1",
        pnl: 500,
        returnPercent: 5,
        exitReason: "target_1",
        strategy: "swing",
      }),
      makeTrade({
        id: "l1",
        pnl: -300,
        returnPercent: -3,
        exitReason: "stop_loss",
        strategy: "swing",
      }),
      makeTrade({
        id: "w2",
        pnl: 200,
        returnPercent: 2,
        exitReason: "target_2",
        strategy: "intraday",
      }),
      makeTrade({
        id: "l2",
        pnl: -100,
        returnPercent: -1,
        exitReason: "market_close",
        strategy: "intraday",
      }),
    ];

    const report = buildTradeOutcomeReport(trades);
    expect(report.tradesAnalyzed).toBe(4);
    expect(report.closedTrades).toBe(4);
    expect(report.mostCommonExitReason).toBeTruthy();
    expect(report.exitReasonDistribution.TARGET_1).toBe(1);
    expect(report.exitReasonDistribution.STOP_LOSS).toBe(1);
    expect(report.exitReasonDistribution.TIME_EXIT).toBe(1);
    expect(report.bestStrategy).not.toBeNull();
    expect(report.worstStrategy).not.toBeNull();

    const swing = report.strategySummaries.find((s) => s.strategy === "swing");
    expect(swing?.trades).toBe(2);
    expect(swing?.targetHitPercent).toBeGreaterThan(0);
    expect(swing?.stopLossHitPercent).toBeGreaterThan(0);

    const record = toTradeOutcomeRecord(trades[0]);
    expect(record.sessionId).toBe("2026-07-01");
    expect(record.scanId).toBe("2026-07-01:1");
    expect(record.holdingDays).toBe(2);
    expect(record.mfe).toBeGreaterThan(0);
  });

  it("prints live outcome validation summary", () => {
    const report = runTradeOutcomeEngine();
    // eslint-disable-next-line no-console
    console.log("\n=== Trade Outcome Validation ===");
    // eslint-disable-next-line no-console
    console.log(`Trades analyzed: ${report.tradesAnalyzed} (closed=${report.closedTrades})`);
    // eslint-disable-next-line no-console
    console.log(
      "Outcome statistics:",
      `avgMFE=${report.mfeMaeStatistics.averageMfe}% avgMAE=${report.mfeMaeStatistics.averageMae}% avgDD=${report.mfeMaeStatistics.averageDrawdown}%`
    );
    // eslint-disable-next-line no-console
    console.log(
      "Most common exit reason:",
      report.mostCommonExitReason ?? "(none)",
      report.mostCommonExitReason
        ? `(n=${report.exitReasonDistribution[report.mostCommonExitReason]})`
        : ""
    );
    // eslint-disable-next-line no-console
    console.log(
      "Best strategy:",
      report.bestStrategy
        ? `${report.bestStrategy.strategy} expectancy=${report.bestStrategy.expectancy}% winRate=${report.bestStrategy.winRate}%`
        : "(none)"
    );
    // eslint-disable-next-line no-console
    console.log(
      "Worst strategy:",
      report.worstStrategy
        ? `${report.worstStrategy.strategy} expectancy=${report.worstStrategy.expectancy}% winRate=${report.worstStrategy.winRate}%`
        : "(none)"
    );
    expect(report.strategySummaries).toHaveLength(3);
    expect(report.mfeMaeStatistics).toBeDefined();
  });
});
