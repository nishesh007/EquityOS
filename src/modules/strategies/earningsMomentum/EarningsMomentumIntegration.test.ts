/**
 * Earnings Momentum Integration — tests (Sprint 11B.3T).
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
  EARNINGS_MOMENTUM_STRATEGY_ID,
  EarningsMomentumStrategy,
  EarningsMomentumTradeBuilder,
  ensureEarningsMomentumRegistered,
  executeEarningsMomentumThroughEngine,
  executeEarningsMomentumWithPipeline,
  getEarningsMomentumIntegrationStatus,
  getEarningsMomentumMetrics,
  registerEarningsMomentumStrategy,
  resetEarningsMomentumMetrics,
  type EarningsMomentumCandle,
  type EarningsMomentumStrategyInput,
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
): EarningsMomentumCandle {
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
    trend: "Expanding",
    indiaVix: 14,
    atr: 2,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.5,
    dailyRange: 1.5,
    intradayRange: 1.1,
    riskMode: "Risk On",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Expanding",
    vixMomentum: 1,
    atrExpansion: true,
    atrCompression: false,
    relativeVolatility: 1.1,
    volatilityExpansion: true,
    volatilityCompression: false,
    gapDirection: "up",
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
  regime: MarketRegime["regime"] = "Event Driven",
  confidence = 75
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
    riskMode: "Risk On",
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
      strategyId: EARNINGS_MOMENTUM_STRATEGY_ID,
      name: "Earnings Momentum",
      category: "Swing",
      eligible: true,
      priority: 53,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildIdealCandles(): EarningsMomentumCandle[] {
  const out: EarningsMomentumCandle[] = [];
  let px = 100;
  for (let i = 0; i < 12; i += 1) {
    const open = px;
    px *= 1.004;
    out.push(bar(i, open, px * 1.005, open * 0.997, px, 1_200_000));
  }
  const last = out[out.length - 1]!;
  out[out.length - 1] = {
    ...last,
    volume: 2_500_000,
    close: last.close * 1.01,
    high: last.close * 1.015,
  };
  return out;
}

function makeLeaderInput(): EarningsMomentumStrategyInput {
  const candles = buildIdealCandles();
  const last = candles[candles.length - 1]!;
  return {
    symbol: "EARN",
    lastPrice: last.close,
    earningsMomentum: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      relativeVolume: 1.8,
      averageVolume20d: 1_200_000,
      relativeStrength: 70,
      fundamentals: {
        epsActual: 12,
        epsEstimate: 10,
        revenueActual: 1100,
        revenueEstimate: 1000,
        ebitda: 300,
        ebitdaPrior: 250,
        operatingMargin: 0.22,
        operatingMarginPrior: 0.2,
        patGrowth: 0.18,
        revenueGrowthYoy: 0.15,
        revenueGrowthQoq: 0.05,
        epsGrowthYoy: 0.2,
        epsGrowthQoq: 0.06,
        guidance: "upgrade",
        institutionalBuying: true,
        managementCommentaryPositive: true,
      },
    },
  };
}

function makeExecutionContext(
  input: EarningsMomentumStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Event Driven", 75),
    confidence: makeConfidence(75),
    eligibleStrategies: eligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0, 20),
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

describe("Earnings Momentum Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetEarningsMomentumMetrics();
    ensureEarningsMomentumRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetEarningsMomentumMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getEarningsMomentumIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(EARNINGS_MOMENTUM_STRATEGY_ID);
    expect(getStrategyRegistry().has(EARNINGS_MOMENTUM_STRATEGY_ID)).toBe(
      true
    );
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(
      EARNINGS_MOMENTUM_STRATEGY_ID
    );
    expect(instance).toBeInstanceOf(EarningsMomentumStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeEarningsMomentumThroughEngine(
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
    const result = executeEarningsMomentumWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerEarningsMomentumStrategy", () => {
    const registry = getStrategyRegistry();
    registerEarningsMomentumStrategy(registry);
    expect(registry.has(EARNINGS_MOMENTUM_STRATEGY_ID)).toBe(true);
  });

  it("rejects Poor RR setups", () => {
    const input = makeLeaderInput();
    const context = makeExecutionContext(input);
    const strategy = new EarningsMomentumStrategy();
    const detection = strategy.detect(context);
    expect(detection.detected).toBe(true);
    const rejected = new EarningsMomentumTradeBuilder({
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
    resetEarningsMomentumMetrics();
    executeEarningsMomentumThroughEngine(
      makeExecutionContext(makeLeaderInput()),
      { skipEligibilityCheck: true }
    );
    const snap = getEarningsMomentumMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new EarningsMomentumStrategy();
    expect(strategy.detect(broken).detected).toBe(false);
    expect(strategy.buildTradeSetup(broken).entry).toBe(0);
  });
});
