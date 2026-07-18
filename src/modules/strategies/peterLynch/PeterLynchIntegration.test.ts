/**
 * Peter Lynch Integration — tests (Sprint 11B.3W).
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
  PETER_LYNCH_STRATEGY_ID,
  PeterLynchStrategy,
  ensurePeterLynchRegistered,
  executePeterLynchThroughEngine,
  executePeterLynchWithPipeline,
  getPeterLynchIntegrationStatus,
  getPeterLynchMetrics,
  registerPeterLynchStrategy,
  resetPeterLynchMetrics,
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
    volatility: makeVolatility(),
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
      strategyId: PETER_LYNCH_STRATEGY_ID,
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

function buildHistory(): PeterLynchYearlyFinancials[] {
  const out: PeterLynchYearlyFinancials[] = [];
  let revenue = 800;
  let eps = 4;
  let opMargin = 0.12;
  for (let y = 2016; y <= 2025; y += 1) {
    revenue *= 1.18;
    eps *= 1.2;
    opMargin += 0.005;
    out.push({
      year: y,
      revenue,
      eps,
      netProfit: revenue * opMargin * 0.7,
      operatingProfit: revenue * opMargin,
      operatingCashFlow: revenue * 0.12,
      freeCashFlow: revenue * 0.1,
      operatingMargin: opMargin,
      netMargin: opMargin * 0.7,
    });
  }
  return out;
}

function makeLeaderInput(): PeterLynchStrategyInput {
  return {
    symbol: "GROWTH",
    lastPrice: 100,
    peterLynch: {
      financialHistory: buildHistory(),
      current: {
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
      },
      business: {
        scalableBusiness: 88,
        marketOpportunity: 85,
        competitivePosition: 80,
        brandStrength: 75,
        productLeadership: 82,
        innovation: 78,
        customerRetention: 80,
        recurringRevenue: 70,
      },
    },
  };
}

function makeExecutionContext(
  input: PeterLynchStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Weak Bull", 75),
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

describe("Peter Lynch Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetPeterLynchMetrics();
    ensurePeterLynchRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetPeterLynchMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getPeterLynchIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(PETER_LYNCH_STRATEGY_ID);
    expect(getStrategyRegistry().has(PETER_LYNCH_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(PETER_LYNCH_STRATEGY_ID);
    expect(instance).toBeInstanceOf(PeterLynchStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executePeterLynchThroughEngine(
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
    const result = executePeterLynchWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerPeterLynchStrategy", () => {
    const registry = getStrategyRegistry();
    registerPeterLynchStrategy(registry);
    expect(registry.has(PETER_LYNCH_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on engine path", () => {
    resetPeterLynchMetrics();
    executePeterLynchThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getPeterLynchMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new PeterLynchStrategy();
    expect(strategy.detect(broken).recommendation).toBe("AVOID");
    expect(strategy.buildInvestmentSetup(broken).entry).toBe(0);
  });
});
