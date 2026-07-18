/**
 * Regime Confidence Engine — unit tests (Sprint 11B.2B).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  BreadthAnalysis,
  InstitutionalMarketContext,
  SectorAnalysis,
  SectorRotationSummary,
  VolatilityAnalysis,
} from "@/src/modules/marketContext";
import {
  MarketRegimeEngine,
  RegimeConfidenceEngine,
  buildRegimeConfidenceAnalysis,
  classifyConfidenceGrade,
  classifyMarketRegime,
  createFallbackConfidenceAnalysis,
  resetMarketRegimeEngine,
  type ConfidenceGrade,
  type MarketRegimeClassification,
} from "./index";

function makeBreadth(overrides: Partial<BreadthAnalysis> = {}): BreadthAnalysis {
  return {
    advanceCount: 1200,
    declineCount: 900,
    unchangedCount: 80,
    advanceDeclineRatio: 1.33,
    netAdvances: 300,
    breadthPercent: 55,
    participationPercent: 58,
    equalWeightBreadth: 55,
    largeCapBreadth: 56,
    midCapBreadth: 54,
    smallCapBreadth: 52,
    breadthMomentum: 2,
    breadthQuality: "Neutral",
    score: 55,
    confidence: 70,
    reasons: ["Breadth balanced"],
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

function makeVolatility(
  overrides: Partial<VolatilityAnalysis> = {}
): VolatilityAnalysis {
  return {
    score: 45,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 14,
    atr: 120,
    historicalVolatility: 14,
    realizedVolatility: 13,
    gapPercent: 0.1,
    dailyRange: 0.8,
    intradayRange: 0.7,
    riskMode: "Neutral",
    confidence: 72,
    reasons: ["India VIX normal"],
    vixTrend: "Stable",
    vixMomentum: 0.5,
    atrExpansion: false,
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: false,
    volatilityCompression: false,
    gapDirection: "flat",
    lastUpdated: new Date("2026-07-18T10:00:00Z"),
    ...overrides,
  };
}

function makeSectors(
  specs: Array<{ sector: string; score: number }>
): SectorAnalysis[] {
  return specs.map((spec) => ({
    sector: spec.sector,
    score: spec.score,
    trend:
      spec.score >= 65 ? "Bull" : spec.score <= 40 ? "Bear" : "Neutral",
    relativeStrength: spec.score,
    breadth: spec.score,
    volume: 55,
    momentum: spec.score,
    participation: spec.score,
    confidence: 70,
    reasons: [`${spec.sector} scored`],
  }));
}

function makeRotation(sectors: SectorAnalysis[]): SectorRotationSummary {
  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  return {
    improving: ranked.filter((s) => s.score >= 60).map((s) => s.sector),
    weakening: ranked.filter((s) => s.score <= 40).map((s) => s.sector),
    stable: ranked
      .filter((s) => s.score > 40 && s.score < 60)
      .map((s) => s.sector),
    leaders: ranked.slice(0, 3).map((s) => s.sector),
    laggards: ranked.slice(-3).map((s) => s.sector),
    reasons: ["Rotation snapshot"],
  };
}

function makeContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectorStrength =
    overrides.sectorStrength ??
    makeSectors([
      { sector: "IT", score: 62 },
      { sector: "Auto", score: 58 },
      { sector: "Banking", score: 55 },
      { sector: "Pharma", score: 48 },
    ]);

  const base: InstitutionalMarketContext = {
    timestamp: new Date("2026-07-18T10:00:00Z"),
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: makeBreadth(),
    sectorStrength,
    sectorRotation: makeRotation(sectorStrength),
    volatility: makeVolatility(),
    riskMode: "Neutral",
    confidence: 70,
    healthScore: 55,
    qualityGrade: "B",
    summary: ["Balanced tape."],
    warnings: [],
  };

  const merged = { ...base, ...overrides };
  if (!overrides.sectorRotation && overrides.sectorStrength) {
    merged.sectorRotation = makeRotation(overrides.sectorStrength);
  }
  return merged;
}

function exceptionalBullContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 86 },
    { sector: "Auto", score: 80 },
    { sector: "Banking", score: 78 },
    { sector: "FMCG", score: 74 },
  ]);
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 82,
    marketBreadth: makeBreadth({
      score: 80,
      participationPercent: 78,
      breadthQuality: "Very Strong",
      confidence: 90,
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({
      score: 22,
      regime: "Very Low",
      indiaVix: 11,
      riskMode: "Risk On",
    }),
    riskMode: "Risk On",
    confidence: 92,
    healthScore: 86,
    qualityGrade: "A+",
    warnings: [],
  });
}

function conflictingContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 64,
    marketBreadth: makeBreadth({
      score: 30,
      participationPercent: 35,
      breadthQuality: "Weak",
    }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 72 },
      { sector: "Auto", score: 28 },
    ]),
    volatility: makeVolatility({
      score: 72,
      regime: "High",
      indiaVix: 22,
      riskMode: "Risk Off",
    }),
    riskMode: "Risk On",
    confidence: 48,
    healthScore: 45,
    qualityGrade: "C",
    warnings: ["Conflicting signals across market subsystems"],
  });
}

function withRegime(
  context: InstitutionalMarketContext
): { context: InstitutionalMarketContext; regime: MarketRegimeClassification } {
  return { context, regime: classifyMarketRegime(context) };
}

describe("RegimeConfidenceUtils", () => {
  it("scores exceptional / very high confidence for aligned bull regime", () => {
    const { context, regime } = withRegime(exceptionalBullContext());
    const analysis = buildRegimeConfidenceAnalysis({ context, regime });
    expect(analysis.score).toBeGreaterThanOrEqual(70);
    expect(
      ["Exceptional", "High", "Good"] as ConfidenceGrade[]
    ).toContain(analysis.grade);
    expect(analysis.positiveReasons.length).toBeGreaterThan(0);
    expect(analysis.contributions.length).toBe(7);
    expect(analysis.summary.length).toBeGreaterThan(0);
    expect(analysis.summary.length).toBeLessThanOrEqual(5);
  });

  it("classifies high confidence grade bands", () => {
    expect(classifyConfidenceGrade(96)).toBe("Exceptional");
    expect(classifyConfidenceGrade(88)).toBe("High");
    expect(classifyConfidenceGrade(75)).toBe("Good");
    expect(classifyConfidenceGrade(60)).toBe("Moderate");
    expect(classifyConfidenceGrade(40)).toBe("Low");
  });

  it("reduces confidence on conflicting signals", () => {
    const aligned = buildRegimeConfidenceAnalysis(
      withRegime(exceptionalBullContext())
    );
    const mixed = buildRegimeConfidenceAnalysis(withRegime(conflictingContext()));
    expect(mixed.score).toBeLessThan(aligned.score);
    expect(mixed.negativeReasons.length).toBeGreaterThan(0);
    expect(
      mixed.negativeReasons.some((r) => /conflict|Incomplete|weakening|VIX/i.test(r))
    ).toBe(true);
  });

  it("handles missing sector data", () => {
    const context = makeContext({
      marketTrend: "Strong Bull",
      marketStrength: 75,
      marketBreadth: makeBreadth({ score: 72, participationPercent: 70 }),
      sectorStrength: [],
      sectorRotation: {
        improving: [],
        weakening: [],
        stable: [],
        leaders: [],
        laggards: [],
        reasons: [],
      },
      riskMode: "Risk On",
      qualityGrade: "B",
      warnings: ["Sector strength subsystem unavailable"],
    });
    const regime = classifyMarketRegime(context);
    const analysis = buildRegimeConfidenceAnalysis({ context, regime });
    expect(analysis.score).toBeLessThan(90);
    expect(
      analysis.contributions.some((c) => /sector|missing/i.test(c.reason + c.title))
    ).toBe(true);
  });

  it("handles missing volatility / VIX", () => {
    const context = makeContext({
      marketTrend: "Strong Bull",
      marketStrength: 75,
      marketBreadth: makeBreadth({ score: 70, participationPercent: 68 }),
      volatility: makeVolatility({
        indiaVix: 0,
        score: 50,
        regime: "Normal",
        confidence: 25,
      }),
      riskMode: "Risk On",
      warnings: ["Volatility subsystem unavailable"],
    });
    const regime = classifyMarketRegime(context);
    const analysis = buildRegimeConfidenceAnalysis({ context, regime });
    expect(analysis.negativeReasons.length).toBeGreaterThan(0);
    expect(analysis.grade).not.toBe("Exceptional");
  });

  it("handles missing breadth via weak breadth object + warning", () => {
    const context = makeContext({
      marketTrend: "Strong Bull",
      marketStrength: 78,
      marketBreadth: makeBreadth({
        score: 50,
        participationPercent: 0,
        confidence: 20,
        reasons: ["Breadth unavailable"],
      }),
      riskMode: "Risk On",
      warnings: ["Breadth subsystem unavailable"],
    });
    const regime = classifyMarketRegime(context);
    const analysis = buildRegimeConfidenceAnalysis({ context, regime });
    expect(analysis.score).toBeLessThan(
      buildRegimeConfidenceAnalysis(withRegime(exceptionalBullContext())).score
    );
  });

  it("handles partial context and API-style failure", () => {
    const partial = buildRegimeConfidenceAnalysis({
      context: null,
      regime: null,
    });
    expect(partial.grade).toBe("Low");
    expect(partial.negativeReasons.length).toBeGreaterThan(0);

    const fallback = createFallbackConfidenceAnalysis("API failure");
    expect(fallback.score).toBeLessThanOrEqual(25);
    expect(fallback.summary.length).toBeGreaterThan(0);
  });

  it("orders contributions by absolute impact", () => {
    const analysis = buildRegimeConfidenceAnalysis(
      withRegime(exceptionalBullContext())
    );
    const abs = analysis.contributions.map((c) => Math.abs(c.contribution));
    for (let i = 1; i < abs.length; i++) {
      expect(abs[i - 1]).toBeGreaterThanOrEqual(abs[i]);
    }
  });

  it("generates positive, negative, and summary explainability", () => {
    const analysis = buildRegimeConfidenceAnalysis(
      withRegime(exceptionalBullContext())
    );
    expect(analysis.contributions.every((c) => c.title && c.description)).toBe(
      true
    );
    expect(analysis.summary.length).toBeLessThanOrEqual(5);
    expect(
      analysis.summary.some((s) => /confidence|Regime|Trend|Participation|Volatility/i.test(s))
    ).toBe(true);
  });
});

describe("RegimeConfidenceEngine + MarketRegimeEngine integration", () => {
  beforeEach(() => {
    resetMarketRegimeEngine();
  });

  afterEach(() => {
    resetMarketRegimeEngine();
  });

  it("attaches confidenceAnalysis on classify()", () => {
    const engine = new MarketRegimeEngine();
    const regime = engine.classify(exceptionalBullContext());
    expect(regime.confidenceAnalysis).toBeDefined();
    expect(regime.confidenceAnalysis.contributions.length).toBe(7);
    expect(engine.getConfidenceAnalysis()).toEqual(regime.confidenceAnalysis);
    expect(regime.confidence).toBe(regime.confidenceAnalysis.score);
  });

  it("exposes getConfidenceAnalysis after classify", () => {
    const engine = new MarketRegimeEngine();
    expect(engine.getConfidenceAnalysis()).toBeNull();
    engine.classify(exceptionalBullContext());
    expect(engine.getConfidenceAnalysis()?.grade).toBeTruthy();
  });

  it("reduces confidence for incomplete context fallback", () => {
    const engine = new MarketRegimeEngine();
    const regime = engine.classify(null);
    expect(regime.confidenceAnalysis.grade).toBe("Low");
    expect(regime.confidenceAnalysis.negativeReasons.length).toBeGreaterThan(0);
  });

  it("RegimeConfidenceEngine.analyze is deterministic", () => {
    const confidenceEngine = new RegimeConfidenceEngine();
    const { context, regime } = withRegime(exceptionalBullContext());
    const a = confidenceEngine.analyze(context, regime);
    const b = confidenceEngine.analyze(context, regime);
    expect(a.score).toBe(b.score);
    expect(a.grade).toBe(b.grade);
    expect(a.contributions.map((c) => c.factor)).toEqual(
      b.contributions.map((c) => c.factor)
    );
  });
});
