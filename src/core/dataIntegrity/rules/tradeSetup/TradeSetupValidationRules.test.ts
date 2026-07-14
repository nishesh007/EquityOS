/**
 * Trade Setup Validation — unit tests (Prompt 9F.7).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerTradeSetupRules,
  resetTradeSetupRuleRegistrationState,
  resetTradeSetupValidationMetrics,
  resetTradeSetupAuditLog,
  getTradeSetupValidationMetrics,
  getTradeSetupAuditLog,
  buildTradeSetupRules,
  calculateTradeSetupQuality,
  calculateRiskReward,
  validateTradeSetup,
  validateEntry,
  validateStopLoss,
  validateTargets,
  validateRiskReward,
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
} from "./index";

function validLongSetup(overrides: Record<string, unknown> = {}) {
  return {
    setupId: "TS-LONG-001",
    side: "LONG",
    tradeType: "SWING",
    status: "ACTIVE",
    entry: 100,
    stopLoss: 95,
    targets: { primary: 110, secondary: 115, final: 120 },
    currentPrice: 100.5,
    exchange: "NSE",
    timestamp: "2026-07-14T10:00:00.000Z",
    liquidity: 500_000,
    atr: 2,
    historicalVolatility: 25,
    atrPercent: 2,
    beta: 1.1,
    gapRisk: 1.5,
    dailyRangePercent: 3,
    support: 96,
    resistance: 112,
    marketTrend: "bullish",
    sectorTrend: "bullish",
    capital: 1_000_000,
    positionSize: 50_000,
    allocationPercent: 5,
    portfolioExposure: 10,
    sectorExposure: 15,
    riskPerTradePercent: 1,
    diversification: 60,
    quantity: 100,
    technical: {
      score: 80,
      trend: "bullish",
      movingAverages: "bullish",
      macd: "bullish",
      rsi: 55,
      adx: 28,
      adxDirection: "bullish",
      supertrend: "bullish",
      vwap: "bullish",
      ichimoku: "bullish",
    },
    reviewer: "ai-research-analyst",
    ...overrides,
  };
}

function validShortSetup(overrides: Record<string, unknown> = {}) {
  return validLongSetup({
    setupId: "TS-SHORT-001",
    side: "SHORT",
    entry: 100,
    stopLoss: 105,
    targets: { primary: 90, secondary: 85, final: 80 },
    support: 88,
    resistance: 104,
    marketTrend: "bearish",
    sectorTrend: "bearish",
    technical: {
      score: 80,
      trend: "bearish",
      movingAverages: "bearish",
      macd: "bearish",
      rsi: 40,
      adx: 28,
      adxDirection: "bearish",
      supertrend: "bearish",
      vwap: "bearish",
      ichimoku: "bearish",
    },
    ...overrides,
  });
}

describe("Trade setup rule registration", () => {
  beforeEach(() => {
    resetTradeSetupRuleRegistrationState();
    resetTradeSetupValidationMetrics();
    resetTradeSetupAuditLog();
  });

  it("registers trade setup rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerTradeSetupRules({ engine });
    expect(first.registered).toBeGreaterThan(20);
    const second = registerTradeSetupRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildTradeSetupRules().length).toBe(first.total);
    expect(DEFAULT_TRADE_SETUP_VALIDATION_CONFIG.minRiskReward).toBeGreaterThan(
      0
    );
  });
});

describe("Long / short / swing / intraday acceptance", () => {
  beforeEach(() => {
    resetTradeSetupRuleRegistrationState();
    resetTradeSetupAuditLog();
  });

  it("accepts a coherent long swing setup", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(validLongSetup(), { engine });
    expect(result.failedRules).toEqual([]);
  });

  it("accepts a coherent short swing setup", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(validShortSetup(), { engine });
    expect(result.failedRules).toEqual([]);
  });

  it("accepts an intraday long setup", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({
        tradeType: "INTRADAY",
        setupId: "TS-INTRA-001",
        entry: 100,
        stopLoss: 97.5,
        targets: { primary: 105, secondary: 107, final: 109 },
        atr: 1,
        support: 98,
        resistance: 105.5,
      }),
      { engine }
    );
    expect(result.failedRules).toEqual([]);
  });
});

describe("Rejection cases", () => {
  beforeEach(() => {
    resetTradeSetupRuleRegistrationState();
    resetTradeSetupAuditLog();
  });

  it("rejects poor risk-reward", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({
        entry: 100,
        stopLoss: 90,
        targets: { primary: 102, secondary: 103, final: 104 },
        support: 89,
        resistance: 103,
      }),
      { engine }
    );
    expect(result.failedRules.some((id) => id.startsWith("ts.rr."))).toBe(true);
  });

  it("rejects invalid stop loss for long", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateStopLoss(
      validLongSetup({ stopLoss: 105 }),
      { engine }
    );
    expect(result.failedRules).toContain("ts.stop.side_alignment");
  });

  it("rejects invalid targets for long", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTargets(
      validLongSetup({
        targets: { primary: 90, secondary: 85, final: 80 },
      }),
      { engine }
    );
    expect(result.failedRules).toContain("ts.target.side_alignment");
  });

  it("rejects trend conflicts", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({
        marketTrend: "bearish",
        sectorTrend: "bearish",
        technical: {
          score: 20,
          trend: "bearish",
          movingAverages: "bearish",
          macd: "bearish",
          rsi: 30,
          adx: 40,
          adxDirection: "bearish",
          supertrend: "bearish",
          vwap: "bearish",
          ichimoku: "bearish",
        },
      }),
      { engine }
    );
    expect(result.failedRules.some((id) => id.startsWith("ts.trend."))).toBe(
      true
    );
  });

  it("rejects excessive volatility", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({
        historicalVolatility: 120,
        atrPercent: 15,
        excessiveVolatility: true,
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("ts.volatility."))
    ).toBe(true);
  });

  it("rejects oversized position allocation", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({
        allocationPercent: 40,
        portfolioExposure: 50,
        sectorExposure: 50,
        riskPerTradePercent: 8,
      }),
      { engine }
    );
    expect(
      result.failedRules.some((id) => id.startsWith("ts.position."))
    ).toBe(true);
  });

  it("rejects entry equal to stop (impossible downside)", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateTradeSetup(
      validLongSetup({ stopLoss: 100 }),
      { engine }
    );
    expect(result.failedRules.length).toBeGreaterThan(0);
    expect(
      result.failedRules.some(
        (id) =>
          id === "ts.stop.not_equal_entry" ||
          id === "ts.stop.side_alignment" ||
          id.startsWith("ts.consistency.")
      )
    ).toBe(true);
  });
});

describe("Scoped validators and quality", () => {
  beforeEach(() => {
    resetTradeSetupRuleRegistrationState();
    resetTradeSetupAuditLog();
    resetTradeSetupValidationMetrics();
  });

  it("validateEntry scopes to entry rules", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const result = await validateEntry(validLongSetup(), { engine });
    expect(result.results.every((r) => r.ruleId.startsWith("ts.entry."))).toBe(
      true
    );
    expect(result.failedRules).toEqual([]);
  });

  it("validateRiskReward computes and validates RR", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    const rr = calculateRiskReward(validLongSetup());
    expect(rr?.riskRewardRatio).toBeCloseTo(2, 5);
    const result = await validateRiskReward(validLongSetup(), { engine });
    expect(result.failedRules).toEqual([]);
  });

  it("calculateTradeSetupQuality scores 0–100", () => {
    const quality = calculateTradeSetupQuality(validLongSetup());
    expect(quality.score).toBeGreaterThanOrEqual(0);
    expect(quality.score).toBeLessThanOrEqual(100);
    expect(quality.rejected).toBe(false);
  });

  it("tracks metrics and audit log after validation", async () => {
    const engine = new RuleEngine();
    registerTradeSetupRules({ engine });
    await validateTradeSetup(validLongSetup(), { engine });
    const metrics = getTradeSetupValidationMetrics();
    expect(metrics.tradeSetupsValidated).toBe(1);
    expect(metrics.averageQualityScore).toBeGreaterThan(0);
    expect(getTradeSetupAuditLog().length).toBeGreaterThan(0);
  });
});
