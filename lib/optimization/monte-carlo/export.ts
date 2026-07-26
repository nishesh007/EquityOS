import {
  analyticsExportService,
  type ExportFormat,
  type ExportPreparation,
} from "@/lib/analytics";
import type { MonteCarloSession } from "./types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function resultsCsv(session: MonteCarloSession): string {
  const header = [
    "simulation",
    "scenario",
    "return",
    "drawdown",
    "sharpe",
    "profitFactor",
    "probability",
    "riskGrade",
    "status",
  ];
  const rows = session.results.map((r) =>
    [
      r.simulationIndex,
      r.scenarioLabel,
      r.metrics.expectedReturn,
      r.metrics.maxDrawdown,
      r.metrics.sharpe,
      r.metrics.profitFactor,
      r.probability,
      r.riskGrade,
      r.status,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function pdfText(session: MonteCarloSession): string {
  const d = session.dashboard;
  return [
    "EquityOS Monte Carlo & Stress Testing Report",
    `Session: ${session.id}`,
    `Strategy: ${session.strategyName}`,
    `Simulations: ${session.results.length}`,
    `Stability: ${d?.overallStabilityScore ?? "—"}`,
    `Risk Grade: ${d?.riskGrade ?? "—"}`,
    `P(Ruin): ${d?.probabilityOfRuin ?? "—"}%`,
    "",
    "=== Insights ===",
    ...(d?.insights ?? []).map((i) => `• ${i}`),
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
    // caller surfaces
  }
}

export async function exportMonteCarloSession(input: {
  session: MonteCarloSession;
  format: ExportFormat;
}): Promise<ExportPreparation> {
  const prepared = await analyticsExportService.prepare({
    format: input.format,
    title: `Monte Carlo ${input.session.strategyName}`,
    payload: { sessionId: input.session.id },
    filename: `monte-carlo-${input.session.id}.${
      input.format === "excel" ? "csv" : input.format === "pdf" ? "txt" : input.format
    }`,
  });
  if (prepared.status === "failed") return prepared;

  try {
    let body = "";
    if (input.format === "json") body = JSON.stringify(input.session, null, 2);
    else if (input.format === "pdf") body = pdfText(input.session);
    else body = resultsCsv(input.session);
    downloadBlob(prepared.filename, prepared.mimeType, body);
    return {
      ...prepared,
      status: "ready",
      body,
      message: `Exported Monte Carlo session as ${input.format.toUpperCase()}.`,
    };
  } catch (err) {
    return {
      ...prepared,
      status: "failed",
      message: err instanceof Error ? err.message : "Export failed.",
    };
  }
}
