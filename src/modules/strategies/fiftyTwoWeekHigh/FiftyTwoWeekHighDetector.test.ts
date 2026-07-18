/**
 * 52-Week High Detection & Trade Construction — tests (Sprint 11B.3S).
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
  FiftyTwoWeekHighDetector,
  FiftyTwoWeekHighTradeBuilder,
  buildFiftyTwoWeekHighExplainability,
  detectFiftyTwoWeekHigh,
  getFiftyTwoWeekHighMetrics,
  resetFiftyTwoWeekHighDetector,
  resetFiftyTwoWeekHighMetrics,
  resetFiftyTwoWeekHighTradeBuilder,
  type FiftyTwoWeekHighCandle,
  type FiftyTwoWeekHighDetectionContext,
  type FiftyTwoWeekHighStrategyInput,
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
): FiftyTwoWeekHighCandle {
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
    riskMode: "Risk On",
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
      strategyId: "fifty-two-week-high",
      name: "52 Week High",
      category: "Swing",
      eligible: true,
      priority: 54,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

const PRIOR_HIGH = 100;

/** Ideal: grind below prior high, then fresh closing breakout with volume. */
function buildIdeal52WH(options?: {
  oldBreakout?: boolean;
  extended?: boolean;
  weakVolume?: boolean;
  noBreakout?: boolean;
}): FiftyTwoWeekHighCandle[] {
  const out: FiftyTwoWeekHighCandle[] = [];
  let day = 0;
  let px = 80;
  for (let i = 0; i < 35; i += 1) {
    const open = px;
    px = Math.min(PRIOR_HIGH * 0.985, px * 1.008);
    out.push(bar(day++, open, Math.max(open, px) * 1.003, Math.min(open, px) * 0.997, px, 1_200_000));
  }
  // Base just under high
  for (let i = 0; i < 8; i += 1) {
    const open = px;
    px = PRIOR_HIGH * (0.96 + (i % 3) * 0.008);
    out.push(
      bar(
        day++,
        open,
        Math.min(PRIOR_HIGH * 0.999, Math.max(open, px) * 1.002),
        Math.min(open, px) * 0.997,
        px,
        1_000_000
      )
    );
  }

  if (options?.oldBreakout) {
    for (let i = 0; i < 5; i += 1) {
      const close = PRIOR_HIGH * (1.005 + i * 0.002);
      out.push(
        bar(day++, close * 0.998, close * 1.004, close * 0.996, close, 2_000_000)
      );
    }
  } else if (options?.noBreakout) {
    out.push(
      bar(day++, px, PRIOR_HIGH * 0.995, px * 0.99, PRIOR_HIGH * 0.992, 2_000_000)
    );
  } else if (options?.extended) {
    const atr = PRIOR_HIGH * 0.015;
    const close = PRIOR_HIGH + atr * 4;
    out.push(
      bar(day++, PRIOR_HIGH * 1.01, close * 1.002, PRIOR_HIGH * 1.005, close, 2_500_000)
    );
  } else {
    const vol = options?.weakVolume ? 300_000 : 2_400_000;
    const close = PRIOR_HIGH * 1.012;
    out.push(
      bar(day++, px, close * 1.004, PRIOR_HIGH * 0.998, close, vol)
    );
  }
  return out;
}

function makeIdealInput(
  candleOverrides?: ReturnType<typeof buildIdeal52WH>,
  dataOverrides: Partial<
    FiftyTwoWeekHighStrategyInput["fiftyTwoWeekHigh"]
  > = {}
): FiftyTwoWeekHighStrategyInput {
  const candles = candleOverrides ?? buildIdeal52WH();
  const last = candles[candles.length - 1]!;
  return {
    symbol: "HIGH",
    lastPrice: last.close,
    fiftyTwoWeekHigh: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: PRIOR_HIGH * 0.015,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      ema150: last.close * 0.92,
      ema200: last.close * 0.9,
      relativeVolume: 1.7,
      averageVolume20d: 1_100_000,
      relativeStrength: 72,
      fiftyTwoWeekHigh: PRIOR_HIGH,
      fiftyTwoWeekLow: 70,
      newsDriven: false,
      ...dataOverrides,
    },
  };
}

function makeContext(
  input: FiftyTwoWeekHighStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): FiftyTwoWeekHighDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime("Strong Bull", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 60),
  };
}

describe("52-Week High Detector", () => {
  beforeEach(() => {
    resetFiftyTwoWeekHighDetector();
    resetFiftyTwoWeekHighTradeBuilder();
    resetFiftyTwoWeekHighMetrics();
  });

  afterEach(() => {
    resetFiftyTwoWeekHighDetector();
    resetFiftyTwoWeekHighTradeBuilder();
    resetFiftyTwoWeekHighMetrics();
  });

  it("detects Fresh 52-week High", () => {
    const detection = detectFiftyTwoWeekHigh(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.breakoutConfirmed).toBe(true);
    expect(detection.breakoutAge).toBeLessThanOrEqual(3);
    expect(detection.previous52WeekHigh).toBe(PRIOR_HIGH);
  });

  it("rejects Old Breakout", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(makeIdealInput(buildIdeal52WH({ oldBreakout: true })))
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/old breakout/);
  });

  it("rejects Extended Breakout", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(makeIdealInput(buildIdeal52WH({ extended: true })))
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/extended/);
  });

  it("rejects Low Volume", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(
        makeIdealInput(buildIdeal52WH({ weakVolume: true }), {
          relativeVolume: 0.4,
          averageVolume20d: 2_000_000,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/volume|low/);
  });

  it("rejects Weak Relative Strength", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(makeIdealInput(undefined, { relativeStrength: 40 }))
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/relative strength/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(makeIdealInput(), { marketBreadth: makeBreadth(40) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("rejects Weak Sector", () => {
    const detection = detectFiftyTwoWeekHigh(
      makeContext(makeIdealInput(), { sectorStrength: makeSectors(40) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("builds High Conviction trade", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new FiftyTwoWeekHighDetector().detect(context);
    const setup = new FiftyTwoWeekHighTradeBuilder().build({
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
      relativeStrength: 62,
      relativeVolume: 1.3,
    });
    const context = makeContext(input, {
      marketBreadth: makeBreadth(62),
      sectorStrength: makeSectors(62),
      marketStrength: 66,
      confidence: 76,
    });
    const detection = detectFiftyTwoWeekHigh(context);
    expect(detection.detected).toBe(true);
    const setup = new FiftyTwoWeekHighTradeBuilder().build({
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
    const detection = detectFiftyTwoWeekHigh(context);
    const setup = new FiftyTwoWeekHighTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildFiftyTwoWeekHighExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      ftwInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/52-week|institutional|strength/i);
  });

  it("tracks Metrics", () => {
    resetFiftyTwoWeekHighMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectFiftyTwoWeekHigh(context);
    new FiftyTwoWeekHighTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getFiftyTwoWeekHighMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new FiftyTwoWeekHighDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});
