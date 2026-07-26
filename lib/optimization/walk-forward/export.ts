import {
  analyticsExportService,
  type ExportFormat,
  type ExportPreparation,
} from "@/lib/analytics";
import type { WalkForwardSession } from "./types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function cyclesCsv(session: WalkForwardSession): string {
  const header = [
    "cycle",
    "trainingStart",
    "trainingEnd",
    "testingStart",
    "testingEnd",
    "trades",
    "return",
    "winRate",
    "profitFactor",
    "sharpe",
    "drawdown",
    "status",
  ];
  const rows = session.cycles.map((c) =>
    [
      c.cycle,
      c.training.start,
      c.training.end,
      c.testing.start,
      c.testing.end,
      c.metrics.totalTrades,
      c.metrics.totalReturn,
      c.metrics.winRate,
      c.metrics.profitFactor,
      c.metrics.sharpe,
      c.metrics.maxDrawdown,
      c.status,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function pdfText(session: WalkForwardSession): string {
  const d = session.dashboard;
  return [
    "EquityOS Walk-Forward Validation Report",
    `Session: ${session.id}`,
    `Strategy: ${session.strategyName}`,
    `Method: ${session.config.method}`,
    `Status: ${session.status}`,
    `Robustness: ${d?.robustness.score ?? "—"} (${d?.overallGrade ?? "—"})`,
    "",
    "=== Insights ===",
    ...(d?.insights ?? []).map((i) => `• ${i}`),
    "",
    "=== Cycles ===",
    ...session.cycles.map(
      (c) =>
        `#${c.cycle} ${c.status} ret=${c.metrics.totalReturn}% WR=${c.metrics.winRate}% PF=${c.metrics.profitFactor} DD=${c.metrics.maxDrawdown}%`
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
    // surfaced by caller
  }
}

export async function exportWalkForwardSession(input: {
  session: WalkForwardSession;
  format: ExportFormat;
}): Promise<ExportPreparation> {
  const prepared = await analyticsExportService.prepare({
    format: input.format,
    title: `Walk-Forward ${input.session.strategyName}`,
    payload: { sessionId: input.session.id },
    filename: `walk-forward-${input.session.id}.${
      input.format === "excel" ? "csv" : input.format === "pdf" ? "txt" : input.format
    }`,
  });

  if (prepared.status === "failed") return prepared;

  try {
    let body = "";
    if (input.format === "json") {
      body = JSON.stringify(input.session, null, 2);
    } else if (input.format === "pdf") {
      body = pdfText(input.session);
    } else {
      body = cyclesCsv(input.session);
    }
    downloadBlob(prepared.filename, prepared.mimeType, body);
    return {
      ...prepared,
      status: "ready",
      body,
      message: `Exported walk-forward session as ${input.format.toUpperCase()}.`,
    };
  } catch (err) {
    return {
      ...prepared,
      status: "failed",
      message: err instanceof Error ? err.message : "Export failed.",
    };
  }
}
