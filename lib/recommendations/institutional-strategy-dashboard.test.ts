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
  selectInstitutionalStrategyDashboard,
  parseInstitutionalStrategyId,
} from "./institutional-strategy-dashboard";

function makeCandidate(
  overrides: Partial<OpportunityCandidate> &
    Pick<OpportunityCandidate, "symbol" | "category">
): OpportunityCandidate {
  const conviction = overrides.aiConvictionScore ?? 90;
  const { scanMetrics: scanOverride, quote: quoteOverride, ...rest } =
    overrides;
  const price = quoteOverride?.price ?? scanOverride?.cmp ?? 101.5;
  const priceNum = typeof price === "number" ? price : 101.5;
  return {
    id: `${overrides.symbol}:${overrides.category}`,
    company: overrides.company ?? `${overrides.symbol} Ltd`,
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
      symbol: overrides.symbol,
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
