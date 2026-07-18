/**
 * Darvas Box Integration — tests (Sprint 11B.3N).
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
  DARVAS_BOX_STRATEGY_ID,
  DarvasBoxStrategy,
  DarvasBoxTradeBuilder,
  buildDarvasBoxExplainability,
  buildDarvasBoxInstitutionalScore,
  buildDarvasBoxSummary,
  ensureDarvasBoxRegistered,
  executeDarvasBoxThroughEngine,
  executeDarvasBoxWithPipeline,
  getDarvasBoxIntegrationStatus,
  getDarvasBoxMetrics,
  registerDarvasBoxStrategy,
  resetDarvasBoxMetrics,
  type DarvasBoxCandle,
  type DarvasBoxStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function daily(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): DarvasBoxCandle {
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
      strategyId: "darvas",
      name: "Darvas",
      category: "Swing",
      eligible: true,
      priority: 56,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildIdealInput(): DarvasBoxStrategyInput {
  const candles: DarvasBoxCandle[] = [];
  let day = 0;
  const boxHigh = 110;
  const boxLow = 104;
  for (let i = 0; i < 30; i++) {
    const p = 85 + i * 0.45;
    candles.push(daily(day++, p, p + 1.0, p - 0.3, p + 0.6, 150_000));
  }
  for (let i = 0; i < 12; i++) {
    const mid = boxLow + (boxHigh - boxLow) * (0.4 + (i % 3) * 0.08);
    const vol = 200_000 - i * 8_000;
    let high = mid + 1.2;
    let low = mid - 1.2;
    let close = mid;
    if (i % 3 === 0) {
      high = boxHigh;
      close = boxHigh - 0.35;
      low = Math.max(boxLow + 0.5, close - 1.5);
    } else if (i % 3 === 1) {
      low = boxLow;
      close = boxLow + 0.4;
      high = Math.min(boxHigh - 0.5, close + 1.5);
    } else {
      high = Math.min(boxHigh - 0.3, mid + 1.5);
      low = Math.max(boxLow + 0.3, mid - 1.5);
    }
    if (i === 6) {
      high = boxHigh + 0.35;
      close = boxHigh - 0.4;
      low = boxHigh - 2;
    }
    candles.push(daily(day++, mid, high, low, close, Math.max(vol, 80_000)));
  }
  candles.push(
    daily(day++, boxHigh, boxHigh + 1.3, boxHigh - 0.2, boxHigh + 0.9, 320_000)
  );
  const last = candles[candles.length - 1]!;
  return {
    symbol: "INFY",
    lastPrice: last.close,
    atr: 1.5,
    darvasBox: {
      candlesDaily: candles,
      vwap: last.close - 1,
      atr: 1.5,
      ema20: last.close - 0.5,
      ema50: last.close - 2,
      ema150: last.close - 8,
      ema200: last.close - 12,
      relativeVolume: 1.6,
      averageVolume20d: 140_000,
      fiftyTwoWeekHigh: last.close + 5,
      relativeStrength: 70,
    },
  };
}

function makeExecutionContext(
  input: DarvasBoxStrategyInput
): StrategyExecutionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    riskMode: "Neutral",
    timestamp: atIST(10, 0),
  };
}

beforeEach(() => {
  resetStrategyEngine();
  resetDarvasBoxMetrics();
  ensureDarvasBoxRegistered();
});

afterEach(() => {
  resetStrategyEngine();
  resetDarvasBoxMetrics();
});

describe("Darvas Box Integration", () => {
  it("registers with StrategyRegistry", () => {
    const status = getDarvasBoxIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(DARVAS_BOX_STRATEGY_ID);
    expect(getStrategyRegistry().has(DARVAS_BOX_STRATEGY_ID)).toBe(true);
  });

  it("creates strategy from StrategyFactory", () => {
    const factory = getStrategyFactory();
    expect(factory.has(DARVAS_BOX_STRATEGY_ID)).toBe(true);
    const instance = factory.create(DARVAS_BOX_STRATEGY_ID);
    expect(instance?.id).toBe(DARVAS_BOX_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeDarvasBoxThroughEngine(
      makeExecutionContext(buildIdealInput()),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe(DARVAS_BOX_STRATEGY_ID);
  });

  it("executes with TradingPipeline context", () => {
    const input = buildIdealInput();
    const context = makeExecutionContext(input);
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

    const result = executeDarvasBoxWithPipeline(pipeline, input, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(DARVAS_BOX_STRATEGY_ID);
  });

  it("registerDarvasBoxStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    ensureDarvasBoxRegistered();
    const dup = registerDarvasBoxStrategy(registry);
    expect(typeof dup).toBe("boolean");
    expect(registry.has(DARVAS_BOX_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on trade build", () => {
    resetDarvasBoxMetrics();
    const input = buildIdealInput();
    const context = makeExecutionContext(input);
    const created = getStrategyFactory().create(DARVAS_BOX_STRATEGY_ID);
    expect(created).toBeInstanceOf(DarvasBoxStrategy);
    const detection = (created as DarvasBoxStrategy).detect(context);
    new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getDarvasBoxMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThan(0);
  });

  it("failure recovery returns without throwing", () => {
    const badInput: DarvasBoxStrategyInput = {
      symbol: "X",
      lastPrice: 0,
      darvasBox: {
        candlesDaily: [],
        vwap: 0,
        atr: null,
        ema20: null,
        ema50: null,
        ema150: null,
        ema200: null,
        relativeVolume: null,
        relativeStrength: null,
      },
    };
    expect(() =>
      executeDarvasBoxThroughEngine(makeExecutionContext(badInput), {
        skipEligibilityCheck: true,
      })
    ).not.toThrow();
  });

  it("institutional scoring helpers", () => {
    const input = buildIdealInput();
    const context = makeExecutionContext(input);
    const created = getStrategyFactory().create(DARVAS_BOX_STRATEGY_ID);
    const detection = (created as DarvasBoxStrategy).detect(context);
    const setup = new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const score = buildDarvasBoxInstitutionalScore({
      detection,
      setup,
      marketContext: context.marketContext,
      dbInput: input,
    });
    expect(score.conviction).toBeGreaterThan(0);
    const explain = buildDarvasBoxExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      dbInput: input,
      institutionalScore: score,
    });
    const summary = buildDarvasBoxSummary({
      detection,
      setup,
      positiveReasons: explain.positiveReasons,
      negativeReasons: explain.negativeReasons,
      institutionalScore: score,
    });
    expect(summary.length).toBeGreaterThan(0);
  });
});
