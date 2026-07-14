/**
 * Institutional Validation Reporting Engine — unit tests (Prompt 9F.15).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationReportingEngine,
  registerValidationReportingEngine,
  resetValidationReportingEngine,
  getRegisteredReportSources,
  resetReportSourceRegistrationState,
  DEFAULT_REPORTING_CONFIGURATION,
  generateReport,
  generateValidationReport,
  generateTrustReport,
  generateAnalyticsReport,
  generateAuditReport,
  exportReportModel,
  createReportSnapshot,
  type ReportSourcePayload,
} from "./index";

function samplePayloads(): ReportSourcePayload[] {
  return [
    {
      sourceId: "dataIntegrity",
      module: "dataIntegrity",
      timestamp: new Date().toISOString(),
      stock: "TATAMOTORS",
      sector: "AUTO",
      exchange: "NSE",
      validationCount: 100,
      passed: 92,
      failed: 8,
      warnings: 3,
      critical: 0,
      averageRuntime: 18,
      integrityScore: 93,
      averageScore: 93,
      overallHealth: 90,
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      stock: "TATAMOTORS",
      sector: "AUTO",
      exchange: "NSE",
      trustClassification: "HIGH_TRUST",
      validationCount: 50,
      passed: 45,
      failed: 5,
      trustScore: 88,
      averageScore: 88,
      rejectedObjects: 5,
      trustDistribution: { HIGH_TRUST: 40, TRUST_REQUIRED: 10 },
    },
    {
      sourceId: "hallucination",
      module: "hallucination",
      timestamp: new Date().toISOString(),
      validationCount: 20,
      passed: 16,
      failed: 4,
      hallucinationScore: 81,
      averageScore: 81,
      recommendation: "BUY",
    },
    {
      sourceId: "analytics",
      module: "analytics",
      timestamp: new Date().toISOString(),
      validationCount: 200,
      passed: 170,
      failed: 30,
      overallHealth: 84,
      integrityScore: 90,
      trustScore: 86,
      historicalScore: 79,
      recommendationQuality: 85,
      tradeQuality: 88,
      analytics: {
        trendAnalysis: { overallDirection: "DOWN", overallStrength: 40 },
        ruleEffectiveness: { ruleCount: 12, averageReliability: 78 },
        failureAnalytics: { totalFailures: 30 },
        distributionAnalytics: { byModule: { trust: 50 } },
        predictionAnalytics: { averageConfidence: 70, advisoryOnly: true },
        healthScore: 84,
      },
      recommendationsList: ["Investigate declining trust trend."],
      warningsList: ["Sample warning"],
    },
    {
      sourceId: "recommendation",
      module: "recommendation",
      timestamp: new Date().toISOString(),
      recommendation: "BUY",
      validationCount: 40,
      passed: 35,
      failed: 5,
      recommendationQuality: 87,
      averageScore: 87,
      stock: "INFY",
      sector: "IT",
      exchange: "NSE",
    },
  ];
}

describe("Reporting registration", () => {
  beforeEach(() => {
    resetValidationReportingEngine();
    resetReportSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationReportingEngine();
    resetReportSourceRegistrationState();
  });

  it("registers reporting engine idempotently", () => {
    const first = registerValidationReportingEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredReportSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationReportingEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Report generation", () => {
  let engine: ValidationReportingEngine;

  beforeEach(() => {
    resetValidationReportingEngine();
    engine = new ValidationReportingEngine();
  });

  it("generates validation, trust, analytics, and audit reports", () => {
    const payloads = samplePayloads();
    const validation = engine.generateValidationReport({
      payloads,
      includeLiveCollectors: false,
    });
    expect(validation.reportType).toBe("ValidationReport");
    expect(validation.reportId).toContain("rpt-");
    expect(validation.summary.overallValidationScore).toBeGreaterThan(0);
    expect(validation.moduleScores.length).toBeGreaterThan(0);
    expect(validation.validationMetrics.totalValidations).toBeGreaterThan(0);

    const trust = engine.generateTrustReport({
      payloads,
      includeLiveCollectors: false,
    });
    expect(trust.reportType).toBe("TrustReport");
    expect(trust.trustMetrics.averageTrustScore).toBeGreaterThan(0);

    const analytics = engine.generateAnalyticsReport({
      payloads,
      includeLiveCollectors: false,
    });
    expect(analytics.reportType).toBe("AnalyticsReport");
    expect(analytics.analyticsSummary.healthScore).toBeGreaterThan(0);

    const audit = engine.generateAuditReport({
      payloads,
      includeLiveCollectors: false,
    });
    expect(audit.reportType).toBe("AuditReport");
    expect(audit.auditInformation.engineVersion).toBe(
      DEFAULT_REPORTING_CONFIGURATION.engineVersion
    );
  });

  it("applies filters by stock/module/recommendation", () => {
    const report = engine.generateReport({
      reportType: "ValidationReport",
      payloads: samplePayloads(),
      includeLiveCollectors: false,
      filters: {
        stock: "TATAMOTORS",
        module: ["dataIntegrity", "trust"],
      },
    });
    expect(
      report.moduleScores.every((m) =>
        ["dataIntegrity", "trust"].includes(m.module)
      )
    ).toBe(true);
    expect(report.filters.stock).toBe("TATAMOTORS");
  });
});

describe("Templates, export models, snapshots, metrics", () => {
  let engine: ValidationReportingEngine;

  beforeEach(() => {
    resetValidationReportingEngine();
    engine = new ValidationReportingEngine();
  });

  it("lists templates and builds export models", () => {
    const templates = engine.getTemplates().listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(10);

    const report = engine.generateReport({
      payloads: samplePayloads(),
      includeLiveCollectors: false,
    });

    const json = engine.exportReportModel(report, "JSON");
    expect(json.format).toBe("JSON");

    const csv = engine.exportReportModel(report, "CSV");
    expect(csv.format).toBe("CSV");
    if (csv.format === "CSV") {
      expect(csv.headers.length).toBeGreaterThan(0);
      expect(csv.rows.length).toBeGreaterThan(0);
    }

    const excel = engine.exportReportModel(report, "EXCEL_READY");
    expect(excel.format).toBe("EXCEL_READY");
    if (excel.format === "EXCEL_READY") {
      expect(excel.sheets.length).toBeGreaterThanOrEqual(2);
    }

    const pdf = engine.exportReportModel(report, "PDF_READY");
    expect(pdf.format).toBe("PDF_READY");
    if (pdf.format === "PDF_READY") {
      expect(pdf.blocks.length).toBeGreaterThan(0);
    }

    const md = engine.exportReportModel(report, "MARKDOWN");
    expect(md.format).toBe("MARKDOWN");
    if (md.format === "MARKDOWN") {
      expect(md.markdown).toContain("#");
    }
  });

  it("creates and compares report snapshots", () => {
    engine.generateReport({
      payloads: samplePayloads(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createReportSnapshot("baseline");

    const degraded = samplePayloads().map((p) => ({
      ...p,
      trustScore: (p.trustScore ?? 80) - 30,
      integrityScore: (p.integrityScore ?? 80) - 30,
      failed: (p.failed ?? 0) + 25,
      overallHealth: 50,
    }));
    engine.generateReport({
      payloads: degraded,
      includeLiveCollectors: false,
    });
    const snap2 = engine.createReportSnapshot("degraded");

    const comparison = engine.compareReportSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.trustDelta).toBeLessThan(0);
    expect(engine.listSnapshots().length).toBe(2);

    const metrics = engine.getMetrics();
    expect(metrics.reportsGenerated).toBeGreaterThan(0);
    expect(metrics.snapshotCount).toBe(2);
    expect(metrics.exportModelCount).toBeGreaterThanOrEqual(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });

  it("recovers gracefully from empty/missing data", () => {
    const report = engine.generateReport({
      payloads: [],
      includeLiveCollectors: false,
    });
    expect(report.partial || report.warnings.length > 0).toBe(true);
    expect(report.reportId).toBeTruthy();
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationReportingEngine();
    resetReportSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationReportingEngine();
    resetReportSourceRegistrationState();
  });

  it("exposes generate/export/snapshot helpers", () => {
    const engine = new ValidationReportingEngine();
    registerValidationReportingEngine({ engine, force: true });

    const payloads = samplePayloads();
    expect(
      generateValidationReport({ payloads, includeLiveCollectors: false })
        .reportType
    ).toBe("ValidationReport");
    expect(
      generateTrustReport({ payloads, includeLiveCollectors: false }).reportType
    ).toBe("TrustReport");
    expect(
      generateAnalyticsReport({ payloads, includeLiveCollectors: false })
        .reportType
    ).toBe("AnalyticsReport");
    expect(
      generateAuditReport({ payloads, includeLiveCollectors: false }).reportType
    ).toBe("AuditReport");

    const report = generateReport({
      payloads,
      includeLiveCollectors: false,
      reportType: "CustomReport",
    });
    const model = exportReportModel(report, "JSON");
    expect(model.format).toBe("JSON");

    const snap = createReportSnapshot("api");
    expect(snap.snapshotId).toContain("report:");
    expect(DEFAULT_REPORTING_CONFIGURATION.engineVersion).toBe("9F.15.0");
  });
});
