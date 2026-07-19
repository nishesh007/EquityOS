/**
 * Institutional history presentation — tests (read-only timeline / audit / confidence).
 */

import { describe, expect, it } from "vitest";
import {
  buildConfidenceHistory,
  buildDecisionAudit,
  buildInstitutionalHistoryView,
  buildTimeline,
  filterTimelineEvents,
  groupTimelineEvents,
  sortTimelineEvents,
  HISTORY_EMPTY,
} from "@/lib/dashboard/institutional-history-presentation";
import { buildInstitutionalCandidateView } from "@/lib/opportunity-engine/institutional-presentation";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";

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
    previousRank: 3,
    aiConvictionScore: 82,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 120,
    riskReward: 2.2,
    confidencePercent: 78,
    reason: "Breakout\nVolume",
    confidenceReasons: ["Breakout above resistance"],
    confidenceReasonContributions: [
      { label: "Breakout above resistance", contribution: 10 },
      { label: "Volume expansion", contribution: 8 },
      { label: "Volatility", contribution: -2 },
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
    expectedCatalyst: "Earnings",
    firstDetectedAt: "2026-07-14T04:15:00.000Z",
    lastDetectedAt: "2026-07-14T05:00:00.000Z",
    lastUpdatedAt: "2026-07-14T05:15:00.000Z",
    ...overrides,
  };
}

function makeSnapshot(): InstitutionalPlatformSnapshot {
  return {
    platform: {
      overallHealthScore: 88,
      overallTrustScore: 84,
      overallReadiness: 80,
      overallCompliance: 78,
      overallSecurity: 76,
      overallReliability: 80,
      overallPerformance: 81,
      overallExplainability: 79,
      overallDocumentation: 70,
      overallCoverage: 90,
      overallCertification: 80,
      overallRisk: 20,
      overallValidationStatus: "healthy",
      engineCount: 20,
      registeredCount: 18,
      healthyCount: 17,
    },
    dashboard: {
      summary: {
        totalValidations: 10,
        passedValidations: 9,
        failedValidations: 1,
        warningCount: 0,
        criticalCount: 0,
        averageIntegrityScore: 88,
        averageTrustScore: 84,
        averageHallucinationScore: 10,
        historicalPerformanceScore: 80,
        recommendationQuality: 84,
        tradeSetupQuality: 80,
        generatedAt: "2026-07-14T10:00:00.000Z",
      },
      modules: [],
      health: {
        overallHealthScore: 88,
        overallClassification: "HEALTHY",
        validationEngineHealth: 90,
        ruleEngineHealth: 88,
        trustEngineHealth: 84,
        historicalEngineHealth: 80,
        recommendationHealth: 84,
        marketHealth: 80,
        technicalHealth: 82,
        fundamentalHealth: 78,
        deteriorating: false,
      },
      engineVersion: "9F.11.0",
    },
    trust: {
      averageTrustScore: 84,
      highestTrustScore: 95,
      lowestTrustScore: 60,
      averageTrend: 1,
      trustDistribution: {},
      rejectedObjects: 0,
      validationRuntime: 100,
      averageValidationRuntime: 10,
      totalCalculations: 5,
    },
    explainability: {
      generatedExplanations: 3,
      decisionTraces: 4,
      ruleCoverage: 80,
      confidenceCoverage: 78,
      averageExplanationTime: 12,
      explainabilityHealthScore: 80,
      snapshotCount: 1,
      lastRunAt: "2026-07-14T10:05:00.000Z",
    },
    operations: {
      status: {
        initialized: true,
        engineVersion: "9F.32.0",
        certificationStatus: "production_ready",
        health: {
          overallHealthScore: 88,
          overallTrustScore: 84,
          overallReadiness: 80,
          overallCompliance: 78,
          overallSecurity: 76,
          overallReliability: 80,
          overallPerformance: 81,
          overallExplainability: 79,
          overallDocumentation: 70,
          overallCoverage: 90,
          overallCertification: 80,
          overallRisk: 20,
          overallValidationStatus: "healthy",
          engineCount: 20,
          registeredCount: 18,
          healthyCount: 17,
        },
        engines: [],
        warnings: [],
        errors: [],
        updatedAt: "2026-07-14T10:10:00.000Z",
      },
      metrics: {
        initialized: true,
        enginesRegistered: 18,
        enginesRequired: 20,
        certificationRuns: 1,
        overallHealthScore: 88,
        overallRisk: 20,
        averageRuntimeMs: 40,
        snapshotCount: 2,
        lastRunAt: "2026-07-14T10:10:00.000Z",
      },
      summary: null,
      observability: null,
      diagnostics: null,
      performance: null,
      security: null,
      release: null,
      reporting: null,
      audit: [
        {
          timestamp: "2026-07-14T10:00:00.000Z",
          event: "HealthComputed",
          warnings: [],
          errors: [],
        },
        {
          timestamp: "2026-07-14T10:02:00.000Z",
          event: "CertificationRun",
          warnings: [],
          errors: [],
        },
      ],
    },
  };
}

describe("institutional history — timeline", () => {
  it("builds recommendation / validation / trust / AI timeline sections", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, makeSnapshot());
    const events = buildTimeline({ view, candidate, snapshot: makeSnapshot() });
    const labels = events.map((e) => e.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Recommendation Created",
        "Validation Passed",
        "Trust Updated",
        "AI Analysis Generated",
        "Confidence Changed",
        "Target Updated",
        "Stop Loss Updated",
        "Recommendation Upgraded",
      ])
    );
    for (const event of events) {
      expect(event.oldValue).not.toBe("undefined");
      expect(event.newValue).not.toBe("null");
      expect(event.confidence).not.toBe("NaN");
      expect(event.engine).toBeTruthy();
    }
  });

  it("sorts timeline chronologically", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate);
    const events = buildTimeline({ view, candidate });
    const sorted = sortTimelineEvents(events);
    const times = sorted
      .map((e) => (e.timestamp ? new Date(e.timestamp).getTime() : 0))
      .filter((t) => t > 0);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThanOrEqual(times[i - 1]!);
    }
  });

  it("filters and groups timeline events", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, makeSnapshot());
    const events = buildTimeline({ view, candidate, snapshot: makeSnapshot() });
    const validationOnly = filterTimelineEvents(events, "Validation");
    expect(validationOnly.every((e) => e.source === "Validation")).toBe(true);
    const grouped = groupTimelineEvents(events);
    expect(grouped.map((g) => g.source)).toEqual(
      expect.arrayContaining(["Recommendation", "Validation", "Trust", "AI"])
    );
  });
});

describe("institutional history — decision audit", () => {
  it("builds decision audit versions from existing fields", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, makeSnapshot());
    const audit = buildDecisionAudit({
      view,
      candidate,
      snapshot: makeSnapshot(),
    });
    expect(audit.empty).toBe(false);
    expect(audit.decisionTime).not.toBe(HISTORY_EMPTY.UNAVAILABLE);
    expect(audit.platformVersion).toBe("9F.32.0");
    expect(audit.executionId).toBe("AAA:intraday");
    expect(audit.aiVersion).toBe("Sprint 9E");
    expect(audit.snapshotId).toContain("ops-snapshots");
  });

  it("returns empty audit without inputs", () => {
    const audit = buildDecisionAudit({});
    expect(audit.empty).toBe(true);
    expect(audit.emptyMessage).toBe(HISTORY_EMPTY.NO_HISTORY);
  });
});

describe("institutional history — confidence history", () => {
  it("builds confidence / validation / trust evolution points", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, makeSnapshot());
    const history = buildConfidenceHistory({
      view,
      candidate,
      snapshot: makeSnapshot(),
    });
    expect(history.empty).toBe(false);
    expect(history.points.length).toBeGreaterThanOrEqual(2);
    expect(history.confidenceTrend).toBeTruthy();
    expect(history.statusChanges.length).toBeGreaterThan(0);
    for (const point of history.points) {
      expect(point.institutionalGrade).not.toMatch(/undefined|null|NaN/i);
    }
  });

  it("uses empty state when no timestamps exist", () => {
    const history = buildConfidenceHistory({});
    expect(history.empty).toBe(true);
    expect(history.emptyMessage).toBe(HISTORY_EMPTY.NO_HISTORY);
  });
});

describe("institutional history — full view + expired/archived", () => {
  it("builds filtered history view", () => {
    const candidate = makeCandidate();
    const view = buildInstitutionalCandidateView(candidate, makeSnapshot());
    const full = buildInstitutionalHistoryView({
      view,
      candidate,
      snapshot: makeSnapshot(),
      filter: "Recommendation",
    });
    expect(full.filter).toBe("Recommendation");
    expect(full.filtered.every((e) => e.source === "Recommendation")).toBe(true);
    expect(full.audit.empty).toBe(false);
    expect(full.confidenceHistory.empty).toBe(false);
  });

  it("includes expired section when outcome present", () => {
    const candidate = makeCandidate({
      expiredOutcome: "Target Hit",
      expiredReason: "Target 1 reached",
      peakTime: "2026-07-14T06:00:00.000Z",
    });
    const view = buildInstitutionalCandidateView(candidate);
    const events = buildTimeline({ view, candidate });
    expect(events.some((e) => e.section === "Expired")).toBe(true);
  });
});
