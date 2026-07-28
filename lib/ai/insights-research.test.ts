/**
 * Sprint 9F.2 — Insights terminal via Horizon-First pipelines.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { selectInsightsResearchTerminal } from "@/lib/ai/insights-research";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { clearHorizonPipelineCache } from "@/lib/recommendations/horizons";

function baseCandidate(
  overrides: Partial<OpportunityCandidate> = {}
): OpportunityCandidate {
  return {
    id: "RELIANCE:swing",
    symbol: "RELIANCE",
    company: "Reliance Industries",
    category: "swing",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 88,
    entryZone: { low: 1480, high: 1520 },
    stopLoss: 1420,
    target1: 1600,
    target2: 1680,
    target3: 1760,
    riskReward: 2.4,
    confidencePercent: 82,
    reason: "EMA pullback with volume confirmation",
    confidenceReasons: ["EMA Alignment", "Volume Breakout"],
    scanMetrics: {
      cmp: 1500,
      sector: "Energy",
      volume: 2_500_000,
      avg_volume_20d: 1_800_000,
      adtv_20d: 1_800_000 * 1500,
      avg_turnover_20d: 1_800_000 * 1500,
      volume_ratio: 2.1,
      delivery_percent: 48,
      ema20: 1490,
      ema50: 1460,
      adx: 28,
      macd_histogram: 1.2,
      relative_strength: 62,
      rsi: 55,
      atr: 30,
      trend_score: 68,
      momentum: 3,
      change_percent: 1.4,
      closing_strength: 65,
      fundamental_score: 58,
      roe: 15,
      revenue_growth: 12,
      pe: 24,
      volatility: 22,
      week52_momentum: 9,
      price_to_52w_high: 0.91,
    },
    firstDetectedAt: "2026-07-25T04:00:00.000Z",
    lastDetectedAt: "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: "2026-07-25T04:00:00.000Z",
    pipelineEligible: true,
    eligibilityScore: 80,
    opportunityScore: 86,
    strategyId: "cup-and-handle",
    strategyName: "Cup & Handle Breakout",
    strategySignal: {
      strategy: "Cup & Handle Breakout",
      strategyId: "cup-and-handle",
      category: "swing",
      timeframe: "Daily",
      signal: "BUY",
      entry: 1500,
      stopLoss: 1420,
      target: 1680,
      target1: 1600,
      target2: 1680,
      holdingPeriod: "5–15 days",
      confidence: 82,
      conviction: 88,
      risk: 80,
      reward: 180,
      riskReward: 2.25,
      reasons: ["Cup & Handle breakout confirmed"],
      evidence: ["Volume expansion on breakout"],
      tags: ["swing", "breakout"],
      marketContext: "Bullish",
      marketRegime: "Trending",
      eligibility: { eligible: true, score: 80, reasons: ["Eligible"] },
      timestamp: "2026-07-25T04:00:00.000Z",
    },
    strategySignals: [
      {
        strategy: "Cup & Handle Breakout",
        strategyId: "cup-and-handle",
        category: "swing",
        timeframe: "Daily",
        signal: "BUY",
        entry: 1500,
        stopLoss: 1420,
        target: 1680,
        target1: 1600,
        target2: 1680,
        holdingPeriod: "5–15 days",
        confidence: 82,
        conviction: 88,
        risk: 80,
        reward: 180,
        riskReward: 2.25,
        reasons: ["Cup & Handle breakout confirmed"],
        evidence: ["Volume expansion on breakout"],
        tags: ["swing", "breakout"],
        marketContext: "Bullish",
        marketRegime: "Trending",
        eligibility: { eligible: true, score: 80, reasons: ["Eligible"] },
        timestamp: "2026-07-25T04:00:00.000Z",
      },
      {
        strategy: "EMA Pullback",
        strategyId: "ema-pullback",
        category: "swing",
        timeframe: "Daily",
        signal: "BUY",
        entry: 1495,
        stopLoss: 1430,
        target: 1650,
        target1: 1580,
        target2: 1650,
        holdingPeriod: "5–12 days",
        confidence: 76,
        conviction: 80,
        risk: 65,
        reward: 155,
        riskReward: 2.1,
        reasons: ["Pullback to EMA20"],
        evidence: ["EMA stack intact"],
        tags: ["swing", "ema"],
        marketContext: "Bullish",
        marketRegime: "Trending",
        eligibility: { eligible: true, score: 76, reasons: ["Eligible"] },
        timestamp: "2026-07-25T04:00:00.000Z",
      },
    ],
    strategyConsensus: {
      primaryStrategy: "EMA Pullback",
      primaryStrategyId: "ema-pullback",
      supportingStrategies: ["EMA Pullback", "Relative Strength Leadership"],
      opposingStrategies: [],
      agreementPercent: 80,
      conflictPercent: 0,
      agreementScore: 80,
      combinedScore: 84,
      finalConfidence: 82,
      conviction: 86,
      technicalFramework: ["EMA", "Cup & Handle"],
      fundamentalFramework: [],
      valuationFramework: [],
      growthFramework: [],
      combinedVerdict: "Bullish consensus",
    },
    executedStrategyIds: ["cup-and-handle", "ema-pullback"],
    marketTrend: "Bullish",
    marketRegime: "Trending",
    ...overrides,
  };
}

function makeState(
  candidates: OpportunityCandidate[]
): OpportunityEngineState {
  const categories = emptyOpportunityCategories();
  for (const candidate of candidates) {
    categories[candidate.category].push(candidate);
  }
  return {
    tradingDate: "2026-07-25",
    scanCount: 2,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("selectInsightsResearchTerminal (horizon-first)", () => {
  beforeEach(() => {
    clearHorizonPipelineCache();
  });

  it("builds swing recommendations with horizon quality explainability", () => {
    const terminal = selectInsightsResearchTerminal(
      makeState([baseCandidate()])
    );

    expect(terminal.swing.length).toBeGreaterThanOrEqual(1);
    const row = terminal.swing.find((r) => r.symbol === "RELIANCE");
    expect(row).toBeTruthy();
    expect(row!.matchedConditions.length).toBeGreaterThan(0);
    expect(row!.reasonsFor.length).toBeGreaterThan(0);
    expect(row!.aiExplanation.length).toBeGreaterThan(0);
    expect(row!.holdingPeriod).toMatch(/\d/);
    expect(row!.supportsTarget3).toBe(true);
  });

  it("keeps scalping and intraday as independent pipelines", () => {
    const scalp = baseCandidate({
      id: "SBIN:intraday",
      symbol: "SBIN",
      company: "SBI",
      category: "intraday",
      strategyId: "scalping",
      strategyName: "Scalping",
      executedStrategyIds: ["scalping"],
      strategySignal: {
        ...baseCandidate().strategySignal!,
        strategy: "Scalping",
        strategyId: "scalping",
        entry: 800,
        stopLoss: 792,
        target1: 808,
        target2: 812,
        target: 816,
      },
      scanMetrics: {
        ...baseCandidate().scanMetrics,
        cmp: 800,
        atr: 6,
        volume_ratio: 2.6,
        change_percent: 0.8,
        momentum: 1.1,
        adx: 24,
        delivery_percent: 22,
        trend_score: 48,
      },
      quote: {
        ...baseCandidate().quote!,
        symbol: "SBIN",
        price: 800,
      },
    });

    const session = baseCandidate({
      id: "TCS:intraday",
      symbol: "TCS",
      company: "TCS",
      category: "intraday",
      strategyId: "orb",
      strategyName: "Opening Range Breakout",
      executedStrategyIds: ["orb"],
      strategySignal: {
        ...baseCandidate().strategySignal!,
        strategy: "Opening Range Breakout",
        strategyId: "orb",
        entry: 3500,
        stopLoss: 3450,
        target1: 3580,
        target2: 3620,
        target: 3680,
      },
      scanMetrics: {
        ...baseCandidate().scanMetrics,
        cmp: 3500,
        atr: 45,
        volume_ratio: 1.5,
        change_percent: 1.1,
        momentum: 2,
        adx: 26,
        vwap: 3480,
        trend_score: 58,
        delivery_percent: 40,
      },
      quote: {
        ...baseCandidate().quote!,
        symbol: "TCS",
        price: 3500,
      },
    });

    const terminal = selectInsightsResearchTerminal(makeState([scalp, session]));

    const scalpSymbols = terminal.scalping.map((r) => r.symbol);
    const intraSymbols = terminal.intraday.map((r) => r.symbol);

    // Independent selection — not the same cloned list.
    expect(scalpSymbols.join(",")).not.toBe(intraSymbols.join(","));
  });
});
