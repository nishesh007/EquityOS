/**
 * EMA Pullback Detection & Trade Construction — tests (Sprint 11B.3P).
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
  EMAPullbackDetector,
  EMAPullbackTradeBuilder,
  buildEMAPullbackExplainability,
  detectEMAPullback,
  getEMAPullbackMetrics,
  resetEMAPullbackDetector,
  resetEMAPullbackMetrics,
  resetEMAPullbackTradeBuilder,
  type EMAPullbackCandle,
  type EMAPullbackDetectionContext,
  type EMAPullbackStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function bar(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): EMAPullbackCandle {
  return {
    timestamp: atIST(10, 0, dayOffset),
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

function makeVolatility(score = 40): VolatilityAnalysis {
  return {
    score,
    regime: score >= 60 ? "High" : "Normal",
    trend: "Contracting",
    indiaVix: 12,
    atr: 1.5,
    historicalVolatility: 12,
    realizedVolatility: 11,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Contracting",
    vixMomentum: -1,
    atrExpansion: false,
    atrCompression: true,
    relativeVolatility: 0.8,
    volatilityExpansion: false,
    volatilityCompression: true,
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
  const sectors = overrides.sectorStrength ?? makeSectors(70);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(65),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(40),
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
      strategyId: "ema-pullback",
      name: "EMA Pullback",
      category: "Swing",
      eligible: true,
      priority: 57,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Uptrend daily + 5m sequence ending in EMA20 touch + bullish confirmation. */
function buildBullPullbackCandles(touch: "ema20" | "ema50" | "vwap"): {
  daily: EMAPullbackCandle[];
  fiveMin: EMAPullbackCandle[];
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  vwap: number;
  ema20Series: number[];
} {
  const daily: EMAPullbackCandle[] = [];
  let close = 100;
  for (let i = 0; i < 35; i += 1) {
    const open = close;
    close = close * 1.008;
    daily.push(bar(i, open, close * 1.003, open * 0.997, close, 1_200_000));
  }
  const lastClose = close;
  const ema200 = lastClose * 0.9;
  const ema100 = lastClose * 0.94;
  let ema20 = lastClose * 0.995;
  let ema50 = lastClose * 0.97;
  let vwap = lastClose * 0.998;
  if (touch === "ema20") {
    ema20 = lastClose * 0.992;
    vwap = lastClose * 0.998;
    ema50 = lastClose * 0.97;
  } else if (touch === "ema50") {
    ema50 = lastClose * 0.988;
    ema20 = lastClose * 0.996;
    vwap = lastClose * 0.998;
  } else {
    vwap = lastClose * 0.992;
    ema20 = lastClose * 0.996;
    ema50 = lastClose * 0.97;
  }

  const touchLevel =
    touch === "ema20" ? ema20 : touch === "ema50" ? ema50 : vwap;

  // Tight 5m trend near highs, then shallow pullback to touch level.
  const fiveMin: EMAPullbackCandle[] = [];
  let p = lastClose * 0.985;
  for (let i = 0; i < 10; i += 1) {
    const open = p;
    p = p * 1.0015;
    fiveMin.push(
      bar(35, open, p * 1.001, open * 0.999, p, 900_000 + i * 1000)
    );
  }
  const impulse = fiveMin[fiveMin.length - 1]!.close;
  // Controlled pullback bars (low volume)
  fiveMin.push(
    bar(35, impulse, impulse * 1.001, impulse * 0.998, impulse * 0.999, 600_000)
  );
  fiveMin.push(
    bar(
      35,
      impulse * 0.999,
      impulse * 0.9995,
      touchLevel * 0.9998,
      touchLevel * 1.0002,
      550_000
    )
  );
  // Bullish confirmation
  fiveMin.push(
    bar(
      35,
      touchLevel * 1.0002,
      impulse * 1.002,
      touchLevel * 0.9999,
      impulse * 1.0015,
      1_300_000
    )
  );

  const ema20Series = Array.from(
    { length: 8 },
    (_, i) => ema20 * (0.992 + i * 0.0015)
  );

  return {
    daily,
    fiveMin,
    ema20,
    ema50,
    ema100,
    ema200,
    vwap,
    ema20Series,
  };
}

function makeBullInput(
  touch: "ema20" | "ema50" | "vwap" = "ema20",
  overrides: Partial<EMAPullbackStrategyInput["emaPullback"]> = {}
): EMAPullbackStrategyInput {
  const built = buildBullPullbackCandles(touch);
  const last = built.fiveMin[built.fiveMin.length - 1]!;
  return {
    symbol: "PULL",
    lastPrice: last.close,
    emaPullback: {
      candlesDaily: built.daily,
      candles5m: built.fiveMin,
      vwap: built.vwap,
      atr: last.close * 0.03,
      ema9: last.close * 0.99,
      ema20: built.ema20,
      ema50: built.ema50,
      ema100: built.ema100,
      ema200: built.ema200,
      ema20Series: built.ema20Series,
      relativeVolume: 1.3,
      averageVolume20d: 900_000,
      rsi: 55,
      adx: 28,
      relativeStrength: 65,
      newsDriven: false,
      ...overrides,
    },
  };
}

function makeContext(
  input: EMAPullbackStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {},
  regime: MarketRegime["regime"] = "Strong Bull"
): EMAPullbackDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime(regime, 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 35),
  };
}

describe("EMA Pullback Detector", () => {
  beforeEach(() => {
    resetEMAPullbackDetector();
    resetEMAPullbackTradeBuilder();
    resetEMAPullbackMetrics();
  });

  afterEach(() => {
    resetEMAPullbackDetector();
    resetEMAPullbackTradeBuilder();
    resetEMAPullbackMetrics();
  });

  it("detects EMA20 Pullback", () => {
    const detection = detectEMAPullback(makeContext(makeBullInput("ema20")));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.pullbackType).toBe("ema20");
  });

  it("detects EMA50 Pullback", () => {
    const detection = detectEMAPullback(makeContext(makeBullInput("ema50")));
    expect(detection.detected).toBe(true);
    expect(detection.pullbackType).toBe("ema50");
  });

  it("detects VWAP Pullback", () => {
    const detection = detectEMAPullback(makeContext(makeBullInput("vwap")));
    expect(detection.detected).toBe(true);
    expect(detection.pullbackType).toBe("vwap");
  });

  it("rejects Deep Correction", () => {
    const detection = detectEMAPullback(
      makeContext(
        makeBullInput("ema20", {
          atr: 0.5,
          candles5m: (() => {
            const input = makeBullInput("ema20");
            const candles = [...(input.emaPullback.candles5m ?? [])];
            const peak = candles[candles.length - 4]!;
            candles[candles.length - 2] = bar(
              35,
              peak.close,
              peak.close,
              peak.close * 0.5,
              peak.close * 0.55,
              900_000
            );
            return candles;
          })(),
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.warnings.join(" ") + detection.reasons.join(" ")).toMatch(
      /deep/i
    );
  });

  it("rejects Trend Reversal / broken stack", () => {
    const detection = detectEMAPullback(
      makeContext(
        makeBullInput("ema20", {
          ema20: 100,
          ema50: 110,
          ema100: 120,
          ema200: 130,
          ema20Series: [130, 125, 120, 115, 110, 105, 100, 95],
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/trend|structure|reversal/i);
  });

  it("rejects Weak Volume", () => {
    const detection = detectEMAPullback(
      makeContext(
        makeBullInput("ema20", {
          relativeVolume: 0.4,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak volume/i);
  });

  it("rejects Weak Sector", () => {
    const detection = detectEMAPullback(
      makeContext(makeBullInput("ema20"), {
        sectorStrength: makeSectors(30),
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectEMAPullback(
      makeContext(makeBullInput("ema20"), {
        marketBreadth: makeBreadth(30),
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("builds High Conviction trade", () => {
    const input = makeBullInput("ema20");
    const context = makeContext(input);
    const detection = new EMAPullbackDetector().detect(context);
    const setup = new EMAPullbackTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2);
    expect(setup.conviction).toBeGreaterThanOrEqual(55);
    expect(setup.signalGrade).toBeTruthy();
  });

  it("produces Low Conviction on marginal inputs", () => {
    const input = makeBullInput("ema20", {
      relativeVolume: 0.9,
      adx: 20,
      relativeStrength: 52,
    });
    const context = makeContext(input, {
      marketBreadth: makeBreadth(53),
      sectorStrength: makeSectors(53),
      marketStrength: 55,
      confidence: 70,
    });
    const detection = detectEMAPullback(context);
    expect(detection.detected).toBe(true);
    const setup = new EMAPullbackTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.conviction).toBeLessThan(95);
  });

  it("generates Explainability and Signal Grade", () => {
    const input = makeBullInput("ema20");
    const context = makeContext(input);
    const detection = detectEMAPullback(context);
    const setup = new EMAPullbackTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildEMAPullbackExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      epInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/EMA|trend|pullback|sector/i);
    expect(setup.signalGrade).toMatch(/A\+|A|B\+|B|C|D|F/);
  });

  it("tracks Metrics", () => {
    resetEMAPullbackMetrics();
    const input = makeBullInput("ema20");
    const context = makeContext(input);
    const detection = detectEMAPullback(context);
    new EMAPullbackTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getEMAPullbackMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new EMAPullbackDetector().detect(null);
    expect(empty.detected).toBe(false);
    expect(empty.warnings.length + empty.reasons.length).toBeGreaterThan(0);
  });
});
