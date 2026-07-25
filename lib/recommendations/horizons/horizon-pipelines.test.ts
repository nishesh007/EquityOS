/**
 * Sprint 9F.2 — Horizon-First pipeline independence tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { OpportunityCandidate, OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  clearHorizonPipelineCache,
  HORIZON_METHODOLOGY,
  horizonPipelineIndependenceReport,
  runHorizonPipelines,
} from "@/lib/recommendations/horizons";
import { HORIZON_COLORS } from "@/lib/recommendations/horizons/colors";

function candidate(
  overrides: Partial<OpportunityCandidate> &
    Pick<OpportunityCandidate, "symbol" | "category">
): OpportunityCandidate {
  const { scanMetrics: scanOverride, quote: quoteOverride, ...rest } =
    overrides;
  const price =
    (scanOverride?.cmp as number | undefined) ??
    (typeof quoteOverride?.price === "number" ? quoteOverride.price : 1000);
  return {
    id: `${overrides.symbol}:${overrides.category}`,
    company: overrides.company ?? overrides.symbol,
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 72,
    entryZone: { low: price * 0.99, high: price * 1.01 },
    stopLoss: price * 0.96,
    target1: price * 1.05,
    target2: price * 1.1,
    target3: price * 1.16,
    riskReward: 2.2,
    confidencePercent: 70,
    reason: "test",
    firstDetectedAt: "2026-07-25T04:00:00.000Z",
    lastDetectedAt: "2026-07-25T04:00:00.000Z",
    lastUpdatedAt: "2026-07-25T04:00:00.000Z",
    pipelineEligible: true,
    opportunityScore: 70,
    quote: {
      price,
      volume: 800_000,
      ...quoteOverride,
    } as OpportunityCandidate["quote"],
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
    scanCount: 1,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("Horizon-First pipelines", () => {
  beforeEach(() => {
    clearHorizonPipelineCache();
  });

  it("uses distinct methodologies per horizon", () => {
    expect(HORIZON_METHODOLOGY.scalping).toBe("vwap_mean_reversion");
    expect(HORIZON_METHODOLOGY.intraday).toBe("intraday_atr_structure");
    expect(HORIZON_METHODOLOGY.btst).toBe("relative_volume_overnight");
    expect(HORIZON_METHODOLOGY.swing).toBe("trend_pullback");
    expect(HORIZON_METHODOLOGY.short_term).toBe("measured_breakout");
    expect(HORIZON_METHODOLOGY.medium_term).toBe("momentum_extension");
    expect(HORIZON_METHODOLOGY.long_term).toBe("value_accumulation");

    const methods = Object.values(HORIZON_METHODOLOGY);
    expect(new Set(methods).size).toBe(methods.length);
  });

  it("does not clone the same ranked list across all horizons", () => {
    const universe = [
      candidate({
        symbol: "SCALP1",
        category: "intraday",
        strategyId: "scalping",
        strategyName: "Scalping",
        scanMetrics: {
          atr: 8,
          volume_ratio: 2.5,
          change_percent: 0.9,
          momentum: 1.2,
          adx: 22,
          delivery_percent: 20,
          cmp: 500,
        },
        executedStrategyIds: ["scalping"],
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
        symbol: "MED1",
        category: "momentum",
        strategyId: "earnings-momentum",
        strategyName: "Earnings Momentum",
        scanMetrics: {
          atr: 30,
          fundamental_score: 65,
          roe: 16,
          revenue_growth: 18,
          pe: 20,
          relative_strength: 60,
          week52_momentum: 12,
          trend_score: 58,
          cmp: 900,
        },
      }),
    ];

    const snapshot = runHorizonPipelines(stateFrom(universe));
    const report = horizonPipelineIndependenceReport(snapshot);

    // Not all horizons share an identical symbol set.
    const symbolSets = Object.values(snapshot).map(
      (rows) => rows.map((r) => r.selection.symbol).sort().join(",")
    );
    expect(new Set(symbolSets).size).toBeGreaterThan(1);

    // Long-term methodology must not equal swing methodology on produced trades.
    const longMethods = report.methodologies.long_term;
    const swingMethods = report.methodologies.swing;
    if (longMethods.length && swingMethods.length) {
      expect(longMethods.some((m) => m === "value_accumulation" || m === "strategy_signal")).toBe(
        true
      );
      expect(swingMethods.every((m) => m !== "value_accumulation")).toBe(true);
    }

    // Justified-duplicate policy: at most 2 horizons per symbol without
    // independent thesis justification (primary + optional secondary).
    const appearances = new Map<string, number>();
    for (const rows of Object.values(snapshot)) {
      for (const row of rows) {
        appearances.set(
          row.selection.symbol,
          (appearances.get(row.selection.symbol) ?? 0) + 1
        );
      }
    }
    for (const count of appearances.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }

    // Holding labels must match horizon class (no swing-day leakage).
    for (const row of snapshot.medium_term) {
      expect(row.trade.holdingPeriod).toMatch(/Months/i);
      expect(row.trade.holdingPeriod).not.toMatch(/Trading Days/i);
    }
    for (const row of snapshot.short_term) {
      expect(row.trade.holdingPeriod).toMatch(/Months/i);
    }
    for (const row of snapshot.long_term) {
      expect(row.trade.holdingPeriod).toMatch(/Months/i);
      const midMatch = row.trade.holdingPeriod.match(
        /(\d+)\s*[–-]\s*(\d+)\s*Months/i
      );
      if (midMatch) {
        const midMonths =
          (Number(midMatch[1]) + Number(midMatch[2])) / 2;
        expect(midMonths).toBeGreaterThanOrEqual(11);
      }
    }
    for (const row of snapshot.btst) {
      expect(row.trade.holdingPeriod).toMatch(/Trading Days/i);
      expect(row.trade.holdingPeriod).not.toMatch(/Hours|Minutes/i);
    }

    // Confidence must be dispersed — never cluster at ~95.
    const confidences = Object.values(snapshot)
      .flat()
      .map((r) => r.recommendation.confidence);
    if (confidences.length >= 3) {
      const unique = new Set(confidences.map((c) => Math.round(c)));
      expect(unique.size).toBeGreaterThanOrEqual(2);
      expect(confidences.every((c) => c < 94.5 || c > 95.5)).toBe(true);
      expect(confidences.some((c) => c < 90)).toBe(true);
    }
  });

  it("attaches horizon quality explainability", () => {
    const snapshot = runHorizonPipelines(
      stateFrom([
        candidate({
          symbol: "SWING2",
          category: "swing",
          strategyId: "cup-and-handle",
          strategyName: "Cup & Handle",
          scanMetrics: {
            atr: 22,
            trend_score: 70,
            adx: 32,
            relative_strength: 65,
            ema20: 1005,
            ema50: 980,
            volume_ratio: 1.6,
            macd_histogram: 1.2,
            cmp: 1020,
          },
        }),
      ])
    );

    const swing = snapshot.swing[0];
    if (swing) {
      expect(swing.quality.whyThisHorizon.length).toBeGreaterThan(0);
      expect(swing.quality.qualifiedFactors.length).toBeGreaterThan(0);
      expect(swing.quality.targetMethodology.length).toBeGreaterThan(0);
      expect(swing.quality.holdingRationale.length).toBeGreaterThan(0);
      expect(swing.trade.methodology).not.toBe("value_accumulation");
    }
  });

  it("defines canonical horizon colors per product spec", () => {
    expect(HORIZON_COLORS.scalping.hex).toBe("#8B5CF6");
    expect(HORIZON_COLORS.scalping.identity).toBe("Purple");
    expect(HORIZON_COLORS.intraday.hex).toBe("#1E90FF");
    expect(HORIZON_COLORS.intraday.identity).toBe("Dodger Blue");
    expect(HORIZON_COLORS.btst.hex).toBe("#00C896");
    expect(HORIZON_COLORS.btst.identity).toBe("Emerald");
    expect(HORIZON_COLORS.swing.hex).toBe("#FF9800");
    expect(HORIZON_COLORS.swing.identity).toBe("Orange");
    expect(HORIZON_COLORS.short_term.hex).toBe("#F5B700");
    expect(HORIZON_COLORS.short_term.identity).toBe("Amber");
    expect(HORIZON_COLORS.medium_term.hex).toBe("#22D3EE");
    expect(HORIZON_COLORS.medium_term.identity).toBe("Cyan");
    expect(HORIZON_COLORS.long_term.hex).toBe("#EF4444");
    expect(HORIZON_COLORS.long_term.identity).toBe("Crimson");
  });
});
