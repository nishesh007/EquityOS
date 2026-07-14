/**
 * AI Recommendation Validation — unit tests (Prompt 9F.6).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerRecommendationRules,
  resetRecommendationRuleRegistrationState,
  resetRecommendationValidationMetrics,
  resetRecommendationAuditLog,
  getRecommendationValidationMetrics,
  getRecommendationAuditLog,
  buildRecommendationRules,
  calculateRecommendationQualityScore,
  validateRecommendation,
  validateRecommendationReasoning,
  validateRecommendationConfidence,
  validateRecommendationAlignment,
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
} from "./index";

function validRec(overrides: Record<string, unknown> = {}) {
  return {
    action: "BUY",
    confidence: 75,
    timestamp: "2026-07-14T10:00:00.000Z",
    primaryReason: "Trend and fundamentals aligned for accumulation.",
    supportingFactors: ["Revenue growth", "Breakout confirmation"],
    riskFactors: ["Sector volatility", "Earnings event"],
    invalidationCriteria: "Close below 50 DMA on volume",
    supportingIndicators: ["RSI 55", "MACD bullish cross", "Price above VWAP"],
    supportingFundamentals: ["ROE 18%", "Revenue growth 22%"],
    marketContext: "Sector and index both in uptrend",
    riskLevel: "MEDIUM",
    expectedRisk: 12,
    downside: 8,
    upside: 20,
    riskReward: 2.5,
    maximumLoss: 7,
    expectedHoldingPeriod: "4W",
    reviewer: "ai-research-analyst",
    technical: {
      score: 78,
      trend: "bullish",
      momentum: "bullish",
      volume: "bullish",
      breakout: "bullish",
      support: "bullish",
      resistance: "neutral",
      movingAverages: "bullish",
      rsi: 55,
      macd: "bullish",
      adx: "bullish",
      atr: "neutral",
      vwap: "bullish",
      supertrend: "bullish",
      ichimoku: "bullish",
    },
    fundamental: {
      score: 72,
      outlook: "bullish",
      improving: true,
      revenueGrowth: 22,
      profitGrowth: 18,
      cashFlow: 120,
      debt: 0.4,
      roe: 18,
      roce: 16,
      margins: 14,
      valuation: 22,
      promoterHolding: 45,
      quarterlyResults: "beat",
    },
    market: {
      score: 70,
      sectorTrend: "bullish",
      indexTrend: "bullish",
      volatility: 18,
      eventRisk: "low",
    },
    historical: {
      score: 70,
      successRate: 68,
      accuracy: 65,
      previousReasoning: "Prior buy on consolidation breakout",
      previousConviction: 70,
    },
    previousRecommendation: {
      action: "ACCUMULATE",
      confidence: 70,
      reason: "Prior buy on consolidation breakout",
      timestamp: "2026-06-20T10:00:00.000Z",
    },
    ...overrides,
  };
}

describe("Recommendation rule registration", () => {
  beforeEach(() => {
    resetRecommendationRuleRegistrationState();
    resetRecommendationValidationMetrics();
    resetRecommendationAuditLog();
  });

  it("registers recommendation rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerRecommendationRules({ engine });
    expect(first.registered).toBeGreaterThan(10);
    const second = registerRecommendationRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildRecommendationRules().length).toBe(first.total);
    expect(DEFAULT_RECOMMENDATION_VALIDATION_CONFIG.minQualityScore).toBeGreaterThan(
      0
    );
  });
});

describe("Action coverage", () => {
  beforeEach(() => {
    resetRecommendationRuleRegistrationState();
    resetRecommendationAuditLog();
  });

  it.each([
    ["STRONG_BUY", 85],
    ["BUY", 75],
    ["HOLD", 60],
    ["WATCH", 55],
    ["SELL", 75],
    ["STRONG_SELL", 85],
  ] as const)("accepts coherent %s recommendation", async (action, confidence) => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const bearish = action === "SELL" || action === "STRONG_SELL";
    const result = await validateRecommendation(
      validRec({
        action,
        confidence,
        technical: {
          score: 78,
          trend: bearish ? "bearish" : "bullish",
          momentum: bearish ? "bearish" : "bullish",
          volume: bearish ? "bearish" : "bullish",
          breakout: bearish ? "bearish" : "bullish",
          support: "neutral",
          resistance: bearish ? "bearish" : "bullish",
          movingAverages: bearish ? "bearish" : "bullish",
          rsi: bearish ? 35 : 55,
          macd: bearish ? "bearish" : "bullish",
          adx: bearish ? "bearish" : "bullish",
          atr: "neutral",
          vwap: bearish ? "bearish" : "bullish",
          supertrend: bearish ? "bearish" : "bullish",
          ichimoku: bearish ? "bearish" : "bullish",
        },
        fundamental: {
          score: 72,
          outlook: bearish ? "bearish" : "bullish",
          improving: !bearish,
          revenueGrowth: bearish ? -5 : 22,
          profitGrowth: bearish ? -8 : 18,
          cashFlow: 120,
          debt: 0.4,
          roe: 18,
          roce: 16,
          margins: 14,
          valuation: 22,
          promoterHolding: 45,
          quarterlyResults: bearish ? "miss" : "beat",
        },
        market: {
          score: 70,
          sectorTrend: bearish ? "bearish" : "bullish",
          indexTrend: bearish ? "bearish" : "bullish",
          volatility: 18,
          eventRisk: "low",
        },
        previousRecommendation: {
          action: bearish ? "REDUCE" : "ACCUMULATE",
          confidence: 70,
          reason: "Prior stance",
          timestamp: "2026-06-20T10:00:00.000Z",
        },
      }),
      { engine }
    );
    expect(result.failedRules).toEqual([]);
  });
});

describe("Contradictory / incomplete recommendations", () => {
  beforeEach(() => {
    resetRecommendationRuleRegistrationState();
    resetRecommendationAuditLog();
  });

  it("rejects Strong Buy with bearish technicals", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendation(
      validRec({
        action: "STRONG_BUY",
        confidence: 85,
        technical: {
          score: 20,
          trend: "bearish",
          momentum: "bearish",
          breakout: "bearish",
        },
      }),
      { engine }
    );
    expect(result.failedRules).toContain("rec.consistency.action_vs_technical");
  });

  it("rejects Sell with extreme confidence vs bullish technicals", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendation(
      validRec({
        action: "SELL",
        confidence: 96,
        technical: { score: 80, trend: "bullish", momentum: "bullish" },
      }),
      { engine }
    );
    expect(result.failedRules).toContain(
      "rec.consistency.sell_high_conviction"
    );
  });

  it("rejects Strong Sell with improving fundamentals", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendation(
      validRec({
        action: "STRONG_SELL",
        confidence: 85,
        technical: {
          score: 78,
          trend: "bearish",
          momentum: "bearish",
          movingAverages: "bearish",
          supertrend: "bearish",
        },
        fundamental: {
          score: 80,
          improving: true,
          outlook: "bullish",
          revenueGrowth: 20,
          profitGrowth: 15,
        },
        market: {
          score: 70,
          sectorTrend: "bearish",
          indexTrend: "bearish",
        },
        previousRecommendation: {
          action: "REDUCE",
          confidence: 70,
          reason: "Prior",
          timestamp: "2026-06-20T10:00:00.000Z",
        },
      }),
      { engine }
    );
    expect(result.failedRules).toContain(
      "rec.consistency.action_vs_fundamentals"
    );
  });

  it("rejects Hold while target already achieved", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendation(
      validRec({
        action: "HOLD",
        confidence: 60,
        target: { targetPrice: 100, currentPrice: 110, achieved: true },
      }),
      { engine }
    );
    expect(result.failedRules).toContain(
      "rec.consistency.target_achieved_hold"
    );
  });

  it("rejects missing reasoning", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendationReasoning(
      {
        action: "BUY",
        confidence: 70,
        timestamp: "2026-07-14T10:00:00.000Z",
      },
      { engine }
    );
    expect(result.failedRules).toContain("rec.reasoning.primary_reason");
    expect(result.failedRules).toContain("rec.reasoning.supporting_factors");
  });

  it("rejects inflated confidence without evidence", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendationConfidence(
      {
        action: "BUY",
        confidence: 98,
        timestamp: "2026-07-14T10:00:00.000Z",
      },
      { engine }
    );
    expect(result.failedRules).toContain("rec.confidence.matches_evidence");
  });

  it("rejects confidence outside 0–100", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendationConfidence(
      { action: "BUY", confidence: 140 },
      { engine }
    );
    expect(result.failedRules).toContain("rec.confidence.bounds");
  });
});

describe("Quality score and historical conflicts", () => {
  beforeEach(() => {
    resetRecommendationRuleRegistrationState();
    resetRecommendationValidationMetrics();
    resetRecommendationAuditLog();
  });

  it("calculates quality score with configured weights", () => {
    const scored = calculateRecommendationQualityScore(validRec());
    expect(scored.score).toBeGreaterThanOrEqual(
      DEFAULT_RECOMMENDATION_VALIDATION_CONFIG.minQualityScore
    );
    expect(scored.rejected).toBe(false);
    expect(scored.components.technicalAlignment).toBeGreaterThan(0);
  });

  it("rejects low quality recommendations", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({
      engine,
      config: { minQualityScore: 90 },
    });
    const result = await validateRecommendation(
      validRec({
        technical: { score: 20, trend: "neutral" },
        fundamental: { score: 20, outlook: "neutral" },
        market: { score: 20, sectorTrend: "neutral", indexTrend: "neutral" },
        historical: { score: 20, successRate: 20 },
        supportingFactors: ["only one"],
        riskFactors: ["r"],
        invalidationCriteria: "x",
        supportingIndicators: ["i"],
        supportingFundamentals: ["f"],
      }),
      { engine }
    );
    expect(result.failedRules).toContain("rec.quality.score_threshold");
  });

  it("detects historical conflicts within window", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    const result = await validateRecommendationAlignment(
      validRec({
        action: "BUY",
        previousRecommendation: {
          action: "SELL",
          confidence: 80,
          reason: "Prior sell",
          timestamp: "2026-07-01T10:00:00.000Z",
        },
        historical: {
          score: 70,
          successRate: 68,
          previousReasoning: "Prior sell",
          previousConviction: 80,
        },
      }),
      { engine }
    );
    // alignment suite includes conflict rules
    const full = await validateRecommendation(
      validRec({
        action: "BUY",
        previousRecommendation: {
          action: "SELL",
          confidence: 80,
          reason: "Prior sell",
          timestamp: "2026-07-01T10:00:00.000Z",
        },
        historical: {
          score: 70,
          successRate: 68,
          previousReasoning: "Prior sell",
          previousConviction: 80,
        },
      }),
      { engine }
    );
    expect(
      full.failedRules.some(
        (id) =>
          id === "rec.conflict.vs_previous" ||
          id === "rec.historical.window_conflict"
      )
    ).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("tracks metrics and audit log", async () => {
    const engine = new RuleEngine();
    registerRecommendationRules({ engine });
    await validateRecommendation(validRec(), { engine });
    const metrics = getRecommendationValidationMetrics();
    expect(metrics.recommendationsValidated).toBe(1);
    expect(metrics.averageQualityScore).toBeGreaterThan(0);
    const audit = getRecommendationAuditLog();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0]?.engineVersion).toBeTruthy();
  });
});
