/**
 * Strategy Builder exports — PDF/CSV/Excel/JSON via shared analytics façade.
 */

import {
  analyticsExportService,
  type ExportFormat,
  type ExportPreparation,
} from "@/lib/analytics";
import type { BuiltStrategy, ComparisonHighlight } from "./types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function strategiesCsv(strategies: readonly BuiltStrategy[]): string {
  const header = [
    "name",
    "grade",
    "overall",
    "return",
    "winRate",
    "profitFactor",
    "sharpe",
    "drawdown",
    "cagr",
    "trades",
    "deployment",
    "tags",
  ];
  const rows = strategies.map((s) =>
    [
      s.name,
      s.scores.grade,
      s.scores.overall,
      s.performance.historicalReturn,
      s.performance.winRate,
      s.performance.profitFactor,
      s.performance.sharpe,
      s.performance.maxDrawdown,
      s.performance.cagr,
      s.performance.tradeCount,
      s.deployment.status,
      s.tags.join("|"),
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function pdfText(
  strategies: readonly BuiltStrategy[],
  highlight?: ComparisonHighlight | null
): string {
  const lines = [
    "EquityOS AI Strategy Builder Report",
    `Strategies: ${strategies.length}`,
    `Generated: ${new Date().toISOString()}`,
    "",
  ];
  for (const s of strategies) {
    lines.push(
      `=== ${s.name} (${s.scores.grade}) ===`,
      `Overall ${s.scores.overall} · Return ${s.performance.historicalReturn}% · WR ${s.performance.winRate}% · PF ${s.performance.profitFactor} · Sharpe ${s.performance.sharpe} · DD ${s.performance.maxDrawdown}%`,
      `Deployment: ${s.deployment.status} — ${s.deployment.summary}`,
      `Entry: ${s.rules.entry.join("; ")}`,
      `Exit: ${s.rules.exit.join("; ")}`,
      ""
    );
  }
  if (highlight) {
    lines.push(
      "=== Comparison Highlights ===",
      `Best return: ${highlight.bestReturnId ?? "—"}`,
      `Lowest DD: ${highlight.lowestDrawdownId ?? "—"}`,
      `Highest Sharpe: ${highlight.highestSharpeId ?? "—"}`
    );
  }
  return lines.join("\n");
}

function downloadBlob(filename: string, mime: string, body: string): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Caller surfaces failure.
  }
}

export async function exportStrategies(input: {
  strategies: readonly BuiltStrategy[];
  format: ExportFormat;
  title?: string;
  highlight?: ComparisonHighlight | null;
}): Promise<ExportPreparation> {
  if (input.strategies.length === 0) {
    return {
      requestId: `export_empty_${Date.now().toString(36)}`,
      format: input.format,
      status: "failed",
      filename: "strategy-builder-empty.txt",
      mimeType: "text/plain",
      message: "No strategies selected for export.",
    };
  }

  const prepared = await analyticsExportService.prepare({
    format: input.format,
    title: input.title ?? "AI Strategy Builder",
    payload: { count: input.strategies.length },
    filename: `strategy-builder.${input.format === "excel" ? "csv" : input.format === "pdf" ? "txt" : input.format}`,
  });

  if (prepared.status === "failed") return prepared;

  try {
    let body: string;
    let mime = prepared.mimeType;
    if (input.format === "json") {
      body = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          strategies: input.strategies,
          highlight: input.highlight ?? null,
        },
        null,
        2
      );
      mime = "application/json";
    } else if (input.format === "pdf") {
      body = pdfText(input.strategies, input.highlight);
      mime = "text/plain";
    } else {
      body = strategiesCsv(input.strategies);
      mime = "text/csv";
    }
    downloadBlob(prepared.filename, mime, body);
    return { ...prepared, status: "ready", message: `Exported ${input.strategies.length} strategies.` };
  } catch {
    return {
      ...prepared,
      status: "failed",
      message: "Export failed unexpectedly.",
    };
  }
}
