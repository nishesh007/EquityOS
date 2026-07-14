/**
 * Institutional report viewer — presentation helpers tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildExecutiveSummary,
  buildMetricCards,
  buildReportMetadata,
  buildReportViewer,
} from "@/lib/dashboard/institutional-report-viewer";
import type { InstitutionalReport } from "@/src/core/dataIntegrity/reporting/ReportBuilder";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";

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
        warnings: ["Latency watch"],
        errors: [],
        updatedAt: "2026-07-14T10:10:00.000Z",
      },
      metrics: {
        initialized: true,
        enginesRegistered: 18,
        enginesRequired: 20,
        certificationRuns: 3,
        overallHealthScore: 88,
        overallRisk: 20,
        averageRuntimeMs: 40,
        snapshotCount: 12,
        lastRunAt: "2026-07-14T09:00:00.000Z",
      },
      summary: null,
      observability: null,
      diagnostics: null,
      performance: null,
      security: null,
      release: null,
      reporting: null,
      audit: [],
    },
  };
}

function makeReport(): InstitutionalReport {
  return {
    reportId: "rpt-test-1",
    reportType: "ValidationReport",
    title: "Institutional Validation Report",
    generatedTime: "2026-07-14T10:00:00.000Z",
    reportingPeriod: {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-14T00:00:00.000Z",
    },
    filters: {},
    detailLevel: "STANDARD",
    summary: {
      overallValidationScore: 90,
      integrityScore: 88,
      trustScore: 86,
      hallucinationScore: 10,
      historicalScore: 80,
      recommendationQuality: 84,
      tradeQuality: 82,
      overallHealth: 88,
    },
    moduleScores: [],
    validationMetrics: {
      totalValidations: 100,
      passed: 95,
      failed: 5,
      warnings: 3,
      critical: 0,
      averageRuntime: 12,
    },
    trustMetrics: {
      averageTrustScore: 86,
      rejectedObjects: 2,
      trustDistribution: { high: 70, medium: 25, low: 5 },
    },
    analyticsSummary: {
      trendAnalysis: {},
      ruleEffectiveness: {},
      failureAnalytics: {},
      distributionAnalytics: {},
      predictionAnalytics: {},
      healthScore: 88,
    },
    warnings: ["Elevated latency"],
    errors: [],
    recommendations: ["Maintain institutional posture", "Watch liquidity"],
    auditInformation: {
      configurationVersion: "9F.CFG.1",
      engineVersion: "9F.32.0",
      generatedBy: "ValidationReportingEngine",
      sourceModules: ["validation"],
    },
    sectionsIncluded: ["summary", "trust", "analytics"],
    partial: false,
    engineVersion: "9F.32.0",
  };
}

describe("institutional-report-viewer", () => {
  it("builds metadata from snapshot without regenerating reports", () => {
    const metadata = buildReportMetadata({ snapshot: makeSnapshot() });
    expect(metadata.reportTitle).toContain("Institutional");
    expect(metadata.platformVersion).toBeTruthy();
    expect(metadata.validationVersion).toBeTruthy();
    expect(metadata.trustVersion).toBeTruthy();
    expect(metadata.aiVersion).toBeTruthy();
    expect(metadata.environment).toBeTruthy();
  });

  it("builds executive summary from report + snapshot", () => {
    const summary = buildExecutiveSummary({
      report: makeReport(),
      snapshot: makeSnapshot(),
    });
    expect(summary.institutionalGrade).toMatch(
      /Institutional|Strong|Watch|Caution|Awaiting/
    );
    expect(summary.topRisks.length).toBeGreaterThan(0);
    expect(summary.topOpportunities.length).toBeGreaterThan(0);
    expect(summary.paragraphs.length).toBeGreaterThan(0);
  });

  it("builds metric cards including validation trust confidence", () => {
    const cards = buildMetricCards({
      report: makeReport(),
      snapshot: makeSnapshot(),
    });
    const ids = cards.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "validation",
        "trust",
        "confidence",
        "risk",
        "conviction",
        "execution",
        "pipeline",
        "readiness",
      ])
    );
  });

  it("locks premium metrics for free preview", () => {
    const cards = buildMetricCards({
      snapshot: makeSnapshot(),
      previewOnly: true,
    });
    const risk = cards.find((c) => c.id === "risk");
    expect(risk?.locked).toBe(true);
    expect(risk?.value).toBe("Upgrade Required");
  });

  it("builds full viewer with TOC navigation anchors", () => {
    const viewer = buildReportViewer({
      report: makeReport(),
      snapshot: makeSnapshot(),
      subject: {
        userId: "admin",
        role: "administrator",
        subscriptionTier: "enterprise",
      },
    });
    expect(viewer.toc.map((t) => t.id)).toEqual(
      expect.arrayContaining([
        "executive_summary",
        "market_summary",
        "validation_summary",
        "trust_summary",
        "ai_explainability",
        "opportunity_list",
        "tomorrow_watchlist",
        "historical_validation",
        "historical_trust",
        "risk_analysis",
        "charts",
        "appendix",
        "disclaimer",
      ])
    );
    expect(viewer.sections.length).toBe(viewer.toc.length);
    expect(viewer.previewOnly).toBe(false);
    expect(viewer.showExport).toBe(true);
    expect(viewer.footer.disclaimer.length).toBeGreaterThan(10);
  });

  it("gates free users to preview with locked premium sections", () => {
    const viewer = buildReportViewer({
      snapshot: makeSnapshot(),
      subject: { userId: "free-1", role: "free", subscriptionTier: "none" },
    });
    expect(viewer.previewOnly).toBe(true);
    expect(viewer.upgradeRequired).toBe(true);
    expect(viewer.showExport).toBe(false);
    const premium = viewer.sections.filter((s) => s.premium);
    expect(premium.every((s) => s.locked)).toBe(true);
    expect(viewer.toc.some((t) => t.locked)).toBe(true);
  });

  it("gives subscribers full viewer without upgrade banner", () => {
    const viewer = buildReportViewer({
      snapshot: makeSnapshot(),
      subject: { userId: "sub-1", role: "subscriber", subscriptionTier: "pro" },
    });
    expect(viewer.previewOnly).toBe(false);
    expect(viewer.upgradeRequired).toBe(false);
    expect(viewer.showExport).toBe(true);
    expect(viewer.sections.every((s) => !s.locked)).toBe(true);
  });

  it("reuses report metadata execution and snapshot ids", () => {
    const viewer = buildReportViewer({
      report: makeReport(),
      snapshot: makeSnapshot(),
    });
    expect(viewer.metadata.executionId).toBe("rpt-test-1");
    expect(viewer.metadata.generatedBy).toBeTruthy();
    expect(viewer.metadata.reportVersion).toBeTruthy();
  });

  it("supports expand/collapse section model via premium flags", () => {
    const viewer = buildReportViewer({
      snapshot: makeSnapshot(),
      subject: { userId: "sub", role: "subscriber", subscriptionTier: "basic" },
    });
    const charts = viewer.sections.find((s) => s.id === "charts");
    expect(charts?.premium).toBe(true);
    expect(charts?.locked).toBe(false);
    const disclaimer = viewer.sections.find((s) => s.id === "disclaimer");
    expect(disclaimer?.premium).toBe(false);
  });
});
