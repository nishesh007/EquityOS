/**
 * Cup & Handle Detection & Trade Construction — tests (Sprint 11B.3Q).
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
  CupHandleDetector,
  CupHandleTradeBuilder,
  buildCupHandleExplainability,
  detectCupHandle,
  getCupHandleMetrics,
  resetCupHandleDetector,
  resetCupHandleMetrics,
  resetCupHandleTradeBuilder,
  type CupHandleCandle,
  type CupHandleDetectionContext,
  type CupHandleStrategyInput,
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
): CupHandleCandle {
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

function makeVolatility(score = 35): VolatilityAnalysis {
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
    volatility: overrides.volatility ?? makeVolatility(35),
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
      strategyId: "cup-and-handle",
      name: "Cup & Handle",
      category: "Swing",
      eligible: true,
      priority: 55,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Ideal rounded cup (~20% depth) + declining-volume handle + breakout. */
function buildIdealCupHandle(options?: {
  cupDepthPct?: number;
  vShaped?: boolean;
  deepHandle?: boolean;
  weakBreakoutVolume?: boolean;
  noBreakout?: boolean;
  lateBreakout?: boolean;
}): CupHandleCandle[] {
  const depthPct = options?.cupDepthPct ?? 0.2;
  const out: CupHandleCandle[] = [];
  let day = 0;
  let px = 80;
  // Lead-in uptrend to left peak ~100
  for (let i = 0; i < 15; i += 1) {
    const open = px;
    px = px * 1.015;
    out.push(bar(day++, open, px * 1.004, open * 0.996, px, 1_200_000));
  }
  const leftPeak = px;

  if (options?.vShaped) {
    // Sharp V: plunge then spike
    out.push(
      bar(day++, px, px, leftPeak * (1 - depthPct), leftPeak * (1 - depthPct), 2_000_000)
    );
    px = leftPeak * 0.98;
    out.push(bar(day++, leftPeak * (1 - depthPct), px, leftPeak * (1 - depthPct), px, 1_800_000));
  } else {
    // Rounded descent
    const bottom = leftPeak * (1 - depthPct);
    for (let i = 0; i < 12; i += 1) {
      const t = (i + 1) / 12;
      const target = leftPeak - (leftPeak - bottom) * Math.sin((t * Math.PI) / 2);
      const open = px;
      px = target;
      out.push(bar(day++, open, Math.max(open, px) * 1.002, Math.min(open, px) * 0.998, px, 1_000_000 - i * 20_000));
    }
    // Bottom dwell
    for (let i = 0; i < 6; i += 1) {
      const open = px;
      px = bottom * (1 + (i % 2) * 0.004);
      out.push(
        bar(day++, open, Math.max(open, px) * 1.003, bottom * 0.998, px, 900_000)
      );
    }
    // Rounded ascent toward left peak
    for (let i = 0; i < 12; i += 1) {
      const t = (i + 1) / 12;
      const target = bottom + (leftPeak * 0.98 - bottom) * Math.sin((t * Math.PI) / 2);
      const open = px;
      px = target;
      out.push(
        bar(day++, open, Math.max(open, px) * 1.003, Math.min(open, px) * 0.997, px, 950_000 + i * 15_000)
      );
    }
  }

  const rightPeak = px;
  // Handle consolidation
  const handleHigh = rightPeak;
  const handleLow = options?.deepHandle
    ? rightPeak * 0.8
    : rightPeak * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const open = px;
    px = handleLow + (handleHigh - handleLow) * (0.4 + (i % 3) * 0.1);
    out.push(
      bar(
        day++,
        open,
        Math.min(handleHigh, Math.max(open, px) * 1.002),
        Math.max(handleLow, Math.min(open, px) * 0.998),
        px,
        800_000 - i * 40_000
      )
    );
  }

  const pivot = Math.max(...out.slice(-6).map((c) => c.high));
  if (options?.noBreakout) {
    out.push(
      bar(day++, px, pivot * 0.992, px * 0.985, pivot * 0.988, 1_500_000)
    );
  } else if (options?.lateBreakout) {
    // Extended >5% beyond pivot but bar range under circuit threshold.
    const lateClose = pivot * 1.055;
    out.push(
      bar(day++, pivot * 1.01, lateClose * 1.005, pivot * 1.008, lateClose, 2_500_000)
    );
  } else {
    const vol = options?.weakBreakoutVolume ? 400_000 : 2_200_000;
    out.push(
      bar(day++, px, pivot * 1.02, px * 0.998, pivot * 1.015, vol)
    );
  }
  return out;
}

function makeIdealInput(
  candleOverrides?: ReturnType<typeof buildIdealCupHandle>,
  dataOverrides: Partial<CupHandleStrategyInput["cupHandle"]> = {}
): CupHandleStrategyInput {
  const candles = candleOverrides ?? buildIdealCupHandle();
  const last = candles[candles.length - 1]!;
  return {
    symbol: "CUP",
    lastPrice: last.close,
    cupHandle: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      ema150: last.close * 0.92,
      ema200: last.close * 0.9,
      relativeVolume: 1.6,
      averageVolume20d: 1_000_000,
      relativeStrength: 70,
      fiftyTwoWeekHigh: last.close * 1.05,
      newsDriven: false,
      ...dataOverrides,
    },
  };
}

function makeContext(
  input: CupHandleStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): CupHandleDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 60),
  };
}

describe("Cup & Handle Detector", () => {
  beforeEach(() => {
    resetCupHandleDetector();
    resetCupHandleTradeBuilder();
    resetCupHandleMetrics();
  });

  afterEach(() => {
    resetCupHandleDetector();
    resetCupHandleTradeBuilder();
    resetCupHandleMetrics();
  });

  it("detects Ideal Cup & Handle", () => {
    const detection = detectCupHandle(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.roundedCup).toBe(true);
    expect(detection.breakoutConfirmed).toBe(true);
  });

  it("rejects Shallow Cup", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ cupDepthPct: 0.06 })))
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects Deep Cup", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ cupDepthPct: 0.42 })))
    );
    expect(detection.detected).toBe(false);
  });

  it("accepts Rounded Cup", () => {
    const detection = detectCupHandle(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.roundedCup).toBe(true);
    expect(detection.reasons.join(" ")).toMatch(/rounded cup/i);
  });

  it("rejects V-shaped Cup", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ vShaped: true })))
    );
    expect(detection.detected).toBe(false);
  });

  it("confirms Valid Handle", () => {
    const detection = detectCupHandle(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.handleValid).toBe(true);
    expect(detection.handleDuration).toBeGreaterThan(0);
  });

  it("rejects Deep Handle", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ deepHandle: true })))
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects Weak Volume", () => {
    const detection = detectCupHandle(
      makeContext(
        makeIdealInput(buildIdealCupHandle({ weakBreakoutVolume: true }), {
          relativeVolume: 0.5,
          averageVolume20d: 2_000_000,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/volume|weak/);
  });

  it("rejects False Breakout", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ noBreakout: true })))
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects Late Breakout", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(buildIdealCupHandle({ lateBreakout: true })))
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/late/);
  });

  it("rejects Weak Relative Strength", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(undefined, { relativeStrength: 30 }))
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/relative strength/i);
  });

  it("rejects Weak Sector", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(), { sectorStrength: makeSectors(30) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectCupHandle(
      makeContext(makeIdealInput(), { marketBreadth: makeBreadth(30) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("builds High Conviction trade", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new CupHandleDetector().detect(context);
    const setup = new CupHandleTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.conviction).toBeGreaterThanOrEqual(55);
  });

  it("produces Low Conviction on marginal inputs", () => {
    const input = makeIdealInput(undefined, {
      relativeStrength: 56,
      relativeVolume: 1.3,
    });
    const context = makeContext(input, {
      marketBreadth: makeBreadth(56),
      sectorStrength: makeSectors(56),
      marketStrength: 58,
      confidence: 72,
    });
    const detection = detectCupHandle(context);
    expect(detection.detected).toBe(true);
    const setup = new CupHandleTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.conviction).toBeLessThan(95);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectCupHandle(context);
    const setup = new CupHandleTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildCupHandleExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      chInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/cup|handle|breakout/i);
  });

  it("tracks Metrics", () => {
    resetCupHandleMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectCupHandle(context);
    new CupHandleTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getCupHandleMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new CupHandleDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});
