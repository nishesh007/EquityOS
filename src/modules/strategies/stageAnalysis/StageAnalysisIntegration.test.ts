/**
 * Stage Analysis Integration — tests (Sprint 11B.3M).
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
  STAGE_ANALYSIS_STRATEGY_ID,
  StageAnalysisStrategy,
  StageAnalysisTradeBuilder,
  buildStageAnalysisExplainability,
  buildStageAnalysisInstitutionalScore,
  buildStageAnalysisSummary,
  ensureStageAnalysisRegistered,
  executeStageAnalysisThroughEngine,
  executeStageAnalysisWithPipeline,
  getStageAnalysisIntegrationStatus,
  getStageAnalysisMetrics,
  registerStageAnalysisStrategy,
  resetStageAnalysisMetrics,
  type StageAnalysisCandle,
  type StageAnalysisStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, weekOffset = 0): Date {
  return new Date(
    Date.UTC(2025, 0, 6 + weekOffset * 7, hour, minute, 0) - 330 * 60_000
  );
}

function weekly(
  weekOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): StageAnalysisCandle {
  return {
    timestamp: atIST(10, 0, weekOffset),
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
    atr: 2,
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
      strategyId: "stage-analysis",
      name: "Stage Analysis",
      category: "Swing",
      eligible: true,
      priority: 58,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildStage2Input(): StageAnalysisStrategyInput {
  const candles: StageAnalysisCandle[] = [];
  let week = 0;
  for (let i = 0; i < 30; i++) {
    const p = 80 + i * 0.4;
    candles.push(weekly(week++, p, p + 1.5, p - 0.5, p + 0.8, 90_000));
  }
  for (let i = 0; i < 16; i++) {
    const p = 92 + i * 1.1;
    candles.push(
      weekly(week++, p, p + 2.5, p - 0.4, p + 1.8, 110_000 + i * 8_000)
    );
  }
  const last = candles[candles.length - 1]!;
  const ma = last.close * 0.94;
  const daily = candles.slice(-35).map((c, i) => ({
    ...c,
    timestamp: atIST(10, 0, i),
  }));
  return {
    symbol: "TCS",
    lastPrice: last.close,
    atr: 2,
    stageAnalysis: {
      candlesDaily: daily,
      candlesWeekly: candles,
      ma30Week: ma,
      ma30WeekHistory: [ma * 0.97, ma * 0.98, ma * 0.99, ma],
      ema20: last.close - 1,
      ema50: last.close - 3,
      ema150: last.close - 8,
      ema200: last.close - 12,
      vwap: last.close - 0.5,
      atr: 2,
      relativeVolume: 1.4,
      averageVolume20Week: 120_000,
      relativeStrength: 70,
      previousStage: 1,
    },
  };
}

function makeExecutionContext(
  input: StageAnalysisStrategyInput
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
  resetStageAnalysisMetrics();
  ensureStageAnalysisRegistered();
});

afterEach(() => {
  resetStrategyEngine();
  resetStageAnalysisMetrics();
});

describe("Stage Analysis Integration", () => {
  it("registers with StrategyRegistry", () => {
    const status = getStageAnalysisIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(STAGE_ANALYSIS_STRATEGY_ID);
    expect(getStrategyRegistry().has(STAGE_ANALYSIS_STRATEGY_ID)).toBe(true);
  });

  it("creates strategy from StrategyFactory", () => {
    const factory = getStrategyFactory();
    expect(factory.has(STAGE_ANALYSIS_STRATEGY_ID)).toBe(true);
    const instance = factory.create(STAGE_ANALYSIS_STRATEGY_ID);
    expect(instance?.id).toBe(STAGE_ANALYSIS_STRATEGY_ID);
  });

  it("executes through StrategyEngine", () => {
    const result = executeStageAnalysisThroughEngine(
      makeExecutionContext(buildStage2Input()),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe(STAGE_ANALYSIS_STRATEGY_ID);
  });

  it("executes with TradingPipeline context", () => {
    const input = buildStage2Input();
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

    const result = executeStageAnalysisWithPipeline(pipeline, input, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe(STAGE_ANALYSIS_STRATEGY_ID);
  });

  it("registerStageAnalysisStrategy is idempotent-safe via ensure", () => {
    const registry = getStrategyRegistry();
    ensureStageAnalysisRegistered();
    const dup = registerStageAnalysisStrategy(registry);
    expect(typeof dup).toBe("boolean");
    expect(registry.has(STAGE_ANALYSIS_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on trade build", () => {
    resetStageAnalysisMetrics();
    const input = buildStage2Input();
    const context = makeExecutionContext(input);
    const created = getStrategyFactory().create(STAGE_ANALYSIS_STRATEGY_ID);
    expect(created).toBeInstanceOf(StageAnalysisStrategy);
    const detection = (created as StageAnalysisStrategy).detect(context);
    new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getStageAnalysisMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThan(0);
  });

  it("failure recovery returns without throwing", () => {
    const badInput: StageAnalysisStrategyInput = {
      symbol: "X",
      lastPrice: 0,
      stageAnalysis: {
        candlesDaily: [],
        candlesWeekly: [],
        ma30Week: null,
        ema20: null,
        ema50: null,
        ema150: null,
        ema200: null,
        vwap: 0,
        atr: null,
        relativeVolume: null,
        relativeStrength: null,
      },
    };
    expect(() =>
      executeStageAnalysisThroughEngine(makeExecutionContext(badInput), {
        skipEligibilityCheck: true,
      })
    ).not.toThrow();
  });

  it("institutional scoring helpers", () => {
    const input = buildStage2Input();
    const context = makeExecutionContext(input);
    const created = getStrategyFactory().create(STAGE_ANALYSIS_STRATEGY_ID);
    const detection = (created as StageAnalysisStrategy).detect(context);
    const setup = new StageAnalysisTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const score = buildStageAnalysisInstitutionalScore({
      detection,
      setup,
      marketContext: context.marketContext,
      saInput: input,
    });
    expect(score.conviction).toBeGreaterThan(0);
    const explain = buildStageAnalysisExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      saInput: input,
      institutionalScore: score,
    });
    const summary = buildStageAnalysisSummary({
      detection,
      setup,
      positiveReasons: explain.positiveReasons,
      negativeReasons: explain.negativeReasons,
      institutionalScore: score,
    });
    expect(summary.length).toBeGreaterThan(0);
  });
});
