/**
 * Strategy Eligibility Matrix — unit tests (Sprint 11B.2C).
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
  MarketRegimeLabel,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import {
  STRATEGY_MATRIX,
  StrategyEligibilityEngine,
  computeEligibilityScore,
  createFallbackEligibilitySnapshot,
  evaluateStrategyMatrix,
  getStrategyProfile,
  resetStrategyEligibilityEngine,
  resolveStrategyMatrix,
  sortEligibleStrategies,
  type EligibleStrategy,
  type StrategyProfile,
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

function makeConfidence(score: number): RegimeConfidenceAnalysis {
  return {
    score,
    grade:
      score >= 95
        ? "Exceptional"
        : score >= 85
          ? "High"
          : score >= 70
            ? "Good"
            : score >= 55
              ? "Moderate"
              : "Low",
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    contributions: [],
    summary: [`Confidence ${score}.`],
  };
}

function makeRegime(
  regime: MarketRegimeLabel,
  confidence: number,
  overrides: Partial<MarketRegime> = {}
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 85,
    reasons: [`Classified as ${regime}`],
    triggeredRules: [regime],
    timestamp: new Date("2026-07-18T10:00:00Z"),
    confidenceAnalysis: makeConfidence(confidence),
    ...overrides,
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

function strongBullContext(): InstitutionalMarketContext {
  const sectors = makeSectors([
    { sector: "IT", score: 82 },
    { sector: "Auto", score: 78 },
    { sector: "Banking", score: 76 },
    { sector: "FMCG", score: 72 },
  ]);
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 80,
    marketBreadth: makeBreadth({
      score: 78,
      participationPercent: 76,
      breadthQuality: "Very Strong",
      confidence: 90,
    }),
    sectorStrength: sectors,
    volatility: makeVolatility({
      score: 28,
      regime: "Low",
      indiaVix: 12,
      riskMode: "Risk On",
    }),
    riskMode: "Risk On",
    confidence: 90,
    healthScore: 82,
    qualityGrade: "A+",
  });
}

function weakBullContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 62,
    marketBreadth: makeBreadth({ score: 60, participationPercent: 58 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 64 },
      { sector: "Auto", score: 60 },
      { sector: "Banking", score: 58 },
    ]),
    volatility: makeVolatility({ score: 40, regime: "Normal" }),
    riskMode: "Risk On",
    confidence: 72,
    healthScore: 65,
    qualityGrade: "A",
  });
}

function sidewaysContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: makeBreadth({ score: 50 }),
    volatility: makeVolatility({ score: 35, regime: "Normal" }),
    riskMode: "Neutral",
    confidence: 68,
    healthScore: 58,
  });
}

function weakBearContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bear",
    marketStrength: 38,
    marketBreadth: makeBreadth({
      score: 35,
      participationPercent: 32,
      breadthQuality: "Weak",
    }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 36 },
      { sector: "Auto", score: 34 },
      { sector: "Banking", score: 30 },
    ]),
    volatility: makeVolatility({ score: 55, regime: "Elevated" }),
    riskMode: "Risk Off",
    confidence: 62,
    healthScore: 40,
    qualityGrade: "C",
  });
}

function strongBearContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Strong Bear",
    marketStrength: 22,
    marketBreadth: makeBreadth({
      score: 20,
      participationPercent: 18,
      breadthQuality: "Very Weak",
    }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 22 },
      { sector: "Auto", score: 18 },
    ]),
    volatility: makeVolatility({
      score: 70,
      regime: "High",
      indiaVix: 24,
      riskMode: "Risk Off",
    }),
    riskMode: "Risk Off",
    confidence: 70,
    healthScore: 28,
    qualityGrade: "C",
  });
}

function highVolContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Weak Bull",
    marketStrength: 52,
    marketBreadth: makeBreadth({ score: 48 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 52 },
      { sector: "Auto", score: 48 },
    ]),
    volatility: makeVolatility({
      score: 78,
      regime: "Extreme",
      indiaVix: 26,
      atrExpansion: true,
      riskMode: "Neutral",
    }),
    riskMode: "Neutral",
    confidence: 62,
    healthScore: 50,
    qualityGrade: "C",
  });
}

function lowVolContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Sideways",
    marketStrength: 55,
    marketBreadth: makeBreadth({ score: 55 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 58 },
      { sector: "Auto", score: 54 },
      { sector: "Banking", score: 52 },
    ]),
    volatility: makeVolatility({
      score: 18,
      regime: "Very Low",
      indiaVix: 10,
      atrCompression: true,
      riskMode: "Risk On",
    }),
    riskMode: "Neutral",
    confidence: 75,
    healthScore: 68,
    qualityGrade: "A",
  });
}

function eventDrivenContext(): InstitutionalMarketContext {
  return makeContext({
    marketTrend: "Strong Bull",
    marketStrength: 68,
    marketBreadth: makeBreadth({ score: 62 }),
    sectorStrength: makeSectors([
      { sector: "IT", score: 70 },
      { sector: "Banking", score: 66 },
    ]),
    volatility: makeVolatility({
      score: 72,
      regime: "High",
      indiaVix: 22,
      gapPercent: 1.4,
      atrExpansion: true,
      gapDirection: "up",
      riskMode: "Neutral",
    }),
    riskMode: "Neutral",
    confidence: 65,
    healthScore: 55,
    qualityGrade: "B",
  });
}

describe("Strategy matrix registry", () => {
  it("registers all approved strategies", () => {
    expect(STRATEGY_MATRIX.length).toBe(27);
    const ids = STRATEGY_MATRIX.map((p) => p.id);
    expect(ids).toContain("scalping");
    expect(ids).toContain("orb");
    expect(ids).toContain("vwap-continuation");
    expect(ids).toContain("buffett");
    expect(ids).toContain("quality-compounder");
    expect(new Set(ids).size).toBe(27);
  });

  it("exposes lookup helpers", () => {
    expect(getStrategyProfile("vcp")?.name).toBe("VCP");
    expect(getStrategyProfile("missing")).toBeUndefined();
  });
});

describe("StrategyEligibilityEngine — regime scenarios", () => {
  let engine: StrategyEligibilityEngine;

  beforeEach(() => {
    resetStrategyEligibilityEngine();
    engine = new StrategyEligibilityEngine();
  });

  afterEach(() => {
    resetStrategyEligibilityEngine();
  });

  it("evaluates Strong Bull with eligible trend strategies", () => {
    const snapshot = engine.evaluate(
      strongBullContext(),
      makeRegime("Strong Bull", 90)
    );
    expect(snapshot.eligible.length).toBeGreaterThan(0);
    expect(snapshot.eligible.some((s) => s.strategyId === "momentum-continuation")).toBe(
      true
    );
    expect(snapshot.eligible.some((s) => s.strategyId === "fifty-two-week-high")).toBe(
      true
    );
    expect(engine.getEligibleStrategies()).toEqual(snapshot.eligible);
    expect(engine.getRejectedStrategies().length).toBe(snapshot.rejected.length);
  });

  it("evaluates Weak Bull", () => {
    const snapshot = engine.evaluate(
      weakBullContext(),
      makeRegime("Weak Bull", 72)
    );
    expect(snapshot.regime).toBe("Weak Bull");
    expect(snapshot.eligible.length).toBeGreaterThan(0);
    expect(
      snapshot.eligible.every((s) => s.blockedReasons.length === 0)
    ).toBe(true);
  });

  it("evaluates Sideways — favors mean-reversion / range strategies", () => {
    const snapshot = engine.evaluate(
      sidewaysContext(),
      makeRegime("Sideways", 68)
    );
    const eligibleIds = snapshot.eligible.map((s) => s.strategyId);
    expect(eligibleIds).toContain("vwap-mean-reversion");
    expect(eligibleIds).not.toContain("momentum-continuation");
    const momentum = snapshot.rejected.find(
      (s) => s.strategyId === "momentum-continuation"
    );
    expect(momentum?.blockedReasons.some((r) => /Sideways|not supported/i.test(r))).toBe(
      true
    );
  });

  it("evaluates Weak Bear", () => {
    const snapshot = engine.evaluate(
      weakBearContext(),
      makeRegime("Weak Bear", 62)
    );
    expect(snapshot.eligible.length).toBeLessThan(snapshot.rejected.length);
    expect(
      snapshot.rejected.some((s) =>
        s.blockedReasons.some((r) => /Risk Mode|Breadth|confidence|strength/i.test(r))
      )
    ).toBe(true);
  });

  it("evaluates Strong Bear — heavily rejects risk-on strategies", () => {
    const snapshot = engine.evaluate(
      strongBearContext(),
      makeRegime("Strong Bear", 70)
    );
    expect(snapshot.eligible.length).toBe(0);
    expect(snapshot.rejected.length).toBe(STRATEGY_MATRIX.length);
  });

  it("evaluates High Volatility", () => {
    const snapshot = engine.evaluate(
      highVolContext(),
      makeRegime("High Volatility", 60)
    );
    const eligibleIds = snapshot.eligible.map((s) => s.strategyId);
    expect(eligibleIds).toContain("scalping");
    expect(eligibleIds).toContain("liquidity-sweep");
    expect(
      snapshot.rejected.some(
        (s) =>
          s.strategyId === "vcp" &&
          s.blockedReasons.some((r) => /Blocked|Volatility|Risk Mode/i.test(r))
      )
    ).toBe(true);
  });

  it("evaluates Low Volatility", () => {
    const snapshot = engine.evaluate(
      lowVolContext(),
      makeRegime("Low Volatility", 75)
    );
    const eligibleIds = snapshot.eligible.map((s) => s.strategyId);
    expect(eligibleIds).toContain("institutional-accumulation");
    expect(eligibleIds).toContain("flat-base");
    expect(eligibleIds).not.toContain("gap-and-go");
  });

  it("evaluates Event Driven", () => {
    const snapshot = engine.evaluate(
      eventDrivenContext(),
      makeRegime("Event Driven", 65)
    );
    const eligibleIds = snapshot.eligible.map((s) => s.strategyId);
    expect(eligibleIds).toContain("gap-and-go");
    expect(eligibleIds).toContain("news-momentum");
    expect(
      snapshot.rejected.some(
        (s) =>
          s.strategyId === "cup-and-handle" &&
          s.blockedReasons.some((r) => /Blocked|Event Driven/i.test(r))
      )
    ).toBe(true);
  });
});

describe("StrategyEligibilityEngine — gates & scoring", () => {
  let engine: StrategyEligibilityEngine;

  beforeEach(() => {
    resetStrategyEligibilityEngine();
    engine = new StrategyEligibilityEngine();
  });

  afterEach(() => {
    resetStrategyEligibilityEngine();
  });

  it("allows strategies under high confidence Strong Bull", () => {
    const snapshot = engine.evaluate(
      strongBullContext(),
      makeRegime("Strong Bull", 95)
    );
    expect(snapshot.confidence).toBe(95);
    expect(snapshot.eligible.length).toBeGreaterThan(5);
    expect(snapshot.summary.length).toBeGreaterThan(0);
    expect(snapshot.summary.length).toBeLessThanOrEqual(5);
  });

  it("rejects on low confidence", () => {
    const snapshot = engine.evaluate(
      strongBullContext(),
      makeRegime("Strong Bull", 40)
    );
    expect(snapshot.eligible.length).toBe(0);
    expect(
      snapshot.rejected.every((s) =>
        s.blockedReasons.some((r) => /confidence/i.test(r))
      )
    ).toBe(true);
  });

  it("rejects on low breadth", () => {
    const context = strongBullContext();
    context.marketBreadth = makeBreadth({ score: 20, breadthQuality: "Very Weak" });
    const snapshot = engine.evaluate(context, makeRegime("Strong Bull", 88));
    expect(
      snapshot.rejected.some((s) =>
        s.blockedReasons.some((r) => /Breadth insufficient/i.test(r))
      )
    ).toBe(true);
    expect(snapshot.eligible.length).toBeLessThan(
      engine.evaluate(strongBullContext(), makeRegime("Strong Bull", 88)).eligible
        .length
    );
  });

  it("rejects on weak sector participation", () => {
    const context = strongBullContext();
    context.sectorStrength = makeSectors([
      { sector: "IT", score: 25 },
      { sector: "Auto", score: 22 },
    ]);
    const snapshot = engine.evaluate(context, makeRegime("Strong Bull", 88));
    expect(
      snapshot.rejected.some((s) =>
        s.blockedReasons.some((r) => /Sector participation weak/i.test(r))
      )
    ).toBe(true);
  });

  it("rejects Risk Off for strategies that block it", () => {
    const context = strongBullContext();
    context.riskMode = "Risk Off";
    const snapshot = engine.evaluate(context, makeRegime("Strong Bull", 88));
    const orb = snapshot.strategies.find((s) => s.strategyId === "orb");
    expect(orb?.eligible).toBe(false);
    expect(orb?.blockedReasons.some((r) => /Risk Mode = Risk Off/i.test(r))).toBe(
      true
    );
  });

  it("rejects disabled strategies", () => {
    const matrix = resolveStrategyMatrix([
      { id: "scalping", enabled: false },
    ]);
    const custom = new StrategyEligibilityEngine(undefined, matrix);
    const snapshot = custom.evaluate(
      strongBullContext(),
      makeRegime("Strong Bull", 90)
    );
    const scalp = snapshot.rejected.find((s) => s.strategyId === "scalping");
    expect(scalp).toBeDefined();
    expect(scalp?.blockedReasons.some((r) => /disabled/i.test(r))).toBe(true);
  });

  it("sorts eligible by priority then score then category", () => {
    const items: EligibleStrategy[] = [
      {
        strategyId: "vcp",
        name: "VCP",
        category: "Swing",
        eligible: true,
        priority: 60,
        score: 80,
        reasons: [],
        blockedReasons: [],
      },
      {
        strategyId: "orb",
        name: "ORB",
        category: "Scalp",
        eligible: true,
        priority: 88,
        score: 70,
        reasons: [],
        blockedReasons: [],
      },
      {
        strategyId: "scalping",
        name: "Scalping",
        category: "Scalp",
        eligible: true,
        priority: 88,
        score: 90,
        reasons: [],
        blockedReasons: [],
      },
    ];
    const sorted = sortEligibleStrategies(items);
    expect(sorted.map((s) => s.strategyId)).toEqual([
      "scalping",
      "orb",
      "vcp",
    ]);
  });

  it("handles missing context without crashing", () => {
    const snapshot = engine.evaluate(null, null);
    expect(snapshot.eligible.length).toBe(0);
    expect(snapshot.rejected.length).toBe(STRATEGY_MATRIX.length);
    expect(snapshot.warnings.length).toBeGreaterThan(0);
    expect(engine.getEligibleStrategies()).toEqual([]);
  });

  it("createFallbackEligibilitySnapshot rejects all", () => {
    const fallback = createFallbackEligibilitySnapshot();
    expect(fallback.eligible.length).toBe(0);
    expect(fallback.rejected.length).toBe(27);
  });

  it("is deterministic for identical inputs", () => {
    const context = strongBullContext();
    const regime = makeRegime("Strong Bull", 90);
    const a = evaluateStrategyMatrix({ context, regime });
    const b = evaluateStrategyMatrix({ context, regime });
    expect(a.eligible.map((s) => s.strategyId)).toEqual(
      b.eligible.map((s) => s.strategyId)
    );
    expect(a.eligible.map((s) => s.score)).toEqual(
      b.eligible.map((s) => s.score)
    );
  });

  it("scores are within 0–100 and respect configurable weights", () => {
    const profile = getStrategyProfile("momentum-continuation") as StrategyProfile;
    const score = computeEligibilityScore(
      strongBullContext(),
      makeRegime("Strong Bull", 90),
      profile
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    const weighted = computeEligibilityScore(
      strongBullContext(),
      makeRegime("Strong Bull", 90),
      profile,
      {
        ...requireConfig(),
        weights: {
          regimeMatch: 1,
          confidence: 0,
          breadth: 0,
          sectorStrength: 0,
          marketStrength: 0,
          healthScore: 0,
        },
      }
    );
    expect(weighted).toBe(100);
  });
});

function requireConfig() {
  return {
    weights: {
      regimeMatch: 0.3,
      confidence: 0.2,
      breadth: 0.15,
      sectorStrength: 0.15,
      marketStrength: 0.1,
      healthScore: 0.1,
    },
    categoryOrder: ["Scalp", "Intraday", "Swing", "Position"] as const,
    scoreFloor: 0,
    scoreCeiling: 100,
    missingContextPenalty: 40,
    minimumEligibilityScore: 55,
  };
}
