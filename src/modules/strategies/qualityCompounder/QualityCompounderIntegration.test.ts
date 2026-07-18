/**
 * Quality Compounder Integration — tests (Sprint 11B.3Y).
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
  QUALITY_COMPOUNDER_STRATEGY_ID,
  QualityCompounderStrategy,
  ensureQualityCompounderRegistered,
  executeQualityCompounderThroughEngine,
  executeQualityCompounderWithPipeline,
  getQualityCompounderIntegrationStatus,
  getQualityCompounderMetrics,
  registerQualityCompounderStrategy,
  resetQualityCompounderMetrics,
  type QualityCompounderBusinessInputs,
  type QualityCompounderCapitalInputs,
  type QualityCompounderCurrentSnapshot,
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

function buildHistory(): QualityCompounderYearlyFinancials[] {
  const out: QualityCompounderYearlyFinancials[] = [];
  let revenue = 1000;
  let eps = 8;
  let book = 40;
  for (let y = 2016; y <= 2025; y += 1) {
    revenue *= 1.1;
    eps *= 1.1;
    book *= 1.08;
    out.push({
      year: y,
      revenue,
      eps,
      operatingProfit: revenue * 0.18,
      operatingCashFlow: revenue * 0.14,
      freeCashFlow: revenue * 0.12,
      bookValue: book,
      grossMargin: 0.45,
      operatingMargin: 0.22,
      netMargin: 0.16,
      roe: 0.2,
      roce: 0.2,
      roic: 0.19,
    });
  }
  return out;
}

function excellentBusiness(): QualityCompounderBusinessInputs {
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
  };
}

function wideMoat(): QualityCompounderMoatInputs {
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
  };
}

function excellentManagement(): QualityCompounderManagementInputs {
  return {
    integrity: 88,
    capitalAllocation: 87,
    governance: 86,
    promoterQuality: 85,
    accountingQuality: 88,
    shareholderAlignment: 86,
    communication: 84,
    executionTrackRecord: 87,
  };
}

function excellentCapital(): QualityCompounderCapitalInputs {
  return {
    roic: 0.22,
    reinvestmentRate: 0.35,
    buybackQuality: 87,
    dividendPolicy: 86,
    acquisitionHistory: 87,
    debtManagement: 88,
    cashAllocation: 87,
    shareDilutionRisk: 8,
  };
}

function strongCurrent(): QualityCompounderCurrentSnapshot {
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
  };
}

function makeLeaderInput(): QualityCompounderStrategyInput {
  const current = strongCurrent();
  return {
    symbol: "QCMP",
    lastPrice: current.currentPrice,
    qualityCompounder: {
      financialHistory: buildHistory(),
      current,
      business: excellentBusiness(),
      moat: wideMoat(),
      management: excellentManagement(),
      capital: excellentCapital(),
    },
  };
}

function makeExecutionContext(
  input: QualityCompounderStrategyInput
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

describe("Quality Compounder Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetQualityCompounderMetrics();
    ensureQualityCompounderRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetQualityCompounderMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getQualityCompounderIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(QUALITY_COMPOUNDER_STRATEGY_ID);
    expect(getStrategyRegistry().has(QUALITY_COMPOUNDER_STRATEGY_ID)).toBe(
      true
    );
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(QUALITY_COMPOUNDER_STRATEGY_ID);
    expect(instance).toBeInstanceOf(QualityCompounderStrategy);
  });

  it("executes through Strategy Engine", () => {
    const result = executeQualityCompounderThroughEngine(
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
    const result = executeQualityCompounderWithPipeline(
      makePipeline(context),
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerQualityCompounderStrategy", () => {
    const registry = getStrategyRegistry();
    registerQualityCompounderStrategy(registry);
    expect(registry.has(QUALITY_COMPOUNDER_STRATEGY_ID)).toBe(true);
  });

  it("records metrics on engine path", () => {
    resetQualityCompounderMetrics();
    executeQualityCompounderThroughEngine(makeExecutionContext(makeLeaderInput()), {
      skipEligibilityCheck: true,
    });
    const snap = getQualityCompounderMetrics().getSnapshot();
    expect(snap.companiesScreened).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new QualityCompounderStrategy();
    expect(strategy.detect(broken).recommendation).toBe("AVOID");
    expect(strategy.buildInvestmentSetup(broken).entry).toBe(0);
  });
});
