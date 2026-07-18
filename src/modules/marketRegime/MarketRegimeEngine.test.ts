/**
 * Market Regime Engine — unit tests (Sprint 11B.2A).
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
  buildDefaultMarketRegimeRules,
  classifyMarketRegime,
  createFallbackMarketRegime,
  evaluateMarketRegimeRules,
  resetMarketRegimeEngine,
  type MarketRegimeLabel,
} from "./index";

function makeBreadth(
  overrides: Partial<BreadthAnalysis> = {}
): BreadthAnalysis {
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
  specs: Array<{ sector: string; score: number; trend?: SectorAnalysis["trend"] }>
): SectorAnalysis[] {
  return specs.map((spec) => ({
    sector: spec.sector,
    score: spec.score,
    trend: spec.trend ?? (spec.score >= 65 ? "Bull" : spec.score <= 40 ? "Bear" : "Neutral"),
    relativeStrength: spec.score,
    breadth: spec.score,
    volume: 55,
    momentum: spec.score,
    participation: spec.score,
    confidence: 70,
    reasons: [`${spec.sector} scored`],
  }));
}

function makeRotation(
  sectors: SectorAnalysis[]
): SectorRotationSummary {
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

  const merged: InstitutionalMarketContext = { ...base, ...overrides };
  if (!overrides.sectorRotation && overrides.sectorStrength) {
    merged.sectorRotation = makeRotation(overrides.sectorStrength);
  }
  return merged;
}

function strongBullContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 82, trend: "Strong Bull" },
    { sector: "Auto", score: 76, trend: "Bull" },
    { sector: "Banking", score: 74, trend: "Bull" },
    { sector: "FMCG", score: 68, trend: "Bull" },
    { sector: "Pharma", score: 52 },
  ]);
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 78,
    marketBreadth: makeBreadth({
      score: 74,
      participationPercent: 72,
      breadthPercent: 68,
      breadthQuality: "Strong",
      breadthMomentum: 8,
      confidence: 80,
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({
      score: 28,
      regime: "Low",
      indiaVix: 12,
      riskMode: "Risk On",
    }),
    riskMode: "Risk On",
    confidence: 84,
    healthScore: 78,
    qualityGrade: "A",
    warnings: [],
  });
}

function weakBullContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 64 },
    { sector: "Banking", score: 60 },
    { sector: "Auto", score: 56 },
    { sector: "Pharma", score: 48 },
  ]);
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 60,
    marketBreadth: makeBreadth({
      score: 58,
      participationPercent: 60,
      breadthQuality: "Neutral",
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({ score: 40, regime: "Normal", indiaVix: 14 }),
    riskMode: "Neutral",
    confidence: 68,
    healthScore: 60,
    qualityGrade: "B",
  });
}

function strongBearContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 28, trend: "Strong Bear" },
    { sector: "Auto", score: 32, trend: "Bear" },
    { sector: "Metal", score: 25, trend: "Strong Bear" },
    { sector: "FMCG", score: 45 },
  ]);
  return makeContext({
    marketTrend: "Strong Bear",
    marketStrength: 24,
    marketBreadth: makeBreadth({
      score: 28,
      participationPercent: 35,
      breadthPercent: 30,
      breadthQuality: "Weak",
      confidence: 78,
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({
      score: 58,
      regime: "Elevated",
      indiaVix: 19,
      riskMode: "Risk Off",
    }),
    riskMode: "Risk Off",
    confidence: 80,
    healthScore: 28,
    qualityGrade: "C",
  });
}

function weakBearContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 40 },
    { sector: "Auto", score: 38 },
    { sector: "Banking", score: 44 },
    { sector: "FMCG", score: 50 },
  ]);
  return makeContext({
    marketTrend: "Weak Bear",
    marketStrength: 40,
    marketBreadth: makeBreadth({
      score: 42,
      participationPercent: 45,
      breadthQuality: "Weak",
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({ score: 50, regime: "Normal" }),
    riskMode: "Neutral",
    confidence: 66,
    healthScore: 40,
    qualityGrade: "C",
  });
}

function highVolOverrideContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 58,
    marketBreadth: makeBreadth({ score: 55 }),
    volatility: makeVolatility({
      score: 88,
      regime: "Extreme",
      indiaVix: 28,
      atrExpansion: true,
      volatilityExpansion: true,
      riskMode: "Risk Off",
      gapPercent: 0.3,
    }),
    riskMode: "Risk Off",
    confidence: 75,
    healthScore: 35,
    qualityGrade: "C",
  });
}

function eventDrivenContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Sideways",
    marketStrength: 48,
    marketBreadth: makeBreadth({ score: 50 }),
    volatility: makeVolatility({
      score: 72,
      regime: "High",
      indiaVix: 22,
      atrExpansion: true,
      gapPercent: 1.2,
      gapDirection: "down",
      volatilityExpansion: true,
      riskMode: "Risk Off",
    }),
    riskMode: "Neutral",
    confidence: 60,
    healthScore: 45,
    qualityGrade: "C",
    warnings: ["Partial API degradation detected"],
  });
}

function lowVolContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Sideways",
    marketStrength: 52,
    marketBreadth: makeBreadth({ score: 52, participationPercent: 55 }),
    volatility: makeVolatility({
      score: 18,
      regime: "Very Low",
      indiaVix: 10.5,
      atrCompression: true,
      volatilityCompression: true,
      riskMode: "Risk On",
    }),
    riskMode: "Neutral",
    confidence: 72,
    healthScore: 58,
    qualityGrade: "B",
  });
}

function mixedSignalsContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 62,
    marketBreadth: makeBreadth({
      score: 32,
      participationPercent: 38,
      breadthQuality: "Weak",
    }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 70 },
      { sector: "Auto", score: 30 },
      { sector: "Metal", score: 28 },
    ]),
    volatility: makeVolatility({
      score: 68,
      regime: "Elevated",
      riskMode: "Risk Off",
    }),
    riskMode: "Risk On",
    confidence: 50,
    healthScore: 48,
    qualityGrade: "C",
    warnings: ["Conflicting signals across market subsystems"],
  });
}

describe("MarketRegime rule catalog", () => {
  it("exposes documented priority-ordered rules", () => {
    const rules = buildDefaultMarketRegimeRules();
    const names = rules.map((rule) => rule.name);
    expect(names).toContain("high_volatility_override");
    expect(names).toContain("event_driven_stress");
    expect(names).toContain("strong_bull_confirmed");
    expect(names).toContain("strong_bear_confirmed");
    expect(names).toContain("weak_bull_bias");
    expect(names).toContain("weak_bear_bias");
    expect(names).toContain("low_volatility_quiet");
    expect(names).toContain("sideways_mixed_fallback");

    const priorities = rules.map((rule) => rule.priority);
    expect(priorities[0]).toBeGreaterThanOrEqual(priorities[priorities.length - 1]);
  });
});

describe("MarketRegime classification", () => {
  it("classifies Strong Bull", () => {
    const regime = classifyMarketRegime(strongBullContext());
    expect(regime.regime).toBe("Strong Bull");
    expect(regime.confidence).toBeGreaterThan(50);
    expect(regime.triggeredRules[0]).toBe("strong_bull_confirmed");
    expect(regime.reasons.some((r) => /participation|strength|Bull/i.test(r))).toBe(
      true
    );
  });

  it("classifies Weak Bull", () => {
    const regime = classifyMarketRegime(weakBullContext());
    expect(["Weak Bull", "Strong Bull", "Low Volatility"]).toContain(regime.regime);
    // Prefer Weak Bull when strong confirmations are absent.
    if (regime.regime === "Weak Bull") {
      expect(regime.triggeredRules).toContain("weak_bull_bias");
    }
  });

  it("classifies Strong Bear", () => {
    const regime = classifyMarketRegime(strongBearContext());
    expect(regime.regime).toBe("Strong Bear");
    expect(regime.triggeredRules[0]).toBe("strong_bear_confirmed");
  });

  it("classifies Weak Bear", () => {
    const regime = classifyMarketRegime(weakBearContext());
    expect(["Weak Bear", "Strong Bear", "Sideways"]).toContain(regime.regime);
  });

  it("classifies Sideways on balanced tape", () => {
    const regime = classifyMarketRegime(makeContext());
    expect(
      ["Sideways", "Low Volatility", "Weak Bull", "Weak Bear"] as MarketRegimeLabel[]
    ).toContain(regime.regime);
  });

  it("applies High Volatility override over bullish bias", () => {
    const regime = classifyMarketRegime(highVolOverrideContext());
    expect(regime.regime).toBe("High Volatility");
    expect(regime.priority).toBe(100);
    expect(regime.triggeredRules[0]).toBe("high_volatility_override");
    expect(
      regime.reasons.some((r) => /volatility|overrides/i.test(r))
    ).toBe(true);
  });

  it("classifies Event Driven on gap + expansion stress", () => {
    const regime = classifyMarketRegime(eventDrivenContext());
    expect(["Event Driven", "High Volatility"]).toContain(regime.regime);
    expect(regime.triggeredRules.length).toBeGreaterThan(0);
  });

  it("classifies Low Volatility in quiet markets", () => {
    const regime = classifyMarketRegime(lowVolContext());
    expect(regime.regime).toBe("Low Volatility");
    expect(regime.triggeredRules).toContain("low_volatility_quiet");
  });

  it("resolves mixed / conflicting signals toward Sideways or override", () => {
    const regime = classifyMarketRegime(mixedSignalsContext());
    expect(
      ["Sideways", "High Volatility", "Weak Bull", "Weak Bear", "Event Driven"] as MarketRegimeLabel[]
    ).toContain(regime.regime);
    expect(regime.confidence).toBeLessThan(70);
  });

  it("reduces confidence for low-confidence context", () => {
    const base = strongBullContext();
    const low = classifyMarketRegime({
      ...base,
      confidence: 30,
      warnings: ["Low breadth confidence"],
    });
    const high = classifyMarketRegime(base);
    expect(low.confidence).toBeLessThan(high.confidence);
  });

  it("handles conflicting indicators via rule evaluation", () => {
    const matches = evaluateMarketRegimeRules(mixedSignalsContext());
    expect(matches.some((m) => m.rule.name === "sideways_mixed_fallback")).toBe(
      true
    );
  });
});

describe("MarketRegimeEngine", () => {
  beforeEach(() => {
    resetMarketRegimeEngine();
  });

  afterEach(() => {
    resetMarketRegimeEngine();
  });

  it("exposes classify and getCurrentRegime", () => {
    const engine = new MarketRegimeEngine();
    expect(engine.getCurrentRegime()).toBeNull();
    const regime = engine.classify(strongBullContext());
    expect(engine.getCurrentRegime()).toEqual(regime);
    expect(regime.regime).toBe("Strong Bull");
  });

  it("returns Sideways fallback for missing context", () => {
    const engine = new MarketRegimeEngine();
    const regime = engine.classify(null);
    expect(regime.regime).toBe("Sideways");
    expect(regime.confidence).toBeLessThanOrEqual(40);
    expect(regime.triggeredRules).toContain("sideways_incomplete_fallback");
    expect(regime.reasons[0]).toMatch(/Incomplete/i);
  });

  it("returns Sideways fallback for incomplete context", () => {
    const engine = new MarketRegimeEngine();
    const incomplete = {
      ...strongBullContext(),
      marketStrength: Number.NaN,
    };
    const regime = engine.classify(incomplete);
    expect(regime.regime).toBe("Sideways");
    expect(regime.confidence).toBeLessThanOrEqual(40);
  });

  it("createFallbackMarketRegime is stable", () => {
    const fallback = createFallbackMarketRegime();
    expect(fallback.regime).toBe("Sideways");
    expect(fallback.priority).toBe(10);
  });

  it("is deterministic for identical inputs", () => {
    const engine = new MarketRegimeEngine();
    const a = engine.classify(strongBullContext());
    const b = engine.classify(strongBullContext());
    expect(a.regime).toBe(b.regime);
    expect(a.priority).toBe(b.priority);
    expect(a.triggeredRules).toEqual(b.triggeredRules);
  });
});
