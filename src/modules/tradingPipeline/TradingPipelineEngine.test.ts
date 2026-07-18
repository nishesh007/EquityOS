/**
 * Trading Pipeline — integration tests (Sprint 11B.2D).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  BreadthAnalysis,
  InstitutionalMarketContext,
  SectorAnalysis,
  SectorRotationSummary,
  VolatilityAnalysis,
} from "@/src/modules/marketContext";
import { resetMarketRegimeEngine } from "@/src/modules/marketRegime";
import { resetStrategyEligibilityEngine } from "@/src/modules/strategyEligibility";
import {
  PIPELINE_STAGE_ORDER,
  PipelineValidator,
  TradingPipeline,
  calculatePipelineHealth,
  createFallbackPipelineResult,
  createStageRecord,
  resetTradingPipeline,
  validatePipelineResult,
  type TradingPipelineResult,
} from "./index";

function makeBreadth(overrides: Partial<BreadthAnalysis> = {}): BreadthAnalysis {
  return {
    advanceCount: 1200,
    declineCount: 900,
    unchangedCount: 80,
    advanceDeclineRatio: 1.33,
    netAdvances: 300,
    breadthPercent: 55,
    participationPercent: 58,
    equalWeightBreadth: 55,
    largeCapBreadth: 56,
    midCapBreadth: 54,
    smallCapBreadth: 52,
    breadthMomentum: 2,
    breadthQuality: "Neutral",
    score: 55,
    confidence: 70,
    reasons: ["Breadth balanced"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

function makeVolatility(
  overrides: Partial<VolatilityAnalysis> = {}
): VolatilityAnalysis {
  return {
    score: 40,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 14,
    atr: 120,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.1,
    dailyRange: 0.8,
    intradayRange: 0.7,
    riskMode: "Neutral",
    confidence: 72,
    reasons: ["India VIX normal"],
    vixTrend: "Stable",
    vixMomentum: 0.5,
    atrExpansion: false,
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: false,
    volatilityCompression: false,
    gapDirection: "flat",
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

function makeSectors(
  specs: Array<{ sector: string; score: number }>
): SectorAnalysis[] {
  return specs.map((spec) => ({
    sector: spec.sector,
    score: spec.score,
    trend:
      spec.score >= 65 ? "Bull" : spec.score <= 40 ? "Bear" : "Neutral",
    relativeStrength: spec.score,
    breadth: spec.score,
    volume: 55,
    momentum: spec.score,
    participation: spec.score,
    confidence: 70,
    reasons: [`${spec.sector} scored`],
  }));
}

function makeRotation(sectors: SectorAnalysis[]): SectorRotationSummary {
  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  return {
    improving: ranked.filter((s) => s.score >= 60).map((s) => s.sector),
    weakening: ranked.filter((s) => s.score <= 40).map((s) => s.sector),
    stable: ranked
      .filter((s) => s.score > 40 && s.score < 60)
      .map((s) => s.sector),
    leaders: ranked.slice(0, 3).map((s) => s.sector),
    laggards: ranked.slice(-3).map((s) => s.sector),
    reasons: ["Rotation snapshot"],
  };
}

function makeContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectorStrength =
    overrides.sectorStrength ??
    makeSectors([
      { sector: "IT", score: 62 },
      { sector: "Auto", score: 58 },
      { sector: "Banking", score: 55 },
    ]);

  const base: InstitutionalMarketContext = {
    timestamp: new Date("2026-07-18T10:00:00Z"),
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: makeBreadth(),
    sectorStrength,
    sectorRotation: makeRotation(sectorStrength),
    volatility: makeVolatility(),
    riskMode: "Neutral",
    confidence: 70,
    healthScore: 55,
    qualityGrade: "B",
    summary: ["Balanced tape."],
    warnings: [],
  };

  const merged = { ...base, ...overrides };
  if (!overrides.sectorRotation && overrides.sectorStrength) {
    merged.sectorRotation = makeRotation(overrides.sectorStrength);
  }
  return merged;
}

function bullContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 84 },
    { sector: "Auto", score: 80 },
    { sector: "Banking", score: 78 },
    { sector: "FMCG", score: 74 },
  ]);
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 82,
    marketBreadth: makeBreadth({
      score: 80,
      participationPercent: 78,
      breadthQuality: "Very Strong",
      confidence: 92,
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({
      score: 24,
      regime: "Low",
      indiaVix: 11,
      riskMode: "Risk On",
    }),
    riskMode: "Risk On",
    confidence: 92,
    healthScore: 86,
    qualityGrade: "A+",
  });
}

function bearContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Strong Bear",
    marketStrength: 22,
    marketBreadth: makeBreadth({
      score: 18,
      participationPercent: 16,
      breadthQuality: "Very Weak",
    }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 20 },
      { sector: "Auto", score: 18 },
    ]),
    volatility: makeVolatility({
      score: 72,
      regime: "High",
      indiaVix: 25,
      riskMode: "Risk Off",
    }),
    riskMode: "Risk Off",
    confidence: 70,
    healthScore: 28,
    qualityGrade: "C",
  });
}

function sidewaysContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: makeBreadth({ score: 50 }),
    volatility: makeVolatility({ score: 35 }),
    riskMode: "Neutral",
    confidence: 68,
    healthScore: 58,
  });
}

function highVolContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 48,
    marketBreadth: makeBreadth({ score: 45 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 50 },
      { sector: "Auto", score: 46 },
    ]),
    volatility: makeVolatility({
      score: 82,
      regime: "Extreme",
      indiaVix: 28,
      atrExpansion: true,
      riskMode: "Risk Off",
    }),
    riskMode: "Risk Off",
    confidence: 58,
    healthScore: 40,
    qualityGrade: "C",
  });
}

function eventDrivenContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: makeBreadth({ score: 65 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 72 },
      { sector: "Banking", score: 68 },
    ]),
    volatility: makeVolatility({
      score: 74,
      regime: "High",
      indiaVix: 23,
      gapPercent: 1.5,
      atrExpansion: true,
      gapDirection: "up",
    }),
    riskMode: "Neutral",
    confidence: 66,
    healthScore: 56,
  });
}

describe("TradingPipeline — market scenarios", () => {
  let pipeline: TradingPipeline;

  beforeEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
    pipeline = new TradingPipeline();
  });

  afterEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
  });

  it("runs Complete Bull Market end-to-end", () => {
    const result = pipeline.execute({ context: bullContext(), forceRefresh: true });
    expect(result.regime.regime).toMatch(/Bull|Low Volatility/);
    expect(result.confidence.score).toBeGreaterThan(50);
    expect(result.eligibleStrategies.length).toBeGreaterThan(0);
    expect(result.pipelineHealth).toBeGreaterThan(50);
    expect(result.healthGrade).toMatch(/Excellent|Good|Fair/);
    expect(result.errors.length).toBe(0);
    expect(result.stages).toHaveLength(4);
  });

  it("runs Complete Bear Market end-to-end", () => {
    const result = pipeline.execute({ context: bearContext(), forceRefresh: true });
    expect(result.regime.regime).toMatch(/Bear|High Volatility/);
    expect(result.context.riskMode).toBe("Risk Off");
    expect(result.eligibleStrategies.length).toBe(0);
    expect(result.pipelineConfidence).toBeGreaterThan(0);
  });

  it("runs Sideways market", () => {
    const result = pipeline.execute({
      context: sidewaysContext(),
      forceRefresh: true,
    });
    expect(result.regime.regime).toMatch(/Sideways|Low Volatility/);
    expect(result.context).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it("runs High Volatility market", () => {
    const result = pipeline.execute({
      context: highVolContext(),
      forceRefresh: true,
    });
    expect(result.regime.regime).toMatch(/High Volatility|Event Driven|Weak/);
    expect(result.stages.every((s) => s.stage)).toBe(true);
  });

  it("runs Event Driven market", () => {
    const result = pipeline.execute({
      context: eventDrivenContext(),
      forceRefresh: true,
    });
    expect(["Event Driven", "High Volatility", "Strong Bull"]).toContain(
      result.regime.regime
    );
    expect(result.eligibleStrategies.length).toBeGreaterThanOrEqual(0);
  });
});

describe("TradingPipeline — failure & recovery", () => {
  let pipeline: TradingPipeline;

  beforeEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
    pipeline = new TradingPipeline();
  });

  afterEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
  });

  it("handles Missing Context without crashing", () => {
    const result = pipeline.execute({ context: null, forceRefresh: true });
    expect(result.context).toBeDefined();
    expect(result.regime).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(Array.isArray(result.eligibleStrategies)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.pipelineHealth).toBeGreaterThan(0);
    expect(result.stages).toHaveLength(4);
  });

  it("handles Missing Breadth warnings", () => {
    const context = bullContext();
    context.warnings = ["Breadth subsystem unavailable"];
    context.marketBreadth = makeBreadth({ score: 50, confidence: 20 });
    const result = pipeline.execute({ context, forceRefresh: true });
    expect(result.warnings.some((w) => /breadth/i.test(w))).toBe(true);
    expect(result.regime).toBeDefined();
  });

  it("handles Missing Sector data", () => {
    const context = bullContext();
    context.sectorStrength = [];
    context.warnings = ["Sector strength missing"];
    const result = pipeline.execute({ context, forceRefresh: true });
    expect(result.warnings.some((w) => /sector/i.test(w))).toBe(true);
    expect(result.stages.length).toBe(4);
  });

  it("handles Missing Volatility warnings", () => {
    const context = bullContext();
    context.warnings = ["Volatility / VIX feed degraded"];
    const result = pipeline.execute({ context, forceRefresh: true });
    expect(result.warnings.some((w) => /volatilit|vix/i.test(w))).toBe(true);
    expect(result.confidence).toBeDefined();
  });

  it("handles Low Confidence regimes", () => {
    const context = makeContext({
      marketTrend: "Weak Bull",
      marketStrength: 55,
      marketBreadth: makeBreadth({ score: 42 }),
      sectorStrength: makeSectors([
        { sector: "IT", score: 70 },
        { sector: "Auto", score: 25 },
      ]),
      volatility: makeVolatility({ score: 68, regime: "High" }),
      riskMode: "Risk On",
      confidence: 40,
      healthScore: 42,
      qualityGrade: "C",
      warnings: ["Conflicting signals across market subsystems"],
    });
    const result = pipeline.execute({ context, forceRefresh: true });
    expect(result.confidence.score).toBeLessThan(85);
    expect(result.pipelineConfidence).toBeLessThan(
      pipeline.execute({ context: bullContext(), forceRefresh: true })
        .pipelineConfidence
    );
  });

  it("supports Pipeline Recovery via fallback result", () => {
    const fallback = createFallbackPipelineResult(
      new Date(),
      "Simulated upstream failure"
    );
    expect(fallback.errors.length).toBeGreaterThan(0);
    expect(fallback.eligibleStrategies).toEqual([]);
    expect(fallback.regime.regime).toBe("Sideways");
  });

  it("continues after Partial Failure (degraded data quality)", () => {
    const context = bullContext();
    context.confidence = 35;
    context.healthScore = 40;
    context.warnings = [
      "Breadth subsystem unavailable",
      "Sector strength missing",
    ];
    context.sectorStrength = [];
    const result = pipeline.execute({ context, forceRefresh: true });
    expect(result.stages.filter((s) => s.status === "success").length).toBe(4);
    expect(result.pipelineHealth).toBeLessThan(
      pipeline.execute({ context: bullContext(), forceRefresh: true }).pipelineHealth
    );
  });
});

describe("TradingPipeline — cache, order, validation, performance", () => {
  let pipeline: TradingPipeline;

  beforeEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
    pipeline = new TradingPipeline({ cacheTtlMs: 60_000 });
  });

  afterEach(() => {
    resetTradingPipeline();
    resetMarketRegimeEngine();
    resetStrategyEligibilityEngine();
  });

  it("reuses Cache Behaviour on identical context", () => {
    const context = bullContext();
    const first = pipeline.execute({ context, forceRefresh: true });
    const second = pipeline.execute({ context, forceRefresh: false });
    expect(second.stages.every((s) => s.status === "cached" || s.cacheHit)).toBe(
      true
    );
    expect(second.regime.regime).toBe(first.regime.regime);
    const metrics = pipeline.getMetrics();
    expect(metrics.cacheHits).toBeGreaterThan(0);
    expect(metrics.totalRuns).toBeGreaterThanOrEqual(2);
  });

  it("bypasses cache on forceRefresh", () => {
    const context = bullContext();
    pipeline.execute({ context, forceRefresh: true });
    const refreshed = pipeline.execute({ context, forceRefresh: true });
    expect(refreshed.stages.every((s) => s.status === "success")).toBe(true);
  });

  it("enforces Execution Order", () => {
    const result = pipeline.execute({
      context: bullContext(),
      forceRefresh: true,
    });
    expect(result.stages.map((s) => s.stage)).toEqual([...PIPELINE_STAGE_ORDER]);
    expect(result.stages.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it("prevents Duplicate stage records via validator", () => {
    const result = pipeline.execute({
      context: bullContext(),
      forceRefresh: true,
    });
    const broken: TradingPipelineResult = {
      ...result,
      stages: [
        ...result.stages,
        createStageRecord("Market Regime", "success", 1),
      ],
    };
    const validation = validatePipelineResult(broken);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((i) => i.code === "DUPLICATE_EXECUTION")
    ).toBe(true);
  });

  it("validates Duplicate Prevention of eligible strategies", () => {
    const result = pipeline.execute({
      context: bullContext(),
      forceRefresh: true,
    });
    if (result.eligibleStrategies.length === 0) {
      expect(result.eligibleStrategies).toEqual([]);
      return;
    }
    const dup = {
      ...result,
      eligibleStrategies: [
        result.eligibleStrategies[0]!,
        result.eligibleStrategies[0]!,
      ],
    };
    const validation = new PipelineValidator().validate(dup);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((i) => i.code === "DUPLICATE_STRATEGY")
    ).toBe(true);
  });

  it("passes PipelineValidator on healthy run", () => {
    const result = pipeline.execute({
      context: bullContext(),
      forceRefresh: true,
    });
    const validation = pipeline.validate(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("meets Performance budget for synchronous execute", () => {
    const result = pipeline.execute({
      context: bullContext(),
      forceRefresh: true,
    });
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.executionTime).toBeLessThan(2000);
    const metrics = pipeline.getMetrics();
    expect(metrics.engineTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics.successfulEngines).toBeGreaterThan(0);
  });

  it("calculates health grades deterministically", () => {
    const healthy = calculatePipelineHealth({
      context: bullContext(),
      regime: pipeline.execute({ context: bullContext(), forceRefresh: true })
        .regime,
      confidence: pipeline.execute({
        context: bullContext(),
        forceRefresh: true,
      }).confidence,
      eligibleStrategies: [{ strategyId: "orb" } as never],
      stages: PIPELINE_STAGE_ORDER.map((stage, i) =>
        createStageRecord(stage, "success", i)
      ),
    });
    expect(healthy).toBeGreaterThan(60);
  });

  it("is deterministic for identical inputs", () => {
    const context = bullContext();
    const a = pipeline.execute({ context, forceRefresh: true });
    pipeline.clearCache();
    const b = pipeline.execute({ context, forceRefresh: true });
    expect(a.regime.regime).toBe(b.regime.regime);
    expect(a.confidence.score).toBe(b.confidence.score);
    expect(a.eligibleStrategies.map((s) => s.strategyId)).toEqual(
      b.eligibleStrategies.map((s) => s.strategyId)
    );
  });
});
