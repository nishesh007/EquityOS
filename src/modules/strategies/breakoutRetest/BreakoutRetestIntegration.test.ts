/**
 * Breakout Retest Integration — tests (Sprint 11B.3I).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  BreadthAnalysis,
  InstitutionalMarketContext,
  SectorAnalysis,
  SectorRotationSummary,
  VolatilityAnalysis,
} from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import {
  getStrategyFactory,
  getStrategyRegistry,
  resetStrategyEngine,
  type StrategyExecutionContext,
} from "../index";
import {
  BREAKOUT_RETEST_STRATEGY_ID,
  BreakoutRetestTradeBuilder,
  buildBreakoutRetestExplainability,
  buildBreakoutRetestInstitutionalScore,
  buildBreakoutRetestSummary,
  calculateBreakoutRetestSignalGrade,
  ensureBreakoutRetestRegistered,
  executeBreakoutRetestThroughEngine,
  executeBreakoutRetestWithPipeline,
  getBreakoutRetestIntegrationStatus,
  getBreakoutRetestMetrics,
  registerBreakoutRetestStrategy,
  resetBreakoutRetestMetrics,
  type BreakoutRetestCandle,
  type BreakoutRetestDetection,
  type BreakoutRetestStrategyInput,
} from "./index";

function atIST(hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 6, 18, hour, minute, 0) - 330 * 60_000);
}

function candle(
  hour: number,
  minute: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): BreakoutRetestCandle {
  return {
    timestamp: atIST(hour, minute),
    open,
    high,
    low,
    close,
    volume,
  };
}

function makeBreadth(score: number): BreadthAnalysis {
  return {
    advanceCount: 1200,
    declineCount: 600,
    unchangedCount: 50,
    advanceDeclineRatio: 2,
    netAdvances: 600,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 2,
    breadthQuality: score >= 60 ? "Strong" : "Weak",
    score,
    confidence: 80,
    reasons: ["Breadth"],
    lastUpdated: atIST(10, 0),
  };
}

function makeSectors(score: number): SectorAnalysis[] {
  return [
    {
      sector: "IT",
      score,
      trend: score >= 60 ? "Bull" : "Bear",
      relativeStrength: score,
      breadth: score,
      volume: 60,
      momentum: score,
      participation: score,
      confidence: 80,
      reasons: ["Sector"],
    },
  ];
}

function makeRotation(sectors: SectorAnalysis[]): SectorRotationSummary {
  return {
    improving: sectors.map((s) => s.sector),
    weakening: [],
    stable: [],
    leaders: sectors.map((s) => s.sector),
    laggards: [],
    reasons: ["Rotation"],
  };
}

function makeVolatility(): VolatilityAnalysis {
  return {
    score: 45,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 14,
    atr: 1.0,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Stable",
    vixMomentum: 0,
    atrExpansion: false,
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: false,
    volatilityCompression: false,
    gapDirection: "flat",
    lastUpdated: atIST(10, 0),
  };
}

function makeConfidence(score: number): RegimeConfidenceAnalysis {
  return {
    score,
    grade: score >= 85 ? "High" : score >= 70 ? "Good" : "Moderate",
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    contributions: [],
    summary: [`Confidence ${score}`],
  };
}

function makeRegime(): MarketRegime {
  return {
    regime: "Strong Bull",
    confidence: 78,
    priority: 80,
    reasons: ["Strong Bull"],
    triggeredRules: ["Strong Bull"],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(78),
  };
}

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors(60);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 75,
    marketBreadth: makeBreadth(58),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(),
    riskMode: "Risk On",
    confidence: 80,
    healthScore: 75,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function bullCandles(): BreakoutRetestCandle[] {
  return [
    candle(9, 15, 100.0, 100.6, 99.9, 100.4, 80_000),
    candle(9, 20, 100.4, 100.8, 100.1, 100.6, 82_000),
    candle(9, 25, 100.6, 101.0, 100.3, 100.8, 84_000),
    candle(9, 30, 100.8, 101.2, 100.5, 101.0, 85_000),
    candle(9, 35, 101.0, 101.4, 100.7, 101.2, 86_000),
    candle(9, 40, 101.2, 101.45, 100.9, 101.3, 87_000),
    candle(9, 45, 101.3, 101.48, 101.0, 101.35, 88_000),
    candle(9, 50, 101.35, 101.49, 101.05, 101.4, 89_000),
    candle(9, 55, 101.2, 102.2, 101.1, 102.0, 160_000),
    candle(10, 0, 101.95, 102.05, 101.42, 101.65, 70_000),
    candle(10, 5, 101.68, 102.3, 101.62, 102.15, 95_000),
  ];
}

function bullDetection(
  overrides: Partial<BreakoutRetestDetection> = {}
): BreakoutRetestDetection {
  return {
    detected: true,
    direction: "BUY",
    phase: "continuation",
    breakoutLevel: 101.5,
    breakoutExtreme: 102.2,
    retestLow: 101.42,
    retestHigh: 102.05,
    breakoutQuality: 88,
    retestQuality: 85,
    ema20: 101.2,
    ema50: 100.5,
    vwap: 101.0,
    breakoutConfirmed: true,
    retestHeld: true,
    continuationConfirmed: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 85,
    reasons: ["Breakout Retest BUY detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: BreakoutRetestCandle[] = bullCandles()
): BreakoutRetestStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.0,
    breakoutRetest: {
      candles5m: candles,
      vwap: 101.0,
      atr: 1.0,
      ema20: 101.2,
      ema50: 100.5,
      relativeVolume: 1.35,
      resistanceLevels: [101.5],
      supportLevels: [99.5],
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "breakout-retest",
      name: "Breakout Retest",
      category: "Intraday",
      eligible: true,
      priority: 88,
      score: 86,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeContext(): StrategyExecutionContext {
  const regime = makeRegime();
  const marketContext = makeMarketContext();
  return {
    input: makeInput(),
    marketContext,
    regime,
    confidence: regime.confidenceAnalysis,
    eligibleStrategies: makeEligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 10),
  };
}

describe("Breakout Retest Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetBreakoutRetestMetrics();
    ensureBreakoutRetestRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetBreakoutRetestMetrics();
  });

  it("registers with StrategyRegistry", () => {
    const status = getBreakoutRetestIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(BREAKOUT_RETEST_STRATEGY_ID);
    expect(getStrategyRegistry().has(BREAKOUT_RETEST_STRATEGY_ID)).toBe(true);
  });

  it("creates instance via StrategyFactory", () => {
    expect(getStrategyFactory().has(BREAKOUT_RETEST_STRATEGY_ID)).toBe(true);
    const instance = getStrategyFactory().create(BREAKOUT_RETEST_STRATEGY_ID);
    expect(instance?.id).toBe(BREAKOUT_RETEST_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeBreakoutRetestThroughEngine(makeContext(), {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(BREAKOUT_RETEST_STRATEGY_ID);
  });

  it("integrates with TradingPipeline adapter", () => {
    const context = makeContext();
    const pipeline = {
      context: context.marketContext,
      regime: context.regime,
      confidence: context.confidence,
      eligibleStrategies: context.eligibleStrategies,
      timestamp: context.timestamp ?? atIST(10, 10),
      success: true,
      warnings: [],
      errors: [],
      stages: [],
      durationMs: 1,
    } as unknown as TradingPipelineResult;

    const result = executeBreakoutRetestWithPipeline(pipeline, makeInput(), {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(BREAKOUT_RETEST_STRATEGY_ID);
  });

  it("collects Metrics", () => {
    resetBreakoutRetestMetrics();
    const setup = new BreakoutRetestTradeBuilder().build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBeGreaterThan(0);
    const snap = getBreakoutRetestMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("scores Signal Grade", () => {
    const grade = calculateBreakoutRetestSignalGrade({
      conviction: 88,
      qualityScore: 82,
      riskReward: 2.5,
      marketStrength: 75,
    });
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(grade);
  });

  it("builds Explainability and Summary", () => {
    const detection = bullDetection();
    const setup = new BreakoutRetestTradeBuilder().build({
      detection,
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    const score = buildBreakoutRetestInstitutionalScore({
      detection,
      setup,
      marketContext: makeMarketContext(),
      retestInput: makeInput(),
    });
    const explain = buildBreakoutRetestExplainability({
      detection,
      setup,
      marketContext: makeMarketContext(),
      retestInput: makeInput(),
      institutionalScore: score,
    });
    expect(
      explain.positiveReasons.length + explain.neutralFactors.length
    ).toBeGreaterThan(0);
    const summary = buildBreakoutRetestSummary({
      detection,
      setup,
      positiveReasons: explain.positiveReasons,
      negativeReasons: explain.negativeReasons,
      institutionalScore: score,
    });
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(5);
  });

  it("recovers from Failure without crash", () => {
    const setup = new BreakoutRetestTradeBuilder().build({
      detection: bullDetection({
        detected: false,
        direction: "NONE",
        warnings: ["Synthetic failure path."],
      }),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.signalGrade).toBe("F");
  });

  it("registerBreakoutRetestStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    expect(ensureBreakoutRetestRegistered()).toBe(true);
    expect(ensureBreakoutRetestRegistered()).toBe(true);
    expect(registry.has(BREAKOUT_RETEST_STRATEGY_ID)).toBe(true);
    const dup = registerBreakoutRetestStrategy(registry);
    expect(typeof dup).toBe("boolean");
  });
});
