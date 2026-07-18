/**
 * Earnings Momentum Detection & Trade Construction — tests (Sprint 11B.3T).
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
  EarningsMomentumDetector,
  EarningsMomentumTradeBuilder,
  buildEarningsMomentumExplainability,
  detectEarningsMomentum,
  getEarningsMomentumMetrics,
  resetEarningsMomentumDetector,
  resetEarningsMomentumMetrics,
  resetEarningsMomentumTradeBuilder,
  type EarningsFundamentals,
  type EarningsMomentumCandle,
  type EarningsMomentumDetectionContext,
  type EarningsMomentumStrategyInput,
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
): EarningsMomentumCandle {
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
    trend: "Expanding",
    indiaVix: 14,
    atr: 2,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.5,
    dailyRange: 1.5,
    intradayRange: 1.1,
    riskMode: "Risk On",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Expanding",
    vixMomentum: 1,
    atrExpansion: true,
    atrCompression: false,
    relativeVolatility: 1.1,
    volatilityExpansion: true,
    volatilityCompression: false,
    gapDirection: "up",
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
  regime: MarketRegime["regime"] = "Event Driven",
  confidence = 75
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
      strategyId: "earnings-momentum",
      name: "Earnings Momentum",
      category: "Swing",
      eligible: true,
      priority: 53,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildCandles(options?: { weakVolume?: boolean }): EarningsMomentumCandle[] {
  const out: EarningsMomentumCandle[] = [];
  let px = 100;
  for (let i = 0; i < 12; i += 1) {
    const open = px;
    px *= 1.004;
    out.push(bar(i, open, px * 1.005, open * 0.997, px, 1_200_000));
  }
  const lastVol = options?.weakVolume ? 200_000 : 2_500_000;
  const last = out[out.length - 1]!;
  out[out.length - 1] = {
    ...last,
    volume: lastVol,
    close: last.close * 1.01,
    high: last.close * 1.015,
  };
  return out;
}

function beatFundamentals(
  overrides: Partial<EarningsFundamentals> = {}
): EarningsFundamentals {
  return {
    epsActual: 12,
    epsEstimate: 10,
    revenueActual: 1100,
    revenueEstimate: 1000,
    ebitda: 300,
    ebitdaPrior: 250,
    operatingMargin: 0.22,
    operatingMarginPrior: 0.2,
    netProfit: 200,
    patGrowth: 0.18,
    revenueGrowthYoy: 0.15,
    revenueGrowthQoq: 0.05,
    epsGrowthYoy: 0.2,
    epsGrowthQoq: 0.06,
    guidance: "upgrade",
    estimateRevision: 0.05,
    oneTimeGains: false,
    accountingAdjustments: false,
    managementCommentaryPositive: true,
    institutionalBuying: true,
    ...overrides,
  };
}

function makeIdealInput(
  fundOverrides: Partial<EarningsFundamentals> = {},
  dataOverrides: Partial<
    EarningsMomentumStrategyInput["earningsMomentum"]
  > = {},
  candleOptions?: { weakVolume?: boolean }
): EarningsMomentumStrategyInput {
  const candles = buildCandles(candleOptions);
  const last = candles[candles.length - 1]!;
  return {
    symbol: "EARN",
    lastPrice: last.close,
    earningsMomentum: {
      candlesDaily: candles,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      relativeVolume: 1.8,
      averageVolume20d: 1_200_000,
      relativeStrength: 70,
      fundamentals: beatFundamentals(fundOverrides),
      ...dataOverrides,
    },
  };
}

function makeContext(
  input: EarningsMomentumStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): EarningsMomentumDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime("Event Driven", 75),
    confidence: makeConfidence(75),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 20),
  };
}

describe("Earnings Momentum Detector", () => {
  beforeEach(() => {
    resetEarningsMomentumDetector();
    resetEarningsMomentumTradeBuilder();
    resetEarningsMomentumMetrics();
  });

  afterEach(() => {
    resetEarningsMomentumDetector();
    resetEarningsMomentumTradeBuilder();
    resetEarningsMomentumMetrics();
  });

  it("detects Large EPS Beat", () => {
    const detection = detectEarningsMomentum(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.epsSurprise).toBeGreaterThanOrEqual(0.05);
  });

  it("detects Revenue Beat", () => {
    const detection = detectEarningsMomentum(makeContext(makeIdealInput()));
    expect(detection.detected).toBe(true);
    expect(detection.revenueSurprise).toBeGreaterThan(0);
  });

  it("accepts Positive Guidance", () => {
    const detection = detectEarningsMomentum(
      makeContext(makeIdealInput({ guidance: "upgrade" }))
    );
    expect(detection.detected).toBe(true);
    expect(detection.analysis.guidanceUpgrade).toBe(true);
  });

  it("handles Negative Guidance as SELL", () => {
    const candles = buildCandles();
    const last = candles[candles.length - 1]!;
    // Bearish price confirmation
    last.close = last.close * 0.98;
    const input: EarningsMomentumStrategyInput = {
      symbol: "MISS",
      lastPrice: last.close,
      earningsMomentum: {
        candlesDaily: candles,
        vwap: last.close * 1.01,
        atr: last.close * 0.02,
        ema20: last.close * 0.99,
        ema50: last.close * 1.02,
        relativeVolume: 1.8,
        averageVolume20d: 1_200_000,
        relativeStrength: 35,
        fundamentals: beatFundamentals({
          epsActual: 8,
          epsEstimate: 10,
          revenueActual: 900,
          revenueEstimate: 1000,
          operatingMargin: 0.18,
          operatingMarginPrior: 0.22,
          guidance: "downgrade",
          patGrowth: -0.1,
          revenueGrowthYoy: -0.05,
          revenueGrowthQoq: -0.03,
          epsGrowthYoy: -0.12,
          epsGrowthQoq: -0.04,
          institutionalBuying: false,
          institutionalSelling: true,
          managementCommentaryPositive: false,
        }),
      },
    };
    const detection = detectEarningsMomentum(
      makeContext(input, {
        marketBreadth: makeBreadth(40),
        sectorStrength: makeSectors(40),
      })
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("SELL");
  });

  it("rejects Mixed Results", () => {
    const detection = detectEarningsMomentum(
      makeContext(
        makeIdealInput({
          epsActual: 12,
          epsEstimate: 10,
          revenueActual: 900,
          revenueEstimate: 1000,
          guidance: "inline",
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/mixed/i);
  });

  it("rejects Weak Volume", () => {
    const detection = detectEarningsMomentum(
      makeContext(
        makeIdealInput({}, { relativeVolume: 0.5, averageVolume20d: 2_000_000 }, {
          weakVolume: true,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/volume|weak/);
  });

  it("rejects Weak Sector", () => {
    const detection = detectEarningsMomentum(
      makeContext(makeIdealInput(), { sectorStrength: makeSectors(40) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectEarningsMomentum(
      makeContext(makeIdealInput(), { marketBreadth: makeBreadth(40) })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("builds High Conviction trade", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new EarningsMomentumDetector().detect(context);
    const setup = new EarningsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.conviction).toBeGreaterThanOrEqual(55);
  });

  it("produces Low Conviction on marginal inputs", () => {
    const input = makeIdealInput(
      {
        epsActual: 10.6,
        epsEstimate: 10,
        revenueActual: 1025,
        revenueEstimate: 1000,
        guidance: "inline",
      },
      { relativeStrength: 58, relativeVolume: 1.3 }
    );
    const context = makeContext(input, {
      marketBreadth: makeBreadth(55),
      sectorStrength: makeSectors(58),
      marketStrength: 58,
      confidence: 70,
    });
    const detection = detectEarningsMomentum(context);
    expect(detection.detected).toBe(true);
    const setup = new EarningsMomentumTradeBuilder().build({
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
    const detection = detectEarningsMomentum(context);
    const setup = new EarningsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildEarningsMomentumExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      emInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/eps|revenue|guidance|institutional/i);
  });

  it("tracks Metrics", () => {
    resetEarningsMomentumMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectEarningsMomentum(context);
    new EarningsMomentumTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getEarningsMomentumMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new EarningsMomentumDetector().detect(null);
    expect(empty.detected).toBe(false);
  });
});
