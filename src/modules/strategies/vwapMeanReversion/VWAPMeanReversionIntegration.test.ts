/**
 * VWAP Mean Reversion Explainability, Scoring & Integration — tests (Sprint 11B.3D.3).
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
  VWAPMeanReversionTradeBuilder,
  buildVWAPMeanReversionExplainability,
  buildVWAPMeanReversionInstitutionalScore,
  buildVWAPMeanReversionSummary,
  calculateVWAPMeanReversionSignalGrade,
  ensureVWAPMeanReversionRegistered,
  executeVWAPMeanReversionThroughEngine,
  executeVWAPMeanReversionWithPipeline,
  getVWAPMeanReversionIntegrationStatus,
  getVWAPMeanReversionMetrics,
  resetVWAPMeanReversionMetrics,
  type VWAPMeanReversionCandle,
  type VWAPMeanReversionDetection,
  type VWAPMeanReversionStrategyInput,
  type VWAPMeanReversionTradeSetup,
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
): VWAPMeanReversionCandle {
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
    atr: 0.5,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1,
    intradayRange: 0.8,
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

function makeRegime(
  regime: MarketRegime["regime"] = "Sideways",
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 70,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(55);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Sideways",
    marketStrength: 55,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 65,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function bullCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 99.8, 100.0, 99.0, 99.2, 110_000),
    candle(9, 25, 99.2, 99.4, 98.4, 98.6, 115_000),
    candle(9, 30, 98.6, 98.8, 97.8, 98.0, 120_000),
    candle(9, 35, 98.0, 98.2, 97.5, 97.7, 110_000),
    candle(9, 40, 97.7, 97.95, 97.45, 97.7, 100_000),
    candle(9, 45, 97.7, 97.9, 97.5, 97.75, 95_000),
    candle(9, 50, 97.75, 97.95, 97.55, 97.8, 92_000),
    candle(9, 55, 97.8, 98.25, 97.55, 98.05, 98_000),
  ];
}

function bearCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 100.2, 101.0, 100.0, 100.8, 110_000),
    candle(9, 25, 100.8, 101.6, 100.6, 101.4, 115_000),
    candle(9, 30, 101.4, 102.2, 101.2, 102.0, 120_000),
    candle(9, 35, 102.0, 102.5, 101.8, 102.3, 110_000),
    candle(9, 40, 102.3, 102.55, 102.05, 102.3, 100_000),
    candle(9, 45, 102.3, 102.5, 102.1, 102.25, 95_000),
    candle(9, 50, 102.25, 102.45, 102.05, 102.2, 92_000),
    candle(9, 55, 102.2, 102.55, 101.85, 101.95, 98_000),
  ];
}

function bullDetection(
  overrides: Partial<VWAPMeanReversionDetection> = {}
): VWAPMeanReversionDetection {
  return {
    detected: true,
    direction: "BUY",
    vwap: 100,
    deviation: -1.95,
    deviationBand: 1,
    rsi: 22,
    reversalConfirmed: true,
    volumeStable: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 85,
    reasons: ["VWAP BUY mean reversion detected."],
    warnings: [],
    ...overrides,
  };
}

function bearDetection(
  overrides: Partial<VWAPMeanReversionDetection> = {}
): VWAPMeanReversionDetection {
  return {
    detected: true,
    direction: "SELL",
    vwap: 100,
    deviation: 1.95,
    deviationBand: 1,
    rsi: 78,
    reversalConfirmed: true,
    volumeStable: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence: 82,
    reasons: ["VWAP SELL mean reversion detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: VWAPMeanReversionCandle[],
  overrides: Partial<VWAPMeanReversionStrategyInput["vwapMeanReversion"]> = {}
): VWAPMeanReversionStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 0.5,
    vwapMeanReversion: {
      candles5m: candles,
      vwap: 100,
      vwapStdDev: 1,
      bands: { upper: 102, lower: 98, sigma: 1 },
      relativeVolume: 1.0,
      atr: 0.5,
      averageVolume: 100_000,
      rsi: 25,
      recentSwingHigh: 101.5,
      recentSwingLow: 97.45,
      ...overrides,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "vwap-mean-reversion",
      name: "VWAP Mean Reversion",
      category: "Scalp",
      eligible: true,
      priority: 84,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeContext(
  candles: VWAPMeanReversionCandle[],
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
  detection: VWAPMeanReversionDetection,
  candles: VWAPMeanReversionCandle[],
  marketOverrides: Partial<InstitutionalMarketContext> = {},
  tradeConfig?: ConstructorParameters<typeof VWAPMeanReversionTradeBuilder>[0]
): VWAPMeanReversionTradeSetup {
  return new VWAPMeanReversionTradeBuilder({
    maxRiskPercentOfPrice: 0.05,
    ...tradeConfig,
  }).build({
    detection,
    marketContext: makeMarketContext(marketOverrides),
    input: makeInput(candles),
  });
}

describe("VWAP Mean Reversion institutional scoring & explainability", () => {
  beforeEach(() => {
    resetVWAPMeanReversionMetrics();
  });

  it("scores Bullish Mean Reversion with high conviction", () => {
    const setup = buildSetup(bullDetection({ confidence: 92 }), bullCandles());
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.institutionalScore.conviction).toBeGreaterThanOrEqual(65);
    expect(["Exceptional", "High", "Good"]).toContain(
      setup.institutionalScore.grade
    );
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
    expect(setup.explainability.summary.length).toBeLessThanOrEqual(5);
  });

  it("scores Bearish Mean Reversion", () => {
    const setup = buildSetup(
      bearDetection(),
      bearCandles(),
      {
        marketBreadth: makeBreadth(45),
        sectorStrength: makeSectors(45),
      }
    );
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.detection.direction).toBe("SELL");
    expect(setup.institutionalScore.confidence).toBeGreaterThan(0);
  });

  it("reduces conviction on Weak Reversal", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({
        reversalConfirmed: false,
        confidence: 40,
      }),
      setup: strong,
      marketContext: makeMarketContext(),
      mrInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Strong Trend Rejection warnings", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({
        detected: false,
        direction: "NONE",
        warnings: ["Strong trend continuation — mean reversion rejected."],
      }),
      setup: { ...strong, entry: 0, riskReward: 0, qualityScore: 20 },
      marketContext: makeMarketContext(),
      mrInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Poor Liquidity", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({ volumeStable: false }),
      setup: strong,
      marketContext: makeMarketContext({ volatility: makeVolatility(22) }),
      mrInput: makeInput(bullCandles(), { relativeVolume: 0.3 }),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Weak Breadth", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({ breadthConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext({ marketBreadth: makeBreadth(25) }),
      mrInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("reduces conviction on Weak Sector", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({ sectorConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext({ sectorStrength: makeSectors(20) }),
      mrInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("classifies High Conviction and Low Conviction", () => {
    const high = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({ confidence: 95, deviation: -2.2 }),
      setup: buildSetup(bullDetection({ confidence: 95 }), bullCandles()),
      marketContext: makeMarketContext({ marketStrength: 70 }),
      mrInput: makeInput(bullCandles(), { relativeVolume: 1.2 }),
    });
    expect(high.conviction).toBeGreaterThanOrEqual(65);

    const low = buildVWAPMeanReversionInstitutionalScore({
      detection: bullDetection({
        confidence: 35,
        reversalConfirmed: false,
        volumeStable: false,
        breadthConfirmed: false,
        sectorConfirmed: false,
        marketConfirmed: false,
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
      mrInput: makeInput(bullCandles(), {
        relativeVolume: null,
        atr: null,
      }),
    });
    expect(low.grade).toBe("Weak");
    expect(low.conviction).toBeLessThan(high.conviction);
  });

  it("calculates Signal Grade bands", () => {
    expect(
      calculateVWAPMeanReversionSignalGrade({
        conviction: 96,
        qualityScore: 92,
        riskReward: 3,
        marketStrength: 70,
      })
    ).toMatch(/A\+?|B\+/);

    expect(
      calculateVWAPMeanReversionSignalGrade({
        conviction: 40,
        qualityScore: 30,
        riskReward: 1,
        marketStrength: 30,
      })
    ).toMatch(/D|F|C/);
  });

  it("produces Explainability Output with factors", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const explain = buildVWAPMeanReversionExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext(),
      mrInput: makeInput(bullCandles()),
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.positiveReasons.length).toBeGreaterThan(0);
    expect(explain.factors.length).toBeGreaterThan(0);
    expect(explain.factors[0]?.title).toBeTruthy();
    expect(["Positive", "Negative", "Neutral"]).toContain(
      explain.factors[0]?.impact
    );
  });

  it("generates Summary max 5 bullets", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const summary = buildVWAPMeanReversionSummary({
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

describe("VWAP Mean Reversion production integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetVWAPMeanReversionMetrics();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetVWAPMeanReversionMetrics();
  });

  it("registers via Registry Integration", () => {
    expect(ensureVWAPMeanReversionRegistered()).toBe(true);
    expect(getStrategyRegistry().has("vwap-mean-reversion")).toBe(true);
    expect(getVWAPMeanReversionIntegrationStatus().registered).toBe(true);
  });

  it("instantiates via Factory Integration", () => {
    ensureVWAPMeanReversionRegistered();
    const instance = getStrategyFactory().create("vwap-mean-reversion");
    expect(instance?.id).toBe("vwap-mean-reversion");
  });

  it("executes via Strategy Engine", () => {
    ensureVWAPMeanReversionRegistered();
    const ctx = makeContext(bullCandles());
    const result = executeVWAPMeanReversionThroughEngine(ctx, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe("vwap-mean-reversion");
    expect(["BUY", "SELL", "WATCHLIST", "IGNORE"]).toContain(
      result.signal.signal
    );
  });

  it("supports Pipeline Integration adapter", () => {
    ensureVWAPMeanReversionRegistered();
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

    const result = executeVWAPMeanReversionWithPipeline(
      pipeline,
      ctx.input as VWAPMeanReversionStrategyInput,
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe("vwap-mean-reversion");
  });

  it("collects Metrics Collection", () => {
    resetVWAPMeanReversionMetrics();
    buildSetup(bullDetection(), bullCandles());
    buildSetup(
      bullDetection({
        detected: false,
        direction: "NONE",
        warnings: ["Strong trend continuation — mean reversion rejected."],
      }),
      bullCandles()
    );
    const metrics = getVWAPMeanReversionMetrics().getSnapshot();
    expect(metrics.signalsGenerated).toBeGreaterThanOrEqual(2);
    expect(metrics.falseReversionRejects).toBeGreaterThanOrEqual(1);
    expect(metrics.averageHoldTime).toBeGreaterThanOrEqual(0);
  });

  it("handles Failure Recovery without crashing", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const recovered = buildVWAPMeanReversionExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext({ warnings: ["degraded feed"] }),
      mrInput: makeInput(bullCandles(), {
        atr: null,
        relativeVolume: null,
      }),
    });
    expect(recovered.warnings.length).toBeGreaterThan(0);
    expect(Array.isArray(recovered.summary)).toBe(true);

    ensureVWAPMeanReversionRegistered();
    const result = getStrategyEngine().execute(
      "vwap-mean-reversion",
      {
        ...makeContext(bullCandles()),
        input: { symbol: "X", lastPrice: 0 },
      },
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
  });
});
