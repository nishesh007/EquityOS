/**
 * Sprint 9F.6 — Summary card consistency + BUY/SELL conflict tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { selectInsightsResearchTerminal } from "@/lib/ai/insights-research";
import {
  clearHorizonPipelineCache,
  getConflictAudit,
  NO_RECOMMENDATION_AVAILABLE_MESSAGE,
  resolveRecommendationConflicts,
  runHorizonPipelines,
  selectHorizonDashboardSlots,
} from "@/lib/recommendations";
import type {
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";
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
    scanCount: 16,
    lastScannedAt: "2026-07-25T04:00:00.000Z",
    categories,
    isFrozen: false,
    isScanning: false,
    universeSize: candidates.length,
  } as OpportunityEngineState;
}

function stubRow(
  horizonId: HorizonRecommendation["horizonId"],
  symbol: string,
  side: "Long" | "Short",
  score = 70
): HorizonRecommendation {
  const action = side === "Short" ? "SELL" : "BUY";
  const entry = 100;
  const stop = side === "Short" ? 105 : 95;
  const targets =
    side === "Short"
      ? ([90, 85, 80] as [number, number, number])
      : ([108, 112, 118] as [number, number, number]);
  return {
    horizonId,
    selection: {
      horizonId,
      symbol,
      company: symbol,
      side,
      score,
      belongsBecause: [`${horizonId} thesis`],
      qualifiedFactors: ["Factor A", "Factor B"],
      rejectedFactors: [],
      horizonFitNotes: [],
      primaryStrategy: `${horizonId} strategy`,
      supportingStrategies: [],
      factors: [],
      sourceCandidate: candidate({
        symbol,
        category: "swing",
        side,
      }),
    },
    trade: {
      entry,
      entryLow: entry * 0.99,
      entryHigh: entry * 1.01,
      stopLoss: stop,
      targets,
      risk: 5,
      reward: 8,
      riskReward: 1.6,
      expectedReturnPercent: 8,
      holdingPeriod:
        horizonId === "intraday"
          ? "2–4 Hours"
          : horizonId === "long_term"
            ? "12–18 Months"
            : horizonId === "short_term"
              ? "1–2 Months"
              : horizonId === "medium_term"
                ? "3–6 Months"
                : "8–14 Trading Days",
      holdingRationale: "test",
      targetMethodology: "test",
      methodology: "trend_pullback",
    },
    recommendation: {
      id: `${horizonId}:${symbol}`,
      symbol,
      company: symbol,
      category: "swing",
      action,
      primaryStrategy: `${horizonId} strategy`,
      primaryStrategyId: horizonId,
      matchedStrategies: [],
      supportingStrategies: [],
      opposingStrategies: [],
      strategyCount: 1,
      agreementPercent: score,
      conflictPercent: 0,
      opportunityScore: score,
      frameworkScore: score,
      confidence: 70,
      conviction: 70,
      entry,
      stopLoss: stop,
      targets: [...targets],
      risk: 5,
      reward: 8,
      riskReward: 1.6,
      expectedReturnPercent: 8,
      holdingPeriod: "test",
      marketContext: "test",
      marketRegime: "test",
      riskMode: "Neutral",
      eligibility: { eligible: true, score, reasons: [] },
      reasons: [],
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
    },
    quality: {
      whyThisHorizon: [`${horizonId} thesis`],
      qualifiedFactors: ["Factor A"],
      rejectedFactors: [],
      shorterLongerFit: [],
      primaryStrategy: `${horizonId} strategy`,
      supportingStrategies: [],
      holdingRationale: "test",
      targetMethodology: "test",
    },
    recommendationQualityScore: score,
  };
}

function emptySnapshot(): HorizonPipelineSnapshot {
  const snap = {} as HorizonPipelineSnapshot;
  for (const id of INSTITUTIONAL_STRATEGY_IDS) snap[id] = [];
  return snap;
}

describe("Sprint 9F.6 card / table consistency", () => {
  beforeEach(() => clearHorizonPipelineCache());

  it("empty-state copy is No Recommendation Available", () => {
    expect(NO_RECOMMENDATION_AVAILABLE_MESSAGE).toBe(
      "No Recommendation Available"
    );
  });

  it("summary card pick matches the highest-ranked table row for that horizon", () => {
    const state = stateFrom([
      candidate({
        symbol: "SWING1",
        category: "swing",
        strategyId: "ema-pullback",
        strategyName: "EMA Pullback",
        aiConvictionScore: 70,
        confidencePercent: 68,
        scanMetrics: {
          cmp: 1000,
          atr: 25,
          trend_score: 68,
          adx: 30,
          relative_strength: 62,
          ema20: 990,
          ema50: 970,
          volume_ratio: 1.4,
          avg_volume_20d: 600_000,
          adtv_20d: 600_000_000,
          delivery_percent: 44,
        },
      }),
    ]);

    const slots = selectHorizonDashboardSlots(state);
    const terminal = selectInsightsResearchTerminal(state);
    const swingSlot = slots.find((s) => s.strategyId === "swing");
    const swingRows = terminal.swing;

    if (swingRows.length > 0) {
      expect(swingSlot?.pick).not.toBeNull();
      expect(swingSlot?.recommendationCount).toBe(swingRows.length);
      expect(swingSlot?.pick?.symbol).toBe(swingRows[0].symbol);
    } else {
      expect(swingSlot?.pick).toBeNull();
      expect(swingSlot?.recommendationCount ?? 0).toBe(0);
    }
  });

  it("never leaves a card empty when the matching table has rows", () => {
    const state = stateFrom([
      candidate({
        symbol: "MIDCONF",
        category: "swing",
        strategyId: "cup-and-handle",
        strategyName: "Cup & Handle",
        aiConvictionScore: 70,
        confidencePercent: 70,
        scanMetrics: {
          cmp: 1000,
          atr: 22,
          trend_score: 70,
          adx: 32,
          relative_strength: 65,
          ema20: 1005,
          ema50: 980,
          volume_ratio: 1.6,
          macd_histogram: 1.2,
          avg_volume_20d: 700_000,
          adtv_20d: 700_000_000,
          delivery_percent: 45,
        },
      }),
    ]);

    const slots = selectHorizonDashboardSlots(state);
    const terminal = selectInsightsResearchTerminal(state);

    for (const strategyId of INSTITUTIONAL_STRATEGY_IDS) {
      const slot = slots.find((s) => s.strategyId === strategyId);
      const rows = terminal[strategyId];
      if (rows.length > 0) {
        expect(slot?.pick).not.toBeNull();
      } else {
        expect(slot?.pick).toBeNull();
      }
    }
  });
});

describe("Sprint 9F.6 conflict validator", () => {
  it("retains Intraday SELL + Long Term BUY with explanation", () => {
    const snap = emptySnapshot();
    snap.intraday = [stubRow("intraday", "ABC", "Short", 72)];
    snap.long_term = [stubRow("long_term", "ABC", "Long", 80)];

    const { snapshot, audit } = resolveRecommendationConflicts(snap);
    expect(snapshot.intraday).toHaveLength(1);
    expect(snapshot.long_term).toHaveLength(1);
    expect(audit.retainedWithExplanation).toBeGreaterThanOrEqual(1);
    expect(
      snapshot.intraday[0].recommendation.reasons.some((r) =>
        /Conflict retained/i.test(r)
      )
    ).toBe(true);
  });

  it("removes the weaker side for Short Term SELL vs Medium Term BUY", () => {
    const snap = emptySnapshot();
    snap.short_term = [stubRow("short_term", "XYZ", "Short", 60)];
    snap.medium_term = [stubRow("medium_term", "XYZ", "Long", 85)];

    const { snapshot, audit } = resolveRecommendationConflicts(snap);
    expect(audit.removedWeaker).toBeGreaterThanOrEqual(1);
    expect(snapshot.medium_term).toHaveLength(1);
    expect(snapshot.short_term).toHaveLength(0);
  });

  it("allows same-side multi-horizon BUY without conflict", () => {
    const snap = emptySnapshot();
    snap.intraday = [stubRow("intraday", "SAME", "Long", 70)];
    snap.long_term = [stubRow("long_term", "SAME", "Long", 80)];

    const { snapshot, audit } = resolveRecommendationConflicts(snap);
    expect(audit.conflictsDetected).toBe(0);
    expect(snapshot.intraday).toHaveLength(1);
    expect(snapshot.long_term).toHaveLength(1);
  });

  it("pipeline exposes conflict audit", () => {
    clearHorizonPipelineCache();
    runHorizonPipelines(
      stateFrom([
        candidate({
          symbol: "SWING1",
          category: "swing",
          strategyId: "ema-pullback",
          scanMetrics: {
            cmp: 1000,
            atr: 25,
            trend_score: 68,
            adx: 30,
            relative_strength: 62,
            ema20: 990,
            ema50: 970,
            avg_volume_20d: 600_000,
            adtv_20d: 600_000_000,
          },
        }),
      ])
    );
    const audit = getConflictAudit();
    expect(audit).toBeTruthy();
    expect(audit!.symbolsScanned).toBeGreaterThanOrEqual(0);
  });
});
