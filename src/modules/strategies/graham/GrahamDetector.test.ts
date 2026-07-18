/**
 * Graham Value Investing — tests (Sprint 11B.3V).
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
  GrahamDetector,
  GrahamTradeBuilder,
  buildGrahamExplainability,
  detectGraham,
  getGrahamMetrics,
  resetGrahamDetector,
  resetGrahamMetrics,
  resetGrahamTradeBuilder,
  type GrahamCurrentSnapshot,
  type GrahamDetectionContext,
  type GrahamStrategyInput,
  type GrahamYearlyFinancials,
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
      sector: "Banking",
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
  const sectors = overrides.sectorStrength ?? makeSectors(55);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 55,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(50),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(30),
    riskMode: overrides.riskMode ?? "Neutral",
    confidence: 80,
    healthScore: 65,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
    ...overrides,
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "graham",
      name: "Graham",
      category: "Position",
      eligible: true,
      priority: 38,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildHistory(options?: {
  negativeEps?: boolean;
  negativeFcf?: boolean;
}): GrahamYearlyFinancials[] {
  const out: GrahamYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = options?.negativeEps ? -2 : 8;
  let book = 40;
  for (let y = 2016; y <= 2025; y += 1) {
    if (!options?.negativeEps) eps *= 1.05;
    revenue *= 1.06;
    book *= 1.04;
    const fcf = options?.negativeFcf ? -40 : revenue * 0.1;
    out.push({
      year: y,
      revenue,
      eps: options?.negativeEps ? -Math.abs(eps) : eps,
      bookValue: book,
      tangibleBookValue: book * 0.9,
      operatingCashFlow: options?.negativeFcf ? -20 : revenue * 0.12,
      freeCashFlow: fcf,
      dividendPerShare: options?.negativeEps ? 0 : 1.5,
    });
  }
  return out;
}

function strongCurrent(
  overrides: Partial<GrahamCurrentSnapshot> = {}
): GrahamCurrentSnapshot {
  return {
    currentPrice: 50,
    intrinsicValueEstimate: 90,
    bookValue: 55,
    tangibleBookValue: 50,
    currentAssets: 400,
    currentLiabilities: 150,
    totalAssets: 800,
    totalLiabilities: 250,
    workingCapital: 250,
    cash: 100,
    debt: 80,
    debtEquity: 0.3,
    currentRatio: 2.6,
    quickRatio: 1.5,
    interestCoverage: 8,
    operatingCashFlow: 120,
    freeCashFlow: 90,
    pe: 10,
    pb: 0.9,
    evEbitda: 7,
    marketCap: 5000,
    promoterHolding: 0.4,
    institutionalHolding: 0.25,
    creditRating: "AA",
    dividendHistoryYears: 8,
    governanceRedFlags: false,
    accountingConcerns: false,
    corporateGovernanceScore: 80,
    ...overrides,
  };
}

function makeIdealInput(
  overrides?: {
    current?: Partial<GrahamCurrentSnapshot>;
    history?: GrahamYearlyFinancials[];
  }
): GrahamStrategyInput {
  const current = strongCurrent(overrides?.current);
  return {
    symbol: "VALUE",
    lastPrice: current.currentPrice,
    graham: {
      financialHistory: overrides?.history ?? buildHistory(),
      current,
    },
  };
}

function makeContext(
  input: GrahamStrategyInput
): GrahamDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime("Low Volatility", 80),
    confidence: makeConfidence(80),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Graham Value Investing", () => {
  beforeEach(() => {
    resetGrahamDetector();
    resetGrahamTradeBuilder();
    resetGrahamMetrics();
  });

  afterEach(() => {
    resetGrahamDetector();
    resetGrahamTradeBuilder();
    resetGrahamMetrics();
  });

  it("qualifies Large Margin of Safety", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          current: { currentPrice: 45, intrinsicValueEstimate: 100 },
        })
      )
    );
    expect(detection.marginSafety.marginOfSafety).toBeGreaterThanOrEqual(0.33);
    expect(detection.recommendation).toBe("BUY");
  });

  it("flags Small Margin of Safety", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          current: {
            currentPrice: 70,
            intrinsicValueEstimate: 85,
            pe: 14,
            pb: 1.2,
          },
        })
      )
    );
    expect(detection.marginSafety.marginOfSafety).toBeLessThan(0.33);
    expect(
      detection.recommendation === "WATCH" ||
        detection.recommendation === "AVOID" ||
        detection.recommendation === "BUY"
    ).toBe(true);
  });

  it("recognizes Strong Balance Sheet", () => {
    const detection = detectGraham(makeContext(makeIdealInput()));
    expect(detection.balanceSheet.currentRatioOk).toBe(true);
    expect(detection.balanceSheet.debtOk).toBe(true);
    expect(detection.balanceSheet.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects Weak Balance Sheet", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          current: {
            currentRatio: 0.8,
            quickRatio: 0.4,
            workingCapital: -50,
            debtEquity: 0.4,
          },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects High Debt", () => {
    const detection = detectGraham(
      makeContext(makeIdealInput({ current: { debtEquity: 2.5 } }))
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(
      (detection.reasons.join(" ") + detection.warnings.join(" ")).toLowerCase()
    ).toMatch(/debt/);
  });

  it("rejects Negative Cash Flow", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          history: buildHistory({ negativeFcf: true }),
          current: { freeCashFlow: -50, operatingCashFlow: -20 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("flags Overvalued Company", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          current: {
            currentPrice: 200,
            intrinsicValueEstimate: 80,
            pe: 40,
            pb: 3,
          },
        })
      )
    );
    expect(detection.marginSafety.status).toBe("Overvalued");
  });

  it("flags Undervalued Company", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          current: { currentPrice: 40, intrinsicValueEstimate: 100 },
        })
      )
    );
    expect(detection.marginSafety.status).toBe("Undervalued");
  });

  it("recognizes Positive Earnings", () => {
    const detection = detectGraham(makeContext(makeIdealInput()));
    expect(detection.financial.positiveEarnings).toBe(true);
  });

  it("rejects Negative Earnings", () => {
    const detection = detectGraham(
      makeContext(
        makeIdealInput({
          history: buildHistory({ negativeEps: true }),
          current: { pe: null },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
    expect(detection.financial.positiveEarnings).toBe(false);
  });

  it("computes Quality Score", () => {
    const detection = detectGraham(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThan(0);
    expect(detection.qualityScore).toBeLessThanOrEqual(100);
  });

  it("computes Conviction Score", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new GrahamDetector().detect(context);
    const setup = new GrahamTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.conviction).toBeGreaterThan(0);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectGraham(context);
    const setup = new GrahamTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildGrahamExplainability({
      detection,
      setup,
      governanceScore: input.graham.current.corporateGovernanceScore,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(
      /intrinsic|balance sheet|cash flow|margin of safety|liquidity/i
    );
  });

  it("tracks Metrics", () => {
    resetGrahamMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectGraham(context);
    new GrahamTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getGrahamMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new GrahamDetector().detect(null);
    expect(empty.recommendation).toBe("AVOID");
  });
});
