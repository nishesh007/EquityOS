import {
  analyticsExportService,
  type ExportFormat,
  type ExportPreparation,
} from "@/lib/analytics";
import type { OptimizationResult, OptimizationSession } from "./types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function leaderboardCsv(results: readonly OptimizationResult[]): string {
  const header = [
    "rank",
    "strategy",
    "parameters",
    "winRate",
    "profitFactor",
    "sharpe",
    "maxDrawdown",
    "totalReturn",
    "riskReward",
    "score",
    "trades",
    "cagr",
    "expectancy",
    "sortino",
  ];
  const rows = results.map((r) =>
    [
      r.rank,
      r.strategyName,
      JSON.stringify(r.combination.labels),
      r.metrics.winRate,
      r.metrics.profitFactor,
      r.metrics.sharpe,
      r.metrics.maxDrawdown,
      r.metrics.totalReturn,
      r.metrics.riskReward,
      r.score,
      r.metrics.totalTrades,
      r.metrics.cagr,
      r.metrics.expectancy,
      r.metrics.sortino,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function pdfText(session: OptimizationSession): string {
  const top = session.results.slice(0, 10);
  return [
    "EquityOS Strategy Optimization Report",
    `Session: ${session.id}`,
    `Strategy: ${session.strategyName}`,
    `Mode: ${session.searchMode}`,
    `Status: ${session.status}`,
    `Combinations: ${session.evaluatedCount}/${session.combinationCount}`,
    `Created: ${session.createdAt}`,
    `Completed: ${session.completedAt ?? "—"}`,
    "",
    "=== Top Results ===",
    ...top.map(
      (r) =>
        `#${r.rank} score=${r.score} PF=${r.metrics.profitFactor} WR=${r.metrics.winRate}% Sharpe=${r.metrics.sharpe} DD=${r.metrics.maxDrawdown}%`
    ),
  ].join("\n");
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
    // Export failure — caller surfaces message.
  }
}

export async function exportOptimizationSession(input: {
  session: OptimizationSession;
  format: ExportFormat;
  results?: readonly OptimizationResult[];
}): Promise<ExportPreparation> {
  const results = input.results ?? input.session.results;
  const prepared = await analyticsExportService.prepare({
    format: input.format,
    title: `Optimization ${input.session.strategyName}`,
    payload: { sessionId: input.session.id, resultCount: results.length },
    filename: `optimization-${input.session.id}.${input.format === "excel" ? "csv" : input.format === "pdf" ? "txt" : input.format}`,
  });

  if (prepared.status === "failed") return prepared;

  try {
    let body = "";
    if (input.format === "json") {
      body = JSON.stringify(
        {
          session: {
            id: input.session.id,
            strategy: input.session.strategyName,
            searchMode: input.session.searchMode,
            status: input.session.status,
            createdAt: input.session.createdAt,
            completedAt: input.session.completedAt,
          },
          results,
        },
        null,
        2
      );
    } else if (input.format === "pdf") {
      body = pdfText(input.session);
    } else {
      // csv + excel (CSV-compatible payload)
      body = leaderboardCsv(results);
    }

    downloadBlob(prepared.filename, prepared.mimeType, body);

    return {
      ...prepared,
      status: "ready",
      body,
      message: `Exported ${results.length} results as ${input.format.toUpperCase()}.`,
    };
  } catch (err) {
    return {
      ...prepared,
      status: "failed",
      message:
        err instanceof Error ? err.message : "Export failed unexpectedly.",
    };
  }
}
