import { describe, expect, it } from "vitest";
import {
  buildEquityCurve,
  buildMonthlyPerformance,
  computeExecutiveKpis,
  computeMaximumDrawdown,
  computeRecommendationValidation,
  computeStrategyComparison,
  computeTabPerformanceMetrics,
  selectBestTrades,
  selectWorstTrades,
} from "@/lib/paper-trading/analytics";
import { filterTradesForAnalytics } from "@/lib/paper-trading/analytics-filters";
import type { PaperTrade } from "@/lib/paper-trading/types";

function makeClosedTrade(
  overrides: Partial<PaperTrade> &
    Pick<PaperTrade, "id" | "pnl" | "returnPercent">
): PaperTrade {
  return {
    strategy: "swing",
    status: "target_1_hit",
    symbol: "AAA",
    company: "AAA Corp",
    shares: 100,
    entryPrice: 100,
    entryAt: "2026-07-01T04:00:00.000Z",
    currentPrice: 110,
    targetsHit: 1,
    stopLoss: 95,
    targets: [105, 108, 112],
    confidence: 80,
    conviction: 88,
    riskReward: 2,
    recommendationScore: 70,
    exitPrice: 110,
    exitAt: "2026-07-02T10:00:00.000Z",
    exitReason: "target_1",
    holdingMs: 3_600_000,
    recommendation: {
      recommendationId: overrides.id ?? "r1",
      symbol: "AAA",
      company: "AAA Corp",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction: 88,
      confidence: 80,
      opportunityScore: 70,
      riskReward: 2,
      entry: 100,
      stopLoss: 95,
      targets: [105, 108, 112],
      holdingPeriod: "5 – 10 Days",
      reasons: [],
      evidence: [],
      marketContext: "",
      marketRegime: "",
      timestamp: "2026-07-01T04:00:00.000Z",
      aiExplanation: "test",
    },
    timeline: [],
    updatedAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("paper-trading institutional analytics (11E.2)", () => {
  const trades: PaperTrade[] = [
    makeClosedTrade({
      id: "w1",
      symbol: "WIN",
      pnl: 1000,
      returnPercent: 10,
      conviction: 92,
      exitAt: "2026-07-05T10:00:00.000Z",
      exitReason: "target_1",
      recommendation: {
        ...makeClosedTrade({ id: "w1", pnl: 1000, returnPercent: 10 })
          .recommendation,
        recommendationId: "rec-w1",
      },
    }),
    makeClosedTrade({
      id: "l1",
      symbol: "LOSS",
      pnl: -400,
      returnPercent: -4,
      conviction: 75,
      exitAt: "2026-07-10T10:00:00.000Z",
      exitReason: "stop_loss",
      status: "stop_loss_hit",
      recommendation: {
        ...makeClosedTrade({ id: "l1", pnl: -400, returnPercent: -4 })
          .recommendation,
        recommendationId: "rec-l1",
      },
    }),
    makeClosedTrade({
      id: "w2",
      symbol: "WIN2",
      strategy: "intraday",
      pnl: 200,
      returnPercent: 2,
      conviction: 96,
      exitAt: "2026-08-01T10:00:00.000Z",
      exitReason: "target_2",
      status: "target_2_hit",
      recommendation: {
        ...makeClosedTrade({ id: "w2", pnl: 200, returnPercent: 2 })
          .recommendation,
        recommendationId: "rec-w2",
      },
    }),
    {
      ...makeClosedTrade({
        id: "o1",
        symbol: "OPEN",
        pnl: -50,
        returnPercent: -0.5,
        conviction: 82,
      }),
      status: "open",
      exitAt: undefined,
      exitReason: undefined,
      exitPrice: undefined,
      recommendation: {
        ...makeClosedTrade({ id: "o1", pnl: -50, returnPercent: -0.5 })
          .recommendation,
        recommendationId: "rec-o1",
      },
    },
  ];

  it("computes executive KPIs with best/worst strategy", () => {
    const kpis = computeExecutiveKpis(trades, "2026-07-26T10:00:00.000Z");
    expect(kpis.totalTrades).toBe(4);
    expect(kpis.openPositions).toBe(1);
    expect(kpis.closedPositions).toBe(3);
    expect(kpis.winningTrades).toBe(2);
    expect(kpis.losingTrades).toBe(1);
    expect(kpis.overallWinRate).toBeCloseTo(66.7, 0);
    expect(kpis.netVirtualPnl).toBe(750);
    expect(kpis.profitFactor).toBe(3);
    expect(kpis.bestStrategy).toBeTruthy();
    expect(kpis.lastUpdated).toBe("2026-07-26T10:00:00.000Z");
  });

  it("builds strategy comparison for all three portfolios", () => {
    const comparison = computeStrategyComparison(trades);
    expect(comparison).toHaveLength(3);
    expect(comparison.map((r) => r.strategy)).toEqual([
      "intraday",
      "scalping",
      "swing",
    ]);
    expect(comparison.find((r) => r.strategy === "swing")?.totalTrades).toBe(3);
  });

  it("computes tab metrics including RR and conviction", () => {
    const metrics = computeTabPerformanceMetrics(trades, "overview");
    expect(metrics.averageRiskReward).toBeGreaterThan(0);
    expect(metrics.averageConviction).toBeGreaterThan(0);
    expect(metrics.winningTrades).toBe(2);
  });

  it("builds equity curve with period P&L and monthly net return", () => {
    const curve = buildEquityCurve(trades, "all");
    expect(curve).toHaveLength(3);
    expect(curve[curve.length - 1].equity).toBe(800);
    expect(curve[0].periodPnl).toBeDefined();

    const monthly = buildMonthlyPerformance(trades);
    expect(monthly.length).toBeGreaterThanOrEqual(1);
    expect(monthly[0].netReturn).toBeDefined();
  });

  it("validates recommendations and conviction bands", () => {
    const validation = computeRecommendationValidation(trades, [
      "rec-w1",
      "rec-l1",
      "rec-w2",
      "rec-o1",
    ]);
    expect(validation.recommendationsGenerated).toBe(4);
    expect(validation.recommendationsExecuted).toBe(4);
    expect(validation.convictionBands).toHaveLength(5);
    expect(
      validation.convictionBands.find((b) => b.band === "90-95")?.trades
    ).toBeGreaterThanOrEqual(1);
  });

  it("filters explorer including target hit and recommendation id search", () => {
    const filtered = filterTradesForAnalytics(trades, {
      strategy: "all",
      outcome: "target_hit",
      status: "closed",
      dateFrom: null,
      dateTo: null,
      search: "rec-w2",
      company: "",
    });
    expect(filtered.map((t) => t.id)).toEqual(["w2"]);
  });

  it("selects best/worst and drawdown", () => {
    expect(selectBestTrades(trades, 1)[0].id).toBe("w1");
    expect(selectWorstTrades(trades, 1)[0].id).toBe("l1");
    expect(
      computeMaximumDrawdown([
        makeClosedTrade({
          id: "a",
          pnl: 100,
          returnPercent: 1,
          exitAt: "2026-07-01T00:00:00.000Z",
        }),
        makeClosedTrade({
          id: "b",
          pnl: -60,
          returnPercent: -1,
          exitAt: "2026-07-02T00:00:00.000Z",
        }),
        makeClosedTrade({
          id: "c",
          pnl: -20,
          returnPercent: -1,
          exitAt: "2026-07-03T00:00:00.000Z",
        }),
      ])
    ).toBe(80);
  });
});
