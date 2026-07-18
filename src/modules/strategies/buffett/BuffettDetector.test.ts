/**
 * Buffett Quality Investing — tests (Sprint 11B.3U).
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
  BuffettDetector,
  BuffettTradeBuilder,
  buildBuffettExplainability,
  detectBuffett,
  getBuffettMetrics,
  resetBuffettDetector,
  resetBuffettMetrics,
  resetBuffettTradeBuilder,
  type BuffettCurrentSnapshot,
  type BuffettDetectionContext,
  type BuffettManagementInputs,
  type BuffettMoatInputs,
  type BuffettStrategyInput,
  type BuffettYearlyFinancials,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function makeBreadth(score: number): BreadthAnalysis {
  return {
    advanceCount: 1000,
    declineCount: 700,
    unchangedCount: 50,
    advanceDeclineRatio: 1.4,
    netAdvances: 300,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 1,
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
      sector: "FMCG",
      score,
      trend: score >= 60 ? "Bull" : "Bear",
      relativeStrength: score,
      breadth: score,
      volume: 55,
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

function makeVolatility(score = 30): VolatilityAnalysis {
  return {
    score,
    regime: "Normal",
    trend: "Contracting",
    indiaVix: 11,
    atr: 1,
    historicalVolatility: 10,
    realizedVolatility: 9,
    gapPercent: 0.1,
    dailyRange: 0.8,
    intradayRange: 0.6,
    riskMode: "Neutral",
    confidence: 80,
    reasons: ["Vol"],
    vixTrend: "Contracting",
    vixMomentum: -1,
    atrExpansion: false,
    atrCompression: true,
    relativeVolatility: 0.7,
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
  regime: MarketRegime["regime"] = "Low Volatility",
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 70,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(60);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 60,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(30),
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
      strategyId: "buffett",
      name: "Buffett",
      category: "Position",
      eligible: true,
      priority: 40,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildHistory(options?: {
  negativeFcf?: boolean;
  volatileEps?: boolean;
}): BuffettYearlyFinancials[] {
  const out: BuffettYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = 10;
  for (let y = 2016; y <= 2025; y += 1) {
    if (options?.volatileEps) {
      eps = y % 2 === 0 ? 20 : 2;
    } else {
      eps *= 1.1;
    }
    revenue *= 1.08;
    const fcf = options?.negativeFcf ? -50 : revenue * 0.12;
    out.push({
      year: y,
      revenue,
      eps,
      operatingProfit: revenue * 0.2,
      netProfit: revenue * 0.12,
      operatingCashFlow: revenue * 0.15,
      freeCashFlow: fcf,
      operatingMargin: 0.2,
      netMargin: 0.12,
      grossMargin: 0.4,
      roe: 0.22,
      roce: 0.2,
      roic: 0.18,
    });
  }
  return out;
}

function wideMoat(): BuffettMoatInputs {
  return {
    brandStrength: 90,
    networkEffects: 80,
    switchingCosts: 85,
    costLeadership: 70,
    patents: 60,
    distributionAdvantage: 85,
    marketShare: 88,
    pricingPower: 90,
    recurringRevenue: 80,
    industryLeadership: 92,
  };
}

function narrowMoat(): BuffettMoatInputs {
  return {
    brandStrength: 65,
    networkEffects: 55,
    switchingCosts: 60,
    costLeadership: 58,
    patents: 50,
    distributionAdvantage: 60,
    marketShare: 62,
    pricingPower: 60,
    recurringRevenue: 58,
    industryLeadership: 65,
  };
}

function noMoat(): BuffettMoatInputs {
  return {
    brandStrength: 30,
    networkEffects: 20,
    switchingCosts: 25,
    costLeadership: 30,
    patents: 10,
    distributionAdvantage: 25,
    marketShare: 20,
    pricingPower: 25,
    recurringRevenue: 20,
    industryLeadership: 25,
  };
}

function excellentManagement(): BuffettManagementInputs {
  return {
    capitalAllocation: 90,
    corporateGovernance: 88,
    promoterIntegrity: 85,
    shareholderFriendliness: 80,
    dividendPolicy: 75,
    buybackQuality: 70,
    accountingQuality: 92,
    relatedPartyRisk: 15,
  };
}

function poorManagement(): BuffettManagementInputs {
  return {
    capitalAllocation: 35,
    corporateGovernance: 40,
    promoterIntegrity: 30,
    shareholderFriendliness: 35,
    dividendPolicy: 30,
    buybackQuality: 25,
    accountingQuality: 40,
    relatedPartyRisk: 75,
  };
}

function strongCurrent(
  overrides: Partial<BuffettCurrentSnapshot> = {}
): BuffettCurrentSnapshot {
  return {
    currentPrice: 100,
    intrinsicValueEstimate: 140,
    roe: 0.22,
    roce: 0.2,
    roic: 0.18,
    debtEquity: 0.2,
    currentRatio: 2,
    interestCoverage: 12,
    grossMargin: 0.4,
    operatingMargin: 0.2,
    netMargin: 0.12,
    bookValue: 50,
    pe: 22,
    pb: 4,
    evEbitda: 14,
    fcfYield: 0.05,
    promoterHolding: 0.45,
    promoterPledge: 0,
    institutionalHolding: 0.3,
    sector: "FMCG",
    industry: "Consumer",
    creditRating: "AAA",
    dividendHistoryYears: 10,
    shareBuybacks: true,
    governanceRedFlags: false,
    accountingConcerns: false,
    ...overrides,
  };
}

function makeIdealInput(
  overrides?: {
    moat?: BuffettMoatInputs;
    management?: BuffettManagementInputs;
    current?: Partial<BuffettCurrentSnapshot>;
    history?: BuffettYearlyFinancials[];
  }
): BuffettStrategyInput {
  const current = strongCurrent(overrides?.current);
  return {
    symbol: "QUALITY",
    lastPrice: current.currentPrice,
    buffett: {
      financialHistory: overrides?.history ?? buildHistory(),
      current,
      moat: overrides?.moat ?? wideMoat(),
      management: overrides?.management ?? excellentManagement(),
    },
  };
}

function makeContext(
  input: BuffettStrategyInput
): BuffettDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime("Low Volatility", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Buffett Quality Investing", () => {
  beforeEach(() => {
    resetBuffettDetector();
    resetBuffettTradeBuilder();
    resetBuffettMetrics();
  });

  afterEach(() => {
    resetBuffettDetector();
    resetBuffettTradeBuilder();
    resetBuffettMetrics();
  });

  it("qualifies Wide Moat Business", () => {
    const detection = detectBuffett(makeContext(makeIdealInput()));
    expect(detection.moat.classification).toBe("Wide Moat");
    expect(detection.recommendation).toBe("BUY");
  });

  it("recognizes Narrow Moat Business", () => {
    const detection = detectBuffett(
      makeContext(makeIdealInput({ moat: narrowMoat() }))
    );
    expect(detection.moat.classification).toBe("Narrow Moat");
  });

  it("recognizes High ROE Company", () => {
    const detection = detectBuffett(makeContext(makeIdealInput()));
    expect(detection.financial.roeOk).toBe(true);
  });

  it("recognizes Low Debt Company", () => {
    const detection = detectBuffett(makeContext(makeIdealInput()));
    expect(detection.financial.debtOk).toBe(true);
  });

  it("rejects Negative Cash Flow", () => {
    const detection = detectBuffett(
      makeContext(
        makeIdealInput({ history: buildHistory({ negativeFcf: true }) })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/cash flow|fcf|avoid|fail/);
  });

  it("rejects Weak Governance", () => {
    const detection = detectBuffett(
      makeContext(
        makeIdealInput({
          management: poorManagement(),
          current: { governanceRedFlags: true },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects High Promoter Pledge", () => {
    const detection = detectBuffett(
      makeContext(makeIdealInput({ current: { promoterPledge: 0.2 } }))
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/pledge/);
  });

  it("flags Overvalued Company", () => {
    const detection = detectBuffett(
      makeContext(
        makeIdealInput({
          current: {
            currentPrice: 200,
            intrinsicValueEstimate: 100,
            fcfYield: 0.01,
            pe: 45,
          },
        })
      )
    );
    expect(detection.valuation.status).toBe("Overvalued");
  });

  it("flags Undervalued Company", () => {
    const detection = detectBuffett(
      makeContext(
        makeIdealInput({
          current: {
            currentPrice: 80,
            intrinsicValueEstimate: 150,
            fcfYield: 0.06,
          },
        })
      )
    );
    expect(detection.valuation.status).toBe("Undervalued");
  });

  it("scores Excellent Management", () => {
    const detection = detectBuffett(
      makeContext(makeIdealInput({ management: excellentManagement() }))
    );
    expect(detection.management.score).toBeGreaterThanOrEqual(70);
  });

  it("scores Poor Management", () => {
    const detection = detectBuffett(
      makeContext(makeIdealInput({ management: poorManagement() }))
    );
    expect(detection.management.score).toBeLessThan(55);
  });

  it("computes Quality Score", () => {
    const detection = detectBuffett(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThan(0);
    expect(detection.qualityScore).toBeLessThanOrEqual(100);
  });

  it("computes Conviction Score", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new BuffettDetector().detect(context);
    const setup = new BuffettTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.conviction).toBeGreaterThan(0);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectBuffett(context);
    const setup = new BuffettTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildBuffettExplainability({
      detection,
      setup,
      institutionalHolding: input.buffett.current.institutionalHolding,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(
      /moat|roe|cash flow|management|margin of safety/i
    );
  });

  it("tracks Metrics", () => {
    resetBuffettMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectBuffett(context);
    new BuffettTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getBuffettMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new BuffettDetector().detect(null);
    expect(empty.recommendation).toBe("AVOID");
  });

  it("rejects No Moat businesses", () => {
    const detection = detectBuffett(
      makeContext(makeIdealInput({ moat: noMoat() }))
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(detection.moat.classification).toBe("No Moat");
  });
});
