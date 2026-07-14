/**
 * Institutional Validation Intelligence Engine — unit tests (Prompt 9F.21).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationIntelligenceEngine,
  registerValidationIntelligenceEngine,
  resetValidationIntelligenceEngine,
  getRegisteredInsightSources,
  resetInsightSourceRegistrationState,
  DEFAULT_INSIGHTS_CONFIGURATION,
  generateInsights,
  detectPatterns,
  analyzeCorrelations,
  generateRecommendations,
  getRiskInsights,
  getInsightMetrics,
  createInsightSnapshot,
  type InsightObservation,
} from "./index";

function sampleObservations(): InsightObservation[] {
  return [
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      pipelineId: "full",
      validations: 100,
      failures: 20,
      runtimeMs: 250,
      retries: 6,
      timeouts: 4,
      errorRate: 20,
      healthScore: 70,
      availability: 90,
    },
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      pipelineId: "full",
      validations: 100,
      failures: 35,
      runtimeMs: 320,
      retries: 8,
      timeouts: 7,
      errorRate: 45,
      healthScore: 50,
      availability: 80,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      ruleId: "price-range",
      validations: 50,
      failures: 12,
      runtimeMs: 180,
      cacheHitRate: 40,
      parallelSlots: 1,
      healthScore: 60,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      ruleId: "ohlc",
      validations: 40,
      failures: 10,
      runtimeMs: 220,
      cacheHitRate: 35,
      parallelSlots: 1,
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      trustScore: 90,
      recommendationQuality: 88,
      healthScore: 90,
      runtimeMs: 40,
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      trustScore: 70,
      recommendationQuality: 65,
      integrityScore: 85,
      healthScore: 72,
      runtimeMs: 55,
    },
    {
      sourceId: "historical",
      module: "historical",
      timestamp: new Date().toISOString(),
      historicalScore: 80,
      trustScore: 75,
      runtimeMs: 30,
    },
    {
      sourceId: "historical",
      module: "historical",
      timestamp: new Date().toISOString(),
      historicalScore: 60,
      trustScore: 68,
      hallucinationScore: 70,
      runtimeMs: 35,
    },
    {
      sourceId: "historical",
      module: "historical",
      timestamp: new Date().toISOString(),
      historicalScore: 55,
      trustScore: 60,
      hallucinationScore: 55,
      integrityScore: 70,
      runtimeMs: 40,
    },
  ];
}

describe("Intelligence registration", () => {
  beforeEach(() => {
    resetValidationIntelligenceEngine();
    resetInsightSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationIntelligenceEngine();
    resetInsightSourceRegistrationState();
  });

  it("registers intelligence engine idempotently", () => {
    const first = registerValidationIntelligenceEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredInsightSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationIntelligenceEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Patterns, correlations, risks, recommendations", () => {
  let engine: ValidationIntelligenceEngine;

  beforeEach(() => {
    resetValidationIntelligenceEngine();
    engine = new ValidationIntelligenceEngine({
      patternSensitivity: 0.4,
      correlationThreshold: 0.3,
      confidenceThreshold: 0.5,
      runtimeBottleneckMs: 150,
      trustDropThreshold: 10,
      integrityDriftThreshold: 8,
    });
  });

  it("generates insights pack with score", () => {
    const pack = engine.generateInsights({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    expect(pack.packId).toContain("insp:");
    expect(pack.score.overall).toBeGreaterThanOrEqual(0);
    expect(pack.score.overall).toBeLessThanOrEqual(100);
    expect(pack.patterns.length).toBeGreaterThan(0);
    expect(pack.recommendations.every((r) => r.advisoryOnly)).toBe(true);
    expect(DEFAULT_INSIGHTS_CONFIGURATION.engineVersion).toBe("9F.21.0");
  });

  it("detects patterns and correlations", () => {
    const patterns = engine.detectPatterns({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    expect(patterns.patterns.length).toBeGreaterThan(0);
    expect(
      patterns.patterns.some(
        (p) =>
          p.kind === "REPEATED_FAILURES" ||
          p.kind === "EXECUTION_BOTTLENECK" ||
          p.kind === "RECURRING_RULE_VIOLATIONS"
      )
    ).toBe(true);

    const correlations = engine.analyzeCorrelations({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    expect(correlations.correlations.length).toBeGreaterThan(0);
  });

  it("produces risk insights and recommendations", () => {
    const risks = engine.getRiskInsights({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    expect(risks.risks.length).toBeGreaterThan(0);
    expect(risks.risks.every((r) => r.confidence >= 0)).toBe(true);

    const recs = engine.generateRecommendations({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    expect(recs.recommendations.length).toBeGreaterThan(0);
    expect(
      recs.recommendations.every(
        (r) =>
          r.reason &&
          r.evidence.length > 0 &&
          typeof r.confidence === "number" &&
          r.expectedImpact
      )
    ).toBe(true);
  });
});

describe("Snapshots and metrics", () => {
  let engine: ValidationIntelligenceEngine;

  beforeEach(() => {
    resetValidationIntelligenceEngine();
    engine = new ValidationIntelligenceEngine({
      patternSensitivity: 0.4,
      correlationThreshold: 0.3,
      confidenceThreshold: 0.5,
      runtimeBottleneckMs: 150,
    });
  });

  it("creates snapshots and detects regressions", () => {
    engine.generateInsights({
      observations: [
        {
          sourceId: "trust",
          module: "trust",
          timestamp: new Date().toISOString(),
          trustScore: 95,
          healthScore: 95,
          runtimeMs: 20,
          failures: 0,
          validations: 10,
        },
      ],
      includeLiveCollectors: false,
    });
    const snap1 = engine.createInsightSnapshot("baseline");

    engine.generateInsights({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    const snap2 = engine.createInsightSnapshot("stressed");

    const comparison = engine.compareInsightSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    engine.generateInsights({
      observations: sampleObservations(),
      includeLiveCollectors: false,
    });
    const metrics = engine.getInsightMetrics();
    expect(metrics.insightsGenerated).toBeGreaterThan(0);
    expect(metrics.patternsDetected).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationIntelligenceEngine();
    resetInsightSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationIntelligenceEngine();
    resetInsightSourceRegistrationState();
  });

  it("exposes intelligence helpers", () => {
    const engine = new ValidationIntelligenceEngine({
      patternSensitivity: 0.4,
      correlationThreshold: 0.3,
      confidenceThreshold: 0.5,
      runtimeBottleneckMs: 150,
    });
    registerValidationIntelligenceEngine({ engine, force: true });

    const observations = sampleObservations();
    expect(
      generateInsights({ observations, includeLiveCollectors: false }).score
        .overall
    ).toBeGreaterThanOrEqual(0);
    expect(
      detectPatterns({ observations, includeLiveCollectors: false }).patterns
        .length
    ).toBeGreaterThan(0);
    expect(
      analyzeCorrelations({ observations, includeLiveCollectors: false })
        .correlations.length
    ).toBeGreaterThan(0);
    expect(
      generateRecommendations({ observations, includeLiveCollectors: false })
        .recommendations.length
    ).toBeGreaterThan(0);
    expect(
      getRiskInsights({ observations, includeLiveCollectors: false }).risks
        .length
    ).toBeGreaterThan(0);
    expect(getInsightMetrics().insightsGenerated).toBeGreaterThan(0);
    expect(createInsightSnapshot("api").snapshotId).toContain("intel:");
  });
});
