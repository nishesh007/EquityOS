/**
 * Historical Performance Validation — unit tests (Prompt 9F.9).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerHistoricalRules,
  resetHistoricalRuleRegistrationState,
  resetHistoricalValidationMetrics,
  resetHistoricalAuditLog,
  getHistoricalValidationMetrics,
  getHistoricalAuditLog,
  buildHistoricalRules,
  calculateHistoricalScore,
  detectModelDecay,
  validateHistoricalPerformance,
  validateRecommendationHistory,
  validateTradeHistory,
  DEFAULT_HISTORICAL_VALIDATION_CONFIG,
} from "./index";

function validHistory(overrides: Record<string, unknown> = {}) {
  return {
    id: "HIST-BATCH-001",
    recommendationId: "REC-100",
    tradeId: "TRD-200",
    timestamp: "2026-07-14T10:00:00.000Z",
    sampleSize: 40,
    totalTrades: 40,
    totalRecommendations: 40,
    successRate: 90,
    failureRate: 10,
    hitRate: 90,
    overallHitRate: 90,
    predictionAccuracy: 95,
    directionAccuracy: 94,
    priceAccuracy: 88,
    targetAccuracy: 82,
    timingAccuracy: 80,
    volatilityAccuracy: 78,
    trendAccuracy: 92,
    averageReturn: 4.2,
    medianReturn: 3.5,
    maximumGain: 18,
    maximumLoss: -6,
    winningTrades: 36,
    losingTrades: 4,
    targetHitCount: 28,
    stopHitCount: 4,
    expiredCount: 4,
    cancelledCount: 2,
    manualExitCount: 2,
    partialTargetHitCount: 0,
    entryFilledCount: 40,
    target1HitPercent: 70,
    target2HitPercent: 45,
    target3HitPercent: 20,
    averageTargetAchievement: 55,
    averageTimeToTarget: 12,
    stopLossHitPercent: 10,
    averageLoss: 3.5,
    falseStopOutRate: 8,
    trailingStopEffectiveness: 72,
    averageDrawdownBeforeSL: 2.1,
    expectedHoldingPeriod: 20,
    actualHoldingPeriod: 18,
    averageHoldingPeriod: 19,
    earlyExitPercent: 12,
    lateExitPercent: 10,
    expectedRR: 2.0,
    actualRR: 1.9,
    averageRR: 1.9,
    medianRR: 1.7,
    bestRR: 4.5,
    worstRR: 0.4,
    maximumDrawdown: 8,
    averageDrawdown: 3.2,
    recoveryTime: 7,
    painIndex: 4.1,
    ulcerIndex: 3.8,
    consistency: 92,
    consistencyScore: 92,
    monthlyHitRate: 88,
    quarterlyHitRate: 90,
    rolling3mHitRate: 89,
    rolling6mHitRate: 91,
    rolling12mHitRate: 90,
    previousMonthHitRate: 88,
    previousHitRate: 88,
    previousAccuracy: 93,
    previousAverageLoss: 3.6,
    currentHitRate: 90,
    metrics: {
      score: 92,
      hitRate: 90,
      predictionAccuracy: 95,
      averageRR: 1.9,
      maximumDrawdown: 8,
      consistency: 92,
      averageHoldingPeriod: 19,
      earlyExitPercent: 12,
      lateExitPercent: 10,
      averageLoss: 3.5,
      falseStopOutRate: 8,
    },
    byAction: {
      BUY: { hitRate: 91 },
      SELL: { hitRate: 88 },
      HOLD: { hitRate: 70 },
      WATCH: { hitRate: 65 },
    },
    sectorHitRates: { IT: 92, BANK: 88 },
    strategyHitRates: { SWING: 90, INTRADAY: 85 },
    moduleHitRates: { "ai-research": 91, screener: 87 },
    trades: [
      { status: "TARGET_HIT", returnPct: 5 },
      { status: "STOP_HIT", returnPct: -3 },
    ],
    ...overrides,
  };
}

describe("Historical rule registration", () => {
  beforeEach(() => {
    resetHistoricalRuleRegistrationState();
    resetHistoricalValidationMetrics();
    resetHistoricalAuditLog();
  });

  it("registers historical rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerHistoricalRules({ engine });
    expect(first.registered).toBeGreaterThan(20);
    const second = registerHistoricalRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildHistoricalRules().length).toBe(first.total);
    expect(DEFAULT_HISTORICAL_VALIDATION_CONFIG.minHitRate).toBeGreaterThan(0);
  });
});

describe("Winning / losing / expired trades", () => {
  beforeEach(() => {
    resetHistoricalRuleRegistrationState();
    resetHistoricalAuditLog();
  });

  it("accepts strong institutional historical performance", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateHistoricalPerformance(validHistory(), {
      engine,
    });
    expect(result.failedRules).toEqual([]);
  });

  it("validates winning and losing trade balance", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateTradeHistory(
      validHistory({
        winningTrades: 50,
        losingTrades: 20,
        totalTrades: 40,
      }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.trade.winning_losing_balance");
  });

  it("accepts expired trade lifecycle status", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateTradeHistory(
      validHistory({
        tradeStatus: "TIME_EXPIRED",
        trades: [{ status: "EXPIRED" }],
      }),
      { engine }
    );
    expect(result.failedRules).not.toContain("hist.trade.lifecycle_status");
  });
});

describe("Targets, stops, drawdown, accuracy", () => {
  beforeEach(() => {
    resetHistoricalRuleRegistrationState();
    resetHistoricalAuditLog();
  });

  it("rejects inverted target achievement pyramid", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateTradeHistory(
      validHistory({
        target1HitPercent: 40,
        target2HitPercent: 70,
      }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.target.hit_percentages");
  });

  it("rejects excessive average stop loss", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateTradeHistory(
      validHistory({
        averageLoss: 20,
        metrics: { ...((validHistory().metrics as object) ?? {}), averageLoss: 20 },
      }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.stoploss.average_loss");
  });

  it("rejects excessive drawdown", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateTradeHistory(
      validHistory({
        maximumDrawdown: 40,
        excessiveDrawdown: true,
      }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.drawdown.maximum");
  });

  it("rejects low prediction accuracy", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateRecommendationHistory(
      validHistory({
        predictionAccuracy: 30,
        accuracy: 30,
        directionAccuracy: 30,
        metrics: {
          predictionAccuracy: 30,
          hitRate: 90,
        },
      }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.prediction.accuracy_threshold");
  });
});

describe("Rolling performance, decay, consistency", () => {
  beforeEach(() => {
    resetHistoricalRuleRegistrationState();
    resetHistoricalAuditLog();
    resetHistoricalValidationMetrics();
  });

  it("detects model degradation", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const payload = validHistory({
      hitRate: 40,
      currentHitRate: 40,
      previousHitRate: 70,
      predictionAccuracy: 40,
      previousAccuracy: 70,
      averageLoss: 12,
      previousAverageLoss: 4,
      modelDecay: true,
      degradationAlert: true,
      degradationAlerts: ["hit-rate-drop"],
    });
    const decay = detectModelDecay(payload);
    expect(decay.decaying).toBe(true);
    const result = await validateHistoricalPerformance(payload, { engine });
    expect(result.failedRules.some((id) => id.startsWith("hist.decay."))).toBe(
      true
    );
  });

  it("rejects abnormal historical drift", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    const result = await validateHistoricalPerformance(
      validHistory({ performanceDrift: true, abnormalDrift: true }),
      { engine }
    );
    expect(result.failedRules).toContain("hist.consistency.no_abnormal_drift");
  });

  it("calculateHistoricalScore returns banded 0–100 score", () => {
    const score = calculateHistoricalScore(validHistory());
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.rejected).toBe(false);
    expect(["INSTITUTIONAL_GRADE", "EXCELLENT", "GOOD"]).toContain(score.band);
  });

  it("tracks metrics and audit log", async () => {
    const engine = new RuleEngine();
    registerHistoricalRules({ engine });
    await validateHistoricalPerformance(validHistory(), { engine });
    const metrics = getHistoricalValidationMetrics();
    expect(metrics.tradesAnalysed).toBeGreaterThan(0);
    expect(metrics.historicalScore).toBeGreaterThan(0);
    expect(getHistoricalAuditLog().length).toBeGreaterThan(0);
  });
});
