/**
 * Darvas Box Detection & Trade Construction — tests (Sprint 11B.3N).
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
  DarvasBoxDetector,
  DarvasBoxTradeBuilder,
  buildDarvasBoxExplainability,
  detectBoxOnly,
  detectDarvasBox,
  getDarvasBoxMetrics,
  resetDarvasBoxDetector,
  resetDarvasBoxMetrics,
  resetDarvasBoxTradeBuilder,
  type DarvasBoxCandle,
  type DarvasBoxDetectionContext,
  type DarvasBoxStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function daily(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): DarvasBoxCandle {
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
      strategyId: "darvas",
      name: "Darvas",
      category: "Swing",
      eligible: true,
      priority: 56,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Build uptrend lead-in + Darvas box + optional breakout. */
function buildDarvasCandles(options: {
  boxSessions?: number;
  breakout?: boolean;
  falseBreakout?: boolean;
  weakVolume?: boolean;
  lateExtension?: boolean;
  wideBox?: boolean;
}): DarvasBoxCandle[] {
  const boxSessions = options.boxSessions ?? 12;
  const candles: DarvasBoxCandle[] = [];
  let day = 0;
  const boxHigh = 110;
  const boxLow = options.wideBox ? 90 : 104;

  // Lead-in uptrend (stay below box floor)
  for (let i = 0; i < 30; i++) {
    const p = 85 + i * 0.45;
    candles.push(daily(day++, p, p + 1.0, p - 0.3, p + 0.6, 150_000));
  }

  // Box: multiple touches of high/low, declining volume, failed wicks
  for (let i = 0; i < boxSessions; i++) {
    const mid = boxLow + (boxHigh - boxLow) * (0.4 + (i % 3) * 0.08);
    const vol = 200_000 - i * 8_000;
    let high = mid + 1.2;
    let low = mid - 1.2;
    let close = mid;
    if (i % 3 === 0) {
      high = boxHigh;
      close = boxHigh - 0.35;
      low = Math.max(boxLow + 0.5, close - 1.5);
    } else if (i % 3 === 1) {
      low = boxLow;
      close = boxLow + 0.4;
      high = Math.min(boxHigh - 0.5, close + 1.5);
    } else {
      high = Math.min(boxHigh - 0.3, mid + 1.5);
      low = Math.max(boxLow + 0.3, mid - 1.5);
      close = mid;
    }
    // Failed breakout wick (close back inside)
    if (i === Math.floor(boxSessions / 2)) {
      high = boxHigh + 0.35;
      close = boxHigh - 0.4;
      low = boxHigh - 2;
    }
    candles.push(
      daily(
        day++,
        mid,
        high,
        low,
        close,
        Math.max(vol, 80_000)
      )
    );
  }

  if (options.breakout || options.falseBreakout || options.lateExtension) {
    let close = boxHigh + 0.9;
    let high = close + 0.4;
    let low = boxHigh - 0.2;
    let volume = options.weakVolume ? 50_000 : 320_000;
    if (options.falseBreakout) {
      close = boxHigh - 0.2;
      high = boxHigh + 0.6;
      low = boxHigh - 1;
      volume = 320_000;
    }
    if (options.lateExtension) {
      close = boxHigh * 1.07;
      high = close + 0.2;
      low = close - 0.3;
      volume = 320_000;
    }
    candles.push(daily(day++, boxHigh, high, low, close, volume));
  }

  return candles;
}

function makeInput(
  candles: DarvasBoxCandle[],
  overrides: Partial<DarvasBoxStrategyInput["darvasBox"]> = {}
): DarvasBoxStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "INFY",
    lastPrice: last.close,
    atr: 1.5,
    darvasBox: {
      candlesDaily: candles,
      vwap: overrides.vwap ?? last.close - 1,
      atr: overrides.atr ?? 1.5,
      ema20: overrides.ema20 ?? last.close - 0.5,
      ema50: overrides.ema50 ?? last.close - 2,
      ema150: overrides.ema150 ?? last.close - 8,
      ema200: overrides.ema200 ?? last.close - 12,
      relativeVolume: overrides.relativeVolume ?? 1.6,
      averageVolume20d: overrides.averageVolume20d ?? 140_000,
      fiftyTwoWeekHigh: last.close + 5,
      relativeStrength: overrides.relativeStrength ?? 70,
      ...overrides,
    },
  };
}

function makeContext(
  input: DarvasBoxStrategyInput,
  overrides: {
    market?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
  } = {}
): DarvasBoxDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(overrides.market),
    regime: overrides.regime ?? makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

beforeEach(() => {
  resetDarvasBoxDetector();
  resetDarvasBoxTradeBuilder();
  resetDarvasBoxMetrics();
});

afterEach(() => {
  resetDarvasBoxDetector();
  resetDarvasBoxTradeBuilder();
  resetDarvasBoxMetrics();
});

describe("Darvas Box Detection", () => {
  it("detects a valid Darvas Box", () => {
    const candles = buildDarvasCandles({ boxSessions: 12 });
    const box = detectBoxOnly(candles);
    expect(box).not.toBeNull();
    expect(box!.boxDuration).toBeGreaterThanOrEqual(5);
    expect(box!.resistanceTouches).toBeGreaterThanOrEqual(2);
    expect(box!.supportTouches).toBeGreaterThanOrEqual(2);
  });

  it("rejects invalid / wide box", () => {
    const candles = buildDarvasCandles({ boxSessions: 10, wideBox: true });
    const box = detectBoxOnly(candles, { maxBoxWidthPct: 0.08 });
    expect(box).toBeNull();
  });

  it("detects short box (>= min sessions)", () => {
    const candles = buildDarvasCandles({ boxSessions: 6 });
    const box = detectBoxOnly(candles);
    expect(box).not.toBeNull();
    expect(box!.boxDuration).toBeGreaterThanOrEqual(5);
  });

  it("detects long box", () => {
    const candles = buildDarvasCandles({ boxSessions: 28 });
    const box = detectBoxOnly(candles);
    expect(box).not.toBeNull();
    expect(box!.boxDuration).toBeGreaterThanOrEqual(5);
  });

  it("detects successful breakout BUY", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const detection = detectDarvasBox(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.breakoutConfirmed).toBe(true);
  });

  it("rejects false breakout", () => {
    const candles = buildDarvasCandles({
      boxSessions: 12,
      falseBreakout: true,
    });
    const detection = detectDarvasBox(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
  });

  it("rejects weak volume breakout", () => {
    const candles = buildDarvasCandles({
      boxSessions: 12,
      breakout: true,
      weakVolume: true,
    });
    const detection = detectDarvasBox(
      makeContext(
        makeInput(candles, {
          relativeVolume: 0.6,
          averageVolume20d: 150_000,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/volume/i);
  });

  it("rejects weak relative strength", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const detection = detectDarvasBox(
      makeContext(makeInput(candles, { relativeStrength: 30 }))
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/Relative Strength|RS/i);
  });

  it("rejects weak sector", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const detection = detectDarvasBox(
      makeContext(makeInput(candles), {
        market: { sectorStrength: makeSectors(20), marketStrength: 20 },
      })
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects weak breadth", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const detection = detectDarvasBox(
      makeContext(makeInput(candles), {
        market: { marketBreadth: makeBreadth(20) },
      })
    );
    expect(detection.detected).toBe(false);
  });

  it("detector class wraps detectDarvasBox", () => {
    const detector = new DarvasBoxDetector();
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const detection = detector.detect(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
  });
});

describe("Darvas Box Trade Construction", () => {
  it("builds high conviction trade on successful breakout", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectDarvasBox(context);
    const setup = new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.boxHigh).toBeGreaterThan(setup.boxLow);
    expect(setup.conviction).toBeGreaterThan(55);
    expect(setup.positiveReasons.length).toBeGreaterThan(0);
  });

  it("supports retest entry mode", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectDarvasBox(context);
    const setup = new DarvasBoxTradeBuilder({
      entryMode: "retest_box_high",
    }).build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    if (setup.entry > 0) {
      expect(setup.entry).toBeCloseTo(detection.boxHigh, 1);
    }
  });

  it("low conviction when detection fails", () => {
    const candles = buildDarvasCandles({
      boxSessions: 12,
      breakout: true,
      weakVolume: true,
    });
    const input = makeInput(candles, { relativeVolume: 0.5 });
    const context = makeContext(input);
    const detection = detectDarvasBox(context);
    const setup = new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.conviction).toBeLessThan(50);
  });

  it("explainability includes Darvas reasons", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectDarvasBox(context);
    const setup = new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildDarvasBoxExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      dbInput: input,
      institutionalScore: setup.institutionalScore,
    });
    const blob = [
      ...explain.summary,
      ...explain.positiveReasons,
      ...detection.reasons,
    ].join(" ");
    expect(blob).toMatch(/Darvas Box|resistance|volume|Relative Strength/i);
  });

  it("records metrics", () => {
    const candles = buildDarvasCandles({ boxSessions: 12, breakout: true });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectDarvasBox(context);
    new DarvasBoxTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getDarvasBoxMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThan(0);
    expect(snap.boxesCreated).toBeGreaterThan(0);
  });
});
