/**
 * Sector Rotation Integration — tests (Sprint 11B.3J).
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
  SECTOR_ROTATION_STRATEGY_ID,
  SectorRotationTradeBuilder,
  buildSectorRotationExplainability,
  buildSectorRotationInstitutionalScore,
  buildSectorRotationSummary,
  calculateSectorRotationSignalGrade,
  ensureSectorRotationRegistered,
  executeSectorRotationThroughEngine,
  executeSectorRotationWithPipeline,
  getSectorRotationIntegrationStatus,
  getSectorRotationMetrics,
  registerSectorRotationStrategy,
  resetSectorRotationMetrics,
  type SectorRotationCandle,
  type SectorRotationDetection,
  type SectorRotationStrategyInput,
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
): SectorRotationCandle {
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
    confidence: 80,
    priority: 80,
    reasons: ["Strong Bull"],
    triggeredRules: ["Strong Bull"],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(80),
  };
}

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors(80);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: makeBreadth(70),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(),
    riskMode: "Neutral",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function bullCandles(): SectorRotationCandle[] {
  return [
    candle(9, 15, 99.5, 99.8, 99.2, 99.6, 90_000),
    candle(9, 20, 99.6, 100.1, 99.5, 99.9, 95_000),
    candle(9, 25, 99.9, 100.5, 99.8, 100.3, 100_000),
    candle(9, 30, 100.3, 101.0, 100.2, 100.8, 105_000),
    candle(9, 35, 100.8, 101.6, 100.7, 101.4, 110_000),
    candle(9, 40, 101.4, 102.0, 101.3, 101.8, 115_000),
    candle(9, 45, 101.8, 102.05, 101.55, 101.7, 100_000),
    candle(9, 50, 101.7, 101.9, 101.5, 101.65, 95_000),
    candle(9, 55, 101.65, 101.85, 101.48, 101.7, 98_000),
    candle(10, 0, 101.75, 102.6, 101.7, 102.45, 160_000),
  ];
}

function bullDetection(
  overrides: Partial<SectorRotationDetection> = {}
): SectorRotationDetection {
  return {
    detected: true,
    direction: "BUY",
    signalKind: "emerging_sector_leader",
    sectorName: "IT",
    sectorRelativeStrength: 80,
    sectorMomentum: 5,
    sectorBreadth: 70,
    stockRelativeStrength: 88,
    benchmarkRelativeStrength: 60,
    sectorOutperformsBenchmark: true,
    stockOutperformsSector: true,
    ema20: 101.2,
    ema50: 100.4,
    vwap: 100.8,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 85,
    reasons: ["Sector Rotation BUY detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: SectorRotationCandle[] = bullCandles()
): SectorRotationStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "INFY",
    lastPrice: last.close,
    atr: 1.0,
    sectorRotation: {
      candles5m: candles,
      vwap: 100.8,
      atr: 1.0,
      ema20: 101.2,
      ema50: 100.4,
      relativeVolume: 1.35,
      sectorName: "IT",
      sectorRelativeStrength: 80,
      sectorMomentum: 5,
      sectorBreadth: 70,
      stockRelativeStrength: 88,
      benchmarkRelativeStrength: 60,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "sector-rotation",
      name: "Sector Rotation",
      category: "Intraday",
      eligible: true,
      priority: 87,
      score: 85,
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
    timestamp: atIST(10, 5),
  };
}

describe("Sector Rotation Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetSectorRotationMetrics();
    ensureSectorRotationRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetSectorRotationMetrics();
  });

  it("registers with StrategyRegistry", () => {
    const status = getSectorRotationIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(SECTOR_ROTATION_STRATEGY_ID);
    expect(getStrategyRegistry().has(SECTOR_ROTATION_STRATEGY_ID)).toBe(true);
  });

  it("creates instance via StrategyFactory", () => {
    expect(getStrategyFactory().has(SECTOR_ROTATION_STRATEGY_ID)).toBe(true);
    const instance = getStrategyFactory().create(SECTOR_ROTATION_STRATEGY_ID);
    expect(instance?.id).toBe(SECTOR_ROTATION_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeSectorRotationThroughEngine(makeContext(), {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(SECTOR_ROTATION_STRATEGY_ID);
  });

  it("integrates with TradingPipeline adapter", () => {
    const context = makeContext();
    const pipeline = {
      context: context.marketContext,
      regime: context.regime,
      confidence: context.confidence,
      eligibleStrategies: context.eligibleStrategies,
      timestamp: context.timestamp ?? atIST(10, 5),
      success: true,
      warnings: [],
      errors: [],
      stages: [],
      durationMs: 1,
    } as unknown as TradingPipelineResult;

    const result = executeSectorRotationWithPipeline(
      pipeline,
      makeInput(),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe(SECTOR_ROTATION_STRATEGY_ID);
  });

  it("collects Metrics", () => {
    resetSectorRotationMetrics();
    const setup = new SectorRotationTradeBuilder().build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBeGreaterThan(0);
    const snap = getSectorRotationMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.sectorRotationSuccessRate).toBeGreaterThanOrEqual(0);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("scores Signal Grade", () => {
    const grade = calculateSectorRotationSignalGrade({
      conviction: 88,
      qualityScore: 82,
      riskReward: 2.5,
      marketStrength: 70,
    });
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(grade);
  });

  it("builds Explainability and Summary", () => {
    const detection = bullDetection();
    const setup = new SectorRotationTradeBuilder().build({
      detection,
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    const score = buildSectorRotationInstitutionalScore({
      detection,
      setup,
      marketContext: makeMarketContext(),
      srInput: makeInput(),
    });
    const explain = buildSectorRotationExplainability({
      detection,
      setup,
      marketContext: makeMarketContext(),
      srInput: makeInput(),
      institutionalScore: score,
    });
    expect(
      explain.positiveReasons.length + explain.neutralFactors.length
    ).toBeGreaterThan(0);
    const summary = buildSectorRotationSummary({
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
    const setup = new SectorRotationTradeBuilder().build({
      detection: bullDetection({
        detected: false,
        direction: "NONE",
        signalKind: "none",
        warnings: ["Synthetic failure path."],
      }),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.signalGrade).toBe("F");
  });

  it("registerSectorRotationStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    expect(ensureSectorRotationRegistered()).toBe(true);
    expect(ensureSectorRotationRegistered()).toBe(true);
    expect(registry.has(SECTOR_ROTATION_STRATEGY_ID)).toBe(true);
    const dup = registerSectorRotationStrategy(registry);
    expect(typeof dup).toBe("boolean");
  });
});
