import { describe, expect, it } from "vitest";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import {
  buildExecutiveDecisionView,
  convictionBandFromScore,
  toDecisionAction,
} from "./executive-decision-presenter";

function sampleRecommendation(
  overrides: Partial<SharedRecommendation> = {}
): SharedRecommendation {
  return {
    id: "rec-1",
    symbol: "RELIANCE",
    company: "Reliance Industries",
    category: "swing",
    action: "BUY",
    primaryStrategy: "Swing Momentum",
    primaryStrategyId: "swing",
    matchedStrategies: ["Swing Momentum"],
    supportingStrategies: ["Trend Follow"],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 82,
    conflictPercent: 8,
    opportunityScore: 78,
    frameworkScore: 74,
    confidence: 81.2,
    conviction: 80,
    entry: 1400,
    stopLoss: 1320,
    targets: [1480, 1550, 1620],
    risk: 80,
    reward: 220,
    riskReward: 2.75,
    expectedReturnPercent: 5.7,
    entryLow: 1390,
    entryHigh: 1410,
    holdingPeriod: "10–15 Trading Days",
    marketContext: "Constructive market backdrop",
    marketRegime: "Risk-On",
    riskMode: "Neutral",
    eligibility: { eligible: true, score: 90, reasons: [] },
    reasons: ["Aligned momentum and institutional accumulation"],
    evidence: ["ADX supportive", "Relative strength leadership"],
    matchedFrameworks: {
      technical: ["EMA alignment", "Positive momentum"],
      fundamental: ["Earnings growth"],
      valuation: ["Near fair value band"],
      growth: ["Compounder profile"],
    },
    validation: {
      valid: true,
      score: 100,
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
      technicalQuality: 78,
      fundamentalQuality: 72,
      valuation: 64,
      growth: 70,
      capitalAllocation: 68,
      momentum: 76,
      institutionalOwnership: 60,
      sectorStrength: 65,
      marketContext: 70,
      marketRegime: 72,
      aiConfidence: 80,
      risk: 58,
      reward: 74,
      frameworkScore: 74,
    },
    timestamp: "2026-07-25T10:00:00.000Z",
    source: "StrategyEngine",
    ...overrides,
  };
}

describe("executive-decision-presenter", () => {
  it("maps conviction bands from existing scores", () => {
    expect(convictionBandFromScore(80)).toBe("High");
    expect(convictionBandFromScore(65)).toBe("Medium");
    expect(convictionBandFromScore(40)).toBe("Low");
  });

  it("builds a complete executive decision view from SharedRecommendation", () => {
    const rec = sampleRecommendation();
    const view = buildExecutiveDecisionView({
      action: toDecisionAction(rec.action),
      confidence: rec.confidence,
      source: rec,
    });

    expect(view.executiveSummary.available).toBe(true);
    expect(view.executiveSummary.action).toBe("BUY");
    expect(view.executiveSummary.convictionBand).toBe("High");
    expect(view.executiveSummary.narrative.length).toBeGreaterThan(40);

    expect(view.committee.members).toHaveLength(5);
    expect(view.committee.overallLabel).toBe("Strong Buy");
    expect(view.committee.consensusPercent).toBe(82);

    expect(view.tradePlan.available).toBe(true);
    expect(view.tradePlan.entry).toBe(1400);
    expect(view.tradePlan.stopLoss).toBe(1320);
    expect(view.tradePlan.target1).toBe(1480);
    expect(view.tradePlan.target3).toBe(1620);
    expect(view.tradePlan.riskReward).toBe(2.8);

    expect(view.aiConviction.rows).toHaveLength(8);
    expect(view.aiConviction.rows.at(-1)?.label).toBe("Overall");
    expect(view.aiConviction.overall).toBe(80);
  });

  it("returns graceful placeholders when source is missing", () => {
    const view = buildExecutiveDecisionView({
      action: "HOLD",
      confidence: 55,
      currentPrice: 3500,
      source: null,
      tradeHints: {
        entry: 3480,
        entryLow: 3470,
        entryHigh: 3490,
        primaryTarget: 3600,
      },
    });

    expect(view.executiveSummary.available).toBe(false);
    expect(view.committee.overallLabel).toBe("Insufficient Data");
    expect(view.tradePlan.entry).toBe(3480);
    expect(view.tradePlan.target1).toBe(3600);
    const incomplete = view.aiConviction.rows.filter(
      (row) => row.label !== "Overall"
    );
    expect(incomplete.every((row) => row.score == null)).toBe(true);
  });

  it("maps WATCHLIST engine action to HOLD for display", () => {
    const rec = sampleRecommendation({ action: "WATCHLIST", conviction: 62 });
    const view = buildExecutiveDecisionView({
      action: toDecisionAction(rec.action),
      confidence: rec.confidence,
      source: rec,
    });
    expect(view.executiveSummary.action).toBe("HOLD");
    expect(view.executiveSummary.convictionBand).toBe("Medium");
    expect(view.committee.overallLabel).toBe("Hold");
  });
});
