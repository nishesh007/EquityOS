/**
 * Sprint 9F.3 — End-to-end calibration audit sample for Part 9 report.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  clearHorizonPipelineCache,
  getHorizonCalibrationAudit,
  HORIZON_HOLDING_ENVELOPES,
  runHorizonPipelines,
} from "@/lib/recommendations/horizons";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";

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
    scanCount: 9,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

describe("Sprint 9F.3 calibration audit sample", () => {
  beforeEach(() => clearHorizonPipelineCache());

  it("produces a complete audit report with horizon-consistent holdings", () => {
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
        symbol: "INTRA1",
        category: "intraday",
        strategyId: "orb",
        strategyName: "ORB",
        scanMetrics: {
          atr: 18,
          volume_ratio: 1.6,
          vwap: 990,
          adx: 26,
          trend_score: 55,
          cmp: 1000,
        },
        executedStrategyIds: ["orb"],
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
        symbol: "SHORT1",
        category: "breakout",
        strategyId: "earnings-momentum",
        strategyName: "Earnings Momentum",
        scanMetrics: {
          atr: 28,
          relative_strength: 66,
          week52_momentum: 14,
          revenue_growth: 18,
          trend_score: 60,
          volume_ratio: 1.7,
          price_to_52w_high: 0.93,
          cmp: 1100,
        },
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
    ];

    const snapshot = runHorizonPipelines(stateFrom(universe));
    const audit = getHorizonCalibrationAudit();
    expect(audit).toBeTruthy();

    for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
      const env = HORIZON_HOLDING_ENVELOPES[horizonId];
      for (const row of snapshot[horizonId]) {
        // Never cluster at ~95 — allow ≤93 or ≥96 only.
        expect(
          row.recommendation.confidence <= 93.05 ||
            row.recommendation.confidence >= 95.95
        ).toBe(true);
        expect(row.recommendationQualityScore ?? 0).toBeGreaterThanOrEqual(55);
        expect(row.trade.riskReward).toBeCloseTo(
          Math.abs(row.trade.targets[0] - row.trade.entry) /
            Math.abs(row.trade.entry - row.trade.stopLoss),
          2
        );

        if (horizonId === "scalping" || horizonId === "intraday") {
          expect(row.trade.holdingPeriod).toMatch(/Minutes|Hours|market close/i);
        } else if (horizonId === "btst" || horizonId === "swing") {
          expect(row.trade.holdingPeriod).toMatch(/Trading Days/i);
        } else {
          expect(row.trade.holdingPeriod).toMatch(/Months/i);
        }

        // Evidence string must mention horizon envelope membership.
        expect(
          audit!.evidence.some((e) =>
            e.startsWith(`${row.selection.symbol}@${horizonId}:`)
          )
        ).toBe(true);
        expect(env.label.length).toBeGreaterThan(0);
      }
    }

    const confidences = Object.values(snapshot)
      .flat()
      .map((r) => Math.round(r.recommendation.confidence));
    if (confidences.length >= 3) {
      expect(new Set(confidences).size).toBeGreaterThanOrEqual(2);
    }

    expect(audit!.qualityDistribution.from55to70 + audit!.qualityDistribution.from70to85 + audit!.qualityDistribution.above85).toBe(
      audit!.qualityScores.length
    );
  });
});
