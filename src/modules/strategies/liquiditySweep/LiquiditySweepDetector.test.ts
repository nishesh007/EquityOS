/**
 * Liquidity Sweep Detection & Trade Construction — tests (Sprint 11B.3E).
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
  LiquiditySweepDetector,
  LiquiditySweepTradeBuilder,
  detectLiquiditySweep,
  resetLiquiditySweepDetector,
  resetLiquiditySweepMetrics,
  resetLiquiditySweepTradeBuilder,
  type LiquiditySweepCandle,
  type LiquiditySweepDetectionContext,
  type LiquiditySweepStrategyInput,
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
): LiquiditySweepCandle {
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

function makeVolatility(score = 62, indiaVix = 18): VolatilityAnalysis {
  return {
    score,
    regime: score >= 60 ? "High" : "Normal",
    trend: "Expanding",
    indiaVix,
    atr: 0.8,
    historicalVolatility: 18,
    realizedVolatility: 17,
    gapPercent: 0.3,
    dailyRange: 1.4,
    intradayRange: 1.1,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Increasing",
    vixMomentum: 1,
    atrExpansion: true,
    atrCompression: false,
    relativeVolatility: 1.2,
    volatilityExpansion: true,
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
  regime: MarketRegime["regime"] = "High Volatility",
  confidence = 75
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
    confidence: 75,
    healthScore: 60,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "liquidity-sweep",
      name: "Liquidity Sweep",
      category: "Scalp",
      eligible: true,
      priority: 85,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Prior bars form swing low ~98; last bar sweeps below and reclaim. */
function bullishSweepCandles(): LiquiditySweepCandle[] {
  return [
    candle(9, 20, 100.0, 100.4, 99.6, 99.9, 100_000),
    candle(9, 25, 99.9, 100.1, 99.2, 99.4, 105_000),
    candle(9, 30, 99.4, 99.6, 98.6, 98.9, 110_000),
    candle(9, 35, 98.9, 99.2, 98.0, 98.3, 115_000),
    candle(9, 40, 98.3, 98.8, 98.1, 98.5, 100_000),
    candle(9, 45, 98.5, 99.0, 98.2, 98.7, 95_000),
    candle(9, 50, 98.7, 99.1, 98.4, 98.9, 98_000),
    // Sweep low below 98.0, close back above
    candle(9, 55, 98.9, 99.2, 97.5, 98.6, 180_000),
  ];
}

/** Prior bars form swing high ~102; last bar sweeps above and reclaim. */
function bearishSweepCandles(): LiquiditySweepCandle[] {
  return [
    candle(9, 20, 100.0, 100.4, 99.6, 100.1, 100_000),
    candle(9, 25, 100.1, 100.8, 99.9, 100.6, 105_000),
    candle(9, 30, 100.6, 101.4, 100.4, 101.1, 110_000),
    candle(9, 35, 101.1, 102.0, 101.0, 101.7, 115_000),
    candle(9, 40, 101.7, 102.0, 101.4, 101.6, 100_000),
    candle(9, 45, 101.6, 101.9, 101.2, 101.5, 95_000),
    candle(9, 50, 101.5, 101.8, 101.1, 101.4, 98_000),
    // Sweep high above 102.0, close back below
    candle(9, 55, 101.4, 102.6, 101.1, 101.5, 180_000),
  ];
}

/** Equal lows near 98.0 twice, then sweep. */
function equalLowSweepCandles(): LiquiditySweepCandle[] {
  return [
    candle(9, 20, 100.0, 100.3, 99.5, 99.8, 100_000),
    candle(9, 25, 99.8, 100.0, 98.0, 98.4, 110_000),
    candle(9, 30, 98.4, 99.0, 98.2, 98.7, 105_000),
    candle(9, 35, 98.7, 99.2, 98.01, 98.5, 108_000),
    candle(9, 40, 98.5, 99.0, 98.3, 98.8, 100_000),
    candle(9, 45, 98.8, 99.2, 98.4, 98.9, 98_000),
    candle(9, 50, 98.9, 99.3, 98.5, 99.0, 100_000),
    candle(9, 55, 99.0, 99.3, 97.55, 98.7, 190_000),
  ];
}

/** Equal highs near 102.0 twice, then sweep. */
function equalHighSweepCandles(): LiquiditySweepCandle[] {
  return [
    candle(9, 20, 100.0, 100.5, 99.7, 100.2, 100_000),
    candle(9, 25, 100.2, 102.0, 100.1, 101.6, 110_000),
    candle(9, 30, 101.6, 101.9, 101.2, 101.5, 105_000),
    candle(9, 35, 101.5, 102.0, 101.3, 101.7, 108_000),
    candle(9, 40, 101.7, 101.9, 101.2, 101.4, 100_000),
    candle(9, 45, 101.4, 101.8, 101.1, 101.3, 98_000),
    candle(9, 50, 101.3, 101.7, 101.0, 101.2, 100_000),
    candle(9, 55, 101.2, 102.55, 101.0, 101.4, 190_000),
  ];
}

function makeInput(
  candles: LiquiditySweepCandle[],
  overrides: Partial<LiquiditySweepStrategyInput["liquiditySweep"]> = {}
): LiquiditySweepStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 0.9,
    liquiditySweep: {
      candles5m: candles,
      vwap: 100,
      atr: 0.9,
      relativeVolume: 1.4,
      recentSwingHigh: Math.max(...candles.slice(0, -1).map((c) => c.high)),
      recentSwingLow: Math.min(...candles.slice(0, -1).map((c) => c.low)),
      ...overrides,
    },
  };
}

function makeContext(
  input: LiquiditySweepStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    eligibleStrategies?: EligibleStrategy[];
  } = {}
): LiquiditySweepDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime(),
    confidence: makeConfidence(75),
    eligibleStrategies: overrides.eligibleStrategies ?? eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Liquidity Sweep Detection", () => {
  beforeEach(() => {
    resetLiquiditySweepDetector();
    resetLiquiditySweepTradeBuilder();
    resetLiquiditySweepMetrics();
  });

  afterEach(() => {
    resetLiquiditySweepDetector();
    resetLiquiditySweepTradeBuilder();
    resetLiquiditySweepMetrics();
  });

  it("detects Bullish Sweep (false breakdown / swing low)", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(bullishSweepCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.reversalConfirmed).toBe(true);
    expect(detection.sweepExtreme).toBeLessThan(detection.liquidityLevel);
  });

  it("detects Bearish Sweep (false breakout / swing high)", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(bearishSweepCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(detection.reversalConfirmed).toBe(true);
    expect(detection.sweepExtreme).toBeGreaterThan(detection.liquidityLevel);
  });

  it("detects Equal Low Sweep", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(equalLowSweepCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(
      ["equal_low_sweep", "liquidity_grab", "stop_hunt", "false_breakdown", "swing_low_sweep"].includes(
        detection.sweepType
      )
    ).toBe(true);
  });

  it("detects Equal High Sweep", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(equalHighSweepCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(
      ["equal_high_sweep", "liquidity_grab", "stop_hunt", "false_breakout", "swing_high_sweep"].includes(
        detection.sweepType
      )
    ).toBe(true);
  });

  it("rejects False Breakout continuation without reclaim quality", () => {
    const candles = [
      ...bearishSweepCandles().slice(0, -1),
      candle(9, 55, 101.4, 103.5, 101.3, 103.2, 200_000),
    ];
    const detection = detectLiquiditySweep(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
  });

  it("rejects False Breakdown continuation without reclaim", () => {
    const candles = [
      ...bullishSweepCandles().slice(0, -1),
      candle(9, 55, 98.9, 99.0, 96.5, 96.8, 200_000),
    ];
    const detection = detectLiquiditySweep(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
  });

  it("rejects Weak Volume / Low Liquidity", () => {
    const detection = detectLiquiditySweep(
      makeContext(
        makeInput(bullishSweepCandles(), {
          relativeVolume: 0.4,
          candles5m: bullishSweepCandles().map((c, i, arr) =>
            i === arr.length - 1 ? { ...c, volume: 40_000 } : c
          ),
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) => /liquidity|volume/i.test(w))
    ).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(bullishSweepCandles()), {
        marketContext: { marketBreadth: makeBreadth(20) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Sector", () => {
    const detection = detectLiquiditySweep(
      makeContext(makeInput(bullishSweepCandles()), {
        marketContext: { sectorStrength: makeSectors(15) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /sector/i.test(w))).toBe(true);
  });

  it("Detector never throws on null context", () => {
    const detector = new LiquiditySweepDetector();
    const empty = detector.detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("Liquidity Sweep Trade Construction", () => {
  beforeEach(() => {
    resetLiquiditySweepTradeBuilder();
    resetLiquiditySweepMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullishSweepCandles()));
    const detection = detectLiquiditySweep(context);
    expect(detection.detected).toBe(true);
    const setup = new LiquiditySweepTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.institutionalScore.conviction).toBeGreaterThan(50);
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
    expect(setup.explainability.summary.length).toBeLessThanOrEqual(5);
  });

  it("builds bearish setup with signal grade", () => {
    const context = makeContext(makeInput(bearishSweepCandles()));
    const detection = detectLiquiditySweep(context);
    const setup = new LiquiditySweepTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(
      setup.institutionalScore.signalGrade
    );
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullishSweepCandles()));
    const detection = detectLiquiditySweep(context);
    const setup = new LiquiditySweepTradeBuilder({
      minimumRiskReward: 50,
    }).build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.warnings.some((w) => /RR/i.test(w))).toBe(true);
  });

  it("produces Explainability Output", () => {
    const context = makeContext(makeInput(bullishSweepCandles()));
    const detection = detectLiquiditySweep(context);
    const setup = new LiquiditySweepTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.explainability.factors.length).toBeGreaterThan(0);
    const texts = [
      ...setup.explainability.positiveReasons,
      ...setup.explainability.neutralFactors,
      ...setup.explainability.summary,
    ].join(" ");
    expect(texts.length).toBeGreaterThan(0);
  });

  it("Low Conviction when setup rejected", () => {
    const context = makeContext(makeInput(bullishSweepCandles()));
    const detection = detectLiquiditySweep(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new LiquiditySweepTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
    expect(["Weak", "Average"]).toContain(setup.institutionalScore.grade);
  });
});
