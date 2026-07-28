import { describe, expect, it } from "vitest";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  buildInstitutionalRankingReport,
  rankRecommendations,
  runInstitutionalRanking,
  selectInstitutionallyRankedStrategyDashboard,
} from "@/lib/recommendations/institutional-ranking/engine";
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
    conflictPercent: 10,
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
    evidence: ["volume surge", "high liquidity"],
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
    longTermRanking: {
      technicalQuality: 70,
      fundamentalQuality: 70,
      valuation: 60,
      growth: 65,
      capitalAllocation: 60,
      momentum: 70,
      institutionalOwnership: 55,
      sectorStrength: 72,
      marketContext: 65,
      marketRegime: 70,
      aiConfidence: 70,
      risk: 40,
      reward: 70,
      frameworkScore: 70,
    },
    timestamp: "2026-07-28T10:00:00.000Z",
    source: "OpportunityEngine",
    ...overrides,
  };
}

function makeClosedTrade(
  overrides: Partial<PaperTrade> & {
    id: string;
    pnl: number;
    returnPercent: number;
    strategy?: PaperTrade["strategy"];
    conviction?: number;
  }
): PaperTrade {
  const {
    id,
    pnl,
    returnPercent,
    strategy = "swing",
    conviction = 70,
    ...rest
  } = overrides;
  return {
    id,
    strategy,
    status: pnl > 0 ? "target_1_hit" : "stop_loss_hit",
    symbol: "HIST",
    company: "Hist",
    shares: 100,
    entryPrice: 100,
    entryAt: "2026-07-01T04:00:00.000Z",
    currentPrice: 100 + returnPercent,
    targetsHit: pnl > 0 ? 1 : 0,
    stopLoss: 95,
    targets: [105, 110, 115],
    confidence: conviction,
    conviction,
    riskReward: 2,
    recommendationScore: conviction,
    exitPrice: 100 + returnPercent,
    exitAt: "2026-07-02T04:00:00.000Z",
    exitReason: pnl > 0 ? "target_1" : "stop_loss",
    pnl,
    returnPercent,
    holdingMs: 86_400_000,
    recommendation: {
      recommendationId: `rec-${id}`,
      symbol: "HIST",
      company: "Hist",
      action: "BUY",
      primaryStrategy: "Swing",
      primaryStrategyId: "swing",
      conviction,
      confidence: conviction,
      opportunityScore: conviction,
      riskReward: 2,
      entry: 100,
      stopLoss: 95,
      targets: [105, 110, 115],
      holdingPeriod: "3–10 days",
      reasons: ["Volume Surge"],
      evidence: ["volume surge", "high liquidity"],
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

describe("Institutional Ranking Engine v2", () => {
  it("ranks by institutional score not conviction alone", () => {
    const trades: PaperTrade[] = [];
    for (let i = 0; i < 4; i++) {
      trades.push(
        makeClosedTrade({
          id: `swing-w-${i}`,
          pnl: 200,
          returnPercent: 4,
          strategy: "swing",
          conviction: 78,
        })
      );
    }
    for (let i = 0; i < 4; i++) {
      trades.push(
        makeClosedTrade({
          id: `intra-l-${i}`,
          pnl: -150,
          returnPercent: -3,
          strategy: "intraday",
          conviction: 90,
        })
      );
    }

    const highConvictionWeakHistory = makeRec({
      id: "weak-hist",
      symbol: "WEAK",
      conviction: 95,
      primaryStrategyId: "intraday",
      category: "intraday",
      riskReward: 1.6,
    });
    const midConvictionStrongHistory = makeRec({
      id: "strong-hist",
      symbol: "STRONG",
      conviction: 72,
      primaryStrategyId: "swing",
      category: "swing",
      riskReward: 2.4,
    });

    const ranked = rankRecommendations(
      [highConvictionWeakHistory, midConvictionStrongHistory],
      {
        trades,
        market: { breadthScore: 60, asOf: "2026-07-28T12:00:00.000Z" },
      }
    );

    expect(ranked[0].id).toBe("strong-hist");
    expect(ranked[0].institutionalRank).toBeGreaterThan(
      ranked[1].institutionalRank
    );
    expect(ranked[0].rankReason.length).toBeGreaterThan(0);
    expect(ranked[0].expectedExpectancy).toBeDefined();
    expect(ranked[0].rankingConfidence).toBeGreaterThan(0);
  });

  it("ignores paper trades closed after asOf (no future data)", () => {
    const trades = [
      makeClosedTrade({
        id: "past",
        pnl: 100,
        returnPercent: 2,
        exitAt: "2026-07-20T04:00:00.000Z",
      }),
      makeClosedTrade({
        id: "future",
        pnl: 500,
        returnPercent: 20,
        exitAt: "2026-07-29T04:00:00.000Z",
      }),
    ];
    const report = buildInstitutionalRankingReport(
      [
        makeRec({
          id: "r1",
          symbol: "AAA",
          conviction: 70,
          primaryStrategyId: "swing",
        }),
      ],
      {
        trades,
        market: { asOf: "2026-07-28T00:00:00.000Z", breadthScore: 55 },
      }
    );
    expect(report.closedOutcomesUsed).toBe(1);
  });

  it("picks highest institutional rank per horizon for dashboard", () => {
    const slots = selectInstitutionallyRankedStrategyDashboard(
      [
        makeRec({
          id: "a",
          symbol: "AAA",
          conviction: 60,
          primaryStrategyId: "swing",
          riskReward: 1.5,
        }),
        makeRec({
          id: "b",
          symbol: "BBB",
          conviction: 70,
          primaryStrategyId: "swing",
          riskReward: 3.2,
        }),
      ],
      "2026-07-28T12:00:00.000Z",
      { breadthScore: 60, asOf: "2026-07-28T12:00:00.000Z" }
    );
    const swing = slots.find((s) => s.strategyId === "swing");
    expect(swing?.pick?.symbol).toBe("BBB");
  });

  it("prints live ranking validation summary", () => {
    const report = runInstitutionalRanking([], {
      breadthScore: 55,
      asOf: "2026-07-28T12:00:00.000Z",
    });
    // Live path exercised via API; empty candidates still produce distribution.
    expect(report.candidateCount).toBe(0);
    expect(report.rankingFactors.length).toBe(10);
    // eslint-disable-next-line no-console
    console.log("\n=== Institutional Ranking Validation (empty published) ===");
    // eslint-disable-next-line no-console
    console.log("Candidate count:", report.candidateCount);
  });
});
