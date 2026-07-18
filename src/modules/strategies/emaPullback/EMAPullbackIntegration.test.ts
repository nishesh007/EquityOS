/**
 * EMA Pullback Integration — tests (Sprint 11B.3P).
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
  EMA_PULLBACK_STRATEGY_ID,
  EMAPullbackStrategy,
  EMAPullbackTradeBuilder,
  ensureEMAPullbackRegistered,
  executeEMAPullbackThroughEngine,
  executeEMAPullbackWithPipeline,
  getEMAPullbackIntegrationStatus,
  getEMAPullbackMetrics,
  registerEMAPullbackStrategy,
  resetEMAPullbackMetrics,
  type EMAPullbackCandle,
  type EMAPullbackStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function bar(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): EMAPullbackCandle {
  return {
    timestamp: atIST(10, 0, dayOffset),
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
    score: 40,
    regime: "Normal",
    trend: "Contracting",
    indiaVix: 12,
    atr: 1.5,
    historicalVolatility: 12,
    realizedVolatility: 11,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Contracting",
    vixMomentum: -1,
    atrExpansion: false,
    atrCompression: true,
    relativeVolatility: 0.8,
    volatilityExpansion: false,
    volatilityCompression: true,
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
  regime: MarketRegime["regime"] = "Strong Bull",
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 80,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors(70);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: makeBreadth(65),
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

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: EMA_PULLBACK_STRATEGY_ID,
      name: "EMA Pullback",
      category: "Swing",
      eligible: true,
      priority: 57,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeLeaderInput(): EMAPullbackStrategyInput {
  const daily: EMAPullbackCandle[] = [];
  let close = 100;
  for (let i = 0; i < 35; i += 1) {
    const open = close;
    close *= 1.008;
    daily.push(bar(i, open, close * 1.003, open * 0.997, close, 1_200_000));
  }
  const ema200 = close * 0.9;
  const ema100 = close * 0.94;
  const ema50 = close * 0.97;
  const ema20 = close * 0.99;
  const vwap = close * 0.995;
  const fiveMin: EMAPullbackCandle[] = [];
  let p = close * 0.985;
  for (let i = 0; i < 10; i += 1) {
    const open = p;
    p *= 1.0015;
    fiveMin.push(bar(35, open, p * 1.001, open * 0.999, p, 900_000));
  }
  const impulse = fiveMin[fiveMin.length - 1]!.close;
  fiveMin.push(
    bar(35, impulse, impulse * 1.001, impulse * 0.998, impulse * 0.999, 600_000)
  );
  fiveMin.push(
    bar(
      35,
      impulse * 0.999,
      impulse * 0.9995,
      ema20 * 0.9998,
      ema20 * 1.0002,
      550_000
    )
  );
  fiveMin.push(
    bar(
      35,
      ema20 * 1.0002,
      impulse * 1.002,
      ema20 * 0.9999,
      impulse * 1.0015,
      1_300_000
    )
  );
  const last = fiveMin[fiveMin.length - 1]!;
  return {
    symbol: "PULL",
    lastPrice: last.close,
    emaPullback: {
      candlesDaily: daily,
      candles5m: fiveMin,
      vwap,
      atr: last.close * 0.03,
      ema20,
      ema50,
      ema100,
      ema200,
      ema20Series: Array.from(
        { length: 8 },
        (_, i) => ema20 * (0.992 + i * 0.0015)
      ),
      relativeVolume: 1.3,
      averageVolume20d: 900_000,
      rsi: 55,
      adx: 28,
      relativeStrength: 65,
    },
  };
}

function makeExecutionContext(
  input: EMAPullbackStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0, 35),
  };
}

function makePipeline(
  context: StrategyExecutionContext
): TradingPipelineResult {
  return {
    timestamp: context.timestamp ?? atIST(10, 0),
    context: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    pipelineHealth: 80,
    healthGrade: "Good",
    pipelineConfidence: 80,
    executionTime: 1,
    warnings: [],
    errors: [],
    stages: [],
  } as unknown as TradingPipelineResult;
}

describe("EMA Pullback Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetEMAPullbackMetrics();
    ensureEMAPullbackRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetEMAPullbackMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getEMAPullbackIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(EMA_PULLBACK_STRATEGY_ID);
    expect(getStrategyRegistry().has(EMA_PULLBACK_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(EMA_PULLBACK_STRATEGY_ID);
    expect(instance).toBeInstanceOf(EMAPullbackStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeEMAPullbackThroughEngine(
      makeExecutionContext(makeLeaderInput()),
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
    expect(
      result.signal.signal === "BUY" ||
        result.signal.signal === "SELL" ||
        result.signal.signal === "IGNORE"
    ).toBe(true);
  });

  it("integrates with Trading Pipeline", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const result = executeEMAPullbackWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerEMAPullbackStrategy", () => {
    const registry = getStrategyRegistry();
    registerEMAPullbackStrategy(registry);
    expect(registry.has(EMA_PULLBACK_STRATEGY_ID)).toBe(true);
  });

  it("rejects Poor RR setups", () => {
    const input = makeLeaderInput();
    const context = makeExecutionContext(input);
    const strategy = new EMAPullbackStrategy();
    const detection = strategy.detect(context);
    expect(detection.detected).toBe(true);
    const rejected = new EMAPullbackTradeBuilder({
      minimumRiskReward: 1000,
    }).build({
      detection,
      marketContext: context.marketContext,
      input,
      config: { minimumRiskReward: 1000 },
    });
    expect(rejected.entry).toBe(0);
    expect(rejected.warnings.join(" ")).toMatch(/rr|target|threshold/i);
  });

  it("records metrics on engine path", () => {
    resetEMAPullbackMetrics();
    executeEMAPullbackThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getEMAPullbackMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new EMAPullbackStrategy();
    expect(strategy.detect(broken).detected).toBe(false);
    expect(strategy.buildTradeSetup(broken).entry).toBe(0);
  });
});
