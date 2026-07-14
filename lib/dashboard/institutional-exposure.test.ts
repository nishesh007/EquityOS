/**
 * Institutional dashboard exposure — presentation-only tests (Prompt 9F.R2).
 */

import { describe, expect, it } from "vitest";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildExplainabilityPanelView,
  buildPlatformInstitutionalBadges,
  buildRecommendationPanelView,
  buildTrustPanelView,
  buildValidationDetailsView,
  buildValidationMetricViews,
  isPlaceholderDisplay,
  scoreTone,
  trendFromDelta,
} from "@/lib/dashboard/institutional-exposure";
import { buildInstitutionalCandidateView } from "@/lib/opportunity-engine/institutional-presentation";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

function makeSnapshot(
  overrides?: Partial<InstitutionalPlatformSnapshot>
): InstitutionalPlatformSnapshot {
  return {
    platform: {
      overallHealthScore: 88,
      overallTrustScore: 84,
      overallReadiness: 82,
      overallCompliance: 80,
      overallSecurity: 78,
      overallReliability: 80,
      overallPerformance: 81,
      overallExplainability: 79,
      overallDocumentation: 70,
      overallCoverage: 90,
      overallCertification: 80,
      overallRisk: 20,
      overallValidationStatus: "healthy",
      engineCount: 20,
      registeredCount: 20,
      healthyCount: 18,
    },
    dashboard: {
      summary: {
        totalValidations: 42,
        passedValidations: 38,
        failedValidations: 3,
        warningCount: 2,
        criticalCount: 1,
        averageIntegrityScore: 86,
        averageTrustScore: 83,
        averageHallucinationScore: 12,
        historicalPerformanceScore: 80,
        recommendationQuality: 84,
        tradeSetupQuality: 82,
        generatedAt: "2026-07-14T10:00:00.000Z",
      },
      modules: [],
      health: {
        overallHealthScore: 87,
        overallClassification: "HEALTHY",
        validationEngineHealth: 90,
        ruleEngineHealth: 88,
        trustEngineHealth: 85,
        historicalEngineHealth: 80,
        recommendationHealth: 84,
        marketHealth: 78,
        technicalHealth: 80,
        fundamentalHealth: 76,
        deteriorating: false,
      },
      engineVersion: "9F.11.0",
    },
    trust: {
      averageTrustScore: 84,
      highestTrustScore: 96,
      lowestTrustScore: 55,
      averageTrend: 1.5,
      trustDistribution: {
        HIGH_TRUST: 20,
        REVIEW_REQUIRED: 5,
        LOW_TRUST: 2,
      },
      rejectedObjects: 2,
      validationRuntime: 1200,
      averageValidationRuntime: 28,
      totalCalculations: 27,
    },
    explainability: {
      generatedExplanations: 12,
      decisionTraces: 15,
      ruleCoverage: 88,
      confidenceCoverage: 76,
      averageExplanationTime: 14,
      explainabilityHealthScore: 82,
      snapshotCount: 3,
      lastRunAt: "2026-07-14T10:05:00.000Z",
    },
    ...overrides,
  };
}

function makeCandidate(): OpportunityCandidate {
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
    reason: "Breakout",
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
    expectedCatalyst: "Sector rotation",
    sectorStrength: 12,
    scanMetrics: { delivery_percent: 42 },
    firstDetectedAt: "2026-07-14T04:15:00.000Z",
    lastDetectedAt: "2026-07-14T05:00:00.000Z",
    lastUpdatedAt: "2026-07-14T05:15:00.000Z",
  };
}

describe("institutional exposure — validation card", () => {
  it("exposes required validation metrics with value/tone/trend/confidence/updated", () => {
    const metrics = buildValidationMetricViews(makeSnapshot());
    const labels = metrics.map((m) => m.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Overall Validation",
        "Historical Validation",
        "Confidence Validation",
        "Rule Validation",
        "Data Integrity",
        "Pipeline Health",
        "Trust Health",
        "Execution Quality",
        "Production Readiness",
        "Platform Health",
      ])
    );
    for (const metric of metrics) {
      expect(metric.displayValue).toBeTruthy();
      expect(metric.toneClass).toBeTruthy();
      expect(metric.trendLabel).toBeTruthy();
      expect(metric.lastUpdated).toBeTruthy();
      expect(metric.confidence).toBeTruthy();
      expect(metric.tooltip.description).toBeTruthy();
      expect(metric.tooltip.calculation).toBeTruthy();
      expect(metric.tooltip.meaning).toBeTruthy();
      expect(metric.tooltip.healthyRange).toBeTruthy();
      expect(metric.tooltip.lastUpdated).toBeTruthy();
      expect(isPlaceholderDisplay(metric.displayValue)).toBe(false);
    }
  });

  it("builds validation details drawer sections", () => {
    const details = buildValidationDetailsView(makeSnapshot());
    expect(details.overallSummary.length).toBeGreaterThan(0);
    expect(details.ruleExecution.length).toBeGreaterThan(0);
    expect(details.historicalValidation.length).toBeGreaterThan(0);
    expect(details.pipelineValidation.length).toBeGreaterThan(0);
    expect(details.confidenceAnalysis.length).toBeGreaterThan(0);
    expect(details.trustAnalysis.length).toBeGreaterThan(0);
    expect(details.executionTimeline.length).toBeGreaterThan(0);
    expect(details.warnings.length).toBeGreaterThan(0);
    expect(details.errors.length).toBeGreaterThan(0);
    expect(details.recommendation.length).toBeGreaterThan(0);
  });
});

describe("institutional exposure — trust panel", () => {
  it("maps Trust Engine outputs into panel view", () => {
    const view = buildTrustPanelView(makeSnapshot());
    expect(view.empty).toBe(false);
    expect(view.overallTrustScore.displayValue).toBe("84");
    expect(view.trustTrend).toBe("UP");
    expect(view.trustGrade).toMatch(/High Trust|Institutional/);
    expect(view.trustFactors.length).toBeGreaterThan(0);
    expect(view.positiveDrivers.length).toBeGreaterThan(0);
    expect(view.historicalTrust).toBe("80");
  });

  it("uses empty state when trust has no calculations", () => {
    const view = buildTrustPanelView(
      makeSnapshot({
        trust: {
          averageTrustScore: 0,
          highestTrustScore: 0,
          lowestTrustScore: 0,
          averageTrend: 0,
          trustDistribution: {},
          rejectedObjects: 0,
          validationRuntime: 0,
          averageValidationRuntime: 0,
          totalCalculations: 0,
        },
      })
    );
    expect(view.empty).toBe(true);
    expect(view.emptyMessage).toBe("Waiting For Next Scan");
  });
});

describe("institutional exposure — explainability panel", () => {
  it("exposes explainability fields from snapshot and candidate", () => {
    const snapshot = makeSnapshot();
    const candidate = buildInstitutionalCandidateView(makeCandidate(), snapshot);
    const view = buildExplainabilityPanelView(snapshot, candidate);
    expect(view.empty).toBe(false);
    expect(view.decisionTrace.length).toBeGreaterThan(0);
    expect(view.ruleExecutionOrder.length).toBeGreaterThan(0);
    expect(view.ruleContribution).not.toBe("Not Available");
    expect(view.confidenceBreakdown.length).toBeGreaterThan(0);
    expect(view.dependencyGraph.length).toBeGreaterThan(0);
    expect(view.healthScore).toBe("82");
  });
});

describe("institutional exposure — recommendation panel", () => {
  it("exposes recommendation reasoning from candidate view", () => {
    const snapshot = makeSnapshot();
    const candidate = buildInstitutionalCandidateView(makeCandidate(), snapshot);
    const view = buildRecommendationPanelView(snapshot, candidate);
    expect(view.empty).toBe(false);
    expect(view.whyThisStock[0]).toContain("Breakout");
    expect(view.supportingSignals.length).toBeGreaterThan(0);
    expect(view.expectedCatalyst).toBe("Sector rotation");
    expect(view.qualityScore).not.toMatch(/Pending|Not Available/);
  });

  it("shows waiting state without candidate", () => {
    const view = buildRecommendationPanelView(makeSnapshot(), null);
    expect(view.empty).toBe(true);
    expect(view.emptyMessage).toBe("Waiting For Next Scan");
  });
});

describe("institutional exposure — badges", () => {
  it("derives platform institutional badges from existing thresholds", () => {
    const badges = buildPlatformInstitutionalBadges(makeSnapshot());
    const labels = badges.map((b) => b.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Production Ready",
        "Validation Passed",
        "High Trust",
        "AI Verified",
        "Explainable",
        "Institutional Grade",
        "Pipeline Healthy",
      ])
    );
  });

  it("returns no badges when snapshot is empty", () => {
    expect(buildPlatformInstitutionalBadges(null)).toEqual([]);
  });
});

describe("institutional exposure — empty / tone helpers", () => {
  it("never treats institutional placeholders as live scores", () => {
    expect(isPlaceholderDisplay("N/A")).toBe(true);
    expect(isPlaceholderDisplay("Not Available")).toBe(true);
    expect(isPlaceholderDisplay("Pending Validation")).toBe(true);
    expect(isPlaceholderDisplay("Waiting For Next Scan")).toBe(true);
    expect(isPlaceholderDisplay("88")).toBe(false);
  });

  it("maps score tones and trends for UI", () => {
    expect(scoreTone(90)).toBe("excellent");
    expect(scoreTone(72)).toBe("healthy");
    expect(scoreTone(55)).toBe("caution");
    expect(scoreTone(20)).toBe("critical");
    expect(trendFromDelta(2)).toBe("UP");
    expect(trendFromDelta(-1)).toBe("DOWN");
    expect(trendFromDelta(0)).toBe("FLAT");
  });

  it("returns empty validation metrics for null snapshot", () => {
    expect(buildValidationMetricViews(null)).toEqual([]);
  });
});
