/**
 * Flat Base Detection & Trade Construction — tests (Sprint 11B.3R).
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
  FlatBaseDetector,
  FlatBaseTradeBuilder,
  buildFlatBaseExplainability,
  detectFlatBase,
  getFlatBaseMetrics,
  resetFlatBaseDetector,
  resetFlatBaseMetrics,
  resetFlatBaseTradeBuilder,
  type FlatBaseCandle,
  type FlatBaseDetectionContext,
  type FlatBaseStrategyInput,
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
): FlatBaseCandle {
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
  regime: MarketRegime["regime"] = "Weak Bull",
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
    marketTrend: "Weak Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(65),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(35),
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
      strategyId: "flat-base",
      name: "Flat Base",
      category: "Swing",
      eligible: true,
      priority: 52,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

/** Ideal flat base: strong advance → tight consolidation ≤15% → pivot breakout. */
function buildIdealFlatBase(options?: {
  baseDepthPct?: number;
  wideSwings?: boolean;
  weakBreakoutVolume?: boolean;
  noBreakout?: boolean;
  lateBreakout?: boolean;
  weakPrior?: boolean;
}): FlatBaseCandle[] {
  const depthPct = options?.baseDepthPct ?? 0.08;
  const out: FlatBaseCandle[] = [];
  let day = 0;
  let px = options?.weakPrior ? 95 : 80;

  const advanceBars = 28;
  const advanceFactor = options?.weakPrior ? 1.002 : 1.012;
  for (let i = 0; i < advanceBars; i += 1) {
    const open = px;
    px = px * advanceFactor;
    const range = options?.wideSwings ? 0.02 : 0.008;
    out.push(
      bar(
        day++,
        open,
        Math.max(open, px) * (1 + range),
        Math.min(open, px) * (1 - range * 0.5),
        px,
        1_400_000
      )
    );
  }

  const pivotSeed = px;
  const baseLow = pivotSeed * (1 - depthPct);
  const baseBars = 12;
  for (let i = 0; i < baseBars; i += 1) {
    const open = px;
    const wobble = (i % 3) * 0.002;
    px = baseLow + (pivotSeed - baseLow) * (0.55 + wobble);
    const rangeMult = options?.wideSwings ? 0.035 : 0.004;
    out.push(
      bar(
        day++,
        open,
        Math.min(pivotSeed * 1.001, Math.max(open, px) * (1 + rangeMult)),
        Math.max(baseLow * 0.999, Math.min(open, px) * (1 - rangeMult)),
        px,
        900_000 - i * 15_000
      )
    );
  }

  const pivot = Math.max(...out.slice(-baseBars).map((c) => c.high));
  if (options?.noBreakout) {
    // Close firmly inside the base — no pivot breakout.
    const inside = (pivot + baseLow) / 2;
    out.push(
      bar(day++, inside, inside * 1.002, inside * 0.998, inside, 1_800_000)
    );
  } else if (options?.lateBreakout) {
    const lateClose = pivot * 1.06;
    out.push(
      bar(
        day++,
        pivot * 1.01,
        lateClose * 1.005,
        pivot * 1.008,
        lateClose,
        2_500_000
      )
    );
  } else {
    const vol = options?.weakBreakoutVolume ? 400_000 : 2_200_000;
    out.push(
      bar(day++, px, pivot * 1.018, px * 0.998, pivot * 1.012, vol)
    );
  }
  return out;
}

function makeIdealInput(
  candleOverrides?: ReturnType<typeof buildIdealFlatBase>,
  dataOverrides: Partial<FlatBaseStrategyInput["flatBase"]> = {}
): FlatBaseStrategyInput {
  const candles = candleOverrides ?? buildIdealFlatBase();
  const last = candles[candles.length - 1]!;
  return {
    symbol: "FLAT",
    lastPrice: last.close,
    flatBase: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: last.close * 0.015,
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
  input: FlatBaseStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {},
  regime: MarketRegime["regime"] = "Weak Bull"
): FlatBaseDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime(regime, 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 60),
  };
}

describe("Flat Base Detector", () => {
  beforeEach(() => {
    resetFlatBaseDetector();
    resetFlatBaseTradeBuilder();
    resetFlatBaseMetrics();
  });

  afterEach(() => {
    resetFlatBaseDetector();
    resetFlatBaseTradeBuilder();
    resetFlatBaseMetrics();
  });

  it("detects Ideal Flat Base", () => {
    const detection = detectFlatBase(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.flatBaseValid).toBe(true);
    expect(detection.breakoutConfirmed).toBe(true);
    expect(detection.baseDepthPct).toBeLessThanOrEqual(0.15);
  });

  it("rejects Deep Base", () => {
    const detection = detectFlatBase(
      makeContext(makeIdealInput(buildIdealFlatBase({ baseDepthPct: 0.22 })))
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/deep|depth|base/);
  });

  it("rejects Wide Base", () => {
    const detection = detectFlatBase(
      makeContext(
        makeIdealInput(buildIdealFlatBase({ wideSwings: true, baseDepthPct: 0.12 }))
      )
    );
    expect(detection.detected).toBe(false);
  });

  it("requires Strong Prior Trend", () => {
    const detection = detectFlatBase(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.priorAdvancePct).toBeGreaterThanOrEqual(0.12);
    expect(detection.reasons.join(" ")).toMatch(/strong advance/i);
  });

  it("rejects Weak Trend", () => {
    const detection = detectFlatBase(
      makeContext(
        makeIdealInput(buildIdealFlatBase({ weakPrior: true }), {
          ema20: 90,
          ema50: 95,
          ema150: 100,
          ema200: 105,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/weak trend|ema|prior/);
  });

  it("confirms Successful Breakout", () => {
    const detection = detectFlatBase(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.breakoutConfirmed).toBe(true);
    expect(detection.volumeConfirmed).toBe(true);
  });

  it("rejects False Breakout", () => {
    const detection = detectFlatBase(
      makeContext(makeIdealInput(buildIdealFlatBase({ noBreakout: true })))
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/false breakout|below pivot|breakout/);
  });

  it("rejects Weak Volume", () => {
    const detection = detectFlatBase(
      makeContext(
        makeIdealInput(buildIdealFlatBase({ weakBreakoutVolume: true }), {
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

  it("rejects Weak Relative Strength", () => {
    const detection = detectFlatBase(
      makeContext(makeIdealInput(undefined, { relativeStrength: 30 }))
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/relative strength/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectFlatBase(
      makeContext(makeIdealInput(), { marketBreadth: makeBreadth(30) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("rejects Weak Sector", () => {
    const detection = detectFlatBase(
      makeContext(makeIdealInput(), { sectorStrength: makeSectors(30) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("builds High Conviction trade", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new FlatBaseDetector().detect(context);
    const setup = new FlatBaseTradeBuilder().build({
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
      relativeStrength: 54,
      relativeVolume: 1.3,
    });
    const context = makeContext(input, {
      marketBreadth: makeBreadth(52),
      sectorStrength: makeSectors(54),
      marketStrength: 55,
      confidence: 72,
    });
    const detection = detectFlatBase(context);
    expect(detection.detected).toBe(true);
    const setup = new FlatBaseTradeBuilder().build({
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
    const detection = detectFlatBase(context);
    const setup = new FlatBaseTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildFlatBaseExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      fbInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/flat base|breakout|advance/i);
  });

  it("tracks Metrics", () => {
    resetFlatBaseMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectFlatBase(context);
    new FlatBaseTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getFlatBaseMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new FlatBaseDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});
