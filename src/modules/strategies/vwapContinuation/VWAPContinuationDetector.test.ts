/**
 * VWAP Continuation Detection Engine — unit tests (Sprint 11B.3C.1).
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
  VWAPContinuationDetector,
  VWAPContinuationStrategy,
  calculateConfidence,
  calculateVWAPSlope,
  detectBounce,
  detectPullback,
  detectVWAPContinuation,
  measureVWAPDistance,
  resetVWAPContinuationDetector,
  validateBreadth,
  validateSector,
  validateTrend,
  validateVolume,
  type VWAPCandle,
  type VWAPContinuationStrategyInput,
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

function makeVolatility(score = 40): VolatilityAnalysis {
  return {
    score,
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

function makeEligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "vwap-continuation",
      name: "VWAP Continuation",
      category: "Scalp",
      eligible: true,
      priority: 86,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/**
 * Bullish continuation: HH/HL, pullback near VWAP, green bounce, rising VWAP series.
 * VWAP ≈ 100. Pullback lows touch ~99.7–100. Bounce closes ~100.4+.
 */
function bullishCandles(): VWAPCandle[] {
  return [
    candle(9, 20, 100.1, 100.3, 99.9, 100.2, 90_000),
    candle(9, 25, 100.2, 100.5, 100.0, 100.4, 95_000),
    candle(9, 30, 100.4, 100.7, 100.1, 100.6, 100_000),
    candle(9, 35, 100.5, 100.8, 100.2, 100.5, 105_000),
    candle(9, 40, 100.4, 100.6, 99.75, 100.1, 110_000), // pullback toward VWAP
    candle(9, 45, 100.05, 100.5, 100.0, 100.45, 220_000), // bounce
    candle(9, 50, 100.4, 100.9, 100.3, 100.8, 240_000),
    candle(9, 55, 100.7, 101.2, 100.5, 101.0, 260_000), // confirmation
  ];
}

function risingVwapSeries(): number[] {
  return [99.7, 99.8, 99.9, 100.0, 100.05, 100.1, 100.15, 100.2];
}

/**
 * Bearish continuation: LH/LL, pullback near VWAP from below, red rejection.
 */
function bearishCandles(): VWAPCandle[] {
  return [
    candle(9, 20, 99.9, 100.1, 99.7, 99.8, 90_000),
    candle(9, 25, 99.8, 100.0, 99.5, 99.6, 95_000),
    candle(9, 30, 99.6, 99.8, 99.3, 99.4, 100_000),
    candle(9, 35, 99.5, 99.7, 99.2, 99.3, 105_000),
    candle(9, 40, 99.4, 100.25, 99.1, 99.9, 110_000), // pullback high near VWAP
    candle(9, 45, 99.95, 100.0, 99.5, 99.55, 220_000), // rejection
    candle(9, 50, 99.6, 99.7, 99.2, 99.3, 240_000),
    candle(9, 55, 99.3, 99.4, 98.8, 98.9, 260_000), // confirmation
  ];
}

function fallingVwapSeries(): number[] {
  return [100.3, 100.2, 100.1, 100.0, 99.95, 99.9, 99.85, 99.8];
}

function makeInput(
  candles5m: VWAPCandle[],
  overrides: Partial<VWAPContinuationStrategyInput["vwapContinuation"]> = {}
): VWAPContinuationStrategyInput {
  const last = candles5m[candles5m.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    atr: 12,
    volume: last.volume,
    vwapContinuation: {
      candles5m,
      candles1m: candles5m,
      candles15m: candles5m,
      vwap: 100,
      vwapSeries: risingVwapSeries(),
      relativeVolume: 1.8,
      atr: 12,
      averageVolume: 100_000,
      ...overrides,
    },
  };
}

function makeContext(
  candles5m: VWAPCandle[],
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: number;
    vwap?: Partial<VWAPContinuationStrategyInput["vwapContinuation"]>;
    eligible?: EligibleStrategy[];
    timestamp?: Date;
  } = {}
): StrategyExecutionContext {
  const input = makeInput(candles5m, overrides.vwap);
  const confidenceScore = overrides.confidence ?? 80;
  const marketContext = makeMarketContext(overrides.marketContext);
  return {
    input,
    marketContext,
    regime: overrides.regime ?? makeRegime("Strong Bull", confidenceScore),
    confidence: makeConfidence(confidenceScore),
    eligibleStrategies: overrides.eligible ?? makeEligible(),
    riskMode: marketContext.riskMode,
    timestamp: overrides.timestamp ?? atIST(10, 0),
  };
}

function detectionContext(
  candles5m: VWAPCandle[],
  overrides: Parameters<typeof makeContext>[1] = {}
) {
  const ctx = makeContext(candles5m, overrides);
  return {
    input: ctx.input as VWAPContinuationStrategyInput,
    marketContext: ctx.marketContext,
    regime: ctx.regime,
    confidence: ctx.confidence,
    eligibleStrategies: ctx.eligibleStrategies,
    timestamp: ctx.timestamp,
  };
}

describe("VWAPContinuationUtils", () => {
  it("calculates VWAP slope and distance", () => {
    expect(calculateVWAPSlope(risingVwapSeries())).toBeGreaterThan(0.0008);
    expect(calculateVWAPSlope(fallingVwapSeries())).toBeLessThan(-0.0008);
    expect(measureVWAPDistance(101, 100)).toBeCloseTo(0.01);
  });

  it("validates bullish trend / pullback / bounce", () => {
    const bars = bullishCandles();
    expect(validateTrend(bars, "BUY").valid).toBe(true);
    expect(detectPullback(bars, 100, "BUY").detected).toBe(true);
    expect(detectBounce(bars, 100, "BUY").confirmed).toBe(true);
  });

  it("validates volume / breadth / sector helpers", () => {
    const vol = validateVolume(bullishCandles(), 1.8, 100_000);
    expect(vol.confirmed).toBe(true);
    expect(validateBreadth("BUY", makeMarketContext()).confirmed).toBe(true);
    expect(validateSector("BUY", makeMarketContext()).confirmed).toBe(true);
  });

  it("calculates confidence within bounds", () => {
    const score = calculateConfidence({
      trendScore: 85,
      slopeScore: 80,
      pullbackScore: 80,
      bounceScore: 85,
      volumeScore: 80,
      breadthScore: 70,
      sectorScore: 70,
      marketScore: 80,
    });
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("VWAPContinuationDetector", () => {
  beforeEach(() => {
    resetVWAPContinuationDetector();
  });
  afterEach(() => {
    resetVWAPContinuationDetector();
  });

  it("detects Bullish Continuation", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(detectionContext(bullishCandles()));
    expect(result.detected).toBe(true);
    expect(result.direction).toBe("BUY");
    expect(result.pullbackDetected).toBe(true);
    expect(result.bounceConfirmed).toBe(true);
    expect(result.volumeConfirmed).toBe(true);
    expect(result.breadthConfirmed).toBe(true);
    expect(result.sectorConfirmed).toBe(true);
    expect(result.marketConfirmed).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(65);
  });

  it("detects Bearish Continuation", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bearishCandles(), {
        regime: makeRegime("Strong Bear", 80),
        marketContext: {
          marketBreadth: makeBreadth(35),
          sectorStrength: makeSectors(35),
          marketTrend: "Strong Bear",
        },
        vwap: {
          vwap: 100,
          vwapSeries: fallingVwapSeries(),
          relativeVolume: 1.8,
          averageVolume: 100_000,
        },
      })
    );
    expect(result.detected).toBe(true);
    expect(result.direction).toBe("SELL");
    expect(result.bounceConfirmed).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(65);
  });

  it("rejects Flat VWAP", () => {
    const result = detectVWAPContinuation(
      detectionContext(bullishCandles(), {
        vwap: { vwapSeries: [100, 100, 100, 100, 100] },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.warnings.some((w) => /Flat VWAP/i.test(w))).toBe(true);
  });

  it("rejects Weak Volume", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        vwap: { relativeVolume: 0.5, averageVolume: 500_000 },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.volumeConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Weak Volume/i.test(w))).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        marketContext: { marketBreadth: makeBreadth(30) },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.breadthConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Weak Breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Sector", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        marketContext: { sectorStrength: makeSectors(30) },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.sectorConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Weak Sector/i.test(w))).toBe(true);
  });

  it("rejects Risk Off", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        marketContext: { riskMode: "Risk Off" },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.marketConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Risk Off/i.test(w))).toBe(true);
  });

  it("rejects Low Liquidity / high volatility", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        marketContext: { volatility: makeVolatility(90) },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.marketConfirmed).toBe(false);
    expect(
      result.warnings.some((w) => /Poor liquidity|volatility/i.test(w))
    ).toBe(true);
  });

  it("rejects No Pullback", () => {
    // Keep structure above VWAP but never tag within pullback proximity (0.4%).
    const adjusted = bullishCandles().map((c) => ({
      ...c,
      low: Math.max(c.low, 100.5),
      open: Math.max(c.open, 100.5),
      close: Math.max(c.close, 100.55),
      high: Math.max(c.high, 100.7),
    }));
    const result = detectVWAPContinuation(
      detectionContext(adjusted, {
        vwap: { vwap: 100, vwapSeries: risingVwapSeries() },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.pullbackDetected).toBe(false);
    expect(result.warnings.some((w) => /No Pullback/i.test(w))).toBe(true);
  });

  it("rejects No Bounce", () => {
    const bars = bullishCandles();
    // Make last candle a red close still above VWAP but without bounce strength
    bars[bars.length - 1] = candle(
      9,
      55,
      101.0,
      101.1,
      100.05,
      100.08,
      260_000
    );
    const result = detectVWAPContinuation(
      detectionContext(bars, {
        vwap: { vwap: 100, vwapSeries: risingVwapSeries() },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.bounceConfirmed).toBe(false);
    expect(result.warnings.some((w) => /No Bounce/i.test(w))).toBe(true);
  });

  it("scores High Confidence on clean setup", () => {
    const result = detectVWAPContinuation(detectionContext(bullishCandles()));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it("scores Low Confidence when regime confidence is weak", () => {
    const result = detectVWAPContinuation(
      detectionContext(bullishCandles(), { confidence: 40 })
    );
    expect(result.detected).toBe(false);
    expect(result.confidence).toBeLessThan(65);
    expect(
      result.warnings.some((w) => /High uncertainty|Low Confidence/i.test(w))
    ).toBe(true);
  });

  it("rejects Missing VWAP via validator", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        vwap: { vwap: 0 },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.warnings.some((w) => /VWAP/i.test(w))).toBe(true);
  });

  it("rejects Missing Context via validator", () => {
    const detector = new VWAPContinuationDetector();
    const result = detector.detect(null);
    expect(result.detected).toBe(false);
    expect(result.direction).toBe("NONE");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("VWAPContinuationStrategy", () => {
  it("returns detection and zero trade levels", () => {
    const strategy = new VWAPContinuationStrategy();
    const ctx = makeContext(bullishCandles());
    strategy.initialize(ctx);
    const detection = strategy.detect(ctx);
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(strategy.calculateEntry()).toBe(0);
    expect(strategy.calculateStopLoss()).toBe(0);
    expect(strategy.calculateTargets()).toEqual({
      target1: 0,
      target2: 0,
      finalTarget: 0,
    });

    const analysis = strategy.analyze(ctx);
    expect(analysis.bias).toBe("Bullish");
    expect(strategy.generateSignal(ctx, analysis)).toBe("BUY");
  });
});
