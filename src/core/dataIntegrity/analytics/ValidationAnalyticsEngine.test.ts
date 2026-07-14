/**
 * Institutional Validation Analytics Engine — unit tests (Prompt 9F.14).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationAnalyticsEngine,
  registerValidationAnalyticsEngine,
  resetValidationAnalyticsEngine,
  getRegisteredAnalyticsSources,
  resetAnalyticsSourceRegistrationState,
  DEFAULT_ANALYTICS_CONFIGURATION,
  getAnalyticsSummary,
  getRuleEffectiveness,
  getFailureAnalytics,
  getTrendAnalytics,
  getDistributionAnalytics,
  getPredictionAnalytics,
  createAnalyticsSnapshot,
  type AnalyticsObservation,
} from "./index";

function daysAgo(days: number, hourOffset = 0): string {
  return new Date(
    Date.now() - days * 86_400_000 - hourOffset * 3_600_000
  ).toISOString();
}

function sampleObservations(): AnalyticsObservation[] {
  return [
    {
      sourceId: "dataIntegrity",
      timestamp: daysAgo(6),
      module: "dataIntegrity",
      validationCount: 100,
      passed: 95,
      failed: 5,
      warnings: 2,
      critical: 0,
      averageRuntimeMs: 20,
      integrityScore: 94,
      trustScore: 92,
      stock: "TATAMOTORS",
      sector: "AUTO",
      exchange: "NSE",
    },
    {
      sourceId: "trust",
      timestamp: daysAgo(5),
      module: "trust",
      validationCount: 80,
      passed: 70,
      failed: 10,
      averageRuntimeMs: 15,
      trustScore: 88,
      integrityScore: 90,
      stock: "INFY",
      sector: "IT",
      exchange: "NSE",
      recommendation: "BUY",
    },
    {
      sourceId: "hallucination",
      timestamp: daysAgo(4),
      module: "hallucination",
      validationCount: 40,
      passed: 30,
      failed: 10,
      hallucinationScore: 75,
      averageRuntimeMs: 25,
      stock: "TATAMOTORS",
    },
    {
      sourceId: "recommendation",
      timestamp: daysAgo(3),
      module: "recommendation",
      validationCount: 50,
      passed: 40,
      failed: 10,
      recommendationQuality: 82,
      recommendation: "BUY",
      ruleId: "rec.confidence",
      ruleTriggered: true,
      ruleFailed: true,
      falsePositive: true,
      averageRuntimeMs: 18,
    },
    {
      sourceId: "recommendation",
      timestamp: daysAgo(2),
      module: "recommendation",
      ruleId: "rec.confidence",
      ruleTriggered: true,
      ruleFailed: true,
      failed: 3,
      stock: "TATAMOTORS",
    },
    {
      sourceId: "tradeSetup",
      timestamp: daysAgo(2),
      module: "tradeSetup",
      validationCount: 30,
      passed: 28,
      failed: 2,
      tradeQuality: 91,
      ruleId: "trade.rr",
      ruleTriggered: true,
      ruleFailed: false,
      averageRuntimeMs: 12,
    },
    {
      sourceId: "historical",
      timestamp: daysAgo(1),
      module: "historical",
      validationCount: 20,
      passed: 18,
      failed: 2,
      historicalScore: 86,
      trustScore: 80,
      integrityScore: 85,
      averageRuntimeMs: 30,
    },
    {
      sourceId: "market",
      timestamp: daysAgo(0),
      module: "market",
      validationCount: 60,
      passed: 50,
      failed: 10,
      critical: 1,
      trustScore: 70,
      integrityScore: 72,
      hallucinationScore: 60,
      averageRuntimeMs: 40,
      stock: "RELIANCE",
      sector: "ENERGY",
      exchange: "BSE",
      recommendation: "HOLD",
      ruleId: "price.positive",
      ruleTriggered: true,
      ruleFailed: true,
      falseNegative: true,
    },
  ];
}

describe("Analytics registration", () => {
  beforeEach(() => {
    resetValidationAnalyticsEngine();
    resetAnalyticsSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationAnalyticsEngine();
    resetAnalyticsSourceRegistrationState();
  });

  it("registers analytics engine idempotently", () => {
    const first = registerValidationAnalyticsEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredAnalyticsSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationAnalyticsEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Aggregation and health score", () => {
  it("aggregates validation analytics summary", () => {
    const engine = new ValidationAnalyticsEngine();
    const result = engine.analyzeObservations(sampleObservations());
    const s = result.summary;

    expect(s.totalValidations).toBeGreaterThan(0);
    expect(s.passed + s.failed).toBeGreaterThan(0);
    expect(s.averageIntegrityScore).toBeGreaterThan(0);
    expect(s.averageTrustScore).toBeGreaterThan(0);
    expect(s.averageHallucinationScore).toBeGreaterThan(0);
    expect(s.recommendationQuality).toBeGreaterThan(0);
    expect(s.tradeQuality).toBeGreaterThan(0);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.predictions.advisoryOnly).toBe(true);
  });
});

describe("Rule effectiveness and failure analytics", () => {
  it("measures rule effectiveness", () => {
    const engine = new ValidationAnalyticsEngine();
    const report = engine.analyzeObservations(sampleObservations())
      .ruleEffectiveness;

    expect(report.ruleCount).toBeGreaterThan(0);
    expect(report.mostTriggered.length).toBeGreaterThan(0);
    const confidence = report.rules.find((r) => r.ruleId === "rec.confidence");
    expect(confidence?.triggers).toBeGreaterThan(0);
    expect(confidence?.failureRate).toBeGreaterThan(0);
    expect(confidence?.reliabilityScore).toBeLessThanOrEqual(100);
  });

  it("identifies failure patterns and root causes", () => {
    const engine = new ValidationAnalyticsEngine();
    const failures = engine.analyzeObservations(sampleObservations())
      .failureAnalytics;

    expect(failures.totalFailures).toBeGreaterThan(0);
    expect(failures.mostFailedRules.length).toBeGreaterThan(0);
    expect(failures.mostFailedModules.length).toBeGreaterThan(0);
    expect(failures.mostFailedStocks.length).toBeGreaterThan(0);
    expect(failures.rootCauseCandidates.length).toBeGreaterThan(0);
  });
});

describe("Trends and distributions", () => {
  it("generates multi-window trend analytics", () => {
    const engine = new ValidationAnalyticsEngine();
    const trends = engine.analyzeObservations(sampleObservations()).trends;

    expect(trends.hourly.window).toBe("hourly");
    expect(trends.daily.window).toBe("daily");
    expect(trends.weekly.window).toBe("weekly");
    expect(trends.monthly.window).toBe("monthly");
    expect(trends.quarterly.window).toBe("quarterly");
    expect(trends.yearly.window).toBe("yearly");
    expect(["UP", "DOWN", "FLAT"]).toContain(trends.overallDirection);
    expect(trends.overallStability).toBeGreaterThanOrEqual(0);
  });

  it("builds distribution analytics", () => {
    const engine = new ValidationAnalyticsEngine();
    const dist = engine.analyzeObservations(sampleObservations()).distributions;

    expect(Object.keys(dist.validationDistribution).length).toBeGreaterThan(0);
    expect(dist.trustDistribution.some((b) => b.count > 0)).toBe(true);
    expect(dist.sectorDistribution.AUTO ?? dist.sectorDistribution.IT).toBeTruthy();
    expect(dist.exchangeDistribution.NSE).toBeGreaterThan(0);
    expect(dist.recommendationDistribution.BUY).toBeGreaterThan(0);
  });
});

describe("Prediction engine", () => {
  it("emits advisory predictions with confidence", () => {
    const engine = new ValidationAnalyticsEngine({
      minSampleSize: 3,
      collapseDropThreshold: 5,
    });
    const preds = engine.analyzeObservations(sampleObservations()).predictions;

    expect(preds.advisoryOnly).toBe(true);
    expect(preds.predictions.length).toBeGreaterThan(0);
    expect(preds.predictions.every((p) => p.confidence >= 0)).toBe(true);
    expect(preds.anomalies).toBeTruthy();
  });
});

describe("Snapshots and metrics", () => {
  beforeEach(() => {
    resetValidationAnalyticsEngine();
  });

  it("creates and compares analytics snapshots", () => {
    const engine = new ValidationAnalyticsEngine();
    engine.analyzeObservations(sampleObservations());
    const snap1 = engine.createAnalyticsSnapshot("baseline");

    const degraded = sampleObservations().map((o) => ({
      ...o,
      trustScore: (o.trustScore ?? 80) - 25,
      integrityScore: (o.integrityScore ?? 80) - 25,
      failed: (o.failed ?? 0) + 20,
    }));
    engine.analyzeObservations(degraded);
    const snap2 = engine.createAnalyticsSnapshot("degraded");

    const comparison = engine.compareAnalyticsSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.healthDelta).toBeLessThan(0);
    expect(engine.listSnapshots().length).toBe(2);

    const metrics = engine.getMetrics();
    expect(metrics.analyticsRuns).toBeGreaterThan(0);
    expect(metrics.snapshotCount).toBe(2);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationAnalyticsEngine();
    resetAnalyticsSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationAnalyticsEngine();
    resetAnalyticsSourceRegistrationState();
  });

  it("exposes summary/rules/failures/trends/distribution/predictions/snapshot", () => {
    registerValidationAnalyticsEngine({ force: true });
    const engine = new ValidationAnalyticsEngine();
    registerValidationAnalyticsEngine({ engine, force: true });

    const obs = sampleObservations();
    expect(getAnalyticsSummary({ observations: obs }).totalValidations).toBeGreaterThan(
      0
    );
    expect(getRuleEffectiveness({ observations: obs }).ruleCount).toBeGreaterThanOrEqual(
      0
    );
    expect(getFailureAnalytics({ observations: obs }).totalFailures).toBeGreaterThanOrEqual(
      0
    );
    expect(getTrendAnalytics({ observations: obs }).weekly).toBeTruthy();
    expect(
      getDistributionAnalytics({ observations: obs }).trustDistribution.length
    ).toBe(5);
    expect(
      getPredictionAnalytics({ observations: obs }).advisoryOnly
    ).toBe(true);

    // Ensure last run exists for snapshot
    engine.analyzeObservations(obs);
    const snap = createAnalyticsSnapshot("api");
    expect(snap.snapshotId).toContain("analytics:");
    expect(DEFAULT_ANALYTICS_CONFIGURATION.engineVersion).toBe("9F.14.0");
  });
});
