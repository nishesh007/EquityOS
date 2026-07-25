/**
 * Sprint 9F.3 — Calibration gate tests.
 */

import { describe, expect, it } from "vitest";
import {
  calibrateConfidence,
  calibrateRecommendation,
  computeRecommendationQualityScore,
  recalculateRiskReward,
} from "@/lib/recommendations/horizons/calibration";
import { HORIZON_HOLDING_ENVELOPES } from "@/lib/recommendations/horizons/definitions";
import { estimateHoldingPeriod } from "@/lib/opportunity-engine/holding-period-estimator";
import type { HorizonRecommendation } from "@/lib/recommendations/horizons/types";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

function stubRow(
  overrides: Partial<{
    horizonId: HorizonRecommendation["horizonId"];
    holdingPeriod: string;
    entry: number;
    stop: number;
    targets: [number, number, number];
    expectedReturnPercent: number;
    score: number;
  }> = {}
): HorizonRecommendation {
  const horizonId = overrides.horizonId ?? "swing";
  const entry = overrides.entry ?? 100;
  const stop = overrides.stop ?? 95;
  const targets = overrides.targets ?? [108, 112, 118];
  const candidate = {
    symbol: "TEST",
    company: "Test Co",
    category: "swing",
    side: "Long",
    aiConvictionScore: 70,
    confidencePercent: 68,
    scanMetrics: {
      atr: 2.5,
      volume_ratio: 1.5,
      adx: 28,
      trend_score: 60,
      relative_strength: 55,
      ema20: 98,
      fundamental_score: 58,
      volatility: 22,
    },
    strategyId: "ema-pullback",
  } as OpportunityCandidate;

  return {
    horizonId,
    selection: {
      horizonId,
      symbol: "TEST",
      company: "Test Co",
      side: "Long",
      score: overrides.score ?? 72,
      belongsBecause: ["Trend structure"],
      qualifiedFactors: ["Trend score ≥ 52", "ADX ≥ 20", "EMA alignment"],
      rejectedFactors: ["Volume expansion"],
      horizonFitNotes: ["Not long-term valuation"],
      primaryStrategy: "EMA Pullback",
      supportingStrategies: ["Stage Analysis"],
      factors: [
        { label: "Trend score ≥ 52", passed: true, weight: 18 },
        { label: "ADX ≥ 20", passed: true, weight: 14 },
        { label: "EMA alignment", passed: true, weight: 16 },
        { label: "Volume expansion", passed: false, weight: 8 },
        { label: "RS ≥ 52", passed: true, weight: 12 },
        { label: "Pattern", passed: true, weight: 16 },
        { label: "Not compounder", passed: true, weight: 6 },
        { label: "MACD", passed: false, weight: 10 },
      ],
      sourceCandidate: candidate,
    },
    trade: {
      entry,
      entryLow: entry * 0.99,
      entryHigh: entry * 1.01,
      stopLoss: stop,
      targets,
      risk: Math.abs(entry - stop),
      reward: Math.abs(targets[0] - entry),
      riskReward: Math.abs(targets[0] - entry) / Math.abs(entry - stop),
      expectedReturnPercent: overrides.expectedReturnPercent ?? 3.2,
      holdingPeriod: overrides.holdingPeriod ?? "8–14 Trading Days",
      holdingRationale: "ATR velocity",
      targetMethodology: "Swing ATR",
      methodology: "trend_pullback",
    },
    recommendation: {
      id: "t",
      symbol: "TEST",
      company: "Test Co",
      category: "swing",
      action: "BUY",
      primaryStrategy: "EMA Pullback",
      primaryStrategyId: horizonId,
      matchedStrategies: ["EMA Pullback"],
      supportingStrategies: [],
      opposingStrategies: [],
      strategyCount: 1,
      agreementPercent: 70,
      conflictPercent: 0,
      opportunityScore: 72,
      frameworkScore: 72,
      confidence: 94,
      conviction: 94,
      entry,
      stopLoss: stop,
      targets: [...targets],
      risk: 5,
      reward: 8,
      riskReward: 1.6,
      expectedReturnPercent: 3.2,
      holdingPeriod: overrides.holdingPeriod ?? "8–14 Trading Days",
      marketContext: "Bullish",
      marketRegime: "Trend",
      riskMode: "Neutral",
      eligibility: { eligible: true, score: 70, reasons: [] },
      reasons: [],
      evidence: [],
      matchedFrameworks: {
        technical: [],
        fundamental: [],
        valuation: [],
        growth: [],
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
      longTermRanking: null,
      timestamp: "2026-07-25T04:00:00.000Z",
      source: "OpportunityEngine",
    },
    quality: {
      whyThisHorizon: ["Multi-day trend"],
      qualifiedFactors: ["Trend score ≥ 52", "ADX ≥ 20", "EMA alignment"],
      rejectedFactors: ["Volume expansion"],
      shorterLongerFit: ["Not long-term"],
      primaryStrategy: "EMA Pullback",
      supportingStrategies: [],
      holdingRationale: "ATR",
      targetMethodology: "Swing",
    },
  };
}

describe("holding period horizon calibration", () => {
  it("never prints swing-day holdings for medium / short / long horizons", () => {
    const base = {
      category: "momentum" as const,
      side: "Long" as const,
      entry: 100,
      stopLoss: 94,
      target1: 112,
      target3: 125,
      atr: 3,
      adx: 28,
      trendScore: 60,
      volumeRatio: 1.4,
    };

    const medium = estimateHoldingPeriod({ ...base, horizonId: "medium_term" });
    const short = estimateHoldingPeriod({
      ...base,
      category: "breakout",
      horizonId: "short_term",
    });
    const long = estimateHoldingPeriod({
      ...base,
      category: "ai_high_conviction",
      horizonId: "long_term",
    });
    const btst = estimateHoldingPeriod({
      ...base,
      category: "relative_volume",
      horizonId: "btst",
    });

    expect(medium.label).toMatch(/Months/i);
    expect(medium.daysMid).toBeGreaterThanOrEqual(
      HORIZON_HOLDING_ENVELOPES.medium_term.daysMin * 0.9
    );
    expect(short.label).toMatch(/Months/i);
    expect(long.label).toMatch(/Months/i);
    expect(long.daysMid).toBeGreaterThanOrEqual(240);
    expect(btst.label).toMatch(/Trading Days/i);
    expect(btst.daysMid).toBeGreaterThanOrEqual(1);
    expect(btst.daysMid).toBeLessThanOrEqual(3.2);
  });
});

describe("calibration gate", () => {
  it("rejects medium-term leakage with swing holding + tiny return", () => {
    const row = stubRow({
      horizonId: "medium_term",
      holdingPeriod: "2–10 Trading Days",
      targets: [101.5, 102.5, 103.5],
      expectedReturnPercent: 0.4,
    });
    // Keep entry zone below T1 so seal can evaluate holding/ER rejects.
    row.trade.entryHigh = 100.8;
    row.trade.entryLow = 99.2;
    const result = calibrateRecommendation(row);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.reasons.some((r) =>
          /Holding|primary|Expected|integrity|geometry/i.test(r)
        )
      ).toBe(true);
    }
  });

  it("accepts a consistent swing recommendation and recalibrates confidence", () => {
    const row = stubRow({
      horizonId: "swing",
      holdingPeriod: "8–14 Trading Days",
      targets: [108, 112, 118],
      expectedReturnPercent: 2.5,
      score: 74,
    });
    const result = calibrateRecommendation(row);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.recommendation.confidence).toBeLessThan(94);
      expect(result.row.recommendation.confidence).toBeGreaterThan(55);
      expect(result.row.recommendation.riskReward).toBe(
        recalculateRiskReward(row).riskReward
      );
      expect(result.row.recommendationQualityScore).toBeGreaterThanOrEqual(55);
    }
  });

  it("produces dispersed confidence scores", () => {
    const scores = [60, 68, 74, 80, 86].map((score) =>
      calibrateConfidence(stubRow({ score }))
    );
    const unique = new Set(scores.map((s) => Math.round(s)));
    expect(unique.size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(5);
  });

  it("computes quality components", () => {
    const row = stubRow();
    const quality = computeRecommendationQualityScore(row, 78, 10);
    expect(quality.score).toBeGreaterThan(0);
    expect(quality.components.holdingConsistency).toBeGreaterThan(0);
  });
});
