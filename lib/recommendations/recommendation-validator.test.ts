import { describe, expect, it } from "vitest";
import {
  computeTradeMetrics,
  resolveValidatedEntry,
  validateInstitutionalTradeLevels,
} from "@/lib/recommendations/recommendation-validator";

describe("validateInstitutionalTradeLevels", () => {
  it("passes a valid BUY ladder", () => {
    const result = validateInstitutionalTradeLevels({
      action: "BUY",
      entry: 100,
      entryLow: 99,
      entryHigh: 101,
      stopLoss: 95,
      targets: [110, 116, 122],
      holdingPeriod: "3–10 days",
      primaryStrategy: "EMA Pullback",
      currentPrice: 100.5,
      statedRiskReward: 2.2,
    });
    expect(result.valid).toBe(true);
    expect(result.metrics?.riskReward).toBeGreaterThan(1);
    expect(result.metrics?.expectedReturnPercent).toBeGreaterThan(0);
  });

  it("rejects BUY with stop above entry (JINDWORLD-class bug)", () => {
    const result = validateInstitutionalTradeLevels({
      action: "BUY",
      entry: 32,
      entryLow: 31.61,
      entryHigh: 33.23,
      stopLoss: 36.32,
      targets: [39.72, 41.61],
      holdingPeriod: "2–8 weeks",
      primaryStrategy: "VWAP Mean Reversion",
      currentPrice: 37.83,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("Stop Loss"))).toBe(
      true
    );
  });

  it("rejects invalid BUY target ordering", () => {
    const result = validateInstitutionalTradeLevels({
      action: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [120, 110],
      holdingPeriod: "1 week",
      primaryStrategy: "Breakout",
    });
    expect(result.valid).toBe(false);
    expect(result.checks.targetOrdering).toBe(false);
  });

  it("passes a valid SELL ladder", () => {
    const result = validateInstitutionalTradeLevels({
      action: "SELL",
      entry: 100,
      entryLow: 99,
      entryHigh: 101,
      stopLoss: 108,
      targets: [90, 85, 80],
      holdingPeriod: "Intraday",
      primaryStrategy: "Opening Range Fade",
    });
    expect(result.valid).toBe(true);
    expect(result.metrics?.riskReward).toBeGreaterThan(1);
  });

  it("rejects SELL with stop below entry", () => {
    const result = validateInstitutionalTradeLevels({
      action: "SELL",
      entry: 100,
      stopLoss: 95,
      targets: [90, 85],
      holdingPeriod: "Intraday",
      primaryStrategy: "Breakdown",
    });
    expect(result.valid).toBe(false);
    expect(result.checks.stopLossGeometry).toBe(false);
  });

  it("rejects missing holding period / strategy placeholders", () => {
    const result = validateInstitutionalTradeLevels({
      action: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [110, 116],
      holdingPeriod: "—",
      primaryStrategy: "N/A",
    });
    expect(result.valid).toBe(false);
    expect(result.checks.holdingPeriodValid).toBe(false);
    expect(result.checks.strategyPresent).toBe(false);
  });

  it("rejects risk reward at or below 1", () => {
    const result = validateInstitutionalTradeLevels({
      action: "BUY",
      entry: 100,
      stopLoss: 90,
      targets: [105],
      holdingPeriod: "1 day",
      primaryStrategy: "Weak RR",
    });
    expect(result.valid).toBe(false);
    expect(result.checks.riskRewardAboveThreshold).toBe(false);
  });
});

describe("computeTradeMetrics", () => {
  it("recalculates BUY risk reward from actual levels", () => {
    const metrics = computeTradeMetrics("BUY", 100, 95, [110, 116]);
    expect(metrics).toEqual(
      expect.objectContaining({
        risk: 5,
        reward: 10,
        riskReward: 2,
        primaryTargetPercent: 10,
        expectedReturnPercent: 10,
      })
    );
  });
});

describe("resolveValidatedEntry", () => {
  it("falls back to signal entry when preferred remapping inverts SL", () => {
    const resolved = resolveValidatedEntry({
      action: "BUY",
      preferredEntry: 32,
      preferredLow: 31.61,
      preferredHigh: 33.23,
      signalEntry: 38,
      stopLoss: 36.32,
      targets: [39.72, 41.61],
      halfWidth: 0.01,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.entry).toBeGreaterThan(36.32);
    expect(resolved!.entry).toBeLessThan(39.72);
  });

  it("returns null when no valid geometry exists", () => {
    const resolved = resolveValidatedEntry({
      action: "BUY",
      preferredEntry: 50,
      signalEntry: 50,
      stopLoss: 60,
      targets: [40],
    });
    expect(resolved).toBeNull();
  });
});
