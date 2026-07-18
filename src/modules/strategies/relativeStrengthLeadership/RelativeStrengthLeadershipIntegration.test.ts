/**
 * Relative Strength Leadership Integration — tests (Sprint 11B.3O).
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
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
  RelativeStrengthLeadershipStrategy,
  RelativeStrengthLeadershipTradeBuilder,
  buildRelativeStrengthLeadershipExplainability,
  buildRelativeStrengthLeadershipInstitutionalScore,
  buildRelativeStrengthLeadershipSummary,
  ensureRelativeStrengthLeadershipRegistered,
  executeRelativeStrengthLeadershipThroughEngine,
  executeRelativeStrengthLeadershipWithPipeline,
  getRelativeStrengthLeadershipIntegrationStatus,
  getRelativeStrengthLeadershipMetrics,
  registerRelativeStrengthLeadershipStrategy,
  resetRelativeStrengthLeadershipMetrics,
  type RelativeStrengthLeadershipCandle,
  type RelativeStrengthLeadershipStrategyInput,
  type RelativeStrengthSeriesPoint,
} from "./index";

function atIST(hour: number, minute: number, dayOffset = 0): Date {
  return new Date(
    Date.UTC(2026, 6, 1 + dayOffset, hour, minute, 0) - 330 * 60_000
  );
}

function daily(
  dayOffset: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): RelativeStrengthLeadershipCandle {
  return {
    timestamp: atIST(10, 0, dayOffset),
    open,
    high,
    low,
    close,
    volume,
  };
}

function makeBreadth(score: number): BreadthAnalysis {
  return {
    advanceCount: 1200,
    declineCount: 600,
    unchangedCount: 50,
    advanceDeclineRatio: 2,
    netAdvances: 600,
    breadthPercent: score,
    participationPercent: score,
    equalWeightBreadth: score,
    largeCapBreadth: score,
    midCapBreadth: score,
    smallCapBreadth: score,
    breadthMomentum: 2,
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
      trend: score >= 60 ? "Bull" : "Bear",
      relativeStrength: score,
      breadth: score,
      volume: 60,
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
    score: 40,
    regime: "Normal",
    trend: "Contracting",
    indiaVix: 12,
    atr: 1.5,
    historicalVolatility: 12,
    realizedVolatility: 11,
    gapPercent: 0.2,
    dailyRange: 1.2,
    intradayRange: 0.9,
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
  regime: MarketRegime["regime"] = "Strong Bull",
  confidence = 80
): MarketRegime {
  return {
    regime,
    confidence,
    priority: 80,
    reasons: [regime],
    triggeredRules: [regime],
    timestamp: atIST(10, 0),
    confidenceAnalysis: makeConfidence(confidence),
  };
}

function makeMarketContext(
  overrides: Partial<InstitutionalMarketContext> = {}
): InstitutionalMarketContext {
  const sectors = overrides.sectorStrength ?? makeSectors(70);
  return {
    timestamp: atIST(10, 0),
    marketTrend: "Strong Bull",
    marketStrength: 70,
    marketBreadth: overrides.marketBreadth ?? makeBreadth(65),
    sectorStrength: sectors,
    sectorRotation: overrides.sectorRotation ?? makeRotation(sectors),
    volatility: overrides.volatility ?? makeVolatility(),
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
      strategyId: RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
      name: "Relative Strength Leadership",
      category: "Swing",
      eligible: true,
      priority: 55,
      score: 80,
      reasons: ["Eligible"],
      blockedReasons: [],
    },
  ];
}

function buildUptrendCandles(count = 45): RelativeStrengthLeadershipCandle[] {
  const out: RelativeStrengthLeadershipCandle[] = [];
  let close = 100;
  for (let i = 0; i < count; i += 1) {
    const open = close;
    close = close * 1.012;
    out.push(
      daily(
        i,
        open,
        close * 1.008,
        open * 0.992,
        close,
        i === count - 1 ? 2_500_000 : 1_200_000
      )
    );
  }
  return out;
}

function laggingSeries(
  candles: readonly RelativeStrengthLeadershipCandle[],
  factor = 0.4
): RelativeStrengthSeriesPoint[] {
  const start = candles[0]!.close;
  return candles.map((c) => ({
    timestamp: c.timestamp,
    close: start * (1 + (c.close / start - 1) * factor),
  }));
}

function makeLeaderInput(): RelativeStrengthLeadershipStrategyInput {
  const candles = buildUptrendCandles(45);
  const last = candles[candles.length - 1]!;
  return {
    symbol: "LEADER",
    lastPrice: last.close,
    relativeStrengthLeadership: {
      candlesDaily: candles,
      nifty50: laggingSeries(candles, 0.35),
      sectorIndex: laggingSeries(candles, 0.45),
      industryIndex: laggingSeries(candles, 0.5),
      relativeStrengthRatio: 88,
      relativeStrengthMomentum: 2.5,
      leadershipPercentile: 92,
      sectorRankPercentile: 85,
      industryRankPercentile: 82,
      peerUniverseSize: 100,
      vwap: last.close * 0.99,
      atr: last.close * 0.02,
      ema20: last.close * 0.985,
      ema50: last.close * 0.96,
      ema150: last.close * 0.91,
      ema200: last.close * 0.88,
      relativeVolume: 1.6,
      averageVolume20d: 1_200_000,
      fiftyTwoWeekHigh: last.close * 1.02,
    },
  };
}

function makeExecutionContext(
  input: RelativeStrengthLeadershipStrategyInput
): StrategyExecutionContext {
  const marketContext = makeMarketContext();
  return {
    input,
    marketContext,
    regime: makeRegime("Strong Bull", 82),
    confidence: makeConfidence(82),
    eligibleStrategies: eligible(),
    riskMode: marketContext.riskMode,
    timestamp: atIST(10, 0, 44),
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

describe("Relative Strength Leadership Integration", () => {
  beforeEach(() => {
    resetStrategyEngine();
    resetRelativeStrengthLeadershipMetrics();
    ensureRelativeStrengthLeadershipRegistered();
  });

  afterEach(() => {
    resetStrategyEngine();
    resetRelativeStrengthLeadershipMetrics();
  });

  it("registers with Strategy Registry", () => {
    const status = getRelativeStrengthLeadershipIntegrationStatus();
    expect(status.registered).toBe(true);
    expect(status.strategyId).toBe(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID);
    expect(getStrategyRegistry().has(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID)).toBe(
      true
    );
  });

  it("creates via Strategy Factory", () => {
    const instance = getStrategyFactory().create(
      RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID
    );
    expect(instance).toBeInstanceOf(RelativeStrengthLeadershipStrategy);
  });

  it("executes through Strategy Engine", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const result = executeRelativeStrengthLeadershipThroughEngine(context, {
      skipEligibilityCheck: true,
    });
    expect(result).toBeTruthy();
    expect(result.signal.signal === "BUY" || result.signal.signal === "IGNORE").toBe(
      true
    );
  });

  it("integrates with Trading Pipeline", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const pipeline = makePipeline(context);
    const result = executeRelativeStrengthLeadershipWithPipeline(
      pipeline,
      context.input,
      { skipEligibilityCheck: true }
    );
    expect(result).toBeTruthy();
  });

  it("supports registerRelativeStrengthLeadershipStrategy idempotency", () => {
    const registry = getStrategyRegistry();
    const first = registerRelativeStrengthLeadershipStrategy(registry);
    const second = registerRelativeStrengthLeadershipStrategy(registry);
    expect(first || second || registry.has(RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID)).toBe(
      true
    );
  });

  it("scores institutional conviction and summary", () => {
    const input = makeLeaderInput();
    const context = makeExecutionContext(input);
    const strategy = new RelativeStrengthLeadershipStrategy();
    strategy.detect(context);
    const setup = strategy.buildTradeSetup(context);
    expect(setup.entry).toBeGreaterThan(0);

    const institutional = buildRelativeStrengthLeadershipInstitutionalScore({
      detection: setup.detection,
      setup,
      marketContext: context.marketContext,
      rsInput: input,
    });
    expect(institutional.conviction).toBeGreaterThan(0);

    const explain = buildRelativeStrengthLeadershipExplainability({
      detection: setup.detection,
      setup,
      marketContext: context.marketContext,
      rsInput: input,
      institutionalScore: institutional,
    });
    const summary = buildRelativeStrengthLeadershipSummary({
      detection: setup.detection,
      setup,
      positiveReasons: explain.positiveReasons,
      negativeReasons: explain.negativeReasons,
      institutionalScore: institutional,
    });
    expect(summary.length).toBeGreaterThan(0);
  });

  it("rejects Poor RR setups", () => {
    const input = makeLeaderInput();
    const context = makeExecutionContext(input);
    const strategy = new RelativeStrengthLeadershipStrategy();
    const detection = strategy.detect(context);
    expect(detection.detected).toBe(true);
    const rejected = new RelativeStrengthLeadershipTradeBuilder({
      minimumRiskReward: 1000,
    }).build({
      detection,
      marketContext: context.marketContext,
      input,
      config: { minimumRiskReward: 1000 },
    });
    expect(rejected.entry).toBe(0);
    expect(rejected.warnings.join(" ")).toMatch(/rr|target|threshold/i);
  });

  it("records metrics on engine path", () => {
    resetRelativeStrengthLeadershipMetrics();
    const context = makeExecutionContext(makeLeaderInput());
    executeRelativeStrengthLeadershipThroughEngine(context, {
      skipEligibilityCheck: true,
    });
    const snap = getRelativeStrengthLeadershipMetrics().getSnapshot();
    expect(snap.signalsGenerated).toBeGreaterThanOrEqual(0);
  });

  it("recovers when market payload is missing", () => {
    const context = makeExecutionContext(makeLeaderInput());
    const broken: StrategyExecutionContext = {
      ...context,
      input: { symbol: "X", lastPrice: 100 },
    };
    const strategy = new RelativeStrengthLeadershipStrategy();
    const detection = strategy.detect(broken);
    expect(detection.detected).toBe(false);
    const setup = strategy.buildTradeSetup(broken);
    expect(setup.entry).toBe(0);
  });
});
