/**
 * Sprint 9F.5 — Tradability / liquidity filter tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { buildHorizonUniverse } from "@/lib/recommendations/horizons/universe";
import {
  clearHorizonPipelineCache,
  getTradabilityAudit,
  runHorizonPipelines,
} from "@/lib/recommendations/horizons";
import {
  DEFAULT_TRADABILITY_THRESHOLDS,
  evaluateTradability,
  filterUniverseByTradability,
} from "@/lib/recommendations/tradability";

function candidate(
  overrides: Partial<OpportunityCandidate> &
    Pick<OpportunityCandidate, "symbol" | "category">
): OpportunityCandidate {
  const { scanMetrics: scanOverride, ...rest } = overrides;
  const price = (scanOverride?.cmp as number | undefined) ?? 1000;
  return {
    id: `${overrides.symbol}:${overrides.category}`,
    company: overrides.company ?? overrides.symbol,
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 72,
    entryZone: { low: price * 0.99, high: price * 1.01 },
    stopLoss: price * 0.96,
    target1: price * 1.08,
    target2: price * 1.14,
    target3: price * 1.22,
    riskReward: 2.2,
    confidencePercent: 70,
    reason: "test",
    firstDetectedAt: "2026-07-25T04:00:00.000Z",
    lastDetectedAt: "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: "2026-07-25T04:00:00.000Z",
    pipelineEligible: true,
    opportunityScore: 70,
    quote: { price, volume: 800_000 } as OpportunityCandidate["quote"],
    scanMetrics: {
      cmp: price,
      atr: 20,
      volume: 800_000,
      avg_volume_20d: 500_000,
      adtv_20d: 500_000 * price,
      avg_turnover_20d: 500_000 * price,
      volume_ratio: 1.6,
      change_percent: 1.2,
      momentum: 2,
      adx: 28,
      trend_score: 60,
      relative_strength: 58,
      delivery_percent: 42,
      closing_strength: 70,
      fundamental_score: 62,
      roe: 18,
      revenue_growth: 14,
      pe: 22,
      volatility: 22,
      ema20: price * 0.98,
      ema50: price * 0.96,
      vwap: price * 0.995,
      week52_momentum: 8,
      price_to_52w_high: 0.9,
      ...scanOverride,
    },
    ...rest,
  };
}

function stateFrom(candidates: OpportunityCandidate[]): OpportunityEngineState {
  const categories = {
    intraday: [] as OpportunityCandidate[],
    swing: [] as OpportunityCandidate[],
    breakout: [] as OpportunityCandidate[],
    momentum: [] as OpportunityCandidate[],
    relative_volume: [] as OpportunityCandidate[],
    mean_reversion: [] as OpportunityCandidate[],
    ai_high_conviction: [] as OpportunityCandidate[],
  };
  for (const c of candidates) {
    categories[c.category].push(c);
  }
  return {
    tradingDate: "2026-07-25",
    scanCount: 15,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("Sprint 9F.5 tradability engine", () => {
  beforeEach(() => clearHorizonPipelineCache());

  it("passes a deep liquid name with institutional ADTV", () => {
    const result = evaluateTradability(
      candidate({
        symbol: "RELIANCE",
        category: "swing",
        scanMetrics: {
          cmp: 1500,
          avg_volume_20d: 2_000_000,
          adtv_20d: 2_000_000 * 1500,
          volume_ratio: 1.4,
          delivery_percent: 48,
        },
      })
    );
    expect(result.tradable).toBe(true);
    expect(["A+", "A", "B", "C"]).toContain(result.grade);
    expect(result.score).toBeGreaterThanOrEqual(
      DEFAULT_TRADABILITY_THRESHOLDS.minScore
    );
  });

  it("rejects a one-day volume spike on thin 20d ADV (liquidity trap)", () => {
    const result = evaluateTradability(
      candidate({
        symbol: "THINCO",
        category: "relative_volume",
        scanMetrics: {
          cmp: 80,
          avg_volume_20d: 18_000,
          adtv_20d: 18_000 * 80,
          volume: 90_000,
          volume_ratio: 5.0,
          delivery_percent: 8,
        },
      })
    );
    expect(result.tradable).toBe(false);
    expect(result.grade).toBe("F");
    expect(
      result.reasons.some((r) => /trap|spike|ADV|ADTV|floor/i.test(r))
    ).toBe(true);
  });

  it("does not let high relative volume alone certify tradability", () => {
    const result = evaluateTradability(
      candidate({
        symbol: "SPIKEONLY",
        category: "intraday",
        scanMetrics: {
          cmp: 120,
          avg_volume_20d: 40_000,
          adtv_20d: 40_000 * 120,
          volume_ratio: 8.5,
          delivery_percent: 12,
        },
      })
    );
    expect(result.tradable).toBe(false);
  });

  it("rejects extremely wide bid-ask spreads when present", () => {
    const result = evaluateTradability(
      candidate({
        symbol: "WIDESPREAD",
        category: "swing",
        scanMetrics: {
          cmp: 1000,
          avg_volume_20d: 400_000,
          adtv_20d: 400_000_000,
          volume_ratio: 1.2,
          delivery_percent: 40,
          bid_ask_spread_pct: 2.5,
        },
      })
    );
    expect(result.tradable).toBe(false);
    expect(result.reasons.some((r) => /Bid-ask/i.test(r))).toBe(true);
  });

  it("filters universe before strategy ranking and reports removals", () => {
    const liquid = candidate({
      symbol: "LIQUID1",
      category: "swing",
      strategyId: "ema-pullback",
      scanMetrics: {
        cmp: 1000,
        atr: 25,
        avg_volume_20d: 600_000,
        adtv_20d: 600_000_000,
        volume_ratio: 1.5,
        delivery_percent: 45,
        trend_score: 68,
        adx: 30,
        relative_strength: 62,
        ema20: 990,
        ema50: 970,
      },
    });
    const trap = candidate({
      symbol: "TRAP1",
      category: "relative_volume",
      strategyId: "institutional-accumulation",
      scanMetrics: {
        cmp: 50,
        avg_volume_20d: 12_000,
        adtv_20d: 600_000,
        volume_ratio: 6.2,
        delivery_percent: 5,
        closing_strength: 80,
        change_percent: 4,
      },
    });

    const universe = buildHorizonUniverse(stateFrom([liquid, trap]));
    const { eligible, audit } = filterUniverseByTradability(universe);
    expect(audit.removed).toBeGreaterThanOrEqual(1);
    expect(eligible.map((m) => m.symbol)).toContain("LIQUID1");
    expect(eligible.map((m) => m.symbol)).not.toContain("TRAP1");
  });

  it("pipeline exposes tradability audit and never publishes trap names", () => {
    const snapshot = runHorizonPipelines(
      stateFrom([
        candidate({
          symbol: "SWING1",
          category: "swing",
          strategyId: "ema-pullback",
          strategyName: "EMA Pullback",
          scanMetrics: {
            cmp: 1000,
            atr: 25,
            avg_volume_20d: 700_000,
            adtv_20d: 700_000_000,
            volume_ratio: 1.4,
            delivery_percent: 44,
            trend_score: 68,
            adx: 30,
            relative_strength: 62,
            ema20: 990,
            ema50: 970,
          },
        }),
        candidate({
          symbol: "ILLIQUID",
          category: "momentum",
          strategyId: "earnings-momentum",
          scanMetrics: {
            cmp: 40,
            avg_volume_20d: 8_000,
            adtv_20d: 320_000,
            volume_ratio: 7.5,
            delivery_percent: 6,
            trend_score: 70,
            relative_strength: 70,
          },
        }),
      ])
    );

    const audit = getTradabilityAudit();
    expect(audit).toBeTruthy();
    expect(audit!.removed).toBeGreaterThanOrEqual(1);
    expect(audit!.rejections.some((r) => r.symbol === "ILLIQUID")).toBe(true);

    for (const rows of Object.values(snapshot)) {
      expect(rows.every((r) => r.selection.symbol !== "ILLIQUID")).toBe(true);
    }
  });
});
