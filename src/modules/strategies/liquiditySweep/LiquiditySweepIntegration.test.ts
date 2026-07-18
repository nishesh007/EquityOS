/**
 * Liquidity Sweep Integration — tests (Sprint 11B.3E).
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
  LIQUIDITY_SWEEP_STRATEGY_ID,
  LiquiditySweepTradeBuilder,
  buildLiquiditySweepExplainability,
  buildLiquiditySweepInstitutionalScore,
  buildLiquiditySweepSummary,
  calculateLiquiditySweepSignalGrade,
  ensureLiquiditySweepRegistered,
  executeLiquiditySweepThroughEngine,
  executeLiquiditySweepWithPipeline,
  getLiquiditySweepIntegrationStatus,
  getLiquiditySweepMetrics,
  registerLiquiditySweepStrategy,
  resetLiquiditySweepMetrics,
  type LiquiditySweepCandle,
  type LiquiditySweepDetection,
  type LiquiditySweepStrategyInput,
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
): LiquiditySweepCandle {
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
    advanceCount: 1000,
    declineCount: 800,
    unchangedCount: 50,
    advanceDeclineRatio: 1.25,
    netAdvances: 200,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 1,
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
      volume: 55,
      momentum: score,
      participation: score,
      confidence: 75,
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
    score: 62,
    regime: "High",
    trend: "Expanding",
    indiaVix: 18,
    atr: 0.8,
    historicalVolatility: 18,
    realizedVolatility: 17,
    gapPercent: 0.3,
    dailyRange: 1.4,
    intradayRange: 1.1,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Increasing",
    vixMomentum: 1,
    atrExpansion: true,
    atrCompression: false,
    relativeVolatility: 1.2,
    volatilityExpansion: true,
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

function makeRegime(
  regime: MarketRegime["regime"] = "High Volatility",
  confidence = 75
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 70,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(55);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Sideways",
    marketStrength: 55,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 75,
    healthScore: 60,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function bullCandles(): LiquiditySweepCandle[] {
  return [
    candle(9, 20, 100.0, 100.4, 99.6, 99.9, 100_000),
    candle(9, 25, 99.9, 100.1, 99.2, 99.4, 105_000),
    candle(9, 30, 99.4, 99.6, 98.6, 98.9, 110_000),
    candle(9, 35, 98.9, 99.2, 98.0, 98.3, 115_000),
    candle(9, 40, 98.3, 98.8, 98.1, 98.5, 100_000),
    candle(9, 45, 98.5, 99.0, 98.2, 98.7, 95_000),
    candle(9, 50, 98.7, 99.1, 98.4, 98.9, 98_000),
    candle(9, 55, 98.9, 99.2, 97.5, 98.6, 180_000),
  ];
}

function bullDetection(
  overrides: Partial<LiquiditySweepDetection> = {}
): LiquiditySweepDetection {
  return {
    detected: true,
    direction: "BUY",
    sweepType: "stop_hunt",
    liquidityLevel: 98,
    sweepExtreme: 97.5,
    reclaimClose: 98.6,
    sweepDistance: 0.5,
    reversalConfirmed: true,
    volumeSpike: true,
    relativeVolumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 85,
    reasons: ["Liquidity Sweep BUY detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: LiquiditySweepCandle[] = bullCandles()
): LiquiditySweepStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 0.9,
    liquiditySweep: {
      candles5m: candles,
      vwap: 100,
      atr: 0.9,
      relativeVolume: 1.4,
      recentSwingHigh: 100.4,
      recentSwingLow: 98.0,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "liquidity-sweep",
      name: "Liquidity Sweep",
      category: "Scalp",
      eligible: true,
      priority: 85,
      score: 80,
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
    timestamp: atIST(10, 0),
  };
}

describe("Liquidity Sweep Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetLiquiditySweepMetrics();
    ensureLiquiditySweepRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetLiquiditySweepMetrics();
  });

  it("registers with StrategyRegistry", () => {
    const status = getLiquiditySweepIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(LIQUIDITY_SWEEP_STRATEGY_ID);
    expect(getStrategyRegistry().has(LIQUIDITY_SWEEP_STRATEGY_ID)).toBe(true);
  });

  it("creates instance via StrategyFactory", () => {
    ensureLiquiditySweepRegistered();
    expect(getStrategyFactory().has(LIQUIDITY_SWEEP_STRATEGY_ID)).toBe(true);
    const instance = getStrategyFactory().create(LIQUIDITY_SWEEP_STRATEGY_ID);
    expect(instance?.id).toBe(LIQUIDITY_SWEEP_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeLiquiditySweepThroughEngine(makeContext(), {
      skipEligibilityCheck: true,
    });
    expect(result).toBeDefined();
    expect(result.signal.strategyId).toBe(LIQUIDITY_SWEEP_STRATEGY_ID);
  });

  it("integrates with TradingPipeline adapter", () => {
    const context = makeContext();
    const pipeline = {
      context: context.marketContext,
      regime: context.regime,
      confidence: context.confidence,
      eligibleStrategies: context.eligibleStrategies,
      timestamp: context.timestamp ?? atIST(10, 0),
      success: true,
      warnings: [],
      errors: [],
      stages: [],
      durationMs: 1,
    } as unknown as TradingPipelineResult;

    const result = executeLiquiditySweepWithPipeline(pipeline, makeInput(), {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(LIQUIDITY_SWEEP_STRATEGY_ID);
  });

  it("collects Metrics", () => {
    resetLiquiditySweepMetrics();
    const setup = new LiquiditySweepTradeBuilder().build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBeGreaterThan(0);
    const snap = getLiquiditySweepMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("scores Signal Grade", () => {
    const grade = calculateLiquiditySweepSignalGrade({
      conviction: 88,
      qualityScore: 82,
      riskReward: 2.5,
      marketStrength: 60,
    });
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(grade);
  });

  it("builds Explainability and Summary", () => {
    const detection = bullDetection();
    const setup = new LiquiditySweepTradeBuilder().build({
      detection,
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    const score = buildLiquiditySweepInstitutionalScore({
      detection,
      setup,
      marketContext: makeMarketContext(),
      lsInput: makeInput(),
    });
    const explain = buildLiquiditySweepExplainability({
      detection,
      setup,
      marketContext: makeMarketContext(),
      lsInput: makeInput(),
      institutionalScore: score,
    });
    expect(explain.positiveReasons.length + explain.neutralFactors.length).toBeGreaterThan(0);
    const summary = buildLiquiditySweepSummary({
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
    const setup = new LiquiditySweepTradeBuilder().build({
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

  it("registerLiquiditySweepStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    const first = ensureLiquiditySweepRegistered();
    const second = ensureLiquiditySweepRegistered();
    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(registry.has(LIQUIDITY_SWEEP_STRATEGY_ID)).toBe(true);
    // Direct register after ensure should not throw (duplicate returns false)
    const dup = registerLiquiditySweepStrategy(registry);
    expect(typeof dup).toBe("boolean");
  });
});
