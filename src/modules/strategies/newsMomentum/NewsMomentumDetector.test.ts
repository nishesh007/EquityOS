/**
 * News Momentum Detection & Trade Construction — tests (Sprint 11B.3K).
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
  NewsMomentumDetector,
  NewsMomentumTradeBuilder,
  classifyNewsCatalyst,
  detectNewsMomentum,
  resetNewsMomentumDetector,
  resetNewsMomentumMetrics,
  resetNewsMomentumTradeBuilder,
  scoreNewsQuality,
  type NewsCatalystEvent,
  type NewsMomentumCandle,
  type NewsMomentumDetectionContext,
  type NewsMomentumStrategyInput,
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
): NewsMomentumCandle {
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
  score = 50,
  trend: VolatilityAnalysis["trend"] = "Expanding"
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
  regime: MarketRegime["regime"] = "High Volatility",
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
    volatility: overrides.volatility ?? makeVolatility(50),
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
      strategyId: "news-momentum",
      name: "News Momentum",
      category: "Intraday",
      eligible: true,
      priority: 88,
      score: 85,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function bullNewsCandles(): NewsMomentumCandle[] {
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

function newsEvent(
  overrides: Partial<NewsCatalystEvent> = {}
): NewsCatalystEvent {
  const ts = atIST(10, 0);
  return {
    id: "news-1",
    headline: "Company beats earnings estimates",
    catalystType: "earnings_beat",
    source: "earnings",
    publishedAt: new Date(ts.getTime() - 15 * 60_000),
    credibility: 85,
    impact: 80,
    marketRelevance: 85,
    ...overrides,
  };
}

function makeInput(
  candles: NewsMomentumCandle[],
  newsEvents: NewsCatalystEvent[],
  overrides: Partial<NewsMomentumStrategyInput["newsMomentum"]> = {}
): NewsMomentumStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "INFY",
    lastPrice: last.close,
    atr: 1.0,
    newsMomentum: {
      candles5m: candles,
      vwap: overrides.vwap ?? 100.8,
      atr: 1.0,
      ema20: overrides.ema20 ?? 101.2,
      ema50: overrides.ema50 ?? 100.4,
      relativeVolume: overrides.relativeVolume ?? 1.55,
      newsEvents,
      gapPercent: 1.2,
      ...overrides,
    },
  };
}

function makeContext(
  input: NewsMomentumStrategyInput,
  overrides: {
    marketContext?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
    confidence?: RegimeConfidenceAnalysis;
  } = {}
): NewsMomentumDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.marketContext),
    regime: overrides.regime ?? makeRegime("High Volatility", 80),
    confidence: overrides.confidence ?? makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 5),
  };
}

describe("News Momentum Detection", () => {
  beforeEach(() => {
    resetNewsMomentumDetector();
    resetNewsMomentumTradeBuilder();
    resetNewsMomentumMetrics();
  });

  afterEach(() => {
    resetNewsMomentumDetector();
    resetNewsMomentumTradeBuilder();
    resetNewsMomentumMetrics();
  });

  it("detects Strong Earnings Beat", () => {
    const detection = detectNewsMomentum(
      makeContext(makeInput(bullNewsCandles(), [newsEvent()]))
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.catalystType).toBe("earnings_beat");
    expect(detection.confidence).toBeGreaterThanOrEqual(60);
    expect(detection.priceConfirmed).toBe(true);
    expect(detection.volumeConfirmed).toBe(true);
  });

  it("detects Large Order Win", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({
            catalystType: "large_order_win",
            headline: "Major government order win",
            impact: 85,
          }),
        ])
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.catalystType).toBe("large_order_win");
  });

  it("detects Promoter Buying", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({
            catalystType: "promoter_buying",
            headline: "Promoter increases stake",
          }),
        ])
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
  });

  it("detects Rating Upgrade", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({
            catalystType: "rating_upgrade",
            headline: "Broker upgrades to Buy",
            source: "analyst",
          }),
        ])
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
  });

  it("rejects Weak News", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({
            credibility: 40,
            impact: 30,
            marketRelevance: 35,
          }),
        ])
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.warnings.some((w) =>
        /quality|credibility|eligible/i.test(w)
      )
    ).toBe(true);
  });

  it("rejects Duplicate News", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({ isDuplicate: true }),
        ])
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /duplicate/i.test(w))).toBe(true);
  });

  it("rejects Rumor", () => {
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(bullNewsCandles(), [
          newsEvent({ isRumor: true, source: "rumor" }),
        ])
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /rumor/i.test(w))).toBe(true);
  });

  it("rejects Weak Volume", () => {
    const lowVolCandles = bullNewsCandles().map((c, i, arr) =>
      i === arr.length - 1
        ? { ...c, volume: 50_000, close: c.open - 0.2, open: c.open + 0.1 }
        : c
    );
    const detection = detectNewsMomentum(
      makeContext(
        makeInput(lowVolCandles, [newsEvent()], { relativeVolume: 0.8 })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.some((w) => /volume/i.test(w))).toBe(true);
  });

  it("classifies news quality grades", () => {
    const high = classifyNewsCatalyst(newsEvent(), undefined, atIST(10, 5));
    expect(["High", "Very High"]).toContain(high);
    const weak = classifyNewsCatalyst(
      newsEvent({ credibility: 30, impact: 20, marketRelevance: 20 }),
      undefined,
      atIST(10, 5)
    );
    expect(["Low", "Ignore"]).toContain(weak);
    expect(scoreNewsQuality(newsEvent(), undefined, atIST(10, 5))).toBeGreaterThan(
      50
    );
  });

  it("Detector never throws on null context", () => {
    const empty = new NewsMomentumDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});

describe("News Momentum Trade Construction", () => {
  beforeEach(() => {
    resetNewsMomentumTradeBuilder();
    resetNewsMomentumMetrics();
  });

  it("builds High Conviction bullish setup", () => {
    const context = makeContext(makeInput(bullNewsCandles(), [newsEvent()]));
    const detection = detectNewsMomentum(context);
    expect(detection.detected).toBe(true);
    const setup = new NewsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.catalystType).toBe("earnings_beat");
    expect(setup.catalystStrength).toBeGreaterThan(0);
    expect(setup.institutionalScore.conviction).toBeGreaterThan(50);
    expect(setup.explainability.summary.length).toBeGreaterThan(0);
  });

  it("rejects Poor RR", () => {
    const context = makeContext(makeInput(bullNewsCandles(), [newsEvent()]));
    const detection = detectNewsMomentum(context);
    const setup = new NewsMomentumTradeBuilder({
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
    const context = makeContext(makeInput(bullNewsCandles(), [newsEvent()]));
    const detection = detectNewsMomentum(context);
    detection.detected = false;
    detection.direction = "NONE";
    const setup = new NewsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.institutionalScore.conviction).toBeLessThan(70);
  });

  it("Explainability includes sprint examples", () => {
    const context = makeContext(makeInput(bullNewsCandles(), [newsEvent()]));
    const detection = detectNewsMomentum(context);
    const setup = new NewsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    const combined = [
      ...setup.explainability.summary,
      ...setup.explainability.positiveReasons,
    ].join(" ");
    expect(
      /earnings surprise|Institutional volume|Price confirms|Sector also|Momentum supported/i.test(
        combined
      )
    ).toBe(true);
  });

  it("Signal Grade assigned for valid setup", () => {
    const context = makeContext(makeInput(bullNewsCandles(), [newsEvent()]));
    const detection = detectNewsMomentum(context);
    const setup = new NewsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
    });
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(
      setup.institutionalScore.signalGrade
    );
  });
});
