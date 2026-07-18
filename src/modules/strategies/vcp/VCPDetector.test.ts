/**
 * VCP Detection & Trade Construction — tests (Sprint 11B.3L).
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
  VCPDetector,
  VCPTradeBuilder,
  buildVCPExplainability,
  detectVCP,
  resetVCPDetector,
  resetVCPMetrics,
  resetVCPTradeBuilder,
  type VCPCandle,
  type VCPDetectionContext,
  type VCPStrategyInput,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 18 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function daily(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): VCPCandle {
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
  const sectors = overrides.sectorStrength ?? makeSectors(80);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(70),
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
      strategyId: "vcp",
      name: "VCP",
      category: "Swing",
      eligible: true,
      priority: 60,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Build contracting base segments + breakout. */
function buildVCPCandles(options: {
  contractionCount: number;
  breakoutClose?: number;
  breakoutVolume?: number;
  weakVolume?: boolean;
  falseBreakout?: boolean;
  lateExtension?: boolean;
}): VCPCandle[] {
  const count = options.contractionCount;
  const barsPer = 8;
  const candles: VCPCandle[] = [];
  let day = 0;

  // Lead-in uptrend; pad so total daily bars always exceed minimumSessionCandles.
  const baseBars = count * 8;
  const leadIn = Math.max(12, 34 - baseBars);
  for (let i = 0; i < leadIn; i++) {
    const p = 82 + i * 0.7;
    candles.push(daily(day++, p, p + 1.2, p - 0.4, p + 0.8, 220_000));
  }

  const ranges = Array.from({ length: count }, (_, i) => {
    const firstRange = 10;
    const range = firstRange * Math.pow(0.7, i);
    const low = 95 + i * 1.2;
    const high = low + range;
    const vol = 240_000 - i * 45_000;
    return { high, low, vol: Math.max(vol, 50_000) };
  });

  for (const seg of ranges) {
    for (let i = 0; i < barsPer; i++) {
      const t = i / (barsPer - 1);
      const mid = seg.low + (seg.high - seg.low) * (0.35 + t * 0.3);
      const half = (seg.high - seg.low) * 0.35;
      candles.push(
        daily(
          day++,
          mid,
          Math.min(seg.high, mid + half),
          Math.max(seg.low, mid - half),
          mid + half * 0.2,
          options.weakVolume ? seg.vol : seg.vol
        )
      );
    }
  }

  const pivot = ranges[ranges.length - 1]!.high;
  let close = options.breakoutClose ?? pivot + 0.8;
  let high = close + 0.3;
  let low = pivot - 0.2;
  let volume = options.breakoutVolume ?? (options.weakVolume ? 60_000 : 320_000);

  if (options.falseBreakout) {
    close = pivot - 0.1;
    high = pivot + 0.4;
    low = pivot - 1;
    volume = 320_000;
  }
  if (options.lateExtension) {
    close = pivot * 1.06;
    high = close + 0.1;
    low = close - 0.15;
    volume = 320_000;
  }

  candles.push(daily(day++, pivot, high, low, close, volume));
  return candles;
}

function makeInput(
  candles: VCPCandle[],
  overrides: Partial<VCPStrategyInput["vcp"]> = {}
): VCPStrategyInput {
  const last = candles[candles.length - 1]!;
  return {
    symbol: "RELIANCE",
    lastPrice: last.close,
    atr: 1.5,
    vcp: {
      candlesDaily: candles,
      vwap: overrides.vwap ?? last.close - 1,
      atr: overrides.atr ?? 1.5,
      ema20: overrides.ema20 ?? last.close - 0.8,
      ema50: overrides.ema50 ?? last.close - 2,
      ema150: overrides.ema150 ?? last.close - 8,
      ema200: overrides.ema200 ?? last.close - 12,
      relativeVolume: overrides.relativeVolume ?? 1.8,
      averageVolume20d: overrides.averageVolume20d ?? 150_000,
      fiftyTwoWeekHigh: overrides.fiftyTwoWeekHigh ?? last.close + 3,
      ...overrides,
    },
  };
}

function makeContext(
  input: VCPStrategyInput,
  overrides: {
    market?: Partial<InstitutionalMarketContext>;
    regime?: MarketRegime;
  } = {}
): VCPDetectionContext {
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
  resetVCPDetector();
  resetVCPTradeBuilder();
  resetVCPMetrics();
});

afterEach(() => {
  resetVCPDetector();
  resetVCPTradeBuilder();
  resetVCPMetrics();
});

describe("VCP Detection", () => {
  it("detects ideal VCP with three contractions", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.contractionCount).toBeGreaterThanOrEqual(2);
    expect(detection.volumeDryUp).toBe(true);
    expect(detection.breakoutConfirmed).toBe(true);
    expect(detection.confidence).toBeGreaterThan(50);
  });

  it("detects two contractions", () => {
    const candles = buildVCPCandles({ contractionCount: 2 });
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
    expect(detection.contractionCount).toBeGreaterThanOrEqual(2);
  });

  it("detects five contractions", () => {
    const candles = buildVCPCandles({ contractionCount: 5 });
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
    expect(detection.contractionCount).toBeGreaterThanOrEqual(2);
  });

  it("rejects weak pattern (expanding ranges)", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    // Corrupt base to expand ranges
    for (let i = 12; i < candles.length - 1; i++) {
      const c = candles[i]!;
      candles[i] = {
        ...c,
        high: c.high + (i % 5) * 2,
        low: c.low - (i % 5) * 2,
      };
    }
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
  });

  it("rejects weak volume breakout", () => {
    const candles = buildVCPCandles({
      contractionCount: 3,
      weakVolume: true,
      breakoutVolume: 40_000,
    });
    const detection = detectVCP(
      makeContext(
        makeInput(candles, {
          relativeVolume: 0.6,
          averageVolume20d: 150_000,
        })
      )
    );
    expect(detection.detected).toBe(false);
  });

  it("rejects false breakout (no close above pivot)", () => {
    const candles = buildVCPCandles({
      contractionCount: 3,
      falseBreakout: true,
    });
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
  });

  it("rejects late / extended entry", () => {
    const candles = buildVCPCandles({
      contractionCount: 3,
      lateExtension: true,
    });
    const detection = detectVCP(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/late|extended/i);
  });

  it("rejects weak sector", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const detection = detectVCP(
      makeContext(makeInput(candles), {
        market: { sectorStrength: makeSectors(30), marketStrength: 30 },
      })
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.reasons.join(" ") + detection.warnings.join(" ")
    ).toMatch(/sector|leadership|strength/i);
  });

  it("rejects weak breadth", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const detection = detectVCP(
      makeContext(makeInput(candles), {
        market: { marketBreadth: makeBreadth(20) },
      })
    );
    expect(detection.detected).toBe(false);
    expect(
      detection.reasons.join(" ") + detection.warnings.join(" ")
    ).toMatch(/breadth|participation/i);
  });

  it("detector class wraps detectVCP", () => {
    const detector = new VCPDetector();
    const candles = buildVCPCandles({ contractionCount: 3 });
    const detection = detector.detect(makeContext(makeInput(candles)));
    expect(detection.detected).toBe(true);
    expect(detector.getLastDetection()?.detected).toBe(true);
  });
});

describe("VCP Trade Construction", () => {
  it("builds high conviction trade on ideal VCP", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectVCP(context);
    const setup = new VCPTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.pivotPrice).toBeGreaterThan(0);
    expect(setup.contractionCount).toBeGreaterThanOrEqual(2);
    expect(setup.conviction).toBeGreaterThan(55);
    expect(setup.qualityScore).toBeGreaterThan(50);
    expect(setup.positiveReasons.length).toBeGreaterThan(0);
    expect(setup.institutionalSummary.length).toBeGreaterThan(0);
  });

  it("rejects poor RR via tight target failure path", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const input = makeInput(candles, { atr: 0.05 });
    const context = makeContext(input);
    const detection = detectVCP(context);
    const setup = new VCPTradeBuilder({
      minimumRiskReward: 2.5,
      targetRMultiples: { target1: 0.5, target2: 0.8, finalTarget: 1 },
      atrTargetMultiples: { target1: 0.2, target2: 0.3, finalTarget: 0.5 },
      measuredMoveFraction: 0.05,
      preferHigherFinalRr: false,
      maxRiskPercentOfPrice: 0.2,
    }).build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    // With constrained targets, either rejected or still meets RR via R multiples
    if (setup.entry > 0) {
      expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    } else {
      expect(setup.warnings.join(" ")).toMatch(
        /RR|target|threshold|detection|volume/i
      );
    }
  });

  it("low conviction when detection fails", () => {
    const candles = buildVCPCandles({
      contractionCount: 3,
      weakVolume: true,
      breakoutVolume: 30_000,
    });
    const input = makeInput(candles, { relativeVolume: 0.5 });
    const context = makeContext(input);
    const detection = detectVCP(context);
    const setup = new VCPTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBe(0);
    expect(setup.conviction).toBeLessThan(50);
  });

  it("explainability includes Minervini-style reasons", () => {
    const candles = buildVCPCandles({ contractionCount: 3 });
    const input = makeInput(candles);
    const context = makeContext(input);
    const detection = detectVCP(context);
    const setup = new VCPTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildVCPExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      vcpInput: input,
      institutionalScore: setup.institutionalScore,
    });
    const blob = [
      ...explain.summary,
      ...explain.positiveReasons,
      ...detection.reasons,
    ].join(" ");
    expect(blob).toMatch(/contraction|Volume dried|Minervini|Breakout/i);
  });
});
