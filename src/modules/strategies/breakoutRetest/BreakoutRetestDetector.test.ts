/**
 * Breakout Retest Detection & Trade Construction — tests (Sprint 11B.3I).
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
  BreakoutRetestDetector,
  BreakoutRetestTradeBuilder,
  buildBreakoutRetestExplainability,
  detectBreakoutRetest,
  resetBreakoutRetestDetector,
  resetBreakoutRetestMetrics,
  resetBreakoutRetestTradeBuilder,
  type BreakoutRetestCandle,
  type BreakoutRetestDetectionContext,
  type BreakoutRetestStrategyInput,
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
): BreakoutRetestCandle {
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
  confidence = 78
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
  const sectors = overrides.sectorStrength ?? makeSectors(60);
  return {
    timestamp: atIST(10, 0),
    marketTrend: overrides.marketTrend ?? "Strong Bull",
    marketStrength: 75,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(58),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(45, "Stable"),
    riskMode: overrides.riskMode ?? "Risk On",
    confidence: 80,
    healthScore: 75,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "breakout-retest",
      name: "Breakout Retest",
      category: "Intraday",
      eligible: true,
      priority: 88,
      score: 86,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

const RESISTANCE = 101.5;
const SUPPORT = 99.5;

/** Build resistance, breakout with volume, shallow retest, confirmation close above. */
function bullBreakoutRetestCandles(): BreakoutRetestCandle[] {
  return [
    candle(9, 15, 100.0, 100.6, 99.9, 100.4, 80_000),
    candle(9, 20, 100.4, 100.8, 100.1, 100.6, 82_000),
    candle(9, 25, 100.6, 101.0, 100.3, 100.8, 84_000),
    candle(9, 30, 100.8, 101.2, 100.5, 101.0, 85_000),
    candle(9, 35, 101.0, 101.4, 100.7, 101.2, 86_000),
    candle(9, 40, 101.2, 101.45, 100.9, 101.3, 87_000),
    candle(9, 45, 101.3, 101.48, 101.0, 101.35, 88_000),
    candle(9, 50, 101.35, 101.49, 101.05, 101.4, 89_000),
    candle(9, 55, 101.2, 102.2, 101.1, 102.0, 160_000),
    candle(10, 0, 101.95, 102.05, 101.42, 101.65, 70_000),
    candle(10, 5, 101.68, 102.3, 101.62, 102.15, 95_000),
  ];
}

function bearBreakdownRetestCandles(): BreakoutRetestCandle[] {
  return [
    candle(9, 15, 101.0, 101.2, 100.6, 100.8, 90_000),
    candle(9, 20, 100.8, 101.0, 100.4, 100.6, 92_000),
    candle(9, 25, 100.6, 100.8, 100.1, 100.3, 94_000),
    candle(9, 30, 100.3, 100.5, 99.9, 100.1, 96_000),
    candle(9, 35, 100.1, 100.3, 99.7, 99.9, 98_000),
    candle(9, 40, 99.9, 100.1, 99.55, 99.7, 100_000),
    candle(9, 45, 99.7, 99.85, 99.52, 99.6, 102_000),
    candle(9, 50, 99.6, 99.75, 99.53, 99.58, 103_000),
    candle(9, 55, 99.55, 99.6, 98.8, 99.0, 165_000),
    candle(10, 0, 99.05, 99.55, 99.48, 99.35, 72_000),
    candle(10, 5, 99.32, 99.4, 98.55, 98.65, 98_000),
  ];
}

function falseBreakoutCandles(): BreakoutRetestCandle[] {
  const base = bullBreakoutRetestCandles();
  base[base.length - 1] = {
    ...base[base.length - 1]!,
    open: 101.5,
    high: 101.7,
    low: 101.2,
    close: 101.25,
    volume: 90_000,
  };
  return base;
}

function failedRetestCandles(): BreakoutRetestCandle[] {
  const base = bullBreakoutRetestCandles();
  base[base.length - 2] = {
    ...base[base.length - 2]!,
    open: 101.9,
    high: 102.0,
    low: 100.8,
    close: 100.95,
    volume: 65_000,
  };
  base[base.length - 1] = {
    ...base[base.length - 1]!,
    open: 100.95,
    high: 101.2,
    low: 100.7,
    close: 100.85,
    volume: 80_000,
  };
  return base;
}

function makeInput(
  candles: BreakoutRetestCandle[],
  overrides: Partial<BreakoutRetestStrategyInput["breakoutRetest"]> = {}
): BreakoutRetestStrategyInput {
  const last = candles[candles.length - 1]!;
  const bullish = last.close > 101;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.0,
    breakoutRetest: {
      candles5m: candles,
      vwap: overrides.vwap ?? (bullish ? 101.0 : 100.2),
      atr: 1.0,
      ema20: overrides.ema20 ?? (bullish ? 101.2 : 100.0),
      ema50: overrides.ema50 ?? (bullish ? 100.5 : 100.8),
      relativeVolume: 1.35,
      resistanceLevels: [RESISTANCE],
      supportLevels: [SUPPORT],
      ...overrides,
    },
  };
}

function makeContext(
  input: BreakoutRetestStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: RegimeConfidenceAnalysis;
  } = {}
): BreakoutRetestDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime("Strong Bull", 78),
    confidence: overrides.confidence ?? makeConfidence(78),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 10),
  };
}

describe("Breakout Retest Detection", () => {
  beforeEach(() => {
    resetBreakoutRetestDetector();
    resetBreakoutRetestTradeBuilder();
    resetBreakoutRetestMetrics();
  });

  afterEach(() => {
    resetBreakoutRetestDetector();
    resetBreakoutRetestTradeBuilder();
    resetBreakoutRetestMetrics();
  });

  it("detects Successful Breakout Retest (BUY)", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(bullBreakoutRetestCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.retestHeld).toBe(true);
    expect(detection.continuationConfirmed).toBe(true);
    expect(detection.confidence).toBeGreaterThan(50);
  });

  it("detects Support Breakdown Retest (SELL)", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(bearBreakdownRetestCandles()), {
        regime: makeRegime("Strong Bear", 78),
        marketContext: {
          marketBreadth: makeBreadth(40),
          sectorStrength: makeSectors(40),
          marketTrend: "Strong Bear",
          volatility: makeVolatility(45, "Stable"),
        },
      })
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(detection.retestHeld).toBe(true);
  });

  it("rejects False Breakout", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(falseBreakoutCandles()))
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) =>
        /confirmation|false|retest|breakout/i.test(w)
      )
    ).toBe(true);
  });

  it("rejects Failed Retest", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(failedRetestCandles()))
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) =>
        /retest|retracement|confirmation|deep/i.test(w)
      )
    ).toBe(true);
  });

  it("rejects Weak Volume", () => {
    const detection = detectBreakoutRetest(
      makeContext(
        makeInput(bullBreakoutRetestCandles(), {
          relativeVolume: 0.5,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /volume|RVOL/i.test(w))).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(bullBreakoutRetestCandles()), {
        marketContext: { marketBreadth: makeBreadth(40) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Sector", () => {
    const detection = detectBreakoutRetest(
      makeContext(makeInput(bullBreakoutRetestCandles()), {
        marketContext: { sectorStrength: makeSectors(45) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /sector/i.test(w))).toBe(true);
  });

  it("Detector never throws on null context", () => {
    const empty = new BreakoutRetestDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("Breakout Retest Trade Construction", () => {
  beforeEach(() => {
    resetBreakoutRetestTradeBuilder();
    resetBreakoutRetestMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullBreakoutRetestCandles()));
    const detection = detectBreakoutRetest(context);
    expect(detection.detected).toBe(true);
    const setup = new BreakoutRetestTradeBuilder().build({
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
        /resistance|retest|volume|breadth|sector|institutional/i.test(r)
      )
    ).toBe(true);
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullBreakoutRetestCandles()));
    const detection = detectBreakoutRetest(context);
    const setup = new BreakoutRetestTradeBuilder({
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
    const context = makeContext(makeInput(bullBreakoutRetestCandles()));
    const detection = detectBreakoutRetest(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new BreakoutRetestTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
  });

  it("builds Explainability with breakout retest examples", () => {
    const context = makeContext(makeInput(bullBreakoutRetestCandles()));
    const detection = detectBreakoutRetest(context);
    const setup = new BreakoutRetestTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    const explain = buildBreakoutRetestExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      retestInput: context.input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.length).toBeLessThanOrEqual(5);
    const allText = [
      ...explain.positiveReasons,
      ...explain.summary,
    ].join(" ");
    expect(
      /Resistance converted into support|Retest held with declining volume|Institutional buying resumed|Market breadth confirms breakout|Sector leadership remains intact/i.test(
        allText
      )
    ).toBe(true);
  });
});
