/**
 * Strategy Framework — unit tests (Sprint 11B.3A).
 * Uses a framework test double only — not ORB / VWAP / Liquidity Sweep.
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
import {
  BaseStrategy,
  StrategyEngine,
  StrategyFactory,
  StrategyLifecycle,
  StrategyRegistry,
  StrategyValidator,
  getStrategyEngine,
  getStrategyFactory,
  getStrategyRegistry,
  resetStrategyEngine,
  type StrategyAnalysisResult,
  type StrategyExecutionContext,
  type StrategySignal,
  type StrategyTargets,
  type StrategyValidationResult,
} from "./index";

/** Framework test double — proves extensibility without implementing a real strategy. */
class FrameworkProbeStrategy extends BaseStrategy {
  readonly id: string = "framework-probe";
  readonly name: string = "Framework Probe";
  readonly category = "Scalp" as const;
  readonly eligibilityId = "scalping" as const;
  forceInvalid = false;
  forceThrow = false;
  forceIgnore = false;

  validate(context: StrategyExecutionContext): StrategyValidationResult {
    if (this.forceInvalid) {
      return this.failValidation(["Probe local validation failed."]);
    }
    if (!context.input.lastPrice) {
      return this.failValidation(["Missing last price."]);
    }
    return this.okValidation();
  }

  analyze(context: StrategyExecutionContext): StrategyAnalysisResult {
    if (this.forceThrow) {
      throw new Error("Probe analyze failure.");
    }
    const bullish = context.input.lastPrice >= (context.input.open ?? context.input.lastPrice);
    return {
      bias: this.forceIgnore ? "Neutral" : bullish ? "Bullish" : "Bearish",
      score: bullish ? 75 : 45,
      notes: bullish
        ? ["Price holds above open."]
        : ["Price soft relative to open."],
      metrics: { lastPrice: context.input.lastPrice },
    };
  }

  generateSignal(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"] {
    if (this.forceIgnore) return "IGNORE";
    if (analysis.bias === "Bullish") return "BUY";
    if (analysis.bias === "Bearish") return "SELL";
    return "WATCHLIST";
  }

  calculateEntry(
    context: StrategyExecutionContext,
    _analysis: StrategyAnalysisResult
  ): number {
    return context.input.lastPrice;
  }

  calculateStopLoss(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    entry: number
  ): number {
    const atr = context.input.atr ?? entry * 0.01;
    return analysis.bias === "Bearish" ? entry + atr : entry - atr;
  }

  calculateTargets(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    entry: number,
    stopLoss: number
  ): StrategyTargets {
    const risk = Math.abs(entry - stopLoss);
    const direction = analysis.bias === "Bearish" ? -1 : 1;
    return {
      target1: entry + direction * risk * 1.5,
      target2: entry + direction * risk * 2.5,
      finalTarget: entry + direction * risk * 3.5,
    };
  }

  calculateConfidence(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): number {
    return Math.min(100, (analysis.score + context.confidence.score) / 2);
  }

  explain(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    signal: StrategySignal
  ): string[] {
    return [
      ...analysis.notes,
      `Emitted ${signal.signal} with RR ${signal.riskReward}.`,
    ];
  }
}

class DisabledProbeStrategy extends FrameworkProbeStrategy {
  override readonly enabled = false;
  override readonly id = "framework-probe-disabled";
  override readonly name = "Disabled Probe";
}

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
    score: 70,
    confidence: 80,
    reasons: ["Breadth supportive"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

function makeVolatility(
  overrides: Partial<VolatilityAnalysis> = {}
): VolatilityAnalysis {
  return {
    score: 35,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 13,
    atr: 100,
    historicalVolatility: 12,
    realizedVolatility: 11,
    gapPercent: 0.1,
    dailyRange: 0.7,
    intradayRange: 0.6,
    riskMode: "Risk On",
    confidence: 80,
    reasons: ["VIX calm"],
    vixTrend: "Stable",
    vixMomentum: 0,
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

function makeSectors(): SectorAnalysis[] {
  return [
    {
      sector: "IT",
      score: 72,
      trend: "Bull",
      relativeStrength: 72,
      breadth: 70,
      volume: 60,
      momentum: 70,
      participation: 68,
      confidence: 75,
      reasons: ["IT strong"],
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
    reasons: ["Rotation ok"],
  };
}

function makeConfidence(score: number): RegimeConfidenceAnalysis {
  return {
    score,
    grade: score >= 85 ? "High" : score >= 70 ? "Good" : "Moderate",
    positiveReasons: ["Aligned"],
    negativeReasons: [],
    neutralReasons: [],
    contributions: [],
    summary: [`Confidence ${score}`],
  };
}

function makeRegime(confidence = 80): MarketRegime {
  return {
    regime: "Strong Bull",
    confidence,
    priority: 85,
    reasons: ["Bull regime"],
    triggeredRules: ["Strong Bull"],
    timestamp: new Date("2026-07-18T10:00:00Z"),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors();
  return {
    timestamp: new Date("2026-07-18T10:00:00Z"),
    marketTrend: "Strong Bull",
    marketStrength: 75,
    marketBreadth: makeBreadth(),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(),
    riskMode: "Risk On",
    confidence: 85,
    healthScore: 80,
    qualityGrade: "A",
    summary: ["Bull tape"],
    warnings: [],
  };
}

function makeEligible(strategyId: EligibleStrategy["strategyId"]): EligibleStrategy {
  return {
    strategyId,
    name: strategyId,
    category: "Scalp",
    eligible: true,
    priority: 90,
    score: 80,
    reasons: ["Eligible"],
    blockedReasons: [],
  };
}

function makeContext(
  overrides: Partial<StrategyExecutionContext> = {}
): StrategyExecutionContext {
  const regime = overrides.regime ?? makeRegime(80);
  return {
    input: {
      symbol: "RELIANCE",
      lastPrice: 2500,
      open: 2480,
      high: 2510,
      low: 2475,
      atr: 25,
      ...overrides.input,
    },
    marketContext: overrides.marketContext ?? makeMarketContext(),
    regime,
    confidence: overrides.confidence ?? regime.confidenceAnalysis,
    eligibleStrategies:
      overrides.eligibleStrategies ?? [makeEligible("scalping")],
    riskMode: overrides.riskMode ?? "Risk On",
    timestamp: overrides.timestamp ?? new Date("2026-07-18T10:00:00Z"),
    config: overrides.config,
  };
}

describe("StrategyRegistry", () => {
  let registry: StrategyRegistry;

  beforeEach(() => {
    resetStrategyEngine();
    registry = new StrategyRegistry();
  });

  afterEach(() => {
    resetStrategyEngine();
  });

  it("registers and finds strategies", () => {
    const ok = registry.register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => new FrameworkProbeStrategy(),
    });
    expect(ok).toBe(true);
    expect(registry.find("framework-probe")?.name).toBe("Framework Probe");
    expect(registry.findByCategory("Scalp")).toHaveLength(1);
    expect(registry.getEnabled()).toHaveLength(1);
  });

  it("rejects Duplicate Registration", () => {
    registry.register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => new FrameworkProbeStrategy(),
    });
    const dup = registry.register({
      id: "framework-probe",
      name: "Framework Probe 2",
      category: "Scalp",
      enabled: true,
      create: () => new FrameworkProbeStrategy(),
    });
    expect(dup).toBe(false);
    expect(registry.size()).toBe(1);
  });

  it("unregisters strategies", () => {
    registry.register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => new FrameworkProbeStrategy(),
    });
    expect(registry.unregister("framework-probe")).toBe(true);
    expect(registry.find("framework-probe")).toBeUndefined();
  });
});

describe("StrategyFactory", () => {
  beforeEach(() => {
    resetStrategyEngine();
    getStrategyRegistry().register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => new FrameworkProbeStrategy(),
    });
  });

  afterEach(() => {
    resetStrategyEngine();
  });

  it("instantiates by id without switch statements", () => {
    const factory = new StrategyFactory(getStrategyRegistry());
    const instance = factory.create("framework-probe");
    expect(instance).toBeInstanceOf(FrameworkProbeStrategy);
    expect(instance?.id).toBe("framework-probe");
  });

  it("returns null for Unknown Strategy", () => {
    const factory = getStrategyFactory();
    expect(factory.create("does-not-exist")).toBeNull();
  });
});

describe("StrategyLifecycle", () => {
  it("tracks full happy-path Lifecycle", () => {
    const life = new StrategyLifecycle("framework-probe");
    expect(life.getState()).toBe("Created");
    expect(life.transition("Initialized")).toBe(true);
    expect(life.transition("Validated")).toBe(true);
    expect(life.transition("Analyzed")).toBe(true);
    expect(life.transition("SignalGenerated")).toBe(true);
    expect(life.transition("Completed")).toBe(true);
    expect(life.transition("Disposed")).toBe(true);
    expect(life.getHistory()).toEqual([
      "Created",
      "Initialized",
      "Validated",
      "Analyzed",
      "SignalGenerated",
      "Completed",
      "Disposed",
    ]);
  });

  it("blocks illegal transitions", () => {
    const life = new StrategyLifecycle("framework-probe");
    expect(life.transition("Analyzed")).toBe(false);
    expect(life.getState()).toBe("Created");
  });
});

describe("StrategyValidator & StrategyEngine", () => {
  beforeEach(() => {
    resetStrategyEngine();
    getStrategyRegistry().register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      eligibilityId: "scalping",
      create: () => new FrameworkProbeStrategy(),
    });
    getStrategyRegistry().register({
      id: "framework-probe-disabled",
      name: "Disabled Probe",
      category: "Scalp",
      enabled: false,
      create: () => new DisabledProbeStrategy(),
    });
  });

  afterEach(() => {
    resetStrategyEngine();
  });

  it("validates eligible execution context", () => {
    const strategy = new FrameworkProbeStrategy();
    const validator = new StrategyValidator();
    const result = validator.validate(strategy, makeContext());
    expect(result.valid).toBe(true);
  });

  it("fails Validation when not eligible", () => {
    const strategy = new FrameworkProbeStrategy();
    const validator = new StrategyValidator();
    const result = validator.validate(
      strategy,
      makeContext({ eligibleStrategies: [] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /not eligible/i.test(e))).toBe(true);
  });

  it("executes and returns a StrategySignal", () => {
    const engine = getStrategyEngine();
    const result = engine.execute("framework-probe", makeContext());
    expect(result.signal.signal).toBe("BUY");
    expect(result.signal.symbol).toBe("RELIANCE");
    expect(result.signal.entry).toBeGreaterThan(0);
    expect(result.signal.stopLoss).toBeGreaterThan(0);
    expect(result.signal.target1).toBeGreaterThan(result.signal.entry);
    expect(result.signal.reasons.length).toBeGreaterThan(0);
    expect(result.validation.valid).toBe(true);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns IGNORE on Failure / invalid input", () => {
    const engine = new StrategyEngine();
    const result = engine.execute(
      "framework-probe",
      makeContext({
        input: { symbol: "RELIANCE", lastPrice: 0 },
      })
    );
    expect(result.signal.signal).toBe("IGNORE");
    expect(result.validation.valid).toBe(false);
  });

  it("returns IGNORE for Invalid Strategy local validation", () => {
    getStrategyRegistry().unregister("framework-probe");
    getStrategyRegistry().register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => {
        const s = new FrameworkProbeStrategy();
        s.forceInvalid = true;
        return s;
      },
    });
    const result = getStrategyEngine().execute(
      "framework-probe",
      makeContext(),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
    expect(result.signal.reasons.some((r) => /local validation/i.test(r))).toBe(
      true
    );
  });

  it("returns IGNORE for Disabled Strategy", () => {
    const result = getStrategyEngine().execute(
      "framework-probe-disabled",
      makeContext({
        eligibleStrategies: [makeEligible("scalping")],
      }),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
    expect(result.signal.reasons.some((r) => /disabled/i.test(r))).toBe(true);
  });

  it("returns IGNORE for Unknown Strategy", () => {
    const result = getStrategyEngine().execute("unknown-strategy", makeContext());
    expect(result.signal.signal).toBe("IGNORE");
    expect(result.signal.reasons.some((r) => /Unknown strategy/i.test(r))).toBe(
      true
    );
  });

  it("handles analyze Failure without crashing", () => {
    getStrategyRegistry().unregister("framework-probe");
    getStrategyRegistry().register({
      id: "framework-probe",
      name: "Framework Probe",
      category: "Scalp",
      enabled: true,
      create: () => {
        const s = new FrameworkProbeStrategy();
        s.forceThrow = true;
        return s;
      },
    });
    const result = getStrategyEngine().execute(
      "framework-probe",
      makeContext(),
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
    expect(result.signal.warnings.length).toBeGreaterThan(0);
  });

  it("performs Cleanup / dispose after execution", () => {
    const strategy = new FrameworkProbeStrategy();
    const engine = new StrategyEngine();
    const result = engine.executeInstance(
      strategy,
      makeContext(),
      { skipEligibilityCheck: true }
    );
    expect(result.lifecycle.state).toBe("Disposed");
    expect(result.lifecycle.history).toContain("Completed");
    expect(result.lifecycle.history).toContain("Disposed");
  });
});
