/**
 * Report export adapter — reuses shared analytics export contracts.
 * Materializes CSV/JSON; PDF/Excel ship text/CSV-compatible payloads via the same API.
 */

import {
  analyticsExportService,
  type ExportFormat,
  type ExportPreparation,
} from "@/lib/analytics";
import type { InstitutionalReport } from "@/lib/backtesting/reports/types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function tradeLogCsv(report: InstitutionalReport): string {
  const header = [
    "tradeId",
    "sessionId",
    "strategy",
    "symbol",
    "sector",
    "regime",
    "entryAt",
    "exitAt",
    "returnPercent",
    "pnl",
    "hitTarget",
    "hitStopLoss",
    "conviction",
  ];
  const rows = report.trades.map((t) =>
    [
      t.id,
      t.sessionId,
      t.strategyLabel,
      t.symbol,
      t.sector,
      t.marketRegime,
      t.entryAt,
      t.exitAt ?? "",
      t.returnPercent,
      t.pnl,
      t.hitTarget,
      t.hitStopLoss,
      t.conviction ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function strategyTableCsv(report: InstitutionalReport): string {
  const header = [
    "strategy",
    "trades",
    "totalReturn",
    "winRate",
    "profitFactor",
    "maxDrawdown",
  ];
  const rows = report.validation.strategyComparison.map((r) =>
    [
      r.label,
      r.tradeCount,
      r.totalReturn,
      r.statistics.winRate,
      r.statistics.profitFactor ?? "",
      r.statistics.maximumDrawdown ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function pdfTextReport(report: InstitutionalReport): string {
  const s = report.executiveSummary;
  const lines = [
    `EquityOS Institutional Report`,
    `Report ID: ${report.version.reportId}`,
    `Generated: ${report.version.generatedAt}`,
    `Template: ${report.template.label}`,
    `App Version: ${report.version.applicationVersion}`,
    `Data Version: ${report.version.dataVersion}`,
    `Sessions: ${report.version.backtestSessionIds.join(", ")}`,
    "",
    "=== Executive Summary ===",
    s.overallPerformance,
    `Best Strategy: ${s.bestStrategy}`,
    `Weakest Strategy: ${s.weakestStrategy}`,
    `Risk: ${s.riskAssessment}`,
    `Recommendation Reliability: ${s.recommendationReliability}`,
    "",
    "Key Findings:",
    ...s.keyFindings.map((f) => `• ${f}`),
    "",
    "Improvement Opportunities:",
    ...s.improvementOpportunities.map((f) => `• ${f}`),
  ];
  return lines.join("\n");
}

/**
 * Prepare + materialize a report export using shared ExportRequest/Preparation.
 */
export async function exportInstitutionalReport(input: {
  report: InstitutionalReport;
  format: ExportFormat;
  filename?: string;
}): Promise<ExportPreparation> {
  const title = `${input.report.template.label} · ${input.report.version.reportId}`;
  const prepared = await analyticsExportService.prepare({
    format: input.format,
    title,
    filename: input.filename,
    dateRange: undefined,
    payload: {
      reportId: input.report.version.reportId,
      templateId: input.report.version.templateId,
      sessionIds: input.report.version.backtestSessionIds,
    },
    columns: ["tradeId", "symbol", "returnPercent", "pnl"],
    createdAt: input.report.version.generatedAt,
  });

  if (prepared.status === "failed") return prepared;

  switch (input.format) {
    case "json":
      return {
        ...prepared,
        status: "ready",
        body: JSON.stringify(input.report, null, 2),
        message: "JSON institutional report materialized.",
      };
    case "csv":
      return {
        ...prepared,
        status: "ready",
        body: tradeLogCsv(input.report),
        message: "CSV trade log materialized.",
      };
    case "excel":
      return {
        ...prepared,
        status: "ready",
        // CSV-compatible workbook payload Excel can open; true XLSX deferred.
        body: `${strategyTableCsv(input.report)}\n\n${tradeLogCsv(input.report)}`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        message:
          "Excel export ready as CSV-compatible tabular payload (open in Excel).",
      };
    case "pdf":
      return {
        ...prepared,
        status: "ready",
        body: pdfTextReport(input.report),
        mimeType: "application/pdf",
        message:
          "PDF export ready as institutional text layout (print-to-PDF compatible).",
      };
    default:
      return {
        ...prepared,
        status: "unsupported",
        message: `Unsupported export format: ${String(input.format)}`,
      };
  }
}
