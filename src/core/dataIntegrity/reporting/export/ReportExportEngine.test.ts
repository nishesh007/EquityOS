/**
 * Institutional Report Export Center — unit tests (Prompt 9F.R1).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ReportExportEngine,
  registerReportExportEngine,
  resetReportExportEngine,
  exportPDF,
  exportExcel,
  exportMarkdown,
  printReport,
  canUserExport,
  getExportMetrics,
  getExportAuditLog,
  listSupportedExportReports,
  type ExportAccessSubject,
} from "./index";
import {
  registerValidationReportingEngine,
  resetValidationReportingEngine,
  generateValidationReport,
} from "../index";
import {
  registerValidationSecurityEngine,
  resetValidationSecurityEngine,
} from "../../security";

function admin(): ExportAccessSubject {
  return {
    userId: "admin-1",
    role: "administrator",
    subscriptionTier: "enterprise",
    securityRoles: ["administrator"],
  };
}

function subscriber(tier: "basic" | "pro" | "enterprise" = "pro"): ExportAccessSubject {
  return {
    userId: "sub-1",
    role: "subscriber",
    subscriptionTier: tier,
    securityRoles: ["research_analyst"],
  };
}

function freeUser(): ExportAccessSubject {
  return {
    userId: "free-1",
    role: "free",
    subscriptionTier: "none",
    securityRoles: ["read_only"],
  };
}

describe("Report Export Center (9F.R1)", () => {
  beforeEach(() => {
    resetReportExportEngine();
    resetValidationReportingEngine();
    resetValidationSecurityEngine();
    registerValidationSecurityEngine();
    registerValidationReportingEngine();
    registerReportExportEngine();
  });

  afterEach(() => {
    resetReportExportEngine();
    resetValidationReportingEngine();
    resetValidationSecurityEngine();
  });

  it("lists supported institutional report types", () => {
    const list = listSupportedExportReports();
    const types = list.map((d) => d.reportType);
    expect(types).toContain("ValidationReport");
    expect(types).toContain("TrustReport");
    expect(types).toContain("AnalyticsReport");
    expect(types).toContain("ComplianceReport");
    expect(types).toContain("AuditReport");
    expect(types).toContain("KnowledgeReport");
    expect(types).toContain("PlatformHealthReport");
    expect(types).toContain("DailyMarketReport");
    expect(types).toContain("TomorrowWatchlistReport");
    expect(types).toContain("PortfolioValidationReport");
  });

  it("grants administrator full access", () => {
    for (const format of ["PDF", "EXCEL", "MARKDOWN", "PRINT"] as const) {
      const perm = canUserExport(admin(), format);
      expect(perm.allowed).toBe(true);
      expect(perm.upgradeRequired).toBe(false);
    }
  });

  it("allows subscriber PDF/Print/Markdown and Excel by tier", () => {
    const basic = subscriber("basic");
    expect(canUserExport(basic, "PDF").allowed).toBe(true);
    expect(canUserExport(basic, "PRINT").allowed).toBe(true);
    expect(canUserExport(basic, "MARKDOWN").allowed).toBe(true);
    expect(canUserExport(basic, "EXCEL").allowed).toBe(false);

    const pro = subscriber("pro");
    expect(canUserExport(pro, "EXCEL").allowed).toBe(true);
  });

  it("denies free user downloads with Upgrade Required", () => {
    for (const format of ["PDF", "EXCEL", "MARKDOWN", "PRINT"] as const) {
      const perm = canUserExport(freeUser(), format);
      expect(perm.allowed).toBe(false);
      expect(perm.previewOnly).toBe(true);
      expect(perm.upgradeRequired).toBe(true);
      expect(perm.reason).toMatch(/Upgrade Required/i);
    }
  });

  it("generates PDF for administrators", () => {
    const report = generateValidationReport({ includeLiveCollectors: false });
    const result = exportPDF({
      reportType: "ValidationReport",
      report,
      subject: admin(),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.artifact.format).toBe("PDF");
    expect(result.artifact.bytes.length).toBeGreaterThan(100);
    expect(new TextDecoder().decode(result.artifact.bytes.slice(0, 5))).toBe(
      "%PDF-"
    );
    expect(result.artifact.metadata.watermark).toBeTruthy();
    expect(result.artifact.metadata.aiVersion).toBeTruthy();
    expect(result.artifact.metadata.validationVersion).toBeTruthy();
    expect(result.artifact.metadata.trustVersion).toBeTruthy();
    expect(result.artifact.metadata.platformVersion).toBeTruthy();
    expect(result.artifact.metadata.reportVersion).toBeTruthy();
    expect(result.artifact.metadata.environment).toBeTruthy();
    expect(result.artifact.document.sections.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        "cover",
        "executive_summary",
        "validation_summary",
        "trust_summary",
        "disclaimer",
      ])
    );
  });

  it("generates Excel for administrators", () => {
    const result = exportExcel({
      reportType: "TrustReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.artifact.format).toBe("EXCEL");
    expect(result.artifact.content).toContain("Workbook");
    expect(result.artifact.sheetNames).toContain("Metadata");
    expect(result.artifact.sheetNames).toContain("Summary");
  });

  it("generates Markdown for subscribers", () => {
    const result = exportMarkdown({
      reportType: "AnalyticsReport",
      subject: subscriber("basic"),
      generateOptions: { includeLiveCollectors: false },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.artifact.content).toContain("generatedOn:");
    expect(result.artifact.content).toContain("watermark:");
    expect(result.artifact.content).toContain("Disclaimer");
  });

  it("generates Print HTML", () => {
    const result = printReport({
      reportType: "AuditReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.artifact.html).toContain("<!DOCTYPE html>");
    expect(result.artifact.html).toContain("window.print");
    expect(result.artifact.html).toContain("Disclaimer");
  });

  it("blocks free user PDF export without downloadable artifact", () => {
    const result = exportPDF({
      reportType: "ValidationReport",
      subject: freeUser(),
      generateOptions: { includeLiveCollectors: false },
    });
    expect(result.success).toBe(false);
    expect(result.denied).toBe(true);
    if (result.success) return;
    expect(result.upgradeRequired).toBe(true);
    expect(result.previewOnly).toBe(true);
    expect(result.reason).toMatch(/Upgrade Required/i);
    expect(result.preview).toBeTruthy();
  });

  it("blocks subscriber Excel when tier does not allow", () => {
    const result = exportExcel({
      reportType: "ValidationReport",
      subject: subscriber("basic"),
      generateOptions: { includeLiveCollectors: false },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toMatch(/Excel|tier/i);
  });

  it("records audit logging", () => {
    exportPDF({
      reportType: "ValidationReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    exportPDF({
      reportType: "ValidationReport",
      subject: freeUser(),
      generateOptions: { includeLiveCollectors: false },
    });
    const log = getExportAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
    const success = log.find((e) => e.success && e.exportFormat === "PDF");
    const failure = log.find((e) => !e.success && e.userRole === "free");
    expect(success).toBeTruthy();
    expect(success?.reportType).toBeTruthy();
    expect(success?.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(failure).toBeTruthy();
  });

  it("tracks export metrics", () => {
    exportPDF({
      reportType: "ValidationReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    exportMarkdown({
      reportType: "ValidationReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    printReport({
      reportType: "ValidationReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    exportExcel({
      reportType: "ValidationReport",
      subject: admin(),
      generateOptions: { includeLiveCollectors: false },
    });
    exportPDF({
      reportType: "ValidationReport",
      subject: freeUser(),
      generateOptions: { includeLiveCollectors: false },
    });

    const metrics = getExportMetrics();
    expect(metrics.pdfExports).toBeGreaterThanOrEqual(1);
    expect(metrics.excelExports).toBeGreaterThanOrEqual(1);
    expect(metrics.markdownExports).toBeGreaterThanOrEqual(1);
    expect(metrics.prints).toBeGreaterThanOrEqual(1);
    expect(metrics.failures).toBeGreaterThanOrEqual(1);
    expect(metrics.averageExportTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("reuses existing InstitutionalReport without regenerating", () => {
    const report = generateValidationReport({ includeLiveCollectors: false });
    const engine = new ReportExportEngine();
    const result = engine.exportPDF({
      reportType: "ValidationReport",
      report,
      subject: admin(),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.artifact.metadata.reportId).toBe(report.reportId);
  });
});
