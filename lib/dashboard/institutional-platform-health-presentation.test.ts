/**
 * Institutional platform health dashboard — presentation tests (Prompt 9F.R4).
 */

import { describe, expect, it } from "vitest";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import { buildInstitutionalPlatformHealthDashboard } from "@/lib/dashboard/institutional-platform-health-presentation";

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
      engineCount: 28,
      registeredCount: 26,
      healthyCount: 24,
    },
    dashboard: {
      summary: {
        totalValidations: 40,
        passedValidations: 36,
        failedValidations: 4,
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
      averageTrend: 1.2,
      trustDistribution: { HIGH_TRUST: 20 },
      rejectedObjects: 1,
      validationRuntime: 900,
      averageValidationRuntime: 22,
      totalCalculations: 20,
    },
    explainability: {
      generatedExplanations: 8,
      decisionTraces: 10,
      ruleCoverage: 85,
      confidenceCoverage: 77,
      averageExplanationTime: 15,
      explainabilityHealthScore: 82,
      snapshotCount: 2,
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
          engineCount: 28,
          registeredCount: 26,
          healthyCount: 24,
        },
        engines: [
          {
            engineId: "trust",
            label: "Trust Engine",
            sprint: "9F.10",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "explainability",
            label: "Explainability Engine",
            sprint: "9F.27",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "reporting",
            label: "Reporting Engine",
            sprint: "9F.15",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "security",
            label: "Security Engine",
            sprint: "9F.25",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "performance",
            label: "Performance Engine",
            sprint: "9F.26",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "release",
            label: "Release Engine",
            sprint: "9F.30",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "knowledge",
            label: "Knowledge Graph",
            sprint: "9F.23",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "simulation",
            label: "Simulation Engine",
            sprint: "9F.28",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "learning",
            label: "Learning Engine",
            sprint: "9F.29",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "documentation",
            label: "Documentation Engine",
            sprint: "9F.31",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
          {
            engineId: "orchestrator",
            label: "Validation Orchestrator",
            sprint: "9F.12",
            registered: true,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
            registeredAt: "2026-07-14T09:00:00.000Z",
          },
        ],
        warnings: ["Sample warning"],
        errors: [],
        updatedAt: "2026-07-14T10:10:00.000Z",
      },
      metrics: {
        initialized: true,
        enginesRegistered: 26,
        enginesRequired: 28,
        certificationRuns: 3,
        overallHealthScore: 88,
        overallRisk: 20,
        averageRuntimeMs: 42,
        snapshotCount: 5,
        lastRunAt: "2026-07-14T10:10:00.000Z",
      },
      summary: {
        title: "EquityOS Platform",
        generatedAt: "2026-07-14T10:10:00.000Z",
        initialized: true,
        certificationStatus: "production_ready",
        healthScore: 88,
        risk: 20,
        enginesRegistered: 26,
        enginesRequired: 28,
        highlights: ["Healthy"],
        risks: [],
        nextActions: [],
      },
      observability: {
        telemetryEvents: 120,
        collectedMetrics: 45,
        traceCount: 30,
        exportCount: 4,
        snapshotCount: 2,
        droppedEvents: 1,
        observabilityScore: 86,
        averageCollectionTime: 12,
        lastCollectionAt: "2026-07-14T10:08:00.000Z",
      },
      diagnostics: {
        diagnosticsRuns: 6,
        averageRuntime: 33,
        lastRuntime: 28,
        profilerRuntime: 40,
        averageProfilerRuntime: 35,
        traceCount: 10,
        healthScore: 84,
        snapshotCount: 2,
        memoryUsage: 1024,
        lastRunAt: "2026-07-14T10:07:00.000Z",
      },
      performance: {
        latencyMs: 38,
        throughputPerSec: 25,
        capacity: 80,
        cpuUsagePct: 42,
        memoryUsagePct: 55,
        benchmarks: 3,
        performanceHealthScore: 81,
        averageRuntimeMs: 36,
        snapshotCount: 2,
        lastRunAt: "2026-07-14T10:06:00.000Z",
      },
      security: {
        accessRequests: 50,
        deniedRequests: 2,
        successfulRequests: 48,
        roles: 7,
        permissions: 20,
        policies: 5,
        averageAuthorizationTime: 4,
        securityHealthScore: 78,
        snapshotCount: 1,
        lastRunAt: "2026-07-14T10:05:00.000Z",
      },
      release: {
        certificationRuns: 3,
        releaseScore: 82,
        deploymentRisks: 1,
        rollbackReadiness: 90,
        checklistCompletion: 95,
        averageRuntimeMs: 50,
        snapshotCount: 1,
        lastRunAt: "2026-07-14T09:50:00.000Z",
      },
      reporting: {
        reportsGenerated: 5,
        generationTime: 20,
        averageGenerationTime: 18,
        averageSize: 1200,
        snapshotCount: 1,
        exportModelCount: 3,
        templateUsage: { ValidationReport: 2 },
        lastGeneratedAt: "2026-07-14T10:01:00.000Z",
      },
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
          warnings: ["soft"],
          errors: [],
        },
        {
          timestamp: "2026-07-14T10:03:00.000Z",
          event: "Error",
          warnings: [],
          errors: ["sample"],
        },
      ],
    },
    ...overrides,
  };
}

describe("institutional platform health dashboard", () => {
  it("maps platform health header metrics", () => {
    const view = buildInstitutionalPlatformHealthDashboard(makeSnapshot());
    expect(view.empty).toBe(false);
    expect(view.header.platformHealthScore.value).toBe("88");
    expect(view.header.productionReadiness.value).toBe("82");
    expect(view.header.platformGrade).toMatch(/Institutional|Production/);
    expect(view.header.overallStatus).toBe("healthy");
    expect(view.header.platformVersion).toBe("9F.32.0");
    expect(view.header.platformHealthScore.tooltip.description).toBeTruthy();
    expect(view.header.platformHealthScore.tooltip.healthyRange).toBeTruthy();
  });

  it("exposes engine health rows for required engines", () => {
    const view = buildInstitutionalPlatformHealthDashboard(makeSnapshot());
    const labels = view.engines.map((e) => e.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Validation Engine",
        "Trust Engine",
        "Explainability Engine",
        "Reporting Engine",
        "Security Engine",
        "Knowledge Engine",
        "Simulation Engine",
        "Learning Engine",
        "Performance Engine",
        "Documentation Engine",
        "Release Engine",
      ])
    );
    expect(view.engines.every((e) => e.health && e.status && e.trendLabel)).toBe(
      true
    );
  });

  it("maps pipeline, observability, diagnostics, and performance panels", () => {
    const view = buildInstitutionalPlatformHealthDashboard(makeSnapshot());
    expect(view.pipeline.successRate).toMatch(/%/);
    expect(view.pipeline.queueHealth).toBe("26/28");
    expect(view.observability.events).toBe("120");
    expect(view.observability.p50).toBe("Not Yet Available");
    expect(view.observability.p95).toBe("Not Yet Available");
    expect(view.observability.p99).toBe("Not Yet Available");
    expect(view.diagnostics.regressionDetection).toBe("Clear");
    expect(view.performance.cpuTrend).toBe("42%");
    expect(view.performance.throughput).toBe("25");
  });

  it("maps certification and audit summary", () => {
    const view = buildInstitutionalPlatformHealthDashboard(makeSnapshot());
    expect(view.certification.productionReady).toBe("Yes");
    expect(view.certification.securityPassed).toBe("Passed");
    expect(view.certification.releaseApproved).toBe("Approved");
    expect(view.audit.exportActivity).toBe("3");
    expect(view.audit.validationRuns).toBe("40");
    expect(view.audit.trustEvaluations).toBe("20");
    expect(Number(view.audit.failed)).toBeGreaterThanOrEqual(1);
  });

  it("builds platform timeline and status badges", () => {
    const view = buildInstitutionalPlatformHealthDashboard(makeSnapshot());
    const labels = view.timeline.map((e) => e.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Validation",
        "Trust",
        "Recommendation",
        "Export",
        "Certification",
      ])
    );
    expect(view.badges.map((b) => b.label)).toEqual(
      expect.arrayContaining([
        "Production Ready",
        "Certified",
        "Healthy",
        "Monitored",
        "Explainable",
        "Validated",
        "High Trust",
        "Institutional Grade",
      ])
    );
  });

  it("uses awaiting / not-yet placeholders when snapshot is empty", () => {
    const view = buildInstitutionalPlatformHealthDashboard(null);
    expect(view.empty).toBe(true);
    expect(view.header.platformHealthScore.value).toBe("Awaiting Next Run");
    expect(view.observability.p50).toBe("Not Yet Available");
    expect(view.emptyMessage).toBe("Awaiting Next Run");
  });

  it("never emits bare zero or undefined for header scores when inactive", () => {
    const view = buildInstitutionalPlatformHealthDashboard({
      platform: {
        overallHealthScore: 0,
        overallTrustScore: 0,
        overallReadiness: 0,
        overallCompliance: 0,
        overallSecurity: 0,
        overallReliability: 0,
        overallPerformance: 0,
        overallExplainability: 0,
        overallDocumentation: 0,
        overallCoverage: 0,
        overallCertification: 0,
        overallRisk: 0,
        overallValidationStatus: "unknown",
        engineCount: 0,
        registeredCount: 0,
        healthyCount: 0,
      },
      dashboard: null,
      trust: null,
      explainability: null,
      operations: null,
    });
    expect(view.header.platformHealthScore.value).not.toBe("0");
    expect(view.header.platformHealthScore.value).not.toBe("undefined");
    expect(view.header.platformHealthScore.value).not.toBe("NaN");
  });
});
