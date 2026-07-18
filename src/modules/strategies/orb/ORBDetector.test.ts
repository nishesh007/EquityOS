/**
 * ORB Detection Engine — unit tests (Sprint 11B.3B.1).
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
import type { StrategyExecutionContext } from "../StrategyTypes";
import {
  ORBDetector,
  ORBStrategy,
  calculateOpeningRange,
  detectBreakout,
  detectORB,
  resetORBDetector,
  type ORBCandle,
  type ORBStrategyInput,
} from "./index";

/** Build a Date whose IST wall-clock equals the given HH:mm on 2026-07-18. */
function atIST(hour: number, minute: number): Date {
  const istAsUtcMs = Date.UTC(2026, 6, 18, hour, minute, 0);
  return new Date(istAsUtcMs - 330 * 60_000);
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
    breadthQuality: score >= 60 ? "Strong" : score <= 40 ? "Weak" : "Neutral",
    score,
    confidence: 80,
    reasons: ["Breadth fixture"],
    lastUpdated: atIST(10, 0),
  };
}

function makeSectors(score: number): SectorAnalysis[] {
  return [
    {
      sector: "IT",
      score,
      trend: score >= 60 ? "Bull" : score <= 40 ? "Bear" : "Neutral",
      relativeStrength: score,
      breadth: score,
      volume: 55,
      momentum: score,
      participation: score,
      confidence: 75,
      reasons: ["Sector fixture"],
    },
    {
      sector: "Banking",
      score: score - 2,
      trend: score >= 60 ? "Bull" : score <= 40 ? "Bear" : "Neutral",
      relativeStrength: score - 2,
      breadth: score,
      volume: 50,
      momentum: score,
      participation: score,
      confidence: 70,
      reasons: ["Sector fixture"],
    },
  ];
}

function makeRotation(sectors: SectorAnalysis[]): SectorRotationSummary {
  return {
    improving: sectors.filter((s) => s.score >= 60).map((s) => s.sector),
    weakening: sectors.filter((s) => s.score <= 40).map((s) => s.sector),
    stable: sectors
      .filter((s) => s.score > 40 && s.score < 60)
      .map((s) => s.sector),
    leaders: sectors.slice(0, 1).map((s) => s.sector),
    laggards: sectors.slice(-1).map((s) => s.sector),
    reasons: ["Rotation"],
  };
}

function makeVolatility(): VolatilityAnalysis {
  return {
    score: 40,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 14,
    atr: 12,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1,
    intradayRange: 0.8,
    riskMode: "Risk On",
    confidence: 80,
    reasons: ["Vol fixture"],
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
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 85,
    reasons: [`${regime}`],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(70);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(70),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Risk On",
    confidence: 85,
    healthScore: 75,
    qualityGrade: "A",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function rangeCandles(mid = 100): ORBCandle[] {
  // 09:15 / 09:20 / 09:25 IST → opening range high mid+1 / low mid-1
  return [
    candle(9, 15, mid, mid + 1, mid - 0.5, mid + 0.5, 100_000),
    candle(9, 20, mid + 0.5, mid + 1, mid - 1, mid, 110_000),
    candle(9, 25, mid, mid + 0.8, mid - 0.8, mid + 0.2, 105_000),
  ];
}

function bullBreakoutCandles(): ORBCandle[] {
  return [
    ...rangeCandles(100),
    candle(9, 35, 100.5, 103, 100.2, 102.5, 250_000),
  ];
}

function bearBreakoutCandles(): ORBCandle[] {
  return [
    ...rangeCandles(100),
    candle(9, 35, 99.5, 99.8, 96.5, 97, 250_000),
  ];
}

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "orb",
      name: "ORB",
      category: "Scalp",
      eligible: true,
      priority: 88,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function makeInput(
  candles5m: ORBCandle[],
  overrides: Partial<ORBStrategyInput["orb"]> = {}
): ORBStrategyInput {
  const last = candles5m[candles5m.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    atr: 12,
    volume: last.volume,
    orb: {
      candles5m,
      candles15m: [],
      vwap: 100.5,
      relativeVolume: 1.8,
      atr: 12,
      averageVolume: 100_000,
      ...overrides,
    },
  };
}

function makeContext(
  candles5m: ORBCandle[],
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: number;
    orb?: Partial<ORBStrategyInput["orb"]>;
    eligibleStrategies?: EligibleStrategy[];
    timestamp?: Date;
  } = {}
): StrategyExecutionContext {
  const regime = overrides.regime ?? makeRegime("Strong Bull", overrides.confidence ?? 80);
  return {
    input: makeInput(candles5m, overrides.orb),
    marketContext: makeMarketContext(overrides.marketContext),
    regime,
    confidence: regime.confidenceAnalysis,
    eligibleStrategies: overrides.eligibleStrategies ?? makeEligible(),
    riskMode: overrides.marketContext?.riskMode ?? "Risk On",
    timestamp: overrides.timestamp ?? atIST(9, 40),
  };
}

describe("ORB utilities", () => {
  it("calculates opening range from 09:15–09:30 IST window", () => {
    const range = calculateOpeningRange(rangeCandles(100));
    expect(range).not.toBeNull();
    expect(range!.high).toBe(101);
    expect(range!.low).toBe(99);
  });

  it("detects bullish breakout close above range high", () => {
    const range = calculateOpeningRange(bullBreakoutCandles())!;
    const breakout = detectBreakout(bullBreakoutCandles(), range);
    expect(breakout?.direction).toBe("BUY");
    expect(breakout?.falseBreakout).toBe(false);
  });

  it("detects bearish breakout close below range low", () => {
    const range = calculateOpeningRange(bearBreakoutCandles())!;
    const breakout = detectBreakout(bearBreakoutCandles(), range);
    expect(breakout?.direction).toBe("SELL");
    expect(breakout?.falseBreakout).toBe(false);
  });

  it("flags false breakout when candle closes back inside range", () => {
    const candles = [
      ...rangeCandles(100),
      candle(9, 35, 100.5, 102.5, 99.5, 100.2, 200_000),
    ];
    const range = calculateOpeningRange(candles)!;
    const breakout = detectBreakout(candles, range);
    expect(breakout?.falseBreakout).toBe(true);
    expect(breakout?.falseBreakoutReasons[0]).toMatch(/inside range/i);
  });
});

describe("ORBDetector scenarios", () => {
  let detector: ORBDetector;

  beforeEach(() => {
    resetORBDetector();
    detector = new ORBDetector();
  });

  afterEach(() => {
    resetORBDetector();
  });

  it("detects Bull Breakout with confirmations", () => {
    const ctx = makeContext(bullBreakoutCandles());
    const orbCtx = {
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
      timestamp: ctx.timestamp,
    };
    const detection = detector.detect(orbCtx);
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.volumeConfirmed).toBe(true);
    expect(detection.breadthConfirmed).toBe(true);
    expect(detection.sectorConfirmed).toBe(true);
    expect(detection.marketConfirmed).toBe(true);
    expect(detection.liquidityConfirmed).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(65);
    expect(detection.openingHigh).toBe(101);
    expect(detection.breakoutPrice).toBe(102.5);
  });

  it("detects Bear Breakout with confirmations", () => {
    const regime = makeRegime("Weak Bear", 80);
    const ctx = makeContext(bearBreakoutCandles(), {
      regime,
      marketContext: {
        marketTrend: "Weak Bear",
        marketBreadth: makeBreadth(35),
        sectorStrength: makeSectors(35),
        riskMode: "Neutral",
      },
    });
    const detection = detectORB({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
  });

  it("rejects False Breakout", () => {
    const candles = [
      ...rangeCandles(100),
      candle(9, 35, 100.5, 102.5, 99.5, 100.2, 250_000),
    ];
    const ctx = makeContext(candles);
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /false breakout|inside range/i.test(w))).toBe(
      true
    );
  });

  it("rejects Low Volume", () => {
    const candles = [
      ...rangeCandles(100),
      candle(9, 35, 100.5, 103, 100.2, 102.5, 10_000),
    ];
    const ctx = makeContext(candles, {
      orb: { relativeVolume: 0.5, averageVolume: 100_000 },
    });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(detection.volumeConfirmed).toBe(false);
  });

  it("rejects Weak Breadth", () => {
    const ctx = makeContext(bullBreakoutCandles(), {
      marketContext: { marketBreadth: makeBreadth(30) },
    });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(detection.breadthConfirmed).toBe(false);
  });

  it("rejects Weak Sector", () => {
    const ctx = makeContext(bullBreakoutCandles(), {
      marketContext: { sectorStrength: makeSectors(30) },
    });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(detection.sectorConfirmed).toBe(false);
  });

  it("scores High Confidence when fully aligned", () => {
    const ctx = makeContext(bullBreakoutCandles(), { confidence: 92 });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(70);
  });

  it("rejects Low Confidence regime", () => {
    const regime = makeRegime("Strong Bull", 40);
    const ctx = makeContext(bullBreakoutCandles(), { regime });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(detection.marketConfirmed).toBe(false);
  });

  it("handles No Opening Range", () => {
    const candles = [
      candle(10, 0, 100, 101, 99, 100.5, 100_000),
      candle(10, 5, 100.5, 101, 100, 100.8, 90_000),
      candle(10, 10, 100.8, 101.2, 100.5, 101, 95_000),
      candle(10, 15, 101, 101.5, 100.8, 101.2, 100_000),
    ];
    const ctx = makeContext(candles);
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
      timestamp: atIST(10, 20),
    });
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) => /opening range/i.test(w)) ||
        detection.reasons.some((r) => /opening range/i.test(r))
    ).toBe(true);
  });

  it("rejects Invalid Market Hours", () => {
    const ctx = makeContext(bullBreakoutCandles(), {
      timestamp: atIST(8, 0),
    });
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
      timestamp: atIST(8, 0),
    });
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) => /market hours/i.test(w)) ||
        detection.reasons.some((r) => /market hours/i.test(r))
    ).toBe(true);
  });

  it("rejects Missing Candles", () => {
    const ctx = makeContext([candle(9, 15, 100, 101, 99, 100, 50_000)]);
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
    expect(
      detection.reasons.some((r) => /candle/i.test(r)) ||
        detection.warnings.some((w) => /candle/i.test(w))
    ).toBe(true);
  });

  it("rejects Missing Volume", () => {
    const candles = bullBreakoutCandles().map((c) => ({ ...c, volume: 0 }));
    const ctx = makeContext(candles);
    const detection = detector.detect({
      input: ctx.input as ORBStrategyInput,
      marketContext: ctx.marketContext,
      regime: ctx.regime,
      confidence: ctx.confidence,
      eligibleStrategies: ctx.eligibleStrategies,
    });
    expect(detection.detected).toBe(false);
  });

  it("handles Missing Context", () => {
    const detection = detector.detect(null);
    expect(detection.detected).toBe(false);
    expect(detection.direction).toBe("NONE");
  });
});

describe("ORBStrategy framework integration", () => {
  it("exposes detect() without calculating trade levels", () => {
    const strategy = new ORBStrategy();
    const ctx = makeContext(bullBreakoutCandles());
    const detection = strategy.detect(ctx);
    expect(detection.detected).toBe(true);
    expect(strategy.calculateEntry()).toBe(0);
    expect(strategy.calculateStopLoss()).toBe(0);
    expect(strategy.calculateTargets()).toEqual({
      target1: 0,
      target2: 0,
      finalTarget: 0,
    });
  });

  it("analyze / generateSignal map detection direction", () => {
    const strategy = new ORBStrategy();
    const ctx = makeContext(bullBreakoutCandles());
    const analysis = strategy.analyze(ctx);
    expect(analysis.metrics.detected).toBe(1);
    expect(strategy.generateSignal(ctx, analysis)).toBe("BUY");
  });
});
