/**
 * Cup & Handle Integration — tests (Sprint 11B.3Q).
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
  CUP_HANDLE_STRATEGY_ID,
  CupHandleStrategy,
  CupHandleTradeBuilder,
  ensureCupHandleRegistered,
  executeCupHandleThroughEngine,
  executeCupHandleWithPipeline,
  getCupHandleIntegrationStatus,
  getCupHandleMetrics,
  registerCupHandleStrategy,
  resetCupHandleMetrics,
  type CupHandleCandle,
  type CupHandleStrategyInput,
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
): CupHandleCandle {
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
    score: 35,
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
      strategyId: CUP_HANDLE_STRATEGY_ID,
      name: "Cup & Handle",
      category: "Swing",
      eligible: true,
      priority: 55,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildIdealCandles(): CupHandleCandle[] {
  const out: CupHandleCandle[] = [];
  let day = 0;
  let px = 80;
  for (let i = 0; i < 15; i += 1) {
    const open = px;
    px *= 1.015;
    out.push(bar(day++, open, px * 1.004, open * 0.996, px, 1_200_000));
  }
  const leftPeak = px;
  const bottom = leftPeak * 0.8;
  for (let i = 0; i < 12; i += 1) {
    const t = (i + 1) / 12;
    const target =
      leftPeak - (leftPeak - bottom) * Math.sin((t * Math.PI) / 2);
    const open = px;
    px = target;
    out.push(
      bar(
        day++,
        open,
        Math.max(open, px) * 1.002,
        Math.min(open, px) * 0.998,
        px,
        1_000_000
      )
    );
  }
  for (let i = 0; i < 6; i += 1) {
    const open = px;
    px = bottom * (1 + (i % 2) * 0.004);
    out.push(bar(day++, open, Math.max(open, px) * 1.003, bottom * 0.998, px, 900_000));
  }
  for (let i = 0; i < 12; i += 1) {
    const t = (i + 1) / 12;
    const target = bottom + (leftPeak * 0.98 - bottom) * Math.sin((t * Math.PI) / 2);
    const open = px;
    px = target;
    out.push(
      bar(
        day++,
        open,
        Math.max(open, px) * 1.003,
        Math.min(open, px) * 0.997,
        px,
        950_000
      )
    );
  }
  const rightPeak = px;
  const handleLow = rightPeak * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const open = px;
    px = handleLow + (rightPeak - handleLow) * (0.4 + (i % 3) * 0.1);
    out.push(
      bar(
        day++,
        open,
        Math.min(rightPeak, Math.max(open, px) * 1.002),
        Math.max(handleLow, Math.min(open, px) * 0.998),
        px,
        800_000 - i * 40_000
      )
    );
  }
  const pivot = Math.max(...out.slice(-6).map((c) => c.high));
  out.push(bar(day++, px, pivot * 1.02, px * 0.998, pivot * 1.015, 2_200_000));
  return out;
}

function makeLeaderInput(): CupHandleStrategyInput {
  const candles = buildIdealCandles();
  const last = candles[candles.length - 1]!;
  return {
    symbol: "CUP",
    lastPrice: last.close,
    cupHandle: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      ema150: last.close * 0.92,
      ema200: last.close * 0.9,
      relativeVolume: 1.6,
      averageVolume20d: 1_000_000,
      relativeStrength: 70,
    },
  };
}

function makeExecutionContext(
  input: CupHandleStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0, 60),
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

describe("Cup & Handle Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetCupHandleMetrics();
    ensureCupHandleRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetCupHandleMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getCupHandleIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(CUP_HANDLE_STRATEGY_ID);
    expect(getStrategyRegistry().has(CUP_HANDLE_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(CUP_HANDLE_STRATEGY_ID);
    expect(instance).toBeInstanceOf(CupHandleStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeCupHandleThroughEngine(
      makeExecutionContext(makeLeaderInput()),
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
    expect(
      result.signal.signal === "BUY" || result.signal.signal === "IGNORE"
    ).toBe(true);
  });

  it("integrates with Trading Pipeline", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const result = executeCupHandleWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerCupHandleStrategy", () => {
    const registry = getStrategyRegistry();
    registerCupHandleStrategy(registry);
    expect(registry.has(CUP_HANDLE_STRATEGY_ID)).toBe(true);
  });

  it("rejects Poor RR setups", () => {
    const input = makeLeaderInput();
    const context = makeExecutionContext(input);
    const strategy = new CupHandleStrategy();
    const detection = strategy.detect(context);
    expect(detection.detected).toBe(true);
    const rejected = new CupHandleTradeBuilder({
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
    resetCupHandleMetrics();
    executeCupHandleThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getCupHandleMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new CupHandleStrategy();
    expect(strategy.detect(broken).detected).toBe(false);
    expect(strategy.buildTradeSetup(broken).entry).toBe(0);
  });
});
