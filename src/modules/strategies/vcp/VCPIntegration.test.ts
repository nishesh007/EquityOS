/**
 * VCP Integration — tests (Sprint 11B.3L).
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
  VCP_STRATEGY_ID,
  VCPStrategy,
  VCPTradeBuilder,
  buildVCPExplainability,
  buildVCPInstitutionalScore,
  buildVCPSummary,
  ensureVCPRegistered,
  executeVCPThroughEngine,
  executeVCPWithPipeline,
  getVCPIntegrationStatus,
  getVCPMetrics,
  registerVCPStrategy,
  resetVCPMetrics,
  type VCPCandle,
  type VCPStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 18 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function daily(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): VCPCandle {
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

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(80);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(70),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "vcp",
      name: "VCP",
      category: "Swing",
      eligible: true,
      priority: 60,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildIdealCandles(): VCPCandle[] {
  const candles: VCPCandle[] = [];
  let day = 0;
  for (let i = 0; i < 12; i++) {
    const p = 88 + i * 0.8;
    candles.push(daily(day++, p, p + 1.2, p - 0.4, p + 0.8, 200_000));
  }
  const ranges = [
    { high: 105, low: 95, vol: 190_000 },
    { high: 103.5, low: 96.5, vol: 140_000 },
    { high: 102.2, low: 98.2, vol: 80_000 },
  ];
  for (const seg of ranges) {
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const mid = seg.low + (seg.high - seg.low) * (0.35 + t * 0.3);
      const half = (seg.high - seg.low) * 0.35;
      candles.push(
        daily(
          day++,
          mid,
          Math.min(seg.high, mid + half),
          Math.max(seg.low, mid - half),
          mid + half * 0.2,
          seg.vol
        )
      );
    }
  }
  const pivot = ranges[2]!.high;
  candles.push(daily(day++, pivot, pivot + 1.1, pivot - 0.2, pivot + 0.85, 320_000));
  return candles;
}

function makeInput(candles: VCPCandle[]): VCPStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.5,
    vcp: {
      candlesDaily: candles,
      vwap: last.close - 1,
      atr: 1.5,
      ema20: last.close - 0.8,
      ema50: last.close - 2,
      ema150: last.close - 8,
      ema200: last.close - 12,
      relativeVolume: 1.8,
      averageVolume20d: 150_000,
      fiftyTwoWeekHigh: last.close + 3,
    },
  };
}

function makeExecutionContext(
  input: VCPStrategyInput
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

function makePipeline(input: VCPStrategyInput): TradingPipelineResult {
  const marketContext = makeMarketContext();
  const regime = makeRegime("Strong Bull", 80);
  const confidence = makeConfidence(80);
  return {
    context: marketContext,
    regime,
    confidence,
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
    warnings: [],
    summary: ["pipeline"],
    metrics: {},
    success: true,
    // Minimal fields — cast through known pipeline shape used by other tests
  } as unknown as TradingPipelineResult;
}

beforeEach(() => {
  resetStrategyEngine();
  resetVCPMetrics();
  ensureVCPRegistered();
});

afterEach(() => {
  resetStrategyEngine();
  resetVCPMetrics();
});

describe("VCP Integration", () => {
  it("registers with StrategyRegistry", () => {
    const status = getVCPIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(VCP_STRATEGY_ID);
    expect(getStrategyRegistry().has(VCP_STRATEGY_ID)).toBe(true);
  });

  it("creates strategy from StrategyFactory", () => {
    ensureVCPRegistered();
    const factory = getStrategyFactory();
    expect(factory.has(VCP_STRATEGY_ID)).toBe(true);
    const instance = factory.create(VCP_STRATEGY_ID);
    expect(instance?.id).toBe(VCP_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const input = makeInput(buildIdealCandles());
    const result = executeVCPThroughEngine(makeExecutionContext(input), {
      skipEligibilityCheck: true,
    });
    expect(result).toBeTruthy();
    expect(result.signal.strategyId).toBe(VCP_STRATEGY_ID);
  });

  it("executes with TradingPipeline context", () => {
    const input = makeInput(buildIdealCandles());
    const pipeline = makePipeline(input);
    const result = executeVCPWithPipeline(pipeline, input, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(VCP_STRATEGY_ID);
  });

  it("registerVCPStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    ensureVCPRegistered();
    const dup = registerVCPStrategy(registry);
    expect(typeof dup).toBe("boolean");
    expect(registry.has(VCP_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on trade build", () => {
    resetVCPMetrics();
    const input = makeInput(buildIdealCandles());
    const context = makeExecutionContext(input);
    const strategy = getStrategyFactory().create(VCP_STRATEGY_ID);
    expect(strategy).toBeInstanceOf(VCPStrategy);
    const vcp = strategy as VCPStrategy;
    const detection = vcp.detect(context);
    new VCPTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getVCPMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThan(0);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("failure recovery returns rejected setup without throwing", () => {
    const badInput: VCPStrategyInput = {
      symbol: "X",
      lastPrice: 0,
      vcp: {
        candlesDaily: [],
        vwap: 0,
        atr: null,
        ema20: null,
        ema50: null,
        ema150: null,
        ema200: null,
        relativeVolume: null,
      },
    };
    const context = makeExecutionContext(badInput);
    expect(() =>
      executeVCPThroughEngine(context, { skipEligibilityCheck: true })
    ).not.toThrow();
  });

  it("institutional scoring and summary helpers", () => {
    const input = makeInput(buildIdealCandles());
    const context = makeExecutionContext(input);
    const created = getStrategyFactory().create(VCP_STRATEGY_ID);
    expect(created).toBeInstanceOf(VCPStrategy);
    const detection = (created as VCPStrategy).detect(context);
    const setup = new VCPTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const score = buildVCPInstitutionalScore({
      detection,
      setup,
      marketContext: context.marketContext,
      vcpInput: input,
    });
    expect(score.conviction).toBeGreaterThan(0);
    const explain = buildVCPExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      vcpInput: input,
      institutionalScore: score,
    });
    const summary = buildVCPSummary({
      detection,
      setup,
      positiveReasons: explain.positiveReasons,
      negativeReasons: explain.negativeReasons,
      institutionalScore: score,
    });
    expect(summary.length).toBeGreaterThan(0);
  });
});
