/**
 * Institutional Accumulation Integration — tests (Sprint 11B.3H).
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
  INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
  InstitutionalAccumulationTradeBuilder,
  buildInstitutionalAccumulationExplainability,
  buildInstitutionalAccumulationInstitutionalScore,
  buildInstitutionalAccumulationSummary,
  calculateInstitutionalAccumulationSignalGrade,
  ensureInstitutionalAccumulationRegistered,
  executeInstitutionalAccumulationThroughEngine,
  executeInstitutionalAccumulationWithPipeline,
  getInstitutionalAccumulationIntegrationStatus,
  getInstitutionalAccumulationMetrics,
  registerInstitutionalAccumulationStrategy,
  resetInstitutionalAccumulationMetrics,
  type InstitutionalAccumulationCandle,
  type InstitutionalAccumulationDetection,
  type InstitutionalAccumulationStrategyInput,
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
): InstitutionalAccumulationCandle {
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
    score: 42,
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
    regime: "Weak Bull",
    confidence: 78,
    priority: 80,
    reasons: ["Weak Bull"],
    triggeredRules: ["Weak Bull"],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(78),
  };
}

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors(58);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 70,
    marketBreadth: makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(),
    riskMode: "Risk On",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function bullCandles(): InstitutionalAccumulationCandle[] {
  return [
    candle(9, 15, 100.0, 100.2, 99.8, 100.1, 80_000),
    candle(9, 20, 100.1, 100.4, 99.8, 100.2, 82_000),
    candle(9, 25, 100.2, 100.6, 100.0, 100.5, 85_000),
    candle(9, 30, 100.5, 100.9, 100.2, 100.8, 88_000),
    candle(9, 35, 100.8, 101.2, 100.5, 101.0, 90_000),
    candle(9, 40, 101.0, 101.4, 100.8, 101.2, 92_000),
    candle(9, 45, 101.2, 101.5, 100.9, 101.3, 88_000),
    candle(9, 50, 101.3, 101.6, 101.0, 101.4, 85_000),
    candle(9, 55, 101.4, 101.8, 101.2, 101.6, 87_000),
    candle(10, 0, 101.75, 102.6, 101.7, 102.45, 160_000),
  ];
}

function bullDetection(
  overrides: Partial<InstitutionalAccumulationDetection> = {}
): InstitutionalAccumulationDetection {
  return {
    detected: true,
    direction: "BUY",
    pattern: "high_volume_breakout",
    demandZoneLow: 99.8,
    demandZoneHigh: 101.8,
    accumulationScore: 88,
    volumeQuality: 85,
    ema20: 101.2,
    ema50: 100.4,
    vwap: 100.8,
    higherLows: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 85,
    reasons: ["Institutional Accumulation BUY detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: InstitutionalAccumulationCandle[] = bullCandles()
): InstitutionalAccumulationStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.0,
    institutionalAccumulation: {
      candles5m: candles,
      vwap: 100.8,
      atr: 1.0,
      ema20: 101.2,
      ema50: 100.4,
      relativeVolume: 1.35,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "institutional-accumulation",
      name: "Institutional Accumulation",
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

describe("Institutional Accumulation Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetInstitutionalAccumulationMetrics();
    ensureInstitutionalAccumulationRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetInstitutionalAccumulationMetrics();
  });

  it("registers with StrategyRegistry", () => {
    const status = getInstitutionalAccumulationIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID);
    expect(getStrategyRegistry().has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID)).toBe(
      true
    );
  });

  it("creates instance via StrategyFactory", () => {
    expect(getStrategyFactory().has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID)).toBe(
      true
    );
    const instance = getStrategyFactory().create(
      INSTITUTIONAL_ACCUMULATION_STRATEGY_ID
    );
    expect(instance?.id).toBe(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeInstitutionalAccumulationThroughEngine(makeContext(), {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID);
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

    const result = executeInstitutionalAccumulationWithPipeline(
      pipeline,
      makeInput(),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID);
  });

  it("collects Metrics", () => {
    resetInstitutionalAccumulationMetrics();
    const setup = new InstitutionalAccumulationTradeBuilder().build({
      detection: bullDetection(),
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    expect(setup.entry).toBeGreaterThan(0);
    const snap = getInstitutionalAccumulationMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("scores Signal Grade", () => {
    const grade = calculateInstitutionalAccumulationSignalGrade({
      conviction: 88,
      qualityScore: 82,
      riskReward: 2.5,
      marketStrength: 70,
    });
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(grade);
  });

  it("builds Explainability and Summary", () => {
    const detection = bullDetection();
    const setup = new InstitutionalAccumulationTradeBuilder().build({
      detection,
      marketContext: makeMarketContext(),
      input: makeInput(),
    });
    const score = buildInstitutionalAccumulationInstitutionalScore({
      detection,
      setup,
      marketContext: makeMarketContext(),
      accumulationInput: makeInput(),
    });
    const explain = buildInstitutionalAccumulationExplainability({
      detection,
      setup,
      marketContext: makeMarketContext(),
      accumulationInput: makeInput(),
      institutionalScore: score,
    });
    expect(
      explain.positiveReasons.length + explain.neutralFactors.length
    ).toBeGreaterThan(0);
    const summary = buildInstitutionalAccumulationSummary({
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
    const setup = new InstitutionalAccumulationTradeBuilder().build({
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

  it("registerInstitutionalAccumulationStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    expect(ensureInstitutionalAccumulationRegistered()).toBe(true);
    expect(ensureInstitutionalAccumulationRegistered()).toBe(true);
    expect(registry.has(INSTITUTIONAL_ACCUMULATION_STRATEGY_ID)).toBe(true);
    const dup = registerInstitutionalAccumulationStrategy(registry);
    expect(typeof dup).toBe("boolean");
  });
});
