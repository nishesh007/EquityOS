/**
 * Structured export models for future JSON/CSV/Excel/PDF/Markdown exporters.
 * No rendering logic — data contracts only.
 */

import type { ExportFormat } from "./ReportConfiguration";
import type { InstitutionalReport } from "./ReportBuilder";

export interface JsonExportModel {
  format: "JSON";
  reportId: string;
  generatedAt: string;
  data: InstitutionalReport;
}

export interface CsvExportModel {
  format: "CSV";
  reportId: string;
  generatedAt: string;
  headers: string[];
  rows: string[][];
}

export interface ExcelReadyExportModel {
  format: "EXCEL_READY";
  reportId: string;
  generatedAt: string;
  sheets: Array<{
    name: string;
    headers: string[];
    rows: Array<Array<string | number | boolean | null>>;
  }>;
}

export interface PdfReadyExportModel {
  format: "PDF_READY";
  reportId: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  blocks: Array<{
    heading: string;
    paragraphs: string[];
    tables?: Array<{ headers: string[]; rows: string[][] }>;
  }>;
}

export interface MarkdownExportModel {
  format: "MARKDOWN";
  reportId: string;
  generatedAt: string;
  markdown: string;
}

export type ReportExportModel =
  | JsonExportModel
  | CsvExportModel
  | ExcelReadyExportModel
  | PdfReadyExportModel
  | MarkdownExportModel;

export class ReportExportModels {
  build(report: InstitutionalReport, format: ExportFormat): ReportExportModel {
    switch (format) {
      case "JSON":
        return {
          format: "JSON",
          reportId: report.reportId,
          generatedAt: report.generatedTime,
          data: report,
        };
      case "CSV":
        return this.toCsv(report);
      case "EXCEL_READY":
        return this.toExcel(report);
      case "PDF_READY":
        return this.toPdfReady(report);
      case "MARKDOWN":
        return this.toMarkdown(report);
      default:
        return {
          format: "JSON",
          reportId: report.reportId,
          generatedAt: report.generatedTime,
          data: report,
        };
    }
  }

  private toCsv(report: InstitutionalReport): CsvExportModel {
    const headers = [
      "module",
      "status",
      "validationCount",
      "successPercent",
      "failurePercent",
      "averageScore",
      "trend",
    ];
    const rows = report.moduleScores.map((m) => [
      m.module,
      m.status,
      String(m.validationCount),
      String(m.successPercent),
      String(m.failurePercent),
      String(m.averageScore),
      m.trend,
    ]);
    return {
      format: "CSV",
      reportId: report.reportId,
      generatedAt: report.generatedTime,
      headers,
      rows,
    };
  }

  private toExcel(report: InstitutionalReport): ExcelReadyExportModel {
    return {
      format: "EXCEL_READY",
      reportId: report.reportId,
      generatedAt: report.generatedTime,
      sheets: [
        {
          name: "Summary",
          headers: ["metric", "value"],
          rows: [
            ["overallValidationScore", report.summary.overallValidationScore],
            ["integrityScore", report.summary.integrityScore],
            ["trustScore", report.summary.trustScore],
            ["hallucinationScore", report.summary.hallucinationScore],
            ["historicalScore", report.summary.historicalScore],
            ["recommendationQuality", report.summary.recommendationQuality],
            ["tradeQuality", report.summary.tradeQuality],
            ["overallHealth", report.summary.overallHealth],
          ],
        },
        {
          name: "Modules",
          headers: [
            "module",
            "status",
            "validationCount",
            "successPercent",
            "failurePercent",
            "averageScore",
            "trend",
            "warnings",
          ],
          rows: report.moduleScores.map((m) => [
            m.module,
            m.status,
            m.validationCount,
            m.successPercent,
            m.failurePercent,
            m.averageScore,
            m.trend,
            m.warnings,
          ]),
        },
      ],
    };
  }

  private toPdfReady(report: InstitutionalReport): PdfReadyExportModel {
    return {
      format: "PDF_READY",
      reportId: report.reportId,
      generatedAt: report.generatedTime,
      title: report.title,
      subtitle: `${report.reportType} · ${report.generatedTime}`,
      blocks: [
        {
          heading: "Summary",
          paragraphs: [
            `Overall Validation Score: ${report.summary.overallValidationScore}`,
            `Trust Score: ${report.summary.trustScore}`,
            `Integrity Score: ${report.summary.integrityScore}`,
            `Overall Health: ${report.summary.overallHealth}`,
          ],
        },
        {
          heading: "Modules",
          paragraphs: [`${report.moduleScores.length} modules included`],
          tables: [
            {
              headers: ["Module", "Score", "Success %", "Trend"],
              rows: report.moduleScores.map((m) => [
                m.module,
                String(m.averageScore),
                String(m.successPercent),
                m.trend,
              ]),
            },
          ],
        },
        {
          heading: "Warnings & Errors",
          paragraphs: [
            ...report.warnings.slice(0, 20),
            ...report.errors.slice(0, 20),
          ],
        },
      ],
    };
  }

  private toMarkdown(report: InstitutionalReport): MarkdownExportModel {
    const lines = [
      `# ${report.title}`,
      ``,
      `- Report ID: \`${report.reportId}\``,
      `- Type: ${report.reportType}`,
      `- Generated: ${report.generatedTime}`,
      ``,
      `## Summary`,
      ``,
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Overall Validation | ${report.summary.overallValidationScore} |`,
      `| Integrity | ${report.summary.integrityScore} |`,
      `| Trust | ${report.summary.trustScore} |`,
      `| Hallucination | ${report.summary.hallucinationScore} |`,
      `| Historical | ${report.summary.historicalScore} |`,
      `| Recommendation Quality | ${report.summary.recommendationQuality} |`,
      `| Trade Quality | ${report.summary.tradeQuality} |`,
      `| Overall Health | ${report.summary.overallHealth} |`,
      ``,
      `## Modules`,
      ``,
      `| Module | Status | Score | Success % | Trend |`,
      `| --- | --- | --- | --- | --- |`,
      ...report.moduleScores.map(
        (m) =>
          `| ${m.module} | ${m.status} | ${m.averageScore} | ${m.successPercent} | ${m.trend} |`
      ),
      ``,
      `## Recommendations`,
      ``,
      ...report.recommendations.map((r) => `- ${r}`),
    ];
    return {
      format: "MARKDOWN",
      reportId: report.reportId,
      generatedAt: report.generatedTime,
      markdown: lines.join("\n"),
    };
  }
}
