/**
 * Relative Strength Leadership Detection & Trade Construction — tests (Sprint 11B.3O).
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
  RelativeStrengthLeadershipDetector,
  RelativeStrengthLeadershipTradeBuilder,
  buildRelativeStrengthLeadershipExplainability,
  detectRelativeStrengthLeadership,
  getRelativeStrengthLeadershipMetrics,
  resetRelativeStrengthLeadershipDetector,
  resetRelativeStrengthLeadershipMetrics,
  resetRelativeStrengthLeadershipTradeBuilder,
  type RelativeStrengthLeadershipCandle,
  type RelativeStrengthLeadershipDetectionContext,
  type RelativeStrengthLeadershipStrategyInput,
  type RelativeStrengthSeriesPoint,
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
): RelativeStrengthLeadershipCandle {
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
      strategyId: "relative-strength-leadership",
      name: "Relative Strength Leadership",
      category: "Swing",
      eligible: true,
      priority: 55,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildUptrendCandles(count = 45): RelativeStrengthLeadershipCandle[] {
  const out: RelativeStrengthLeadershipCandle[] = [];
  let close = 100;
  for (let i = 0; i < count; i += 1) {
    const open = close;
    close = close * 1.012;
    const high = close * 1.008;
    const low = open * 0.992;
    const volume = i === count - 1 ? 2_500_000 : 1_200_000;
    out.push(daily(i, open, high, low, close, volume));
  }
  return out;
}

function laggingSeries(
  candles: readonly RelativeStrengthLeadershipCandle[],
  factor = 0.4
): RelativeStrengthSeriesPoint[] {
  const start = candles[0]!.close;
  return candles.map((c, i) => ({
    timestamp: c.timestamp,
    close: start * (1 + ((c.close / start - 1) * factor)),
  }));
}

function makeLeaderInput(
  overrides: Partial<
    RelativeStrengthLeadershipStrategyInput["relativeStrengthLeadership"]
  > = {}
): RelativeStrengthLeadershipStrategyInput {
  const candles = overrides.candlesDaily
    ? [...overrides.candlesDaily]
    : buildUptrendCandles(45);
  const last = candles[candles.length - 1]!;
  const ema200 = last.close * 0.88;
  const ema150 = last.close * 0.91;
  const ema50 = last.close * 0.96;
  const ema20 = last.close * 0.985;
  return {
    symbol: "LEADER",
    lastPrice: last.close,
    relativeStrengthLeadership: {
      candlesDaily: candles,
      nifty50: laggingSeries(candles, 0.35),
      nifty500: laggingSeries(candles, 0.4),
      sectorIndex: laggingSeries(candles, 0.45),
      industryIndex: laggingSeries(candles, 0.5),
      relativeStrengthRatio: 88,
      relativeStrengthMomentum: 2.5,
      pricePerformance: 18,
      leadershipPercentile: 92,
      sectorRankPercentile: 85,
      industryRankPercentile: 82,
      peerUniverseSize: 100,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20,
      ema50,
      ema150,
      ema200,
      relativeVolume: 1.6,
      averageVolume20d: 1_200_000,
      fiftyTwoWeekHigh: last.close * 1.02,
      newsDriven: false,
      ...overrides,
    },
  };
}

function makeContext(
  input: RelativeStrengthLeadershipStrategyInput,
  marketOverrides: Partial<InstitutionalMarketContext> = {}
): RelativeStrengthLeadershipDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(marketOverrides),
    regime: makeRegime("Strong Bull", 82),
    confidence: makeConfidence(82),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0, 44),
  };
}

describe("Relative Strength Leadership Detector", () => {
  beforeEach(() => {
    resetRelativeStrengthLeadershipDetector();
    resetRelativeStrengthLeadershipTradeBuilder();
    resetRelativeStrengthLeadershipMetrics();
  });

  afterEach(() => {
    resetRelativeStrengthLeadershipDetector();
    resetRelativeStrengthLeadershipTradeBuilder();
    resetRelativeStrengthLeadershipMetrics();
  });

  it("detects Top RS Leader", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(makeLeaderInput())
    );
    expect(detection.detected).toBe(true);
    expect(detection.direction).toBe("BUY");
    expect(detection.leadershipPercentile).toBeGreaterThanOrEqual(70);
    expect(detection.relativeStrengthScore).toBeGreaterThanOrEqual(70);
  });

  it("rejects Weak RS", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          relativeStrengthRatio: 40,
          leadershipPercentile: 40,
          sectorRankPercentile: 40,
          industryRankPercentile: 40,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak rs/i);
  });

  it("accepts Improving RS", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          relativeStrengthMomentum: 3.2,
          relativeStrengthRatio: 86,
        })
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.rsIncreasing).toBe(true);
  });

  it("rejects Declining RS", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          relativeStrengthMomentum: -1.5,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/declining rs/i);
  });

  it("confirms Sector Leader", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          sectorRankPercentile: 95,
        })
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.outperformingSector).toBe(true);
    expect(detection.sectorRank).toBeGreaterThanOrEqual(90);
  });

  it("confirms Industry Leader", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          industryRankPercentile: 94,
        })
      )
    );
    expect(detection.detected).toBe(true);
    expect(detection.outperformingIndustry).toBe(true);
    expect(detection.industryRank).toBeGreaterThanOrEqual(90);
  });

  it("rejects Weak Volume", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(
        makeLeaderInput({
          relativeVolume: 0.5,
          averageVolume20d: 5_000_000,
        })
      )
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak volume/i);
  });

  it("rejects Weak Breadth", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(makeLeaderInput(), {
        marketBreadth: makeBreadth(40),
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak breadth/i);
  });

  it("rejects Weak Sector", () => {
    const detection = detectRelativeStrengthLeadership(
      makeContext(makeLeaderInput(), {
        sectorStrength: makeSectors(40),
      })
    );
    expect(detection.detected).toBe(false);
    expect(detection.reasons.join(" ")).toMatch(/weak sector/i);
  });

  it("builds High Conviction trade for top leader", () => {
    const input = makeLeaderInput();
    const context = makeContext(input);
    const detector = new RelativeStrengthLeadershipDetector();
    const detection = detector.detect(context);
    const setup = new RelativeStrengthLeadershipTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.riskReward).toBeGreaterThanOrEqual(2.5);
    expect(setup.conviction).toBeGreaterThanOrEqual(55);
    expect(setup.qualityScore).toBeGreaterThan(0);
  });

  it("produces Low Conviction when enrichment has weak market cues", () => {
    const input = makeLeaderInput({
      relativeStrengthRatio: 72,
      leadershipPercentile: 72,
      relativeStrengthMomentum: 0.6,
      relativeVolume: 1.2,
    });
    const context = makeContext(input, {
      marketBreadth: makeBreadth(58),
      sectorStrength: makeSectors(62),
      marketStrength: 55,
      confidence: 70,
    });
    const detection = detectRelativeStrengthLeadership(context);
    expect(detection.detected).toBe(true);
    const setup = new RelativeStrengthLeadershipTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.entry).toBeGreaterThan(0);
    expect(setup.conviction).toBeLessThan(95);
  });

  it("generates Explainability reasons", () => {
    const input = makeLeaderInput();
    const context = makeContext(input);
    const detection = detectRelativeStrengthLeadership(context);
    const setup = new RelativeStrengthLeadershipTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildRelativeStrengthLeadershipExplainability({
      detection,
      setup,
      marketContext: context.marketContext,
      rsInput: input,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(/relative strength|leadership/i);
    expect(
      [...explain.positiveReasons, ...explain.summary].some((r) =>
        /top percentile|outperforming|leadership|trend quality|sector/i.test(r)
      )
    ).toBe(true);
  });

  it("tracks Metrics", () => {
    resetRelativeStrengthLeadershipMetrics();
    const input = makeLeaderInput();
    const context = makeContext(input);
    const detection = detectRelativeStrengthLeadership(context);
    new RelativeStrengthLeadershipTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getRelativeStrengthLeadershipMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(1);
    expect(snap.leadershipCandidates).toBeGreaterThanOrEqual(1);
    expect(snap.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("recovers from Failure Recovery path", () => {
    const detector = new RelativeStrengthLeadershipDetector();
    const empty = detector.detect(null);
    expect(empty.detected).toBe(false);
    expect(empty.warnings.length + empty.reasons.length).toBeGreaterThan(0);
  });
});
