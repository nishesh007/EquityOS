/**
 * Greenblatt Magic Formula — tests (Sprint 11B.3X).
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
  MagicFormulaDetector,
  MagicFormulaTradeBuilder,
  buildMagicFormulaExplainability,
  detectMagicFormula,
  getMagicFormulaMetrics,
  resetMagicFormulaDetector,
  resetMagicFormulaMetrics,
  resetMagicFormulaTradeBuilder,
  type MagicFormulaCurrentSnapshot,
  type MagicFormulaDetectionContext,
  type MagicFormulaPeerSnapshot,
  type MagicFormulaStrategyInput,
  type MagicFormulaYearlyFinancials,
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
    confidence: 75,
    healthScore: 65,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: "greenblatt",
      name: "Greenblatt",
      category: "Position",
      eligible: true,
      priority: 34,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildHistory(options?: {
  losses?: boolean;
  negativeFcf?: boolean;
}): MagicFormulaYearlyFinancials[] {
  const out: MagicFormulaYearlyFinancials[] = [];
  let revenue = 1000;
  let ebit = options?.losses ? -20 : 120;
  for (let y = 2016; y <= 2025; y += 1) {
    revenue *= 1.06;
    if (!options?.losses) ebit *= 1.05;
    const fcf = options?.negativeFcf ? -40 : revenue * 0.08;
    out.push({
      year: y,
      revenue,
      ebit: options?.losses ? -Math.abs(ebit) : ebit,
      ebitda: options?.losses ? -10 : ebit * 1.2,
      operatingIncome: options?.losses ? -Math.abs(ebit) : ebit,
      netIncome: options?.losses ? -30 : ebit * 0.7,
      operatingCashFlow: options?.negativeFcf ? -20 : revenue * 0.1,
      freeCashFlow: fcf,
    });
  }
  return out;
}

function strongPeers(): MagicFormulaPeerSnapshot[] {
  return [
    { symbol: "P1", earningsYield: 0.04, returnOnCapital: 0.1, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P2", earningsYield: 0.05, returnOnCapital: 0.12, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P3", earningsYield: 0.06, returnOnCapital: 0.15, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P4", earningsYield: 0.07, returnOnCapital: 0.18, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P5", earningsYield: 0.03, returnOnCapital: 0.08, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P6", earningsYield: 0.045, returnOnCapital: 0.11, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P7", earningsYield: 0.055, returnOnCapital: 0.14, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P8", earningsYield: 0.035, returnOnCapital: 0.09, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "P9", earningsYield: 0.065, returnOnCapital: 0.16, sector: "Industrial", industry: "Manufacturing" },
  ];
}

function weakPeers(): MagicFormulaPeerSnapshot[] {
  return [
    { symbol: "W1", earningsYield: 0.25, returnOnCapital: 0.5, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "W2", earningsYield: 0.22, returnOnCapital: 0.45, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "W3", earningsYield: 0.2, returnOnCapital: 0.4, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "W4", earningsYield: 0.18, returnOnCapital: 0.35, sector: "Industrial", industry: "Manufacturing" },
    { symbol: "W5", earningsYield: 0.15, returnOnCapital: 0.3, sector: "Industrial", industry: "Manufacturing" },
  ];
}

function strongCurrent(
  overrides: Partial<MagicFormulaCurrentSnapshot> = {}
): MagicFormulaCurrentSnapshot {
  return {
    currentPrice: 80,
    enterpriseValue: 1000,
    marketCap: 900,
    ebit: 150,
    ebitda: 180,
    revenue: 1200,
    operatingIncome: 150,
    netIncome: 100,
    cash: 100,
    debt: 200,
    workingCapital: 250,
    fixedAssets: 300,
    currentAssets: 400,
    currentLiabilities: 150,
    operatingCashFlow: 140,
    freeCashFlow: 110,
    roe: 0.2,
    roce: 0.18,
    roic: 0.16,
    pe: 12,
    pb: 2,
    evEbitda: 5.5,
    dividendYield: 0.02,
    debtEquity: 0.4,
    currentRatio: 2,
    institutionalHolding: 0.25,
    promoterHolding: 0.35,
    corporateGovernanceScore: 80,
    sector: "Industrial",
    industry: "Manufacturing",
    governanceRedFlags: false,
    accountingConcerns: false,
    ...overrides,
  };
}

function makeIdealInput(overrides?: {
  current?: Partial<MagicFormulaCurrentSnapshot>;
  history?: MagicFormulaYearlyFinancials[];
  peers?: MagicFormulaPeerSnapshot[];
}): MagicFormulaStrategyInput {
  const current = strongCurrent(overrides?.current);
  return {
    symbol: "MAGIC",
    lastPrice: current.currentPrice,
    magicFormula: {
      financialHistory: overrides?.history ?? buildHistory(),
      current,
      peers: overrides?.peers ?? strongPeers(),
    },
  };
}

function makeContext(
  input: MagicFormulaStrategyInput
): MagicFormulaDetectionContext {
  return {
    input,
    marketContext: makeMarketContext(),
    regime: makeRegime("Low Volatility", 75),
    confidence: makeConfidence(75),
    eligibleStrategies: eligible(),
    timestamp: atIST(10, 0),
  };
}

describe("Greenblatt Magic Formula", () => {
  beforeEach(() => {
    resetMagicFormulaDetector();
    resetMagicFormulaTradeBuilder();
    resetMagicFormulaMetrics();
  });

  afterEach(() => {
    resetMagicFormulaDetector();
    resetMagicFormulaTradeBuilder();
    resetMagicFormulaMetrics();
  });

  it("qualifies Top Ranked Company", () => {
    const detection = detectMagicFormula(makeContext(makeIdealInput()));
    expect(detection.ranking.percentileRank).toBeLessThanOrEqual(0.2);
    expect(detection.recommendation).toBe("BUY");
  });

  it("recognizes High Earnings Yield", () => {
    const detection = detectMagicFormula(makeContext(makeIdealInput()));
    expect(detection.earningsYield.earningsYield).toBeGreaterThanOrEqual(0.08);
  });

  it("recognizes High Return on Capital", () => {
    const detection = detectMagicFormula(makeContext(makeIdealInput()));
    expect(detection.roc.returnOnCapital).toBeGreaterThanOrEqual(0.2);
  });

  it("rejects Weak Cash Flow", () => {
    const detection = detectMagicFormula(
      makeContext(
        makeIdealInput({
          history: buildHistory({ negativeFcf: true }),
          current: { freeCashFlow: -50, operatingCashFlow: -20 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects Negative EBIT", () => {
    const detection = detectMagicFormula(
      makeContext(
        makeIdealInput({
          history: buildHistory({ losses: true }),
          current: { ebit: -50, operatingIncome: -40, netIncome: -30 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects High Debt", () => {
    const detection = detectMagicFormula(
      makeContext(makeIdealInput({ current: { debtEquity: 2.5 } }))
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("rejects Weak Governance", () => {
    const detection = detectMagicFormula(
      makeContext(
        makeIdealInput({
          current: { governanceRedFlags: true, corporateGovernanceScore: 20 },
        })
      )
    );
    expect(detection.recommendation).toBe("AVOID");
  });

  it("flags Low Ranked Company", () => {
    const detection = detectMagicFormula(
      makeContext(
        makeIdealInput({
          peers: weakPeers(),
          current: {
            ebit: 40,
            enterpriseValue: 1000,
            workingCapital: 200,
            fixedAssets: 400,
          },
        })
      )
    );
    expect(detection.ranking.percentileRank).toBeGreaterThan(0.4);
  });

  it("scores High Quality", () => {
    const detection = detectMagicFormula(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it("scores Low Quality", () => {
    const detection = detectMagicFormula(
      makeContext(
        makeIdealInput({
          peers: weakPeers(),
          history: buildHistory({ losses: true, negativeFcf: true }),
          current: {
            ebit: -20,
            freeCashFlow: -30,
            operatingCashFlow: -10,
            debtEquity: 2,
            governanceRedFlags: true,
            workingCapital: -50,
          },
        })
      )
    );
    expect(detection.qualityScore).toBeLessThan(55);
  });

  it("computes Quality Score", () => {
    const detection = detectMagicFormula(makeContext(makeIdealInput()));
    expect(detection.qualityScore).toBeGreaterThan(0);
    expect(detection.qualityScore).toBeLessThanOrEqual(100);
  });

  it("computes Conviction Score", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = new MagicFormulaDetector().detect(context);
    const setup = new MagicFormulaTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    expect(setup.conviction).toBeGreaterThan(0);
  });

  it("generates Explainability", () => {
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectMagicFormula(context);
    const setup = new MagicFormulaTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const explain = buildMagicFormulaExplainability({
      detection,
      setup,
      governanceScore: input.magicFormula.current.corporateGovernanceScore,
      institutionalHolding: input.magicFormula.current.institutionalHolding,
      institutionalScore: setup.institutionalScore,
    });
    expect(explain.summary.join(" ")).toMatch(
      /percentile|earnings yield|return on capital|cash flow|financial/i
    );
  });

  it("tracks Metrics", () => {
    resetMagicFormulaMetrics();
    const input = makeIdealInput();
    const context = makeContext(input);
    const detection = detectMagicFormula(context);
    new MagicFormulaTradeBuilder().build({
      detection,
      marketContext: context.marketContext,
      input,
    });
    const snap = getMagicFormulaMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(1);
  });

  it("recovers from Failure Recovery path", () => {
    const empty = new MagicFormulaDetector().detect(null);
    expect(empty.recommendation).toBe("AVOID");
  });
});
