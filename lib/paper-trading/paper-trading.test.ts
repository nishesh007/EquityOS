import { describe, expect, it } from "vitest";
import {
  compareRecommendationsForPaper,
  isBuyableRecommendation,
  resolvePaperStrategy,
  selectCandidatesForStrategy,
} from "@/lib/paper-trading/selection";
import { computeKpis, computeTradePnl } from "@/lib/paper-trading/kpis";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { PaperTrade } from "@/lib/paper-trading/types";

function makeRec(
  overrides: Partial<SharedRecommendation> &
    Pick<SharedRecommendation, "id" | "symbol">
): SharedRecommendation {
  return {
    company: overrides.symbol,
    category: "intraday",
    action: "BUY",
    primaryStrategy: "Intraday Momentum",
    primaryStrategyId: "intraday",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 80,
    conflictPercent: 0,
    opportunityScore: 70,
    frameworkScore: 70,
    confidence: 75,
    conviction: 80,
    entry: 100,
    stopLoss: 95,
    targets: [102, 104, 106],
    risk: 5,
    reward: 6,
    riskReward: 1.2,
    holdingPeriod: "1 – 3 Hours",
    marketContext: "Risk-on",
    marketRegime: "Bullish",
    riskMode: "Normal",
    reasons: ["Strong momentum"],
    evidence: [],
    validation: {
      valid: true,
      score: 80,
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
    timestamp: "2026-07-26T04:00:00.000Z",
    source: "OpportunityEngine",
    ...overrides,
  } as SharedRecommendation;
}

describe("paper-trading selection (11E.1)", () => {
  it("maps primaryStrategyId to portfolio", () => {
    expect(
      resolvePaperStrategy(
        makeRec({ id: "1", symbol: "AAA", primaryStrategyId: "scalping" })
      )
    ).toBe("scalping");
    expect(
      resolvePaperStrategy(
        makeRec({ id: "2", symbol: "BBB", primaryStrategyId: "swing" })
      )
    ).toBe("swing");
  });

  it("rejects non-buyable recommendations", () => {
    expect(
      isBuyableRecommendation(
        makeRec({ id: "1", symbol: "AAA", action: "WATCHLIST" })
      )
    ).toBe(false);
    expect(isBuyableRecommendation(makeRec({ id: "2", symbol: "BBB" }))).toBe(
      true
    );
  });

  it("selects by conviction → score → RR → recency", () => {
    const recs = [
      makeRec({
        id: "a",
        symbol: "A",
        conviction: 70,
        opportunityScore: 99,
        riskReward: 3,
        timestamp: "2026-07-26T05:00:00.000Z",
      }),
      makeRec({
        id: "b",
        symbol: "B",
        conviction: 90,
        opportunityScore: 50,
        riskReward: 1,
        timestamp: "2026-07-26T01:00:00.000Z",
      }),
      makeRec({
        id: "c",
        symbol: "C",
        conviction: 90,
        opportunityScore: 80,
        riskReward: 2,
        timestamp: "2026-07-26T02:00:00.000Z",
      }),
    ];
    const ranked = [...recs].sort(compareRecommendationsForPaper);
    // c beats b (same conviction, higher score); both beat a
    expect(ranked.map((r) => r.id)).toEqual(["c", "b", "a"]);

    const selected = selectCandidatesForStrategy(recs, "intraday", {
      testedIds: new Set(),
      openSymbols: new Set(),
      openSlotsRemaining: 2,
    });
    expect(selected.map((r) => r.id)).toEqual(["c", "b"]);
  });
});

describe("paper-trading kpis", () => {
  it("computes pnl and kpis", () => {
    expect(computeTradePnl(100, 110, 100)).toEqual({
      pnl: 1000,
      returnPercent: 10,
    });

    const trades: PaperTrade[] = [
      {
        id: "t1",
        strategy: "intraday",
        status: "target_1_hit",
        symbol: "AAA",
        company: "AAA",
        shares: 100,
        entryPrice: 100,
        entryAt: new Date().toISOString(),
        currentPrice: 110,
        targetsHit: 1,
        stopLoss: 95,
        targets: [105, 108, 112],
        confidence: 80,
        conviction: 85,
        riskReward: 2,
        recommendationScore: 70,
        exitPrice: 110,
        exitAt: new Date().toISOString(),
        exitReason: "target_1",
        pnl: 1000,
        returnPercent: 10,
        holdingMs: 3_600_000,
        recommendation: {
          recommendationId: "r1",
          symbol: "AAA",
          company: "AAA",
          action: "BUY",
          primaryStrategy: "Intraday",
          primaryStrategyId: "intraday",
          conviction: 85,
          confidence: 80,
          opportunityScore: 70,
          riskReward: 2,
          entry: 100,
          stopLoss: 95,
          targets: [105, 108, 112],
          holdingPeriod: "1 – 3 Hours",
          reasons: [],
          evidence: [],
          marketContext: "",
          marketRegime: "",
          timestamp: new Date().toISOString(),
          aiExplanation: "test",
        },
        timeline: [],
        updatedAt: new Date().toISOString(),
      },
    ];

    const kpis = computeKpis(trades);
    expect(kpis.closedPositions).toBe(1);
    expect(kpis.winRate).toBe(100);
    expect(kpis.totalVirtualPnl).toBe(1000);
  });
});
