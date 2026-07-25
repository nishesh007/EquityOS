/**
 * Sprint 9F.1 — Dynamic Trade Construction Engine tests.
 */

import { describe, expect, it } from "vitest";
import { constructDynamicTrade } from "@/lib/opportunity-engine/dynamic-trade-construction";
import { buildTradeLevels } from "@/lib/opportunity-engine/levels";
import { computeProbabilityWeightedExpectedReturn } from "@/lib/opportunity-engine/expected-return";
import { estimateHoldingPeriod } from "@/lib/opportunity-engine/holding-period-estimator";

describe("constructDynamicTrade — no category templates", () => {
  it("does not emit fixed Swing +5% / +10% / +16% targets", () => {
    const levels = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "swing",
      metrics: {
        atr: 25,
        ema20: 980,
        ema50: 960,
        adx: 28,
        trend_score: 62,
        volume_ratio: 1.4,
        volatility: 22,
      },
    });

    expect(levels.target1).not.toBe(1050);
    expect(levels.target2).not.toBe(1100);
    expect(levels.target3).not.toBe(1160);
    expect(levels.stopLoss).not.toBe(960);
    expect(levels.primaryTargetPercent).not.toBe(5);
  });

  it("does not emit fixed Long Term +8% target", () => {
    const levels = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "ai_high_conviction",
      metrics: {
        atr: 40,
        ema50: 920,
        ema200: 880,
        fundamental_score: 72,
        trend_score: 65,
        volume_ratio: 1.1,
        volatility: 18,
      },
    });

    expect(levels.target1).not.toBe(1080);
    expect(levels.stopLoss).not.toBe(950);
    expect(levels.primaryTargetPercent).not.toBe(8);
  });

  it("does not emit fixed BTST +2.5% target", () => {
    const levels = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "relative_volume",
      metrics: {
        atr: 12,
        vwap: 995,
        volume_ratio: 2.2,
        adx: 24,
        volatility: 20,
      },
    });

    expect(levels.target1).not.toBe(1025);
    expect(levels.stopLoss).not.toBe(985);
    expect(levels.primaryTargetPercent).not.toBe(2.5);
  });

  it("produces stock-specific returns for same category different ATR", () => {
    const lowVol = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "swing",
      metrics: { atr: 10, ema20: 990, trend_score: 60, adx: 25, volume_ratio: 1.3 },
    });
    const highVol = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "swing",
      metrics: { atr: 45, ema20: 960, trend_score: 60, adx: 25, volume_ratio: 1.3 },
    });

    expect(lowVol.primaryTargetPercent).not.toBe(highVol.primaryTargetPercent);
    expect(lowVol.holdingPeriod).not.toBe(highVol.holdingPeriod);
    expect(Math.abs(lowVol.target1 - highVol.target1)).toBeGreaterThan(1);
  });

  it("satisfies BUY geometry Entry < T1 < T2 < T3 and SL < Entry", () => {
    const levels = constructDynamicTrade({
      price: 500,
      side: "Long",
      category: "breakout",
      metrics: {
        atr: 15,
        high: 505,
        low: 480,
        ema20: 490,
        adx: 30,
        volume_ratio: 1.8,
        price_to_52w_high: 0.92,
      },
    });

    expect(levels.stopLoss).toBeLessThan(levels.entryZone.low);
    expect(levels.target1).toBeGreaterThan(levels.entryZone.high);
    expect(levels.target2).toBeGreaterThan(levels.target1);
    expect(levels.target3).toBeGreaterThan(levels.target2);
    expect(levels.riskReward).toBeGreaterThan(1);
  });

  it("uses strategy signal levels when present", () => {
    const levels = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "swing",
      strategyId: "cup-and-handle",
      strategyName: "Cup & Handle",
      strategySignal: {
        entry: 1005,
        stopLoss: 960,
        target1: 1080,
        target2: 1140,
        target: 1220,
        strategyId: "cup-and-handle",
        strategy: "Cup & Handle",
        confidence: 78,
        conviction: 80,
      },
      metrics: { atr: 20 },
    });

    expect(levels.methodology).toBe("strategy_signal");
    expect(levels.stopLoss).toBe(960);
    expect(levels.target1).toBe(1080);
    expect(levels.target2).toBe(1140);
    expect(levels.target3).toBe(1220);
  });

  it("estimates a dynamic holding period label within swing envelope", () => {
    const levels = constructDynamicTrade({
      price: 1000,
      side: "Long",
      category: "momentum",
      horizonId: "swing",
      metrics: { atr: 30, ema20: 970, momentum: 8, trend_score: 70, adx: 32 },
    });
    expect(levels.holdingPeriod).toMatch(/Trading Days/i);
    expect(levels.holdingPeriod).not.toMatch(/Months/i);
  });
});

describe("buildTradeLevels adapter", () => {
  it("delegates to dynamic construction with metrics", () => {
    const a = buildTradeLevels(200, "Long", "swing", 8, {
      metrics: { atr: 8, ema20: 195, trend_score: 58, adx: 22 },
    });
    const b = buildTradeLevels(200, "Long", "swing", 20, {
      metrics: { atr: 20, ema20: 185, trend_score: 58, adx: 22 },
    });
    expect(a.target1).not.toBe(b.target1);
    expect(a.target1).not.toBe(210); // old 5% template
  });
});

describe("expected return", () => {
  it("equals raw Target1 percent from Effective Entry (Sprint 9F.4)", () => {
    const result = computeProbabilityWeightedExpectedReturn({
      side: "BUY",
      entry: 100,
      stopLoss: 95,
      targets: [110, 116, 122],
      conviction: 70,
      holdingDaysMid: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.primaryTargetPercent).toBe(10);
    expect(result!.expectedReturnPercent).toBe(10);
  });
});

describe("holding period estimator", () => {
  it("scales with target distance and ATR", () => {
    const near = estimateHoldingPeriod({
      category: "swing",
      side: "Long",
      entry: 100,
      stopLoss: 96,
      target1: 104,
      target3: 108,
      atr: 2,
      adx: 30,
      trendScore: 65,
      volumeRatio: 1.5,
    });
    const far = estimateHoldingPeriod({
      category: "swing",
      side: "Long",
      entry: 100,
      stopLoss: 92,
      target1: 115,
      target3: 130,
      atr: 2,
      adx: 30,
      trendScore: 65,
      volumeRatio: 1.5,
    });
    expect(far.daysToPrimary).toBeGreaterThan(near.daysToPrimary);
    expect(near.label).not.toEqual(far.label);
  });
});
