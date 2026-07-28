import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetQualityGateReportForTests,
  applyRecommendationQualityGate,
  evaluateRecommendationQuality,
  QUALITY_GATE_THRESHOLDS,
  type QualityGateMarketContext,
} from "@/lib/recommendations/quality-gate";
import type { HorizonRecommendation } from "@/lib/recommendations/horizons/types";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";

function candidate(
  overrides: Partial<OpportunityCandidate> = {}
): OpportunityCandidate {
  return {
    id: "TEST:swing",
    symbol: "TEST",
    company: "Test Co",
    category: "swing",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 80,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 116,
    riskReward: 2.5,
    confidencePercent: 80,
    reason: "ok",
    opportunityScore: 80,
    pipelineEligible: true,
    marketTrend: "Bullish",
    marketRegime: "Bullish",
    scanMetrics: {
      volume_ratio: 1.5,
      relative_strength: 60,
      trend_score: 70,
    },
    firstDetectedAt: "2026-07-28T10:00:00.000Z",
    lastDetectedAt: "2026-07-28T10:00:00.000Z",
    lastUpdatedAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

function row(
  overrides: {
    conviction?: number;
    riskReward?: number;
    horizonId?: HorizonRecommendation["horizonId"];
    action?: "BUY" | "SELL";
    metrics?: Record<string, number>;
    category?: OpportunityCandidate["category"];
  } = {}
): HorizonRecommendation {
  const c = candidate({
    scanMetrics: {
      volume_ratio: 1.5,
      relative_strength: 60,
      trend_score: 70,
      ...(overrides.metrics ?? {}),
    },
    category: overrides.category ?? "swing",
  });
  const horizonId = overrides.horizonId ?? "swing";
  const conviction = overrides.conviction ?? 80;
  const riskReward = overrides.riskReward ?? 2.5;
  return {
    horizonId,
    selection: {
      horizonId,
      symbol: c.symbol,
      company: c.company,
      side: "Long",
      score: 80,
      belongsBecause: ["test"],
      qualifiedFactors: [],
      rejectedFactors: [],
      horizonFitNotes: [],
      primaryStrategy: "Test Strategy",
      supportingStrategies: [],
      factors: [],
      sourceCandidate: c,
    },
    trade: {
      entry: 100,
      entryLow: 99,
      entryHigh: 101,
      stopLoss: 95,
      targets: [110, 116, 120],
      risk: 5,
      reward: 10,
      riskReward,
      expectedReturnPercent: 10,
      holdingPeriod: "2–8 weeks",
      holdingRationale: "test",
      targetMethodology: "test",
      methodology: "intraday_atr_structure",
    },
    recommendation: {
      id: `horizon:${horizonId}:TEST`,
      symbol: "TEST",
      company: "Test Co",
      category: c.category,
      action: overrides.action ?? "BUY",
      primaryStrategy: "Test Strategy",
      primaryStrategyId: horizonId,
      matchedStrategies: [],
      supportingStrategies: [],
      opposingStrategies: [],
      strategyCount: 1,
      agreementPercent: 80,
      conflictPercent: 0,
      opportunityScore: 80,
      frameworkScore: 80,
      confidence: conviction,
      conviction,
      entry: 100,
      stopLoss: 95,
      targets: [110, 116, 120],
      risk: 5,
      reward: 10,
      riskReward,
      holdingPeriod: "2–8 weeks",
      marketContext: "Bullish",
      marketRegime: "Bullish",
      riskMode: "Balanced",
      eligibility: { eligible: true, score: 80, reasons: [] },
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
      timestamp: "2026-07-28T10:00:00.000Z",
      source: "OpportunityEngine",
    },
    quality: {
      whyThisHorizon: [],
      qualifiedFactors: [],
      rejectedFactors: [],
      shorterLongerFit: [],
      primaryStrategy: "Test Strategy",
      supportingStrategies: [],
      holdingRationale: "test",
      targetMethodology: "test",
    },
  };
}

const bullMarket: QualityGateMarketContext = {
  regime: "Bullish",
  marketTrend: "Bullish",
  riskMode: "Risk-On",
  confidence: 70,
  breadthScore: 65,
};

function state(): OpportunityEngineState {
  return {
    tradingDate: "2026-07-28",
    lastScannedAt: "2026-07-28T10:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: 1,
    categories: emptyOpportunityCategories(),
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
  };
}

describe("Recommendation Quality Gate", () => {
  beforeEach(() => {
    __resetQualityGateReportForTests();
  });

  it("passes a strong institutional candidate", () => {
    expect(evaluateRecommendationQuality(row(), bullMarket)).toBeNull();
  });

  it("rejects low conviction", () => {
    expect(
      evaluateRecommendationQuality(row({ conviction: 40 }), bullMarket)
    ).toBe("LOW_CONVICTION");
  });

  it("rejects poor risk/reward", () => {
    expect(
      evaluateRecommendationQuality(row({ riskReward: 1.1 }), bullMarket)
    ).toBe("POOR_RISK_REWARD");
  });

  it("rejects low liquidity", () => {
    expect(
      evaluateRecommendationQuality(
        row({ metrics: { volume_ratio: 0.4, relative_strength: 60, trend_score: 70 } }),
        bullMarket
      )
    ).toBe("LOW_LIQUIDITY");
  });

  it("rejects bear regime + aggressive long", () => {
    expect(
      evaluateRecommendationQuality(row({ horizonId: "intraday" }), {
        ...bullMarket,
        regime: "Weak Bear",
        marketTrend: "Weak Bear",
      })
    ).toBe("REGIME_MISMATCH");
  });

  it("rejects weak breadth + breakout-like short_term", () => {
    expect(
      evaluateRecommendationQuality(
        row({ horizonId: "short_term", category: "breakout" }),
        { ...bullMarket, breadthScore: 30 }
      )
    ).toBe("WEAK_MARKET_BREADTH");
  });

  it("filters snapshot and builds report", () => {
    const snapshot = {
      scalping: [],
      intraday: [row({ horizonId: "intraday", conviction: 40 })],
      btst: [],
      swing: [row({ horizonId: "swing" })],
      short_term: [],
      medium_term: [],
      long_term: [],
    };
    const { snapshot: filtered, report } = applyRecommendationQualityGate(
      snapshot,
      state(),
      bullMarket
    );
    expect(report.candidatesEvaluated).toBe(2);
    expect(report.published).toBe(1);
    expect(report.rejected).toBe(1);
    expect(report.rejectionBreakdown.LOW_CONVICTION).toBe(1);
    expect(filtered.swing).toHaveLength(1);
    expect(filtered.intraday).toHaveLength(0);
    expect(QUALITY_GATE_THRESHOLDS.minConviction).toBe(55);
  });
});
