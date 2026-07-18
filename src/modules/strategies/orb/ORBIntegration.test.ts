/**
 * ORB Explainability, Scoring & Integration — tests (Sprint 11B.3B.3).
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
  ORBTradeBuilder,
  buildORBExplainability,
  buildORBInstitutionalScore,
  buildORBSummary,
  calculateORBSignalGrade,
  ensureORBRegistered,
  executeORBThroughEngine,
  executeORBWithPipeline,
  getORBIntegrationStatus,
  getORBMetrics,
  resetORBMetrics,
  type ORBCandle,
  type ORBDetection,
  type ORBStrategyInput,
  type ORBTradeSetup,
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
): ORBCandle {
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
    atr: 2.5,
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

function bullCandles(): ORBCandle[] {
  return [
    candle(9, 15, 100, 101, 99.5, 100.5, 100_000),
    candle(9, 20, 100.5, 101, 99, 100, 110_000),
    candle(9, 25, 100, 100.8, 99.2, 100.2, 105_000),
    candle(9, 35, 100.5, 103, 100.2, 102.5, 250_000),
  ];
}

function bearCandles(): ORBCandle[] {
  return [
    candle(9, 15, 100, 101, 99.5, 100.5, 100_000),
    candle(9, 20, 100.5, 101, 99, 100, 110_000),
    candle(9, 25, 100, 100.8, 99.2, 100.2, 105_000),
    candle(9, 35, 99.5, 99.8, 96.5, 97, 250_000),
  ];
}

function bullDetection(overrides: Partial<ORBDetection> = {}): ORBDetection {
  return {
    detected: true,
    direction: "BUY",
    openingHigh: 101,
    openingLow: 99,
    breakoutPrice: 102.5,
    breakoutTime: atIST(9, 35),
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    liquidityConfirmed: true,
    confidence: 90,
    reasons: ["ORB BUY detected."],
    warnings: [],
    ...overrides,
  };
}

function bearDetection(overrides: Partial<ORBDetection> = {}): ORBDetection {
  return {
    detected: true,
    direction: "SELL",
    openingHigh: 101,
    openingLow: 99,
    breakoutPrice: 97,
    breakoutTime: atIST(9, 35),
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    liquidityConfirmed: true,
    confidence: 86,
    reasons: ["ORB SELL detected."],
    warnings: [],
    ...overrides,
  };
}

function makeInput(
  candles: ORBCandle[],
  orbOverrides: Partial<ORBStrategyInput["orb"]> = {}
): ORBStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 2.5,
    orb: {
      candles5m: candles,
      vwap: 101,
      relativeVolume: 1.9,
      atr: 2.5,
      averageVolume: 100_000,
      ...orbOverrides,
    },
  };
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "orb",
      name: "ORB",
      category: "Scalp",
      eligible: true,
      priority: 88,
      score: 90,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeContext(
  candles: ORBCandle[],
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): StrategyExecutionContext {
  const regime = makeRegime();
  return {
    input: makeInput(candles),
    marketContext: makeMarketContext(marketOverrides),
    regime,
    confidence: regime.confidenceAnalysis,
    eligibleStrategies: makeEligible(),
    riskMode: "Risk On",
    timestamp: atIST(9, 40),
  };
}

function buildSetup(
  detection: ORBDetection,
  candles: ORBCandle[],
  marketOverrides: Partial<InstitutionalMarketContext> = {},
  tradeConfig?: Parameters<ORBTradeBuilder["constructor"]>[0]
): ORBTradeSetup {
  return new ORBTradeBuilder({
    maxRiskPercentOfPrice: 0.05,
    ...tradeConfig,
  }).build({
    detection,
    marketContext: makeMarketContext(marketOverrides),
    input: makeInput(candles),
  });
}

describe("ORB institutional scoring & explainability", () => {
  beforeEach(() => {
    resetORBMetrics();
  });

  it("scores Strong Bullish ORB with high conviction", () => {
    const setup = buildSetup(bullDetection({ confidence: 95 }), bullCandles());
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.institutionalScore.conviction).toBeGreaterThanOrEqual(70);
    expect(["Exceptional", "High", "Good"]).toContain(
      setup.institutionalScore.grade
    );
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
    expect(setup.explainability.summary.length).toBeLessThanOrEqual(5);
  });

  it("scores Strong Bearish ORB", () => {
    const setup = buildSetup(
      bearDetection(),
      bearCandles(),
      {
        marketTrend: "Weak Bear",
        marketBreadth: makeBreadth(35),
        sectorStrength: makeSectors(35),
        riskMode: "Neutral",
      }
    );
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.detection.direction).toBe("SELL");
    expect(setup.institutionalScore.confidence).toBeGreaterThan(0);
  });

  it("reduces conviction on Weak Volume", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildSetup(
      bullDetection({ volumeConfirmed: false, confidence: 70 }),
      bullCandles(),
      {},
      undefined
    );
    // Force weak volume via detection flag on a valid RR path
    const weakVol = buildORBInstitutionalScore({
      detection: bullDetection({ volumeConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext(),
      orbInput: makeInput(bullCandles(), { relativeVolume: 0.6 }),
    });
    expect(weakVol.conviction).toBeLessThan(strong.institutionalScore.conviction);
    expect(weak.institutionalScore).toBeDefined();
  });

  it("reduces conviction on Weak Breadth", () => {
    const strong = buildSetup(bullDetection(), bullCandles());
    const weak = buildORBInstitutionalScore({
      detection: bullDetection({ breadthConfirmed: false }),
      setup: strong,
      marketContext: makeMarketContext({ marketBreadth: makeBreadth(30) }),
      orbInput: makeInput(bullCandles()),
    });
    expect(weak.conviction).toBeLessThan(strong.institutionalScore.conviction);
  });

  it("marks Poor RR with lower risk factor / rejection", () => {
    const rejected = buildSetup(bullDetection(), bullCandles(), {}, {
      minimumRiskReward: 8,
    });
    expect(rejected.entry).toBe(0);
    expect(rejected.institutionalScore.signalGrade).toBe("F");
  });

  it("rewards Excellent RR", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.institutionalScore.conviction).toBeGreaterThan(55);
  });

  it("classifies High Conviction and Low Conviction grades", () => {
    const high = buildORBInstitutionalScore({
      detection: bullDetection({ confidence: 98 }),
      setup: buildSetup(bullDetection({ confidence: 98 }), bullCandles()),
      marketContext: makeMarketContext({ marketStrength: 92 }),
      orbInput: makeInput(bullCandles(), { relativeVolume: 2.5, vwap: 100 }),
    });
    expect(high.conviction).toBeGreaterThanOrEqual(70);

    const low = buildORBInstitutionalScore({
      detection: bullDetection({
        confidence: 40,
        volumeConfirmed: false,
        breadthConfirmed: false,
        sectorConfirmed: false,
        marketConfirmed: false,
        liquidityConfirmed: false,
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
      orbInput: makeInput(bullCandles(), {
        relativeVolume: null,
        vwap: null,
        atr: null,
      }),
    });
    expect(low.grade).toBe("Weak");
    expect(low.conviction).toBeLessThan(high.conviction);
  });

  it("calculates Signal Grade bands", () => {
    expect(
      calculateORBSignalGrade({
        conviction: 96,
        qualityScore: 92,
        riskReward: 3,
        marketStrength: 90,
      })
    ).toMatch(/A\+?|B\+/);

    expect(
      calculateORBSignalGrade({
        conviction: 40,
        qualityScore: 30,
        riskReward: 1,
        marketStrength: 30,
      })
    ).toMatch(/D|F|C/);
  });

  it("produces Explainability Output with factors", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const explain = buildORBExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext(),
      orbInput: makeInput(bullCandles()),
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
    const summary = buildORBSummary({
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

describe("ORB production integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetORBMetrics();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetORBMetrics();
  });

  it("registers via Registry Integration", () => {
    expect(ensureORBRegistered()).toBe(true);
    expect(getStrategyRegistry().has("orb")).toBe(true);
    expect(getORBIntegrationStatus().registered).toBe(true);
  });

  it("instantiates via Factory Integration", () => {
    ensureORBRegistered();
    const instance = getStrategyFactory().create("orb");
    expect(instance?.id).toBe("orb");
  });

  it("executes via Strategy Engine Execution", () => {
    ensureORBRegistered();
    const ctx = makeContext(bullCandles());
    const result = executeORBThroughEngine(ctx, {
      skipEligibilityCheck: true,
    });
    expect(result.signal.strategyId).toBe("orb");
    expect(["BUY", "SELL", "WATCHLIST", "IGNORE"]).toContain(
      result.signal.signal
    );
  });

  it("supports Pipeline Integration adapter", () => {
    ensureORBRegistered();
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
      timestamp: atIST(9, 40),
      stages: [],
    } as TradingPipelineResult;

    const result = executeORBWithPipeline(
      pipeline,
      ctx.input as ORBStrategyInput,
      { skipEligibilityCheck: true }
    );
    expect(result.signal.strategyId).toBe("orb");
  });

  it("collects Metrics Collection", () => {
    resetORBMetrics();
    buildSetup(bullDetection(), bullCandles());
    buildSetup(bullDetection({ detected: false, direction: "NONE" }), bullCandles());
    const metrics = getORBMetrics().getSnapshot();
    expect(metrics.signalsGenerated).toBeGreaterThanOrEqual(2);
    expect(metrics.totalRuns).toBeGreaterThanOrEqual(2);
    expect(metrics.averageConviction).toBeGreaterThanOrEqual(0);
  });

  it("handles Failure Recovery without crashing", () => {
    const setup = buildSetup(bullDetection(), bullCandles());
    const recovered = buildORBExplainability({
      detection: setup.detection,
      setup,
      marketContext: makeMarketContext({ warnings: ["degraded feed"] }),
      orbInput: makeInput(bullCandles(), {
        vwap: null,
        atr: null,
        relativeVolume: null,
      }),
    });
    expect(recovered.warnings.length).toBeGreaterThan(0);
    expect(Array.isArray(recovered.summary)).toBe(true);

    // Engine path with incomplete input still returns IGNORE, never throws
    ensureORBRegistered();
    const result = getStrategyEngine().execute(
      "orb",
      {
        ...makeContext(bullCandles()),
        input: { symbol: "X", lastPrice: 0 },
      },
      { skipEligibilityCheck: true }
    );
    expect(result.signal.signal).toBe("IGNORE");
  });
});
