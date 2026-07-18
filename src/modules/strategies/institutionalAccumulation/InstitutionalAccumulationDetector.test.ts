/**
 * Institutional Accumulation Detection & Trade Construction — tests (Sprint 11B.3H).
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
  InstitutionalAccumulationDetector,
  InstitutionalAccumulationTradeBuilder,
  buildInstitutionalAccumulationExplainability,
  detectInstitutionalAccumulation,
  resetInstitutionalAccumulationDetector,
  resetInstitutionalAccumulationMetrics,
  resetInstitutionalAccumulationTradeBuilder,
  type InstitutionalAccumulationCandle,
  type InstitutionalAccumulationDetectionContext,
  type InstitutionalAccumulationStrategyInput,
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
): InstitutionalAccumulationCandle {
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
  regime: MarketRegime["regime"] = "Weak Bull",
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
  const sectors = overrides.sectorStrength ?? makeSectors(58);
  return {
    timestamp: atIST(10, 0),
    marketTrend: overrides.marketTrend ?? "Weak Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(42),
    riskMode: overrides.riskMode ?? "Risk On",
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
      strategyId: "institutional-accumulation",
      name: "Institutional Accumulation",
      category: "Intraday",
      eligible: true,
      priority: 87,
      score: 85,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Strong accumulation: higher lows + high volume close near highs. */
function bullAccumulationCandles(): InstitutionalAccumulationCandle[] {
  return [
    candle(9, 15, 100.0, 100.2, 99.8, 100.1, 80_000),
    candle(9, 20, 100.1, 100.4, 99.8, 100.2, 82_000),
    candle(9, 25, 100.2, 100.6, 100.0, 100.5, 85_000),
    candle(9, 30, 100.5, 100.9, 100.2, 100.8, 88_000),
    candle(9, 35, 100.8, 101.2, 100.5, 101.0, 90_000),
    candle(9, 40, 101.0, 101.4, 100.8, 101.2, 92_000),
    candle(9, 45, 101.2, 101.5, 100.9, 101.3, 88_000),
    candle(9, 50, 101.3, 101.6, 101.0, 101.4, 85_000),
    candle(9, 55, 101.4, 101.8, 101.2, 101.6, 87_000),
    candle(10, 0, 101.75, 102.6, 101.7, 102.45, 160_000),
  ];
}

function bearDistributionCandles(): InstitutionalAccumulationCandle[] {
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

function absorptionCandles(): InstitutionalAccumulationCandle[] {
  const base = bullAccumulationCandles();
  const last = base[base.length - 1]!;
  base[base.length - 1] = {
    ...last,
    open: 102.0,
    high: 102.5,
    low: 101.85,
    close: 102.35,
    volume: 155_000,
  };
  return base;
}

function hiddenBuyingCandles(): InstitutionalAccumulationCandle[] {
  return [
    candle(9, 15, 100.0, 100.15, 99.9, 100.05, 95_000),
    candle(9, 20, 100.05, 100.2, 100.0, 100.12, 98_000),
    candle(9, 25, 100.12, 100.28, 100.05, 100.2, 96_000),
    candle(9, 30, 100.2, 100.35, 100.12, 100.28, 97_000),
    candle(9, 35, 100.28, 100.45, 100.2, 100.38, 99_000),
    candle(9, 40, 100.38, 100.55, 100.3, 100.48, 98_500),
    candle(9, 45, 100.48, 100.65, 100.4, 100.58, 97_500),
    candle(9, 50, 100.58, 100.75, 100.5, 100.68, 98_000),
    candle(9, 55, 100.68, 100.85, 100.6, 100.78, 99_000),
    candle(10, 0, 100.78, 101.6, 100.72, 101.45, 165_000),
  ];
}

function makeInput(
  candles: InstitutionalAccumulationCandle[],
  overrides: Partial<
    InstitutionalAccumulationStrategyInput["institutionalAccumulation"]
  > = {}
): InstitutionalAccumulationStrategyInput {
  const last = candles[candles.length - 1]!;
  const bullish = last.close > 101;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.0,
    institutionalAccumulation: {
      candles5m: candles,
      vwap: overrides.vwap ?? (bullish ? 100.8 : 101.2),
      atr: 1.0,
      ema20: overrides.ema20 ?? (bullish ? 101.2 : 100.6),
      ema50: overrides.ema50 ?? (bullish ? 100.4 : 101.4),
      relativeVolume: 1.35,
      ...overrides,
    },
  };
}

function makeContext(
  input: InstitutionalAccumulationStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: RegimeConfidenceAnalysis;
  } = {}
): InstitutionalAccumulationDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime("Weak Bull", 78),
    confidence: overrides.confidence ?? makeConfidence(78),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 5),
  };
}

describe("Institutional Accumulation Detection", () => {
  beforeEach(() => {
    resetInstitutionalAccumulationDetector();
    resetInstitutionalAccumulationTradeBuilder();
    resetInstitutionalAccumulationMetrics();
  });

  afterEach(() => {
    resetInstitutionalAccumulationDetector();
    resetInstitutionalAccumulationTradeBuilder();
    resetInstitutionalAccumulationMetrics();
  });

  it("detects Strong Accumulation (bull)", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(bullAccumulationCandles()))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.higherLows).toBe(true);
    expect(detection.pattern).not.toBe("none");
    expect(detection.confidence).toBeGreaterThan(50);
  });

  it("detects Institutional Distribution (bear)", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(bearDistributionCandles()), {
        regime: makeRegime("Weak Bear", 78),
        marketContext: {
          marketBreadth: makeBreadth(40),
          sectorStrength: makeSectors(40),
          marketTrend: "Weak Bear",
          volatility: makeVolatility(42, "Expanding"),
        },
      })
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
    expect(
      detection.pattern === "distribution" ||
        detection.pattern === "high_volume_breakout"
    ).toBe(true);
  });

  it("detects absorption pattern path", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(absorptionCandles()))
    );
    expect(detection.pattern).not.toBe("none");
    expect(
      ["absorption", "high_volume_breakout", "hidden_buying"].includes(
        detection.pattern
      )
    ).toBe(true);
  });

  it("detects hidden buying pattern path", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(hiddenBuyingCandles()))
    );
    expect(
      ["hidden_buying", "high_volume_breakout", "volume_dry_up"].includes(
        detection.pattern
      )
    ).toBe(true);
  });

  it("rejects Weak Volume", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(
        makeInput(bullAccumulationCandles(), {
          relativeVolume: 0.5,
          candles5m: bullAccumulationCandles().map((c, i, arr) =>
            i === arr.length - 1 ? { ...c, volume: 20_000 } : c
          ),
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /volume/i.test(w))).toBe(true);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(bullAccumulationCandles()), {
        marketContext: { marketBreadth: makeBreadth(40) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /breadth/i.test(w))).toBe(true);
  });

  it("rejects Weak Sector", () => {
    const detection = detectInstitutionalAccumulation(
      makeContext(makeInput(bullAccumulationCandles()), {
        marketContext: { sectorStrength: makeSectors(45) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /sector/i.test(w))).toBe(true);
  });

  it("Detector never throws on null context", () => {
    const empty = new InstitutionalAccumulationDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("Institutional Accumulation Trade Construction", () => {
  beforeEach(() => {
    resetInstitutionalAccumulationTradeBuilder();
    resetInstitutionalAccumulationMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullAccumulationCandles()));
    const detection = detectInstitutionalAccumulation(context);
    expect(detection.detected).toBe(true);
    const setup = new InstitutionalAccumulationTradeBuilder().build({
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
        /accumulation|volume|demand|sector|breadth/i.test(r)
      )
    ).toBe(true);
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullAccumulationCandles()));
    const detection = detectInstitutionalAccumulation(context);
    const setup = new InstitutionalAccumulationTradeBuilder({
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
    const context = makeContext(makeInput(bullAccumulationCandles()));
    const detection = detectInstitutionalAccumulation(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new InstitutionalAccumulationTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
  });

  it("builds Explainability with institutional examples", () => {
    const context = makeContext(makeInput(bullAccumulationCandles()));
    const detection = detectInstitutionalAccumulation(context);
    const setup = new InstitutionalAccumulationTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    const explain = buildInstitutionalAccumulationExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      accumulationInput: context.input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.length).toBeLessThanOrEqual(5);
    expect(
      explain.positiveReasons.some((r) =>
        /accumulation|volume|demand|sector|breadth/i.test(r)
      )
    ).toBe(true);
  });
});
