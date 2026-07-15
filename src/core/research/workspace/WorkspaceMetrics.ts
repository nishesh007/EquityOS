/**
 * Institutional Research Workspace — metrics (Sprint 10A.R1).
 * Open sessions, pinned, research count, cache, memory, execution time.
 */

import { WORKSPACE_EMPTY, safeWorkspaceNumber, safeWorkspaceText } from "./WorkspaceModels";
import { cacheUsageBytes, getLayoutCacheCount } from "./WorkspaceLayout";
import { listSessions } from "./WorkspaceSession";
import { getActiveWorkspace, listWorkspaces } from "./WorkspaceRegistry";

export interface ResearchWorkspaceMetrics {
  openSessions: number;
  pinned: number;
  researchCount: number;
  cacheUsage: number;
  memoryUsage: number;
  executionTimeMs: number;
  workspaceCount: number;
  activeWorkspaceId: string;
  labels: {
    openSessions: string;
    pinned: string;
    researchCount: string;
    cacheUsage: string;
    memoryUsage: string;
    executionTime: string;
    workspaces: string;
  };
  empty: boolean;
  emptyMessage: string;
}

let lastExecutionMs = 0;
let cumulativeExecutionMs = 0;
let runCount = 0;

export function emptyWorkspaceMetrics(): ResearchWorkspaceMetrics {
  return {
    openSessions: 0,
    pinned: 0,
    researchCount: 0,
    cacheUsage: 0,
    memoryUsage: 0,
    executionTimeMs: 0,
    workspaceCount: 0,
    activeWorkspaceId: "",
    labels: {
      openSessions: WORKSPACE_EMPTY.noActiveResearch,
      pinned: "0",
      researchCount: WORKSPACE_EMPTY.awaitingResearch,
      cacheUsage: "0 B",
      memoryUsage: "0 B",
      executionTime: "0 ms",
      workspaces: WORKSPACE_EMPTY.noWorkspace,
    },
    empty: true,
    emptyMessage: WORKSPACE_EMPTY.noWorkspace,
  };
}

export function recordExecutionTime(ms: number): void {
  const value = Math.max(0, Math.floor(safeWorkspaceNumber(ms, 0)));
  lastExecutionMs = value;
  cumulativeExecutionMs += value;
  runCount += 1;
}

export function getWorkspaceMetrics(): ResearchWorkspaceMetrics {
  const started = Date.now();
  try {
    const workspaces = listWorkspaces({ includeArchived: true });
    const sessions = listSessions({ includeArchived: true });
    const openSessions = sessions.filter((s) => s.status === "open").length;
    const pinned = sessions.filter((s) => s.pinned).length;
    const researchCount = sessions.reduce((sum, s) => sum + s.researchCount, 0);
    const cacheUsage = cacheUsageBytes();
    const memoryUsage = estimateMemoryBytes(workspaces.length, sessions.length);
    const active = getActiveWorkspace();
    const executionTimeMs =
      lastExecutionMs || Math.max(0, Date.now() - started);

    const empty = workspaces.length === 0;

    return {
      openSessions,
      pinned,
      researchCount,
      cacheUsage,
      memoryUsage,
      executionTimeMs,
      workspaceCount: workspaces.length,
      activeWorkspaceId: active?.id ?? "",
      labels: {
        openSessions:
          openSessions > 0
            ? String(openSessions)
            : WORKSPACE_EMPTY.noActiveResearch,
        pinned: String(pinned),
        researchCount:
          researchCount > 0
            ? String(researchCount)
            : WORKSPACE_EMPTY.awaitingResearch,
        cacheUsage: formatBytes(cacheUsage),
        memoryUsage: formatBytes(memoryUsage),
        executionTime: `${executionTimeMs} ms`,
        workspaces:
          workspaces.length > 0
            ? String(workspaces.length)
            : WORKSPACE_EMPTY.noWorkspace,
      },
      empty,
      emptyMessage: empty
        ? WORKSPACE_EMPTY.noWorkspace
        : WORKSPACE_EMPTY.awaitingResearch,
    };
  } catch {
    return emptyWorkspaceMetrics();
  }
}

export function getCacheUsage(): number {
  return cacheUsageBytes();
}

export function getMemoryUsage(): number {
  const workspaces = listWorkspaces({ includeArchived: true });
  const sessions = listSessions({ includeArchived: true });
  return estimateMemoryBytes(workspaces.length, sessions.length);
}

export function resetMetrics(): void {
  lastExecutionMs = 0;
  cumulativeExecutionMs = 0;
  runCount = 0;
}

export function getMetricsRunCount(): number {
  return runCount;
}

export function getCumulativeExecutionMs(): number {
  return cumulativeExecutionMs;
}

function estimateMemoryBytes(workspaceCount: number, sessionCount: number): number {
  const layoutBytes = cacheUsageBytes();
  const registryBytes =
    workspaceCount * 256 + sessionCount * 192 + getLayoutCacheCount() * 64;
  return layoutBytes + registryBytes;
}

function formatBytes(bytes: number): string {
  const n = Math.max(0, Math.floor(safeWorkspaceNumber(bytes, 0)));
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export class WorkspaceMetricsTracker {
  getWorkspaceMetrics = getWorkspaceMetrics;
  recordExecutionTime = recordExecutionTime;
  getCacheUsage = getCacheUsage;
  getMemoryUsage = getMemoryUsage;
  reset = resetMetrics;
}

/** Guard label text never surfaces nullish sentinels. */
export function assertMetricLabelsSafe(metrics: ResearchWorkspaceMetrics): boolean {
  const values = Object.values(metrics.labels);
  return values.every((v) => {
    const text = safeWorkspaceText(v, "");
    return text !== "" && text !== "null" && text !== "undefined" && text !== "NaN";
  });
}
