/**
 * Admin reporting exports — Sprint 12C.
 */

import type { AuditLogEntry, SystemHealthSnapshot } from "./types";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function auditToCsv(rows: AuditLogEntry[]): string {
  const header = ["id", "action", "actor", "target", "summary", "createdAt"];
  const lines = rows.map((r) =>
    [r.id, r.action, r.actorEmail, r.targetId, r.summary, r.createdAt]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function healthToCsv(health: SystemHealthSnapshot): string {
  const lines = [
    "metric,value",
    `overall,${health.overall}`,
    `environment,${health.environment}`,
    `build,${health.buildVersion}`,
    `deployment,${health.deploymentVersion}`,
    `memoryPct,${health.memoryUsagePct}`,
    `cpuPct,${health.cpuUsagePct}`,
    `diskPct,${health.diskUsagePct}`,
    ...health.components.map(
      (c) => `${csvEscape(c.id)},${csvEscape(`${c.status} ${c.latencyMs ?? ""}ms`)}`
    ),
  ];
  return lines.join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildSystemReportText(input: {
  health: SystemHealthSnapshot;
  auditCount: number;
  userCount: number;
}): string {
  return [
    "EQUITYOS SYSTEM REPORT",
    `Generated: ${new Date().toISOString()}`,
    `Overall: ${input.health.overall}`,
    `Env: ${input.health.environment}`,
    `Build: ${input.health.buildVersion}`,
    `Users: ${input.userCount}`,
    `Audit events: ${input.auditCount}`,
    "",
    ...input.health.components.map(
      (c) => `${c.label}: ${c.status} (${c.message})`
    ),
  ].join("\n");
}
