/**
 * Quality Compounder — tests (Sprint 11B.3Y).
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
  QUALITY_COMPOUNDER_STRATEGY_ID,
  QualityCompounderDetector,
  QualityCompounderTradeBuilder,
  buildQualityCompounderExplainability,
  detectQualityCompounder,
  getQualityCompounderMetrics,
  resetQualityCompounderDetector,
  resetQualityCompounderMetrics,
  resetQualityCompounderTradeBuilder,
  type QualityCompounderBusinessInputs,
  type QualityCompounderCapitalInputs,
  type QualityCompounderCurrentSnapshot,
  type QualityCompounderDetectionContext,
  type QualityCompounderManagementInputs,
  type QualityCompounderMoatInputs,
  type QualityCompounderStrategyInput,
  type QualityCompounderYearlyFinancials,
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
      sector: "Industrial",
      score,
      trend: "Bull",
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
    indiaVix: 12,
    atr: 1,
    historicalVolatility: 12,
    realizedVolatility: 11,
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
    grade: score >= 70 ? "Good" : "Moderate",
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

function makeMarketContext(): InstitutionalMarketContext {
  const sectors = makeSectors(55);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 55,
    marketBreadth: makeBreadth(50),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(30),
    riskMode: "Neutral",
    confidence: 80,
    healthScore: 65,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: QUALITY_COMPOUNDER_STRATEGY_ID,
      name: "Quality Compounder",
      category: "Position",
      eligible: true,
      priority: 36,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildHistory(options?: {
  negativeFcf?: boolean;
  lowRoic?: boolean;
}): QualityCompounderYearlyFinancials[] {
  const out: QualityCompounderYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = 8;
  let book = 40;
  for (let y = 2016; y <= 2025; y += 1) {
    revenue *= 1.1;
    eps *= 1.1;
    book *= 1.08;
    const fcf = options?.negativeFcf ? -40 : revenue * 0.12;
    out.push({
      year: y,
      revenue,
      eps,
      operatingProfit: revenue * 0.18,
      operatingCashFlow: options?.negativeFcf ? -20 : revenue * 0.14,
      freeCashFlow: fcf,
      bookValue: book,
      grossMargin: 0.45,
      operatingMargin: 0.22,
      netMargin: 0.16,
      roe: 0.2,
      roce: 0.2,
      roic: options?.lowRoic ? 0.05 : 0.19,
    });
  }
  return out;
}

function excellentBusiness(
  overrides: Partial<QualityCompounderBusinessInputs> = {}
): QualityCompounderBusinessInputs {
  return {
    businessSimplicity: 88,
    businessPredictability: 88,
    recurringRevenue: 85,
    pricingPower: 86,
    brandStrength: 87,
    distributionNetwork: 84,
    customerStickiness: 86,
    marketLeadership: 88,
    scalability: 85,
    industryPosition: 87,
    ...overrides,
  };
}

function weakBusiness(): QualityCompounderBusinessInputs {
  return {
    businessSimplicity: 35,
    businessPredictability: 30,
    recurringRevenue: 32,
    pricingPower: 28,
    brandStrength: 30,
    distributionNetwork: 35,
    customerStickiness: 32,
    marketLeadership: 28,
    scalability: 30,
    industryPosition: 33,
  };
}

function wideMoat(
  overrides: Partial<QualityCompounderMoatInputs> = {}
): QualityCompounderMoatInputs {
  return {
    brand: 88,
    networkEffects: 85,
    switchingCosts: 86,
    costAdvantage: 84,
    patents: 82,
    distribution: 87,
    technology: 85,
    regulatoryAdvantage: 80,
    scaleAdvantage: 86,
    recurringCustomers: 88,
    ...overrides,
  };
}

function narrowMoat(): QualityCompounderMoatInputs {
  return {
    brand: 60,
    networkEffects: 58,
    switchingCosts: 62,
    costAdvantage: 59,
    patents: 55,
    distribution: 61,
    technology: 57,
    regulatoryAdvantage: 54,
    scaleAdvantage: 60,
    recurringCustomers: 58,
  };
}

function excellentManagement(
  overrides: Partial<QualityCompounderManagementInputs> = {}
): QualityCompounderManagementInputs {
  return {
    integrity: 88,
    capitalAllocation: 87,
    governance: 86,
    promoterQuality: 85,
    accountingQuality: 88,
    shareholderAlignment: 86,
    communication: 84,
    executionTrackRecord: 87,
    ...overrides,
  };
}

function weakManagement(): QualityCompounderManagementInputs {
  return {
    integrity: 30,
    capitalAllocation: 28,
    governance: 25,
    promoterQuality: 30,
    accountingQuality: 25,
    shareholderAlignment: 28,
    communication: 30,
    executionTrackRecord: 27,
  };
}

function excellentCapital(
  overrides: Partial<QualityCompounderCapitalInputs> = {}
): QualityCompounderCapitalInputs {
  return {
    roic: 0.22,
    reinvestmentRate: 0.35,
    buybackQuality: 87,
    dividendPolicy: 86,
    acquisitionHistory: 87,
    debtManagement: 88,
    cashAllocation: 87,
    shareDilutionRisk: 8,
    ...overrides,
  };
}

function poorCapital(): QualityCompounderCapitalInputs {
  return {
    roic: 0.04,
    reinvestmentRate: 0.05,
    buybackQuality: 25,
    dividendPolicy: 20,
    acquisitionHistory: 22,
    debtManagement: 18,
    cashAllocation: 24,
    shareDilutionRisk: 80,
  };
}

function strongCurrent(
  overrides: Partial<QualityCompounderCurrentSnapshot> = {}
): QualityCompounderCurrentSnapshot {
  return {
    currentPrice: 100,
    intrinsicValueEstimate: 160,
    revenueCagr: 0.1,
    epsCagr: 0.1,
    pe: 22,
    pb: 4,
    peg: 1.2,
    evEbitda: 14,
    fcfYield: 0.05,
    roe: 0.2,
    roce: 0.2,
    roic: 0.19,
    debtEquity: 0.3,
    currentRatio: 2.2,
    interestCoverage: 10,
    grossMargin: 0.45,
    operatingMargin: 0.22,
    netMargin: 0.16,
    bookValue: 55,
    freeCashFlow: 120,
    operatingCashFlow: 150,
    dividendHistoryYears: 10,
    shareBuybacks: true,
    promoterHolding: 0.4,
    promoterPledge: 0,
    institutionalHolding: 0.25,
    sector: "Industrial",
    industry: "Manufacturing",
    corporateGovernanceScore: 85,
    creditRating: "AA",
    marketShare: 25,
    analystGrowthEstimate: 0.12,
    governanceRedFlags: false,
    accountingConcerns: false,
    businessDisruption: false,
    ...overrides,
  };
}

function makeIdealInput(overrides?: {
  current?: Partial<QualityCompounderCurrentSnapshot>;
  history?: QualityCompounderYearlyFinancials[];
  business?: Partial<QualityCompounderBusinessInputs>;
  moat?: Partial<QualityCompounderMoatInputs> | QualityCompounderMoatInputs;
  management?: Partial<QualityCompounderManagementInputs>;
  capital?: Partial<QualityCompounderCapitalInputs>;
}): QualityCompounderStrategyInput {
  const current = strongCurrent(overrides?.current);
  const moatInput =
    overrides?.moat && "brand" in overrides.moat
      ? (overrides.moat as QualityCompounderMoatInputs)
      : wideMoat(overrides?.moat);
  return {
    symbol: "QCMP",
    lastPrice: current.currentPrice,
    qualityCompounder: {
      financialHistory: overrides?.history ?? buildHistory(),
      current,
      business: excellentBusiness(overrides?.business),
      moat: moatInput,
      management: excellentManagement(overrides?.management),
      capital: excellentCapital(overrides?.capital),
    },
  };
}

function makeContext(
  input: QualityCompounderStrategyInput,
  regime: MarketRegime["regime"] = "Low Volatility"
): QualityCompounderDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime(regime, 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Quality Compounder", () => {
  beforeEach(() => {
    resetQualityCompounderDetector();
    resetQualityCompounderTradeBuilder();
    resetQualityCompounderMetrics();
  });

  afterEach(() => {
    resetQualityCompounderDetector();
    resetQualityCompounderTradeBuilder();
    resetQualityCompounderMetrics();
  });

  it("recognizes Wide Moat", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.moat.classification).toBe("Wide Moat");
    expect(detection.moat.score).toBeGreaterThanOrEqual(75);
  });

  it("recognizes Narrow Moat", () => {
    const detection = detectQualityCompounder(
      makeContext(makeIdealInput({ moat: narrowMoat() }))
    );
    expect(detection.moat.classification).toBe("Narrow Moat");
    expect(detection.moat.score).toBeGreaterThanOrEqual(55);
    expect(detection.moat.score).toBeLessThan(75);
  });

  it("qualifies Exceptional Compounder (BUY)", () => {
    const detection = detectQualityCompounder(
      makeContext(makeIdealInput(), "Weak Bull")
    );
    expect(detection.recommendation).toBe("BUY");
    expect(detection.business.grade).toMatch(/Exceptional|Excellent/);
  });

  it("rejects Weak Compounder", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          business: weakBusiness(),
          moat: {
            brand: 20,
            networkEffects: 15,
            switchingCosts: 18,
            costAdvantage: 12,
            patents: 10,
            distribution: 14,
            technology: 16,
            regulatoryAdvantage: 8,
            scaleAdvantage: 12,
            recurringCustomers: 15,
          },
        })
      )
    );
    expect(detection.business.grade).toBe("Weak");
    expect(detection.recommendation).toBe("AVOID");
  });

  it("recognizes High ROIC", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          current: { roic: 0.22 },
          capital: { roic: 0.22 },
        })
      )
    );
    expect(detection.capital.roic).toBeGreaterThanOrEqual(0.18);
    expect(detection.financial.positiveRoic).toBe(true);
  });

  it("rejects Low ROIC", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          current: { roic: 0.05 },
          capital: { roic: 0.05 },
          history: buildHistory({ lowRoic: true }),
        })
      )
    );
    expect(detection.financial.positiveRoic).toBe(false);
    expect(detection.recommendation).toBe("AVOID");
  });

  it("recognizes Strong Governance", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.management.governanceRedFlags).toBe(false);
    expect(detection.management.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects Weak Governance", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          current: {
            governanceRedFlags: true,
            corporateGovernanceScore: 20,
          },
          management: weakManagement(),
        })
      )
    );
    expect(detection.management.governanceRedFlags).toBe(true);
    expect(detection.recommendation).toBe("AVOID");
  });

  it("recognizes Excellent Capital Allocation", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.capital.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects Poor Capital Allocation", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          capital: poorCapital(),
          current: { roic: 0.04 },
        })
      )
    );
    expect(detection.capital.score).toBeLessThan(40);
    expect(detection.recommendation).toBe("AVOID");
  });

  it("accepts Positive FCF", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.financial.positiveFcf).toBe(true);
  });

  it("rejects Negative FCF", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          history: buildHistory({ negativeFcf: true }),
          current: { freeCashFlow: -50, operatingCashFlow: -20 },
        })
      )
    );
    expect(detection.financial.positiveFcf).toBe(false);
    expect(detection.recommendation).toBe("AVOID");
  });

  it("scores High Quality", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it("scores Low Quality", () => {
    const detection = detectQualityCompounder(
      makeContext(
        makeIdealInput({
          business: weakBusiness(),
          capital: poorCapital(),
          management: weakManagement(),
          history: buildHistory({ negativeFcf: true, lowRoic: true }),
          current: {
            freeCashFlow: -40,
            roic: 0.04,
            debtEquity: 1.5,
            governanceRedFlags: true,
          },
        })
      )
    );
    expect(detection.qualityScore).toBeLessThan(55);
  });

  it("computes Quality Score", () => {
    const detection = detectQualityCompounder(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThan(0);
    expect(detection.qualityScore).toBeLessThanOrEqual(100);
  });

  it("computes Conviction Score", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new QualityCompounderDetector().detect(context);
    const setup = new QualityCompounderTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.conviction).toBeGreaterThan(0);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectQualityCompounder(context);
    const setup = new QualityCompounderTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildQualityCompounderExplainability({
      detection,
      setup,
      governanceScore: input.qualityCompounder.current.corporateGovernanceScore,
      institutionalHolding: input.qualityCompounder.current.institutionalHolding,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(
      /moat|ROIC|capital allocation|cash flow|compounding/i
    );
  });

  it("tracks Metrics", () => {
    resetQualityCompounderMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectQualityCompounder(context);
    new QualityCompounderTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getQualityCompounderMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new QualityCompounderDetector().detect(null);
    expect(empty.recommendation).toBe("AVOID");
  });
});
