/**
 * VWAP Mean Reversion Detection Engine — unit tests (Sprint 11B.3D.1).
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
  VWAPMeanReversionDetector,
  VWAPMeanReversionStrategy,
  calculateDeviation,
  calculateVWAPBands,
  detectVWAPMeanReversion,
  resetVWAPMeanReversionDetector,
  type VWAPMeanReversionCandle,
  type VWAPMeanReversionStrategyInput,
} from "./index";

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
    regime: score > 55 ? "High" : "Normal",
    trend: "Stable",
    indiaVix: score > 55 ? 22 : 14,
    atr: 1.2,
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
  regime: MarketRegime["regime"] = "Sideways",
  confidence = 75
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 70,
    reasons: [`${regime}`],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(50);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(50),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(40),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 75,
    healthScore: 60,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
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
      score: 75,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/**
 * Bullish MR: extended below VWAP, exhausting sell, hammer-like reversal.
 * VWAP=100, σ=1 → ~2σ below ≈ close 98 with long lower wick.
 */
function bullishCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 99.8, 100.0, 99.0, 99.2, 110_000),
    candle(9, 25, 99.2, 99.4, 98.4, 98.6, 115_000),
    candle(9, 30, 98.6, 98.8, 97.8, 98.0, 120_000),
    candle(9, 35, 98.0, 98.2, 97.5, 97.7, 110_000),
    // Compressing sell — ranges shrink, lows stabilize
    candle(9, 40, 97.7, 97.95, 97.45, 97.7, 100_000),
    candle(9, 45, 97.7, 97.9, 97.5, 97.75, 95_000),
    candle(9, 50, 97.75, 97.95, 97.55, 97.8, 92_000),
    // Reversal: long lower wick, closes up (~2σ below VWAP)
    candle(9, 55, 97.8, 98.25, 97.55, 98.05, 98_000),
  ];
}

/**
 * Bearish MR: extended above VWAP, exhausting buy, shooting-star reversal.
 */
function bearishCandles(): VWAPMeanReversionCandle[] {
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

/** Strong sell continuation within 1.5–2.5σ — steep slope, no exhaustion. */
function strongTrendCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 100.2, 100.4, 99.9, 100.0, 120_000),
    candle(9, 25, 100.0, 100.1, 99.6, 99.7, 130_000),
    candle(9, 30, 99.7, 99.8, 99.2, 99.3, 140_000),
    candle(9, 35, 99.3, 99.4, 98.8, 98.9, 150_000),
    candle(9, 40, 98.9, 99.0, 98.4, 98.5, 160_000),
    candle(9, 45, 98.5, 98.6, 98.0, 98.1, 170_000),
    candle(9, 50, 98.1, 98.2, 97.6, 97.7, 180_000),
    candle(9, 55, 97.7, 97.9, 97.3, 98.0, 190_000),
  ];
}

function huggingCandles(): VWAPMeanReversionCandle[] {
  return [
    candle(9, 20, 100.0, 100.2, 99.8, 100.05, 100_000),
    candle(9, 25, 100.05, 100.15, 99.9, 100.0, 100_000),
    candle(9, 30, 100.0, 100.1, 99.95, 100.02, 100_000),
    candle(9, 35, 100.02, 100.12, 99.92, 99.98, 100_000),
    candle(9, 40, 99.98, 100.08, 99.9, 100.01, 100_000),
    candle(9, 45, 100.01, 100.1, 99.95, 100.0, 100_000),
    candle(9, 50, 100.0, 100.05, 99.97, 100.02, 100_000),
    candle(9, 55, 100.02, 100.08, 99.98, 100.01, 100_000),
  ];
}

function makeInput(
  candles5m: VWAPMeanReversionCandle[],
  overrides: Partial<VWAPMeanReversionStrategyInput["vwapMeanReversion"]> = {}
): VWAPMeanReversionStrategyInput {
  const last = candles5m[candles5m.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    atr: 1.2,
    volume: last.volume,
    vwapMeanReversion: {
      candles5m,
      candles1m: candles5m,
      vwap: 100,
      vwapStdDev: 1,
      bands: { upper: 102, lower: 98, sigma: 1 },
      relativeVolume: 1.0,
      atr: 1.2,
      averageVolume: 100_000,
      rsi: 25,
      newsDriven: false,
      ...overrides,
    },
  };
}

function makeContext(
  candles5m: VWAPMeanReversionCandle[],
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: number;
    mr?: Partial<VWAPMeanReversionStrategyInput["vwapMeanReversion"]>;
    eligible?: EligibleStrategy[];
    timestamp?: Date;
  } = {}
): StrategyExecutionContext {
  const input = makeInput(candles5m, overrides.mr);
  const confidenceScore = overrides.confidence ?? 75;
  const marketContext = makeMarketContext(overrides.marketContext);
  return {
    input,
    marketContext,
    regime: overrides.regime ?? makeRegime("Sideways", confidenceScore),
    confidence: makeConfidence(confidenceScore),
    eligibleStrategies: overrides.eligible ?? makeEligible(),
    riskMode: marketContext.riskMode,
    timestamp: overrides.timestamp ?? atIST(10, 0),
  };
}

function detectionContext(
  candles5m: VWAPMeanReversionCandle[],
  overrides: Parameters<typeof makeContext>[1] = {}
) {
  const ctx = makeContext(candles5m, overrides);
  return {
    input: ctx.input as VWAPMeanReversionStrategyInput,
    marketContext: ctx.marketContext,
    regime: ctx.regime,
    confidence: ctx.confidence,
    eligibleStrategies: ctx.eligibleStrategies,
    timestamp: ctx.timestamp,
  };
}

describe("VWAPMeanReversionUtils", () => {
  it("calculates deviation and bands", () => {
    expect(calculateDeviation(98, 100, 1)).toBe(-2);
    const bands = calculateVWAPBands(bullishCandles(), 100, 1, 2);
    expect(bands).not.toBeNull();
    expect(bands!.lower).toBe(98);
    expect(bands!.upper).toBe(102);
  });
});

describe("VWAPMeanReversionDetector", () => {
  beforeEach(() => {
    resetVWAPMeanReversionDetector();
  });
  afterEach(() => {
    resetVWAPMeanReversionDetector();
  });

  it("detects Bullish Mean Reversion", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        regime: makeRegime("Sideways", 75),
      })
    );
    expect(result.detected).toBe(true);
    expect(result.direction).toBe("BUY");
    expect(result.reversalConfirmed).toBe(true);
    expect(result.volumeStable).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it("detects Bearish Mean Reversion", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bearishCandles(), {
        mr: { rsi: 78 },
        regime: makeRegime("Weak Bear", 75),
        marketContext: {
          marketBreadth: makeBreadth(55),
          sectorStrength: makeSectors(55),
        },
      })
    );
    expect(result.detected).toBe(true);
    expect(result.direction).toBe("SELL");
    expect(result.reversalConfirmed).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it("rejects Strong Trend", () => {
    const result = detectVWAPMeanReversion(
      detectionContext(strongTrendCandles(), {
        mr: {
          rsi: 20,
          bands: { upper: 102, lower: 98, sigma: 1 },
          vwapStdDev: 1,
        },
      })
    );
    expect(result.detected).toBe(false);
    expect(
      result.warnings.some((w) => /Strong trend|Circuit|continuation/i.test(w))
    ).toBe(true);
  });

  it("rejects Flat Market / hugging VWAP", () => {
    const result = detectVWAPMeanReversion(
      detectionContext(huggingCandles(), {
        mr: { rsi: 50 },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.warnings.some((w) => /hugging VWAP/i.test(w))).toBe(true);
  });

  it("rejects Low Liquidity", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { relativeVolume: 0.3, rsi: 22 },
      })
    );
    expect(result.detected).toBe(false);
    expect(
      result.warnings.some((w) => /liquidity|Relative volume/i.test(w)) ||
        result.volumeStable === false
    ).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        marketContext: { marketBreadth: makeBreadth(20) },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.breadthConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Weak Breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Sector", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        marketContext: { sectorStrength: makeSectors(15) },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.sectorConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Weak Sector/i.test(w))).toBe(true);
  });

  it("rejects High Volatility", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        marketContext: { volatility: makeVolatility(80) },
      })
    );
    expect(result.detected).toBe(false);
    expect(
      result.warnings.some((w) => /volatility|Liquidity/i.test(w)) ||
        result.reasons.some((r) => /volatility|Liquidity/i.test(r))
    ).toBe(true);
  });

  it("rejects Risk Off", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        marketContext: { riskMode: "Risk Off" },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.marketConfirmed).toBe(false);
    expect(result.warnings.some((w) => /Risk Off/i.test(w))).toBe(true);
  });

  it("rejects Missing VWAP via validator", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles(), {
        mr: { vwap: 0, bands: null },
      })
    );
    expect(result.detected).toBe(false);
    expect(result.warnings.some((w) => /VWAP/i.test(w))).toBe(true);
  });

  it("rejects Missing Bands", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(
      detectionContext(bullishCandles().slice(0, 2), {
        mr: {
          vwapStdDev: null,
          bands: null,
          candles5m: bullishCandles().slice(0, 2),
        },
      })
    );
    expect(result.detected).toBe(false);
    expect(
      result.warnings.some((w) => /Bands|Candles/i.test(w)) ||
        result.reasons.some((r) => /Bands|Candles/i.test(r))
    ).toBe(true);
  });

  it("scores High Confidence on clean setup", () => {
    const result = detectVWAPMeanReversion(
      detectionContext(bullishCandles(), {
        mr: { rsi: 20 },
        confidence: 85,
      })
    );
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(65);
  });

  it("scores Low Confidence when regime confidence is weak", () => {
    const result = detectVWAPMeanReversion(
      detectionContext(bullishCandles(), {
        mr: { rsi: 22 },
        confidence: 40,
      })
    );
    expect(result.detected).toBe(false);
    expect(result.confidence).toBeLessThan(60);
  });

  it("rejects Missing Context via validator", () => {
    const detector = new VWAPMeanReversionDetector();
    const result = detector.detect(null);
    expect(result.detected).toBe(false);
    expect(result.direction).toBe("NONE");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("VWAPMeanReversionStrategy", () => {
  it("returns detection and zero trade levels", () => {
    const strategy = new VWAPMeanReversionStrategy();
    const ctx = makeContext(bullishCandles(), { mr: { rsi: 22 } });
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
