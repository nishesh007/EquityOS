/**
 * Sector Rotation Detection & Trade Construction — tests (Sprint 11B.3J).
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
  SectorRotationDetector,
  SectorRotationTradeBuilder,
  detectSectorRotation,
  resetSectorRotationDetector,
  resetSectorRotationMetrics,
  resetSectorRotationTradeBuilder,
  type SectorRotationCandle,
  type SectorRotationDetectionContext,
  type SectorRotationStrategyInput,
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
): SectorRotationCandle {
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
  const sectors = overrides.sectorStrength ?? makeSectors(80);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(70),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(45),
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
      strategyId: "sector-rotation",
      name: "Sector Rotation",
      category: "Intraday",
      eligible: true,
      priority: 87,
      score: 85,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Strong bull: HH/HL with sector rotation leadership. */
function bullLeaderCandles(): SectorRotationCandle[] {
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

function bearLeaderCandles(): SectorRotationCandle[] {
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
  candles: SectorRotationCandle[],
  overrides: Partial<SectorRotationStrategyInput["sectorRotation"]> = {}
): SectorRotationStrategyInput {
  const last = candles[candles.length - 1]!;
  const bullish = last.close > 101;
  return {
    symbol: "INFY",
    lastPrice: last.close,
    atr: 1.0,
    sectorRotation: {
      candles5m: candles,
      vwap: overrides.vwap ?? (bullish ? 100.8 : 101.2),
      atr: 1.0,
      ema20: overrides.ema20 ?? (bullish ? 101.2 : 100.6),
      ema50: overrides.ema50 ?? (bullish ? 100.4 : 101.4),
      relativeVolume: 1.35,
      sectorName: "IT",
      sectorRelativeStrength: bullish ? 80 : 35,
      sectorMomentum: bullish ? 5 : -5,
      sectorBreadth: bullish ? 70 : 35,
      stockRelativeStrength: bullish ? 88 : 30,
      benchmarkRelativeStrength: bullish ? 60 : 55,
      ...overrides,
    },
  };
}

function makeContext(
  input: SectorRotationStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: RegimeConfidenceAnalysis;
  } = {}
): SectorRotationDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime("Strong Bull", 80),
    confidence: overrides.confidence ?? makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 5),
  };
}

describe("Sector Rotation Detection", () => {
  beforeEach(() => {
    resetSectorRotationDetector();
    resetSectorRotationTradeBuilder();
    resetSectorRotationMetrics();
  });

  afterEach(() => {
    resetSectorRotationDetector();
    resetSectorRotationTradeBuilder();
    resetSectorRotationMetrics();
  });

  it("detects Emerging Sector Leader (bull)", () => {
    const detection = detectSectorRotation(
      makeContext(makeInput(bullLeaderCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.sectorName).toBe("IT");
    expect(detection.sectorRelativeStrength).toBe(80);
    expect(detection.stockOutperformsSector).toBe(true);
    expect(detection.sectorOutperformsBenchmark).toBe(true);
    expect(detection.confidence).toBeGreaterThan(50);
    expect([
      "emerging_sector_leader",
      "strengthening_sector",
      "capital_rotation",
      "institutional_sector_buying",
      "sector_breakout",
    ]).toContain(detection.signalKind);
  });

  it("detects Sector Breakdown (bear)", () => {
    const detection = detectSectorRotation(
      makeContext(makeInput(bearLeaderCandles(), {
        sectorRelativeStrength: 35,
        sectorMomentum: -5,
        sectorBreadth: 35,
        stockRelativeStrength: 30,
        benchmarkRelativeStrength: 55,
      }), {
        regime: makeRegime("Weak Bear", 78),
        marketContext: {
          marketBreadth: makeBreadth(35),
          sectorStrength: makeSectors(35),
          marketTrend: "Weak Bear",
          volatility: makeVolatility(42, "Expanding"),
        },
      })
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(["sector_breakdown", "capital_rotation"]).toContain(
      detection.signalKind
    );
  });

  it("detects Strong/Weak Rotation paths", () => {
    const strong = detectSectorRotation(
      makeContext(makeInput(bullLeaderCandles()), {
        regime: makeRegime("Strong Bull", 80),
      })
    );
    expect(strong.detected).toBe(true);
    expect(strong.direction).toBe("BUY");

    const sideways = detectSectorRotation(
      makeContext(makeInput(bullLeaderCandles()), {
        regime: makeRegime("Sideways", 75),
      })
    );
    expect(sideways.detected).toBe(true);
    expect(sideways.direction).toBe("BUY");
  });

  it("rejects Weak Breadth", () => {
    const detection = detectSectorRotation(
      makeContext(
        makeInput(bullLeaderCandles(), { sectorBreadth: 40 }),
        { marketContext: { marketBreadth: makeBreadth(40) } }
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak RS", () => {
    const detection = detectSectorRotation(
      makeContext(
        makeInput(bullLeaderCandles(), {
          sectorRelativeStrength: 50,
          stockRelativeStrength: 52,
          benchmarkRelativeStrength: 60,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) =>
        /sector|outperform|benchmark|stock vs sector/i.test(w)
      )
    ).toBe(true);
  });

  it("Detector never throws on null context", () => {
    const empty = new SectorRotationDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("Sector Rotation Trade Construction", () => {
  beforeEach(() => {
    resetSectorRotationTradeBuilder();
    resetSectorRotationMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectSectorRotation(context);
    expect(detection.detected).toBe(true);
    const setup = new SectorRotationTradeBuilder().build({
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
        /sector|capital|benchmark|breadth|momentum/i.test(r)
      )
    ).toBe(true);
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectSectorRotation(context);
    const setup = new SectorRotationTradeBuilder({
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
    const detection = detectSectorRotation(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new SectorRotationTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
  });

  it("Explainability includes sprint examples", () => {
    const context = makeContext(makeInput(bullLeaderCandles()));
    const detection = detectSectorRotation(context);
    const setup = new SectorRotationTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    const combined = [
      ...setup.explainability.summary,
      ...setup.explainability.positiveReasons,
    ].join(" ");
    expect(/strongest performer|capital rotating|outperforming|breadth|regime/i.test(combined)).toBe(
      true
    );
  });
});
