import { describe, expect, it } from "vitest";
import { applyConsensusEngine } from "@/lib/recommendations/consensus";
import {
  verifyRecommendation,
  buildVerificationReport,
} from "@/lib/recommendations/verification";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

function makeRec(
  overrides: Partial<SharedRecommendation> &
    Pick<SharedRecommendation, "id" | "symbol">
): SharedRecommendation {
  return {
    company: `${overrides.symbol} Ltd`,
    category: "swing",
    action: "BUY",
    primaryStrategy: "Swing",
    primaryStrategyId: "swing",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 80,
    conflictPercent: 0,
    opportunityScore: 80,
    frameworkScore: 75,
    confidence: 80,
    conviction: 80,
    entry: 100,
    entryLow: 99,
    entryHigh: 101,
    stopLoss: 95,
    targets: [110, 115, 120],
    risk: 5,
    reward: 10,
    riskReward: 2,
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
    longTermRanking: null,
    timestamp: "2026-07-28T10:00:00.000Z",
    source: "OpportunityEngine",
    ...overrides,
  };
}

describe("Verification Engine v2 (advisory)", () => {
  it("verifies a consistent long setup", () => {
    const [scored] = applyConsensusEngine([
      makeRec({ id: "ok", symbol: "OK" }),
    ]);
    const result = verifyRecommendation(scored, {
      regime: "Bullish",
      marketTrend: "Bullish",
      pricesBySymbol: { OK: 100 },
    });
    expect(result.verificationStatus).toBe("VERIFIED");
    expect(result.publishable).toBe(true);
  });

  it("blocks invalid stop for long", () => {
    const [scored] = applyConsensusEngine([
      makeRec({ id: "bad", symbol: "BAD", stopLoss: 105, entry: 100 }),
    ]);
    const result = verifyRecommendation(scored, {
      regime: "Bullish",
      marketTrend: "Bullish",
      pricesBySymbol: { BAD: 100 },
    });
    expect(result.verificationStatus).toBe("BLOCKED");
    expect(result.publishable).toBe(false);
  });

  it("treats regime mismatch as warning, not block", () => {
    const [scored] = applyConsensusEngine([
      makeRec({
        id: "warn",
        symbol: "WARN",
        marketRegime: "Bearish",
        marketContext: "Bearish",
      }),
    ]);
    const result = verifyRecommendation(scored, {
      regime: "Strong Bear",
      marketTrend: "Strong Bear downtrend",
      pricesBySymbol: { WARN: 100 },
      breadthScore: 30,
    });
    expect(result.verificationStatus).toBe("VERIFIED_WITH_WARNING");
    expect(result.publishable).toBe(true);
  });

  it("reports advisory distribution shape", () => {
    const report = buildVerificationReport([
      makeRec({ id: "a", symbol: "A" }),
      makeRec({ id: "b", symbol: "B", stopLoss: 120, entry: 100 }),
    ]);
    expect(report.mode).toBe("advisory");
    expect(report.reasonDistribution).toBeDefined();
  });
});
