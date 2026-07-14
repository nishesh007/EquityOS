/**
 * Institutional presentation mappers — UI exposure only (no engine mutation).
 */

import { describe, expect, it } from "vitest";
import {
  buildInstitutionalBadges,
  buildInstitutionalCandidateView,
  buildRecommendationTimeline,
  buildTomorrowWatchlistMeta,
  deriveSignalStability,
} from "@/lib/opportunity-engine/institutional-presentation";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

function makeCandidate(
  overrides?: Partial<OpportunityCandidate>
): OpportunityCandidate {
  return {
    id: "AAA:intraday",
    symbol: "AAA",
    company: "Alpha Ltd",
    category: "intraday",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 82,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 120,
    riskReward: 2.2,
    confidencePercent: 78,
    reason: "Breakout\nVolume",
    confidenceReasons: ["Breakout above resistance", "Volume expansion"],
    confidenceReasonContributions: [
      { label: "Breakout above resistance", contribution: 10 },
      { label: "Volume expansion", contribution: 8 },
      { label: "High volatility", contribution: -3 },
    ],
    convictionComponents: {
      technical: 70,
      momentum: 65,
      trend: 68,
      volume: 80,
      liquidity: 60,
      fundamentals: 55,
      relativeStrength: 62,
      rewardRisk: 70,
      marketRegime: 58,
    },
    scanMetrics: { delivery_percent: 42, volume_ratio: 1.8 },
    firstDetectedAt: "2026-07-14T04:15:00.000Z",
    lastDetectedAt: "2026-07-14T05:00:00.000Z",
    lastUpdatedAt: "2026-07-14T05:15:00.000Z",
    ...overrides,
  };
}

describe("institutional-presentation", () => {
  it("builds badges from existing candidate explainability fields", () => {
    const badges = buildInstitutionalBadges(makeCandidate(), {
      platform: {
        overallHealthScore: 90,
        overallTrustScore: 88,
        overallReadiness: 85,
        overallCompliance: 80,
        overallSecurity: 80,
        overallReliability: 80,
        overallPerformance: 80,
        overallExplainability: 82,
        overallDocumentation: 70,
        overallCoverage: 90,
        overallCertification: 80,
        overallRisk: 20,
        overallValidationStatus: "healthy",
        engineCount: 20,
        registeredCount: 20,
        healthyCount: 20,
      },
      dashboard: {
        summary: {
          totalValidations: 10,
          passedValidations: 9,
          failedValidations: 1,
          warningCount: 0,
          criticalCount: 0,
          averageIntegrityScore: 88,
          averageTrustScore: 86,
          averageHallucinationScore: 10,
          historicalPerformanceScore: 81,
          recommendationQuality: 84,
          tradeSetupQuality: 80,
          generatedAt: new Date().toISOString(),
        },
        modules: [],
        health: {
          overallHealthScore: 88,
          overallClassification: "HEALTHY",
          validationEngineHealth: 90,
          ruleEngineHealth: 88,
          trustEngineHealth: 86,
          historicalEngineHealth: 80,
          recommendationHealth: 84,
          marketHealth: 80,
          technicalHealth: 82,
          fundamentalHealth: 78,
          deteriorating: false,
        },
        engineVersion: "9F",
      },
      trust: {
        averageTrustScore: 86,
        highestTrustScore: 95,
        lowestTrustScore: 60,
        averageTrend: 1,
        trustDistribution: {},
        rejectedObjects: 0,
        validationRuntime: 12,
        averageValidationRuntime: 4,
        totalCalculations: 3,
      },
      explainability: {
        generatedExplanations: 2,
        decisionTraces: 2,
        ruleCoverage: 80,
        confidenceCoverage: 85,
        averageExplanationTime: 5,
        explainabilityHealthScore: 84,
        snapshotCount: 1,
        lastRunAt: new Date().toISOString(),
      },
    });

    const ids = badges.map((badge) => badge.id);
    expect(ids).toContain("AI_VERIFIED");
    expect(ids).toContain("VALIDATED");
    expect(ids).toContain("HIGH_CONFIDENCE");
    expect(ids).toContain("HIGH_QUALITY");
    expect(ids).toContain("HIGH_TRUST");
  });

  it("builds timeline only from available timestamps/events", () => {
    const timeline = buildRecommendationTimeline(makeCandidate(), null);
    expect(timeline.map((event) => event.id)).toEqual([
      "generated",
      "validated",
      "trust",
      "published",
      "updated",
    ]);
    expect(timeline.every((event) => event.at)).toBe(true);
  });

  it("hides unavailable platform metrics as null on candidate view", () => {
    const view = buildInstitutionalCandidateView(makeCandidate(), null, null);
    expect(view.overallScore).toBe(82);
    expect(view.confidence).toBe(78);
    expect(view.trustScore).toBeNull();
    expect(view.validationScore).toBeNull();
    expect(view.historicalSimilarity).toBeNull();
    expect(view.supportingFactors.length).toBeGreaterThan(0);
    expect(view.negativeFactors.length).toBeGreaterThan(0);
    expect(view.decisionTrace.length).toBeGreaterThan(0);
  });

  it("derives signal stability from detection window", () => {
    expect(deriveSignalStability(makeCandidate())).toBeGreaterThan(50);
  });

  it("builds tomorrow watchlist meta from post-market report fields", () => {
    const meta = buildTomorrowWatchlistMeta(
      {
        tomorrowWatchlist: [makeCandidate()],
        missedOpportunities: [],
        bestCallsOfDay: [],
        generatedAt: "2026-07-14T18:25:00.000Z",
        sessionDate: "2026-07-14",
        marketSummary: {
          narrative: "Mixed",
          strongestSector: { name: "IT", changePercent: 1.2 },
          weakestSector: { name: "Banking", changePercent: -0.8 },
          breadth: {
            advances: 1200,
            declines: 800,
            unchanged: 50,
            advanceRatio: 0.6,
          },
          institutionalFlow: { fii: 100, dii: 50, asOf: "2026-07-14" },
          topBreakouts: [],
          topBreakdowns: [],
          topVolumeShock: [],
        },
      },
      [makeCandidate()]
    );

    expect(meta.aiVersion).toBe("Sprint 9E");
    expect(meta.marketRegime).toBe("Bullish");
    expect(meta.expectedSuccess).toBe(78);
    expect(meta.validFromLabel).toContain("09:15");
    expect(meta.finalClosingScan).toBeTruthy();
  });
});
