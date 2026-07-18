/**
 * VWAP Continuation Explainability, Scoring & Integration — tests (Sprint 11B.3C.3).
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
  getStrategyEngine,
  getStrategyFactory,
  getStrategyRegistry,
  resetStrategyEngine,
  type StrategyExecutionContext,
} from "../index";
import {
  VWAPContinuationTradeBuilder,
  buildVWAPContinuationExplainability,
  buildVWAPContinuationInstitutionalScore,
  buildVWAPContinuationSummary,
  calculateVWAPContinuationSignalGrade,
  ensureVWAPContinuationRegistered,
  executeVWAPContinuationThroughEngine,
  executeVWAPContinuationWithPipeline,
  getVWAPContinuationIntegrationStatus,
  getVWAPContinuationMetrics,
  resetVWAPContinuationMetrics,
  type VWAPCandle,
  type VWAPContinuationDetection,
  type VWAPContinuationStrategyInput,
  type VWAPContinuationTradeSetup,
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
): VWAPCandle {
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
    advanceCount: 1000,
    declineCount: 800,
    unchangedCount: 50,
    advanceDeclineRatio: 1.25,
    netAdvances: 200,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 1,
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
      volume: 55,
      momentum: score,
      participation: score,
      confidence: 75,
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

function makeVolatility(indiaVix = 14): VolatilityAnalysis {
  return {
    score: indiaVix > 20 ? 70 : 40,
    regime: indiaVix > 20 ? "High" : "Normal",
    trend: "Stable",
    indiaVix,
    atr: 1.2,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1,
    intradayRange: 0.8,
    riskMode: "Risk On",
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

function makeRegime(
  regime: MarketRegime["regime"] = "Strong Bull",
  confidence = 88
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 85,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(75);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 80,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(75),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Risk On",
    confidence: 90,
    healthScore: 82,
    qualityGrade: "A",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function bullCandles(): VWAPCandle[] {
  return [
    candle(9, 20, 100.1, 100.3, 99.9, 100.2, 90_000),
    candle(9, 25, 100.2, 100.5, 100.0, 100.4, 95_000),
    candle(9, 30, 100.4, 100.7, 100.1, 100.6, 100_000),
    candle(9, 35, 100.5, 100.8, 100.2, 100.5, 105_000),
    candle(9, 40, 100.4, 100.6, 99.75, 100.1, 110_000),
    candle(9, 45, 100.05, 100.5, 100.0, 100.45, 220_000),
    candle(9, 50, 100.4, 100.9, 100.3, 100.8, 240_000),
    candle(9, 55, 100.7, 101.2, 100.5, 101.0, 260_000),
  ];
}

function bearCandles(): VWAPCandle[] {
  return [
    candle(9, 20, 99.9, 100.1, 99.7, 99.8, 90_000),
    candle(9, 25, 99.8, 100.0, 99.5, 99.6, 95_000),
    candle(9, 30, 99.6, 99.8, 99.3, 99.4, 100_000),
    candle(9, 35, 99.5, 99.7, 99.2, 99.3, 105_000),
    candle(9, 40, 99.4, 100.25, 99.1, 99.9, 110_000),
    candle(9, 45, 99.95, 100.0, 99.5, 99.55, 220_000),
    candle(9, 50, 99.6, 99.7, 99.2, 99.3, 240_000),
    candle(9, 55, 99.3, 99.4, 98.8, 98.9, 260_000),
  ];
}

function bullDetection(
  overrides: Partial<VWAPContinuationDetection> = {}
): VWAPContinuationDetection {
  return {
    detected: true,
    direction: "BUY",
    vwap: 100,
    distanceFromVWAP: 0.01,
    pullbackDetected: true,
    bounceConfirmed: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 90,
    reasons: ["VWAP BUY continuation detected."],
    warnings: [],
    ...overrides,
  };
}

function bearDetection(
  overrides: Partial<VWAPContinuationDetection> = {}
): VWAPContinuationDetection {
  return {
    detected: true,
    direction: "SELL",
    vwap: 100,
    distanceFromVWAP: -0.011,
    pullbackDetected: true,
    bounceConfirmed: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 86,
    reasons: ["VWAP SELL continuation detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: VWAPCandle[],
  overrides: Partial<VWAPContinuationStrategyInput["vwapContinuation"]> = {}
): VWAPContinuationStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.2,
    vwapContinuation: {
      candles5m: candles,
      vwap: 100,
      relativeVolume: 1.9,
      atr: 1.2,
      averageVolume: 100_000,
      recentSwingHigh: 101.2,
      recentSwingLow: 99.75,
      ...overrides,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "vwap-continuation",
      name: "VWAP Continuation",
      category: "Scalp",
      eligible: true,
      priority: 86,
      score: 90,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeContext(
  candles: VWAPCandle[],
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): StrategyExecutionContext {
  const regime = makeRegime();
  const marketContext = makeMarketContext(marketOverrides);
  return {
    input: makeInput(candles),
    marketContext,
    regime,
    confidence: regime.confidenceAnalysis,
    eligibleStrategies: makeEligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0),
  };
}

function buildSetup(
  detection: VWAPContinuationDetection,
  candles: VWAPCandle[],
  marketOverrides: Partial<InstitutionalMarketContext> = {},
  tradeConfig?: ConstructorParameters<typeof VWAPContinuationTradeBuilder>[0]
): VWAPContinuationTradeSetup {
  return new VWAPContinuationTradeBuilder({
    maxRiskPercentOfPrice: 0.05,
    ...tradeConfig,
  }).build({
    detection,
    marketContext: makeMarketContext(marketOverrides),
    input: makeInput(candles),
  });
}

describe("VWAP Continuation institutional scoring & explainability", () => {
  beforeEach(() => {
    resetVWAPContinuationMetrics();
  });

  it("scores Strong Bull Continuation with high conviction", () => {
    const setup = buildSetup(bullDetection({ confidence: 95 }), bullCandles());
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.institutionalScore.conviction).toBeGreaterThanOrEqual(70);
    expect(["Exceptional", "High", "Good"]).toContain(
      setup.institutionalScore.grade
    );
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
    expect(setup.explainability.summary.length).toBeLessThanOrEqual(5);
  });

  it("scores Strong Bear Continuation", () => {
    const setup = buildSetup(
      bearDetection(),
      bearCandles(),
      {
        marketTrend: "Strong Bear",
        marketBreadth: makeBreadth(35),
        sectorStrength: makeSectors(35),
        marketStrength: 40,
      }
    );
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.detection.direction).toBe("SELL");
    expect(setup.institutionalScore.confidence).toBeGreaterThan(0);
  });

  it("reduces conviction on Weak VWAP Trend", () => {
    const strong = buildSetup(bullDetection({ confidence: 95 }), bullCandles());
    const weak = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({
        confidence: 40,
        pullbackDetected: false,
        bounceConfirmed: false,
      }),
      setup: strong,
      marketContext: makeMarketContext(),
      vwapInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Weak Volume", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weakVol = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({ volumeConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext(),
      vwapInput: makeInput(bullCandles(), { relativeVolume: 0.6 }),
    });
    expect(weakVol.conviction).toBeLessThan(
      strong.institutionalScore.conviction
    );
  });

  it("reduces conviction on Poor Breadth", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({ breadthConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext({ marketBreadth: makeBreadth(30) }),
      vwapInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Poor Sector", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({ sectorConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext({ sectorStrength: makeSectors(30) }),
      vwapInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("classifies High Conviction and Low Conviction", () => {
    const high = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({ confidence: 98 }),
      setup: buildSetup(bullDetection({ confidence: 98 }), bullCandles()),
      marketContext: makeMarketContext({ marketStrength: 92 }),
      vwapInput: makeInput(bullCandles(), { relativeVolume: 2.5 }),
    });
    expect(high.conviction).toBeGreaterThanOrEqual(70);

    const low = buildVWAPContinuationInstitutionalScore({
      detection: bullDetection({
        confidence: 40,
        volumeConfirmed: false,
        breadthConfirmed: false,
        sectorConfirmed: false,
        marketConfirmed: false,
        pullbackDetected: false,
        bounceConfirmed: false,
      }),
      setup: {
        ...buildSetup(bullDetection(), bullCandles()),
        entry: 0,
        riskReward: 0,
        qualityScore: 20,
      },
      marketContext: makeMarketContext({
        marketStrength: 30,
        marketBreadth: makeBreadth(25),
        sectorStrength: makeSectors(25),
        volatility: makeVolatility(24),
      }),
      vwapInput: makeInput(bullCandles(), {
        relativeVolume: null,
        atr: null,
      }),
    });
    expect(low.grade).toBe("Weak");
    expect(low.conviction).toBeLessThan(high.conviction);
  });

  it("calculates Signal Grade bands", () => {
    expect(
      calculateVWAPContinuationSignalGrade({
        conviction: 96,
        qualityScore: 92,
        riskReward: 3,
        marketStrength: 90,
      })
    ).toMatch(/A\+?|B\+/);

    expect(
      calculateVWAPContinuationSignalGrade({
        conviction: 40,
        qualityScore: 30,
        riskReward: 1,
        marketStrength: 30,
      })
    ).toMatch(/D|F|C/);
  });

  it("produces Explainability Output with factors", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const explain = buildVWAPContinuationExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext(),
      vwapInput: makeInput(bullCandles()),
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.positiveReasons.length).toBeGreaterThan(0);
    expect(explain.factors.length).toBeGreaterThan(0);
    expect(explain.factors[0]?.title).toBeTruthy();
    expect(explain.factors[0]?.description).toBeTruthy();
    expect(["Positive", "Negative", "Neutral"]).toContain(
      explain.factors[0]?.impact
    );
    expect(typeof explain.factors[0]?.contribution).toBe("number");
  });

  it("generates Summary max 5 bullets", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const summary = buildVWAPContinuationSummary({
      detection: setup.detection,
      setup,
      positiveReasons: setup.explainability.positiveReasons,
      negativeReasons: setup.explainability.negativeReasons,
      institutionalScore: setup.institutionalScore,
    });
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(5);
  });
});

describe("VWAP Continuation production integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetVWAPContinuationMetrics();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetVWAPContinuationMetrics();
  });

  it("registers via Registry Integration", () => {
    expect(ensureVWAPContinuationRegistered()).toBe(true);
    expect(getStrategyRegistry().has("vwap-continuation")).toBe(true);
    expect(getVWAPContinuationIntegrationStatus().registered).toBe(true);
  });

  it("instantiates via Factory Integration", () => {
    ensureVWAPContinuationRegistered();
    const instance = getStrategyFactory().create("vwap-continuation");
    expect(instance?.id).toBe("vwap-continuation");
  });

  it("executes via Strategy Engine", () => {
    ensureVWAPContinuationRegistered();
    const ctx = makeContext(bullCandles());
    const result = executeVWAPContinuationThroughEngine(ctx, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe("vwap-continuation");
    expect(["BUY", "SELL", "WATCHLIST", "IGNORE"]).toContain(
      result.signal.signal
    );
  });

  it("supports Pipeline Integration adapter", () => {
    ensureVWAPContinuationRegistered();
    const ctx = makeContext(bullCandles());
    const pipeline = {
      context: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
      pipelineHealth: 80,
      healthGrade: "Good",
      pipelineConfidence: 80,
      executionTime: 1,
      warnings: [],
      errors: [],
      timestamp: atIST(10, 0),
      stages: [],
    } as unknown as TradingPipelineResult;

    const result = executeVWAPContinuationWithPipeline(
      pipeline,
      ctx.input as VWAPContinuationStrategyInput,
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe("vwap-continuation");
  });

  it("collects Metrics Collection", () => {
    resetVWAPContinuationMetrics();
    buildSetup(bullDetection(), bullCandles());
    buildSetup(
      bullDetection({ detected: false, direction: "NONE" }),
      bullCandles()
    );
    const metrics = getVWAPContinuationMetrics().getSnapshot();
    expect(metrics.signalsGenerated).toBeGreaterThanOrEqual(2);
    expect(metrics.totalRuns).toBeGreaterThanOrEqual(2);
    expect(metrics.averageConviction).toBeGreaterThanOrEqual(0);
    expect(metrics.averageHoldTime).toBeGreaterThanOrEqual(0);
  });

  it("handles Failure Recovery without crashing", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const recovered = buildVWAPContinuationExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext({ warnings: ["degraded feed"] }),
      vwapInput: makeInput(bullCandles(), {
        atr: null,
        relativeVolume: null,
      }),
    });
    expect(recovered.warnings.length).toBeGreaterThan(0);
    expect(Array.isArray(recovered.summary)).toBe(true);

    ensureVWAPContinuationRegistered();
    const result = getStrategyEngine().execute(
      "vwap-continuation",
      {
        ...makeContext(bullCandles()),
        input: { symbol: "X", lastPrice: 0 },
      },
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
  });
});
