/**
 * Lightweight report formatter helpers (structure only, no PDF/Excel rendering).
 */

import type { InstitutionalReport } from "./ReportBuilder";
import type { ReportDetailLevel } from "./ReportConfiguration";

export class ReportFormatter {
  /** Produce a compact plain-text overview for logs / audit. */
  toPlainSummary(report: InstitutionalReport): string {
    return [
      `${report.title} [${report.reportId}]`,
      `Type=${report.reportType} Detail=${report.detailLevel}`,
      `Validation=${report.summary.overallValidationScore} Trust=${report.summary.trustScore} Integrity=${report.summary.integrityScore} Health=${report.summary.overallHealth}`,
      `Modules=${report.moduleScores.length} Warnings=${report.warnings.length} Errors=${report.errors.length}`,
      report.partial ? "PARTIAL_REPORT" : "COMPLETE_REPORT",
    ].join(" | ");
  }

  estimateSizeBytes(report: InstitutionalReport): number {
    try {
      return JSON.stringify(report).length;
    } catch {
      return 0;
    }
  }

  applyDetailLevel(
    report: InstitutionalReport,
    detailLevel: ReportDetailLevel
  ): InstitutionalReport {
    if (detailLevel === "FULL" || detailLevel === "DETAILED") return report;
    return {
      ...report,
      detailLevel,
      moduleScores:
        detailLevel === "SUMMARY"
          ? report.moduleScores.slice(0, 5)
          : report.moduleScores.slice(0, 20),
      warnings: report.warnings.slice(0, detailLevel === "SUMMARY" ? 5 : 25),
      errors: report.errors.slice(0, detailLevel === "SUMMARY" ? 5 : 25),
      recommendations: report.recommendations.slice(
        0,
        detailLevel === "SUMMARY" ? 3 : 10
      ),
    };
  }
}
