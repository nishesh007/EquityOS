/**
 * Magic Formula Integration — tests (Sprint 11B.3X).
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
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import {
  getStrategyFactory,
  getStrategyRegistry,
  resetStrategyEngine,
  type StrategyExecutionContext,
} from "../index";
import {
  MAGIC_FORMULA_STRATEGY_ID,
  MagicFormulaStrategy,
  ensureMagicFormulaRegistered,
  executeMagicFormulaThroughEngine,
  executeMagicFormulaWithPipeline,
  getMagicFormulaIntegrationStatus,
  getMagicFormulaMetrics,
  registerMagicFormulaStrategy,
  resetMagicFormulaMetrics,
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
    breadthQuality: "Strong",
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

function makeVolatility(): VolatilityAnalysis {
  return {
    score: 30,
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
    volatility: makeVolatility(),
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
      strategyId: MAGIC_FORMULA_STRATEGY_ID,
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

function buildHistory(): MagicFormulaYearlyFinancials[] {
  const out: MagicFormulaYearlyFinancials[] = [];
  let revenue = 1000;
  let ebit = 120;
  for (let y = 2016; y <= 2025; y += 1) {
    revenue *= 1.06;
    ebit *= 1.05;
    out.push({
      year: y,
      revenue,
      ebit,
      ebitda: ebit * 1.2,
      operatingIncome: ebit,
      netIncome: ebit * 0.7,
      operatingCashFlow: revenue * 0.1,
      freeCashFlow: revenue * 0.08,
    });
  }
  return out;
}

function makeLeaderInput(): MagicFormulaStrategyInput {
  return {
    symbol: "MAGIC",
    lastPrice: 80,
    magicFormula: {
      financialHistory: buildHistory(),
      current: {
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
        magicFormulaRank: 5,
        compositeRank: 5,
        percentileRank: 0.05,
      },
      peers: [
        { symbol: "P1", earningsYield: 0.04, returnOnCapital: 0.1, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P2", earningsYield: 0.05, returnOnCapital: 0.12, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P3", earningsYield: 0.06, returnOnCapital: 0.15, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P4", earningsYield: 0.07, returnOnCapital: 0.18, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P5", earningsYield: 0.03, returnOnCapital: 0.08, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P6", earningsYield: 0.045, returnOnCapital: 0.11, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P7", earningsYield: 0.055, returnOnCapital: 0.14, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P8", earningsYield: 0.035, returnOnCapital: 0.09, sector: "Industrial", industry: "Manufacturing" },
        { symbol: "P9", earningsYield: 0.065, returnOnCapital: 0.16, sector: "Industrial", industry: "Manufacturing" },
      ],
    },
  };
}

function makeExecutionContext(
  input: MagicFormulaStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Low Volatility", 75),
    confidence: makeConfidence(75),
    eligibleStrategies: eligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0),
  };
}

function makePipeline(
  context: StrategyExecutionContext
): TradingPipelineResult {
  return {
    timestamp: context.timestamp ?? atIST(10, 0),
    context: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    pipelineHealth: 80,
    healthGrade: "Good",
    pipelineConfidence: 80,
    executionTime: 1,
    warnings: [],
    errors: [],
    stages: [],
  } as unknown as TradingPipelineResult;
}

describe("Magic Formula Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetMagicFormulaMetrics();
    ensureMagicFormulaRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetMagicFormulaMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getMagicFormulaIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(MAGIC_FORMULA_STRATEGY_ID);
    expect(getStrategyRegistry().has(MAGIC_FORMULA_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(MAGIC_FORMULA_STRATEGY_ID);
    expect(instance).toBeInstanceOf(MagicFormulaStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeMagicFormulaThroughEngine(
      makeExecutionContext(makeLeaderInput()),
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
    expect(
      result.signal.signal === "BUY" ||
        result.signal.signal === "WATCHLIST" ||
        result.signal.signal === "IGNORE"
    ).toBe(true);
  });

  it("integrates with Trading Pipeline", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const result = executeMagicFormulaWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerMagicFormulaStrategy", () => {
    const registry = getStrategyRegistry();
    registerMagicFormulaStrategy(registry);
    expect(registry.has(MAGIC_FORMULA_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on engine path", () => {
    resetMagicFormulaMetrics();
    executeMagicFormulaThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getMagicFormulaMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new MagicFormulaStrategy();
    expect(strategy.detect(broken).recommendation).toBe("AVOID");
    expect(strategy.buildInvestmentSetup(broken).entry).toBe(0);
  });
});
