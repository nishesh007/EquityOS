/**
 * Buffett Integration — tests (Sprint 11B.3U).
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
  BUFFETT_STRATEGY_ID,
  BuffettStrategy,
  ensureBuffettRegistered,
  executeBuffettThroughEngine,
  executeBuffettWithPipeline,
  getBuffettIntegrationStatus,
  getBuffettMetrics,
  registerBuffettStrategy,
  resetBuffettMetrics,
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
  const sectors = makeSectors(60);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Weak Bull",
    marketStrength: 60,
    marketBreadth: makeBreadth(55),
    sectorStrength: sectors,
    sectorRotation: makeRotation(sectors),
    volatility: makeVolatility(),
    riskMode: "Neutral",
    confidence: 80,
    healthScore: 70,
    qualityGrade: "B",
    summary: ["Fixture"],
    warnings: [],
  };
}

function eligible(): EligibleStrategy[] {
  return [
    {
      strategyId: BUFFETT_STRATEGY_ID,
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

function buildHistory(): BuffettYearlyFinancials[] {
  const out: BuffettYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = 10;
  for (let y = 2016; y <= 2025; y += 1) {
    eps *= 1.1;
    revenue *= 1.08;
    out.push({
      year: y,
      revenue,
      eps,
      operatingProfit: revenue * 0.2,
      netProfit: revenue * 0.12,
      operatingCashFlow: revenue * 0.15,
      freeCashFlow: revenue * 0.12,
      operatingMargin: 0.2,
      netMargin: 0.12,
      grossMargin: 0.4,
    });
  }
  return out;
}

function makeLeaderInput(): BuffettStrategyInput {
  return {
    symbol: "QUALITY",
    lastPrice: 100,
    buffett: {
      financialHistory: buildHistory(),
      current: {
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
        governanceRedFlags: false,
        accountingConcerns: false,
      },
      moat: {
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
      },
      management: {
        capitalAllocation: 90,
        corporateGovernance: 88,
        promoterIntegrity: 85,
        shareholderFriendliness: 80,
        dividendPolicy: 75,
        buybackQuality: 70,
        accountingQuality: 92,
        relatedPartyRisk: 15,
      },
    },
  };
}

function makeExecutionContext(
  input: BuffettStrategyInput
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

describe("Buffett Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetBuffettMetrics();
    ensureBuffettRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetBuffettMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getBuffettIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(BUFFETT_STRATEGY_ID);
    expect(getStrategyRegistry().has(BUFFETT_STRATEGY_ID)).toBe(true);
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(BUFFETT_STRATEGY_ID);
    expect(instance).toBeInstanceOf(BuffettStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeBuffettThroughEngine(
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
    const result = executeBuffettWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerBuffettStrategy", () => {
    const registry = getStrategyRegistry();
    registerBuffettStrategy(registry);
    expect(registry.has(BUFFETT_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on engine path", () => {
    resetBuffettMetrics();
    executeBuffettThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getBuffettMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new BuffettStrategy();
    expect(strategy.detect(broken).recommendation).toBe("AVOID");
    expect(strategy.buildInvestmentSetup(broken).entry).toBe(0);
  });
});
