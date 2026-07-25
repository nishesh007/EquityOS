/**
 * Sprint 9F.4 — Mathematical consistency / integrity tests.
 */

import { describe, expect, it } from "vitest";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  auditRecommendationIntegrity,
  clearHorizonPipelineCache,
  computeCanonicalExpectedReturn,
  computeCanonicalRiskReward,
  EXPECTED_RETURN_DEFINITION,
  EFFECTIVE_ENTRY_DEFINITION,
  resolveEffectiveEntry,
  runHorizonPipelines,
  sealTradeMetrics,
} from "@/lib/recommendations/horizons";

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
      volume_ratio: 1.8,
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
    scanCount: 14,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("Sprint 9F.4 trade integrity", () => {
  it("documents a single Expected Return definition", () => {
    expect(EXPECTED_RETURN_DEFINITION).toBe("target1_from_effective_entry");
    expect(EFFECTIVE_ENTRY_DEFINITION).toBe("entry_range_midpoint");
  });

  it("Effective Entry is the midpoint of the entry range", () => {
    expect(
      resolveEffectiveEntry({ entry: 100, entryLow: 99, entryHigh: 101 })
    ).toBe(100);
    expect(resolveEffectiveEntry({ entry: 55 })).toBe(55);
  });

  it("Expected Return equals (T1 − Entry) / Entry × 100", () => {
    expect(
      computeCanonicalExpectedReturn({
        action: "BUY",
        effectiveEntry: 100,
        target1: 110,
      })
    ).toBe(10);
    expect(
      computeCanonicalExpectedReturn({
        action: "SELL",
        effectiveEntry: 100,
        target1: 90,
      })
    ).toBe(10);
  });

  it("Risk Reward equals Reward / Risk from Entry / Stop / T1", () => {
    const rr = computeCanonicalRiskReward({
      action: "BUY",
      effectiveEntry: 100,
      stopLoss: 95,
      target1: 110,
    });
    expect(rr).toEqual({ risk: 5, reward: 10, riskReward: 2 });
  });

  it("sealTradeMetrics rejects invalid BUY geometry", () => {
    expect(
      sealTradeMetrics({
        action: "BUY",
        entry: 100,
        entryLow: 99,
        entryHigh: 101,
        stopLoss: 105,
        targets: [110, 116, 122],
      })
    ).toBeNull();
  });

  it("every published recommendation passes integrity audit", () => {
    clearHorizonPipelineCache();
    const snapshot = runHorizonPipelines(
      stateFrom([
        candidate({
          symbol: "SWING1",
          category: "swing",
          strategyId: "ema-pullback",
          strategyName: "EMA Pullback",
          scanMetrics: {
            atr: 25,
            trend_score: 68,
            adx: 30,
            relative_strength: 62,
            ema20: 990,
            ema50: 970,
            volume_ratio: 1.4,
            cmp: 1000,
          },
        }),
        candidate({
          symbol: "LONG1",
          category: "ai_high_conviction",
          strategyId: "buffett",
          strategyName: "Buffett",
          scanMetrics: {
            atr: 40,
            fundamental_score: 78,
            roe: 22,
            revenue_growth: 16,
            pe: 18,
            volatility: 18,
            trend_score: 55,
            cmp: 1200,
          },
          institutionalScore: 80,
        }),
        candidate({
          symbol: "BTST1",
          category: "relative_volume",
          strategyId: "institutional-accumulation",
          strategyName: "Institutional Accumulation",
          scanMetrics: {
            atr: 15,
            volume_ratio: 2.2,
            closing_strength: 78,
            delivery_percent: 55,
            change_percent: 1.5,
            momentum: 2,
            cmp: 800,
          },
        }),
      ])
    );

    const audit = auditRecommendationIntegrity(snapshot);
    expect(audit.failed).toBe(0);
    expect(audit.passed).toBeGreaterThan(0);

    for (const rows of Object.values(snapshot)) {
      for (const row of rows) {
        const sealed = sealTradeMetrics({
          action: row.recommendation.action === "SELL" ? "SELL" : "BUY",
          entry: row.trade.entry,
          entryLow: row.trade.entryLow,
          entryHigh: row.trade.entryHigh,
          stopLoss: row.trade.stopLoss,
          targets: row.trade.targets,
        });
        expect(sealed).not.toBeNull();
        expect(row.recommendation.expectedReturnPercent).toBe(
          sealed!.expectedReturnPercent
        );
        expect(row.recommendation.riskReward).toBeCloseTo(
          sealed!.riskReward,
          2
        );
        expect(row.recommendation.entry).toBe(sealed!.effectiveEntry);
        // Displayed ER must equal T1 return — not a separate engine.
        const t1Pct =
          ((row.trade.targets[0] - row.trade.entry) / row.trade.entry) * 100;
        expect(row.trade.expectedReturnPercent).toBeCloseTo(t1Pct, 1);
      }
    }
  });
});
