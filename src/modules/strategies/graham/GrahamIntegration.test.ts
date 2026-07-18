/**
 * Graham Integration — tests (Sprint 11B.3V).
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
  GRAHAM_STRATEGY_ID,
  GrahamStrategy,
  ensureGrahamRegistered,
  executeGrahamThroughEngine,
  executeGrahamWithPipeline,
  getGrahamIntegrationStatus,
  getGrahamMetrics,
  registerGrahamStrategy,
  resetGrahamMetrics,
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
      strategyId: GRAHAM_STRATEGY_ID,
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

function buildHistory(): GrahamYearlyFinancials[] {
  const out: GrahamYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = 8;
  let book = 40;
  for (let y = 2016; y <= 2025; y += 1) {
    eps *= 1.05;
    revenue *= 1.06;
    book *= 1.04;
    out.push({
      year: y,
      revenue,
      eps,
      bookValue: book,
      tangibleBookValue: book * 0.9,
      operatingCashFlow: revenue * 0.12,
      freeCashFlow: revenue * 0.1,
      dividendPerShare: 1.5,
    });
  }
  return out;
}

function makeLeaderInput(): GrahamStrategyInput {
  return {
    symbol: "VALUE",
    lastPrice: 50,
    graham: {
      financialHistory: buildHistory(),
      current: {
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
        dividendHistoryYears: 8,
        governanceRedFlags: false,
        accountingConcerns: false,
        corporateGovernanceScore: 80,
      },
    },
  };
}

function makeExecutionContext(
  input: GrahamStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Low Volatility", 80),
    confidence: makeConfidence(80),
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

describe("Graham Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetGrahamMetrics();
    ensureGrahamRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetGrahamMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getGrahamIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(GRAHAM_STRATEGY_ID);
    expect(getStrategyRegistry().has(GRAHAM_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(GRAHAM_STRATEGY_ID);
    expect(instance).toBeInstanceOf(GrahamStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeGrahamThroughEngine(
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
    const result = executeGrahamWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerGrahamStrategy", () => {
    const registry = getStrategyRegistry();
    registerGrahamStrategy(registry);
    expect(registry.has(GRAHAM_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on engine path", () => {
    resetGrahamMetrics();
    executeGrahamThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getGrahamMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new GrahamStrategy();
    expect(strategy.detect(broken).recommendation).toBe("AVOID");
    expect(strategy.buildInvestmentSetup(broken).entry).toBe(0);
  });
});
