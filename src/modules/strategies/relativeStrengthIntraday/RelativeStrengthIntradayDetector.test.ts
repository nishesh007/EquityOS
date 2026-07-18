/**
 * Relative Strength Intraday Detection & Trade Construction — tests (Sprint 11B.3G).
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
  RelativeStrengthIntradayDetector,
  RelativeStrengthIntradayTradeBuilder,
  detectRelativeStrengthIntraday,
  resetRelativeStrengthIntradayDetector,
  resetRelativeStrengthIntradayMetrics,
  resetRelativeStrengthIntradayTradeBuilder,
  type RelativeStrengthIntradayCandle,
  type RelativeStrengthIntradayDetectionContext,
  type RelativeStrengthIntradayStrategyInput,
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
): RelativeStrengthIntradayCandle {
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

function makeVolatility(
  score = 45,
  trend: VolatilityAnalysis["trend"] = "Stable"
): VolatilityAnalysis {
  return {
    score,
    regime: score >= 60 ? "High" : "Normal",
    trend,
    indiaVix: 14,
    atr: 1.0,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: trend,
    vixMomentum: 0,
    atrExpansion: trend === "Expanding",
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: trend === "Expanding",
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
    priority: 80,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(65);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(65),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "relative-strength",
      name: "Relative Strength Intraday",
      category: "Intraday",
      eligible: true,
      priority: 87,
      score: 85,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Strong bull: HH/HL with relative strength leadership. */
function bullLeaderCandles(): RelativeStrengthIntradayCandle[] {
  return [
    candle(9, 15, 99.5, 99.8, 99.2, 99.6, 90_000),
    candle(9, 20, 99.6, 100.1, 99.5, 99.9, 95_000),
    candle(9, 25, 99.9, 100.5, 99.8, 100.3, 100_000),
    candle(9, 30, 100.3, 101.0, 100.2, 100.8, 105_000),
    candle(9, 35, 100.8, 101.6, 100.7, 101.4, 110_000),
    candle(9, 40, 101.4, 102.0, 101.3, 101.8, 115_000),
    candle(9, 45, 101.8, 102.05, 101.55, 101.7, 100_000),
    candle(9, 50, 101.7, 101.9, 101.5, 101.65, 95_000),
    candle(9, 55, 101.65, 101.85, 101.48, 101.7, 98_000),
    candle(10, 0, 101.75, 102.6, 101.7, 102.45, 160_000),
  ];
}

function bearLeaderCandles(): RelativeStrengthIntradayCandle[] {
  return [
    candle(9, 15, 102.5, 102.8, 102.2, 102.4, 90_000),
    candle(9, 20, 102.4, 102.5, 101.9, 102.1, 95_000),
    candle(9, 25, 102.1, 102.2, 101.5, 101.7, 100_000),
    candle(9, 30, 101.7, 101.8, 101.0, 101.2, 105_000),
    candle(9, 35, 101.2, 101.3, 100.4, 100.6, 110_000),
    candle(9, 40, 100.6, 100.7, 100.0, 100.2, 115_000),
    candle(9, 45, 100.2, 100.45, 100.05, 100.25, 100_000),
    candle(9, 50, 100.25, 100.5, 100.1, 100.3, 95_000),
    candle(9, 55, 100.3, 100.55, 100.15, 100.35, 98_000),
    candle(10, 0, 100.25, 100.35, 99.4, 99.55, 160_000),
  ];
}

function makeInput(
  candles: RelativeStrengthIntradayCandle[],
  overrides: Partial<
    RelativeStrengthIntradayStrategyInput["relativeStrengthIntraday"]
  > = {}
): RelativeStrengthIntradayStrategyInput {
  const last = candles[candles.length - 1]!;
  const bullish = last.close > 101;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.0,
    relativeStrengthIntraday: {
      candles5m: candles,
      vwap: overrides.vwap ?? (bullish ? 100.8 : 101.2),
      atr: 1.0,
      ema20: overrides.ema20 ?? (bullish ? 101.2 : 100.6),
      ema50: overrides.ema50 ?? (bullish ? 100.4 : 101.4),
      ema20Series:
        overrides.ema20Series ??
        (bullish
          ? [100.6, 100.8, 101.0, 101.2]
          : [101.2, 101.0, 100.8, 100.6]),
      relativeVolume: 1.35,
      stockRelativeStrength: bullish ? 85 : 35,
      sectorRelativeStrength: bullish ? 70 : 45,
      benchmarkRelativeStrength: bullish ? 60 : 55,
      openingRangeHigh: bullish ? 101.0 : undefined,
      openingRangeLow: bullish ? undefined : 100.5,
      ...overrides,
    },
  };
}

function makeContext(
  input: RelativeStrengthIntradayStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: RegimeConfidenceAnalysis;
  } = {}
): RelativeStrengthIntradayDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime("Strong Bull", 80),
    confidence: overrides.confidence ?? makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 5),
  };
}

describe("Relative Strength Intraday Detection", () => {
  beforeEach(() => {
    resetRelativeStrengthIntradayDetector();
    resetRelativeStrengthIntradayTradeBuilder();
    resetRelativeStrengthIntradayMetrics();
  });

  afterEach(() => {
    resetRelativeStrengthIntradayDetector();
    resetRelativeStrengthIntradayTradeBuilder();
    resetRelativeStrengthIntradayMetrics();
  });

  it("detects Strong Relative Leader (bull)", () => {
    const detection = detectRelativeStrengthIntraday(
      makeContext(makeInput(bullLeaderCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.strongTrend).toBe(true);
    expect(detection.outperformsBenchmark).toBe(true);
    expect(detection.outperformsSector).toBe(true);
    expect(detection.stockRelativeStrength).toBe(85);
    expect(detection.confidence).toBeGreaterThan(50);
  });

  it("detects sector and benchmark leadership path (bear)", () => {
    const detection = detectRelativeStrengthIntraday(
      makeContext(makeInput(bearLeaderCandles()), {
        regime: makeRegime("Strong Bear", 78),
        marketContext: {
          marketBreadth: makeBreadth(35),
          sectorStrength: makeSectors(35),
          marketTrend: "Strong Bear",
          volatility: makeVolatility(42, "Expanding"),
        },
      })
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(detection.outperformsBenchmark).toBe(true);
    expect(detection.outperformsSector).toBe(true);
  });

  it("rejects Weak RS", () => {
    const detection = detectRelativeStrengthIntraday(
      makeContext(
        makeInput(bullLeaderCandles(), {
          stockRelativeStrength: 50,
          sectorRelativeStrength: 70,
          benchmarkRelativeStrength: 60,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) =>
        /relative strength|outperform|benchmark|sector/i.test(w)
      )
    ).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectRelativeStrengthIntraday(
      makeContext(makeInput(bullLeaderCandles()), {
        marketContext: { marketBreadth: makeBreadth(40) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Volume", () => {
    const detection = detectRelativeStrengthIntraday(
      makeContext(
        makeInput(bullLeaderCandles(), {
          relativeVolume: 0.5,
          candles5m: bullLeaderCandles().map((c, i, arr) =>
            i === arr.length - 1 ? { ...c, volume: 20_000 } : c
          ),
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /volume/i.test(w))).toBe(true);
  });

  it("rejects Weak Trend / Sideways", () => {
    const flat = bullLeaderCandles().map((c) => ({
      ...c,
      high: 100.2,
      low: 99.8,
      open: 100.0,
      close: 100.0,
    }));
    const detection = detectRelativeStrengthIntraday(
      makeContext(makeInput(flat, { ema20: 100, ema50: 100, vwap: 100 }), {
        regime: makeRegime("Sideways"),
      })
    );
    expect(detection.detected).toBe(false);
  });

  it("Detector never throws on null context", () => {
    const empty = new RelativeStrengthIntradayDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("Relative Strength Intraday Trade Construction", () => {
  beforeEach(() => {
    resetRelativeStrengthIntradayTradeBuilder();
    resetRelativeStrengthIntradayMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectRelativeStrengthIntraday(context);
    expect(detection.detected).toBe(true);
    const setup = new RelativeStrengthIntradayTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.institutionalScore.conviction).toBeGreaterThan(50);
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
    expect(setup.explainability.summary.length).toBeLessThanOrEqual(5);
    expect(
      setup.explainability.positiveReasons.some((r) =>
        /benchmark|sector|volume|breadth|momentum/i.test(r)
      )
    ).toBe(true);
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectRelativeStrengthIntraday(context);
    const setup = new RelativeStrengthIntradayTradeBuilder({
      minimumRiskReward: 50,
    }).build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.warnings.some((w) => /RR/i.test(w))).toBe(true);
  });

  it("Low Conviction when setup rejected", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectRelativeStrengthIntraday(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new RelativeStrengthIntradayTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
  });
});
