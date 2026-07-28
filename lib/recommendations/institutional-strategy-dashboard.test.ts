/**
 * Sprint 9F.2 — Dashboard ranking via Horizon-First pipelines.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { clearHorizonPipelineCache } from "@/lib/recommendations/horizons";
import {
  __resetInstitutionalDashboardCacheForTests,
  filledSlotCount,
  parseInstitutionalStrategyId,
  rankInstitutionalSlotsFromRecommendations,
  resolveDashboardSlotsFromRecommendations,
  selectInstitutionalStrategyDashboard,
} from "./institutional-strategy-dashboard";
import type { SharedRecommendation } from "./shared-recommendation";

function makeCandidate(
  overrides: Partial<OpportunityCandidate> &
    Pick<OpportunityCandidate, "symbol" | "category">
): OpportunityCandidate {
  const conviction = overrides.aiConvictionScore ?? 90;
  const {
    scanMetrics: scanOverride,
    quote: quoteOverride,
    firstDetectedAt: firstDetectedOverride,
    lastDetectedAt: lastDetectedOverride,
    lastUpdatedAt: lastUpdatedOverride,
    symbol,
    category,
    ...rest
  } = overrides;
  const price = quoteOverride?.price ?? scanOverride?.cmp ?? 101.5;
  const priceNum = typeof price === "number" ? price : 101.5;
  return {
    id: `${symbol}:${category}`,
    company: overrides.company ?? `${symbol} Ltd`,
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: conviction,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 116,
    target3: 122,
    riskReward: 3.2,
    confidencePercent: conviction,
    reason: "Validated setup",
    opportunityScore: conviction,
    pipelineEligible: true,
    marketTrend: "Bullish",
    marketRegime: "Strong Bull",
    quote: {
      symbol,
      price: priceNum,
      change: 1.2,
      changePercent: 1.2,
      open: 100,
      high: 102,
      low: 99,
      previousClose: 100,
      vwap: 100.5,
      volume: 1_000_000,
      deliveryPercent: 40,
      weekHigh52: 120,
      weekLow52: 80,
      ...quoteOverride,
    } as OpportunityCandidate["quote"],
    scanMetrics: {
      cmp: priceNum,
      atr: 2.5,
      volume: 1_000_000,
      avg_volume_20d: 800_000,
      adtv_20d: 800_000 * priceNum,
      avg_turnover_20d: 800_000 * priceNum,
      volume_ratio: 1.8,
      change_percent: 1.2,
      momentum: 2,
      adx: 28,
      trend_score: 65,
      relative_strength: 60,
      delivery_percent: 45,
      closing_strength: 70,
      fundamental_score: 65,
      roe: 18,
      revenue_growth: 14,
      pe: 20,
      volatility: 20,
      ema20: 100,
      ema50: 98,
      vwap: 100.5,
      week52_momentum: 8,
      price_to_52w_high: 0.9,
      ...scanOverride,
    },
    ...rest,
    symbol,
    category,
    firstDetectedAt: firstDetectedOverride ?? "2026-07-25T04:00:00.000Z",
    lastDetectedAt: lastDetectedOverride ?? "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: lastUpdatedOverride ?? "2026-07-25T04:00:00.000Z",
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
    scanCount: 3,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("institutional strategy dashboard ranking (horizon-first)", () => {
  beforeEach(() => {
    __resetInstitutionalDashboardCacheForTests();
    clearHorizonPipelineCache();
  });

  it("returns seven slots from independent horizon pipelines", () => {
    const state = makeState([
      makeCandidate({
        symbol: "SWINGA",
        category: "swing",
        strategyId: "ema-pullback",
        strategyName: "EMA Pullback",
        aiConvictionScore: 92,
        scanMetrics: {
          atr: 3,
          trend_score: 70,
          adx: 32,
          relative_strength: 65,
          ema20: 101,
          ema50: 99,
          volume_ratio: 1.5,
          cmp: 101.5,
        },
      }),
      makeCandidate({
        symbol: "LONGA",
        category: "ai_high_conviction",
        strategyId: "buffett",
        strategyName: "Buffett",
        aiConvictionScore: 91,
        institutionalScore: 88,
        scanMetrics: {
          atr: 4,
          fundamental_score: 80,
          roe: 22,
          revenue_growth: 16,
          pe: 18,
          volatility: 18,
          trend_score: 55,
          cmp: 101.5,
        },
      }),
    ]);

    const slots = selectInstitutionalStrategyDashboard(state);
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.strategyId)).toEqual([
      "intraday",
      "swing",
      "btst",
      "scalping",
      "short_term",
      "medium_term",
      "long_term",
    ]);
  });

  it("parses strategy query ids", () => {
    expect(parseInstitutionalStrategyId("swing")).toBe("swing");
    expect(parseInstitutionalStrategyId("long_term")).toBe("long_term");
    expect(parseInstitutionalStrategyId("nope")).toBeNull();
  });

  it("does not assign the same OE category as the horizon identity", () => {
    // A relative_volume candidate may qualify for BTST, but Long Term uses
    // quality/valuation gates — not a remapped OE bucket.
    const state = makeState([
      makeCandidate({
        symbol: "RVOL1",
        category: "relative_volume",
        strategyId: "institutional-accumulation",
        strategyName: "Institutional Accumulation",
        aiConvictionScore: 90,
        scanMetrics: {
          atr: 2,
          volume_ratio: 2.4,
          closing_strength: 80,
          delivery_percent: 55,
          change_percent: 1.8,
          momentum: 2,
          cmp: 101.5,
          // Intentionally weak quality — must not leak into Long Term.
          fundamental_score: 38,
          roe: 7,
          revenue_growth: 2,
          pe: 55,
        },
      }),
    ]);

    const slots = selectInstitutionalStrategyDashboard(state);
    const btst = slots.find((s) => s.strategyId === "btst");
    const longTerm = slots.find((s) => s.strategyId === "long_term");
    // BTST may pick it; Long Term should not treat relative_volume as LT.
    if (btst?.pick) {
      expect(btst.pick.symbol).toBe("RVOL1");
    }
    if (longTerm?.pick) {
      expect(longTerm.pick.symbol).not.toBe("RVOL1");
    }
  });
});

function makeSharedRecommendation(
  overrides: Partial<SharedRecommendation> &
    Pick<SharedRecommendation, "symbol" | "category" | "primaryStrategyId">
): SharedRecommendation {
  return {
    id: `test:${overrides.symbol}`,
    company: overrides.company ?? `${overrides.symbol} Ltd`,
    action: "BUY",
    primaryStrategy: overrides.primaryStrategy ?? "Test Strategy",
    matchedStrategies: [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 80,
    conflictPercent: 0,
    opportunityScore: overrides.opportunityScore ?? 80,
    frameworkScore: 70,
    confidence: overrides.confidence ?? 75,
    conviction: overrides.conviction ?? 80,
    entry: 100,
    stopLoss: 95,
    targets: [110, 116, 122],
    risk: 5,
    reward: 10,
    riskReward: 2,
    holdingPeriod: "5–20 trading days",
    marketContext: "Bullish",
    marketRegime: "Strong Bull",
    riskMode: "Neutral",
    eligibility: { eligible: true, score: 80, reasons: [] },
    reasons: ["test"],
    evidence: [],
    matchedFrameworks: {
      technical: [],
      fundamental: [],
      valuation: [],
      growth: [],
    },
    validation: {
      valid: true,
      score: 100,
      checks: {
        tradeLevels: true,
        institutionalTradeLevels: true,
        confidence: true,
        opportunityScore: true,
        agreement: true,
        marketContext: true,
        marketRegime: true,
        eligibility: true,
      },
      reasons: [],
    },
    longTermRanking: null,
    timestamp: "2026-07-25T04:00:00.000Z",
    source: "OpportunityEngine",
    ...overrides,
  };
}

describe("dashboard slot projection fallback", () => {
  it("filledSlotCount counts only non-null picks", () => {
    const empty = rankInstitutionalSlotsFromRecommendations([], "t");
    expect(filledSlotCount(empty)).toBe(0);
    expect(empty).toHaveLength(7);
  });

  it("projects OE strategy ids onto horizons via category", () => {
    const recommendations = [
      makeSharedRecommendation({
        symbol: "INTR1",
        category: "intraday",
        primaryStrategyId: "opening-range-fade",
        conviction: 90,
      }),
      makeSharedRecommendation({
        symbol: "SWING1",
        category: "swing",
        primaryStrategyId: "opening-range-fade",
        conviction: 88,
      }),
      makeSharedRecommendation({
        symbol: "MOM1",
        category: "momentum",
        primaryStrategyId: "opening-range-fade",
        conviction: 85,
      }),
      makeSharedRecommendation({
        symbol: "AI1",
        category: "ai_high_conviction",
        primaryStrategyId: "opening-range-fade",
        conviction: 92,
      }),
      makeSharedRecommendation({
        symbol: "BRK1",
        category: "breakout",
        primaryStrategyId: "opening-range-fade",
        conviction: 84,
      }),
      makeSharedRecommendation({
        symbol: "RVOL1",
        category: "relative_volume",
        primaryStrategyId: "opening-range-fade",
        conviction: 83,
      }),
      makeSharedRecommendation({
        symbol: "MR1",
        category: "mean_reversion",
        primaryStrategyId: "opening-range-fade",
        conviction: 82,
      }),
    ];

    const slots = rankInstitutionalSlotsFromRecommendations(
      recommendations,
      "2026-07-25T04:00:00.000Z"
    );
    expect(slots).toHaveLength(7);
    expect(filledSlotCount(slots)).toBe(7);
    expect(slots.find((s) => s.strategyId === "intraday")?.pick?.symbol).toBe(
      "INTR1"
    );
    expect(slots.find((s) => s.strategyId === "swing")?.pick?.symbol).toBe(
      "SWING1"
    );
    expect(slots.find((s) => s.strategyId === "medium_term")?.pick?.symbol).toBe(
      "MOM1"
    );
    expect(slots.find((s) => s.strategyId === "long_term")?.pick?.symbol).toBe(
      "AI1"
    );
  });

  it("never lets an empty strategyDashboard override recommendations", () => {
    const emptyDashboard = rankInstitutionalSlotsFromRecommendations(
      [],
      "t"
    );
    expect(filledSlotCount(emptyDashboard)).toBe(0);

    const recommendations = Array.from({ length: 20 }, (_, i) =>
      makeSharedRecommendation({
        symbol: `SYM${i}`,
        category:
          i % 2 === 0
            ? "intraday"
            : i % 3 === 0
              ? "swing"
              : "ai_high_conviction",
        primaryStrategyId: "opening-range-fade",
        conviction: 70 + (i % 20),
      })
    );

    const resolved = resolveDashboardSlotsFromRecommendations({
      strategyDashboard: emptyDashboard,
      recommendations,
      lastScanTime: "2026-07-25T04:00:00.000Z",
    });

    expect(recommendations).toHaveLength(20);
    expect(resolved).toHaveLength(7);
    expect(filledSlotCount(resolved)).toBe(7);
  });

  it("re-ranks from recommendations when list is non-empty", () => {
    const populated = rankInstitutionalSlotsFromRecommendations(
      [
        makeSharedRecommendation({
          symbol: "KEEP1",
          category: "swing",
          primaryStrategyId: "swing",
          conviction: 99,
        }),
      ],
      "t"
    );
    expect(filledSlotCount(populated)).toBeGreaterThan(0);

    const live = [
      makeSharedRecommendation({
        symbol: "OTHER",
        category: "intraday",
        primaryStrategyId: "opening-range-fade",
        conviction: 50,
      }),
    ];

    const resolved = resolveDashboardSlotsFromRecommendations({
      strategyDashboard: populated,
      recommendations: live,
      lastScanTime: "2026-07-25T04:00:00.000Z",
    });

    expect(resolved.find((s) => s.pick?.symbol === "OTHER")).toBeTruthy();
    expect(resolved.find((s) => s.pick?.symbol === "KEEP1")).toBeFalsy();
  });

  it("keeps baked strategyDashboard when recommendations are empty", () => {
    const populated = rankInstitutionalSlotsFromRecommendations(
      [
        makeSharedRecommendation({
          symbol: "KEEP1",
          category: "swing",
          primaryStrategyId: "swing",
          conviction: 99,
        }),
      ],
      "t"
    );

    const resolved = resolveDashboardSlotsFromRecommendations({
      strategyDashboard: populated,
      recommendations: [],
      lastScanTime: "t",
    });

    expect(resolved).toBe(populated);
    expect(resolved.find((s) => s.pick?.symbol === "KEEP1")).toBeTruthy();
  });
});
