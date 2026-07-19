import { describe, expect, it } from "vitest";
import { buildStrategyConsensus } from "@/lib/opportunity-engine/strategy-consensus";
import type { OpportunityStrategySignal } from "@/lib/opportunity-engine/types";

function signal(
  partial: Partial<OpportunityStrategySignal> &
    Pick<OpportunityStrategySignal, "strategyId" | "strategy" | "signal">
): OpportunityStrategySignal {
  return {
    category: "Swing",
    timeframe: "1D–1W",
    entry: 100,
    stopLoss: 95,
    target: 120,
    target1: 110,
    target2: 120,
    holdingPeriod: "1W",
    confidence: 70,
    conviction: 72,
    risk: 5,
    reward: 20,
    riskReward: 4,
    reasons: [],
    evidence: [],
    tags: [],
    marketContext: "Bullish",
    marketRegime: "Strong Bull",
    eligibility: { eligible: true, score: 80, reasons: [] },
    timestamp: "2026-07-19T10:00:00.000Z",
    ...partial,
  };
}

describe("buildStrategyConsensus", () => {
  it("raises agreement when swing strategies align", () => {
    const primary = signal({
      strategyId: "ema-pullback",
      strategy: "EMA Pullback",
      signal: "BUY",
      confidence: 80,
    });
    const consensus = buildStrategyConsensus(
      [
        primary,
        signal({
          strategyId: "vcp",
          strategy: "VCP",
          signal: "BUY",
          confidence: 75,
        }),
        signal({
          strategyId: "cup-and-handle",
          strategy: "Cup & Handle",
          signal: "BUY",
          confidence: 72,
        }),
      ],
      primary
    );

    expect(consensus?.agreementPercent).toBe(100);
    expect(consensus?.conflictPercent).toBe(0);
    expect(consensus?.supportingStrategies).toEqual(["VCP", "Cup & Handle"]);
    expect(consensus?.technicalFramework.length).toBeGreaterThan(0);
  });

  it("reports conflict when strategies disagree", () => {
    const primary = signal({
      strategyId: "buffett",
      strategy: "Buffett",
      signal: "BUY",
      category: "Position",
      confidence: 78,
    });
    const consensus = buildStrategyConsensus(
      [
        primary,
        signal({
          strategyId: "graham",
          strategy: "Graham",
          signal: "SELL",
          category: "Position",
          confidence: 70,
        }),
      ],
      primary
    );

    expect(consensus?.opposingStrategies).toEqual(["Graham"]);
    expect(consensus?.conflictPercent).toBe(100);
    expect(consensus?.fundamentalFramework).toContain("Buffett");
  });
});
