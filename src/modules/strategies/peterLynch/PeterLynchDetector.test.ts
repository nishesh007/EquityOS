/**
 * Peter Lynch GARP — tests (Sprint 11B.3W).
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
  PeterLynchDetector,
  PeterLynchTradeBuilder,
  buildPeterLynchExplainability,
  detectPeterLynch,
  getPeterLynchMetrics,
  resetPeterLynchDetector,
  resetPeterLynchMetrics,
  resetPeterLynchTradeBuilder,
  type PeterLynchBusinessInputs,
  type PeterLynchCurrentSnapshot,
  type PeterLynchDetectionContext,
  type PeterLynchStrategyInput,
  type PeterLynchYearlyFinancials,
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
      sector: "IT",
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
  confidence = 75
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
  const sectors = makeSectors(60);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 58,
    marketBreadth: makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(30),
    riskMode: "Neutral",
    confidence: 78,
    healthScore: 68,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "lynch",
      name: "Lynch",
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
  decliningMargins?: boolean;
  negativeFcf?: boolean;
  weakGrowth?: boolean;
}): PeterLynchYearlyFinancials[] {
  const out: PeterLynchYearlyFinancials[] = [];
  let revenue = options?.weakGrowth ? 1000 : 800;
  let eps = options?.weakGrowth ? 5 : 4;
  let opMargin = options?.decliningMargins ? 0.22 : 0.12;
  for (let y = 2016; y <= 2025; y += 1) {
    if (options?.weakGrowth) {
      revenue *= 1.02;
      eps *= 1.02;
    } else {
      revenue *= 1.18;
      eps *= 1.2;
    }
    if (options?.decliningMargins) opMargin -= 0.01;
    else opMargin += 0.005;
    const fcf = options?.negativeFcf ? -30 : revenue * 0.1;
    out.push({
      year: y,
      revenue,
      eps,
      netProfit: revenue * opMargin * 0.7,
      operatingProfit: revenue * opMargin,
      operatingCashFlow: options?.negativeFcf ? -10 : revenue * 0.12,
      freeCashFlow: fcf,
      operatingMargin: opMargin,
      netMargin: opMargin * 0.7,
      grossMargin: opMargin + 0.15,
    });
  }
  return out;
}

function excellentBusiness(): PeterLynchBusinessInputs {
  return {
    scalableBusiness: 88,
    marketOpportunity: 85,
    competitivePosition: 80,
    brandStrength: 75,
    productLeadership: 82,
    innovation: 78,
    customerRetention: 80,
    recurringRevenue: 70,
  };
}

function weakBusiness(): PeterLynchBusinessInputs {
  return {
    scalableBusiness: 30,
    marketOpportunity: 25,
    competitivePosition: 28,
    brandStrength: 20,
    productLeadership: 22,
    innovation: 18,
    customerRetention: 25,
    recurringRevenue: 15,
  };
}

function strongCurrent(
  overrides: Partial<PeterLynchCurrentSnapshot> = {}
): PeterLynchCurrentSnapshot {
  return {
    currentPrice: 100,
    intrinsicValueEstimate: 140,
    revenueCagr: 0.18,
    epsCagr: 0.2,
    pe: 18,
    peg: 0.9,
    pb: 4,
    evEbitda: 12,
    dividendYield: 0.01,
    roe: 0.22,
    roce: 0.18,
    roic: 0.15,
    debtEquity: 0.3,
    currentRatio: 1.8,
    interestCoverage: 10,
    grossMargin: 0.4,
    operatingMargin: 0.18,
    netMargin: 0.12,
    freeCashFlow: 200,
    operatingCashFlow: 250,
    marketCap: 50000,
    institutionalHolding: 0.28,
    promoterHolding: 0.4,
    promoterPledge: 0,
    sector: "IT",
    industry: "Software",
    corporateGovernanceScore: 80,
    analystGrowthEstimate: 0.2,
    governanceRedFlags: false,
    accountingConcerns: false,
    ...overrides,
  };
}

function makeIdealInput(overrides?: {
  current?: Partial<PeterLynchCurrentSnapshot>;
  business?: PeterLynchBusinessInputs;
  history?: PeterLynchYearlyFinancials[];
}): PeterLynchStrategyInput {
  const current = strongCurrent(overrides?.current);
  return {
    symbol: "GROWTH",
    lastPrice: current.currentPrice,
    peterLynch: {
      financialHistory: overrides?.history ?? buildHistory(),
      current,
      business: overrides?.business ?? excellentBusiness(),
    },
  };
}

function makeContext(
  input: PeterLynchStrategyInput
): PeterLynchDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime("Weak Bull", 75),
    confidence: makeConfidence(75),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Peter Lynch GARP", () => {
  beforeEach(() => {
    resetPeterLynchDetector();
    resetPeterLynchTradeBuilder();
    resetPeterLynchMetrics();
  });

  afterEach(() => {
    resetPeterLynchDetector();
    resetPeterLynchTradeBuilder();
    resetPeterLynchMetrics();
  });

  it("qualifies High Growth Low PEG", () => {
    const detection = detectPeterLynch(makeContext(makeIdealInput()));
    expect(detection.growth.grade === "Excellent" || detection.growth.grade === "Good").toBe(true);
    expect(detection.peg.pegRatio).toBeLessThanOrEqual(1.5);
    expect(detection.recommendation).toBe("BUY");
  });

  it("rejects High Growth High PEG", () => {
    const detection = detectPeterLynch(
      makeContext(
        makeIdealInput({
          current: { peg: 2.8, pe: 45 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(detection.peg.band).toBe("PEG > 2");
  });

  it("recognizes Strong Financials", () => {
    const detection = detectPeterLynch(makeContext(makeIdealInput()));
    expect(detection.financial.roeOk).toBe(true);
    expect(detection.financial.debtOk).toBe(true);
    expect(detection.financial.score).toBeGreaterThanOrEqual(65);
  });

  it("rejects Weak Financials", () => {
    const detection = detectPeterLynch(
      makeContext(
        makeIdealInput({
          current: {
            roe: 0.05,
            roce: 0.04,
            debtEquity: 2,
            currentRatio: 0.7,
            freeCashFlow: -50,
            operatingCashFlow: -20,
          },
          history: buildHistory({ negativeFcf: true, decliningMargins: true }),
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects Negative Cash Flow", () => {
    const detection = detectPeterLynch(
      makeContext(
        makeIdealInput({
          history: buildHistory({ negativeFcf: true }),
          current: { freeCashFlow: -40, operatingCashFlow: -10 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects High Debt", () => {
    const detection = detectPeterLynch(
      makeContext(makeIdealInput({ current: { debtEquity: 2.5 } }))
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("scores Excellent Business", () => {
    const detection = detectPeterLynch(
      makeContext(makeIdealInput({ business: excellentBusiness() }))
    );
    expect(detection.business.score).toBeGreaterThanOrEqual(70);
  });

  it("scores Weak Business", () => {
    const detection = detectPeterLynch(
      makeContext(makeIdealInput({ business: weakBusiness() }))
    );
    expect(detection.business.score).toBeLessThan(50);
  });

  it("scores High Quality", () => {
    const detection = detectPeterLynch(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it("scores Low Quality", () => {
    const detection = detectPeterLynch(
      makeContext(
        makeIdealInput({
          business: weakBusiness(),
          history: buildHistory({ weakGrowth: true, decliningMargins: true }),
          current: {
            revenueCagr: 0.02,
            epsCagr: 0.01,
            peg: 2.5,
            pe: 40,
            freeCashFlow: -10,
            debtEquity: 1.5,
            promoterPledge: 0.2,
            governanceRedFlags: true,
          },
        })
      )
    );
    expect(detection.qualityScore).toBeLessThan(55);
  });

  it("computes Quality Score", () => {
    const detection = detectPeterLynch(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThan(0);
    expect(detection.qualityScore).toBeLessThanOrEqual(100);
  });

  it("computes Conviction Score", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new PeterLynchDetector().detect(context);
    const setup = new PeterLynchTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.conviction).toBeGreaterThan(0);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectPeterLynch(context);
    const setup = new PeterLynchTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildPeterLynchExplainability({
      detection,
      setup,
      governanceScore: input.peterLynch.current.corporateGovernanceScore,
      institutionalHolding: input.peterLynch.current.institutionalHolding,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(
      /revenue|peg|scale|balance sheet|growth/i
    );
  });

  it("tracks Metrics", () => {
    resetPeterLynchMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectPeterLynch(context);
    new PeterLynchTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getPeterLynchMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new PeterLynchDetector().detect(null);
    expect(empty.recommendation).toBe("AVOID");
  });
});
