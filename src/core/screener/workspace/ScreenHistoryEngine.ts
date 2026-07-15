/**
 * Institutional Screener Workspace — history runs store (Sprint 9D.R7).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  normalizeScreenHistoryRun,
  type ScreenHistoryRun,
} from "./WorkspacePresentationModels";

export interface RecordRunInput {
  id?: string | null;
  runTime?: string | null;
  marketSnapshot?: string | null;
  sectorSnapshot?: string | null;
  validationAvg?: number | null;
  trustAvg?: number | null;
  topResults?: string[] | null;
  executionTimeMs?: number | null;
  strategyId?: string | null;
  screenId?: string | null;
  labels?: string[] | null;
  archived?: boolean | null;
}

const history = new Map<string, ScreenHistoryRun>();
const orderedIds: string[] = [];
const MAX_HISTORY = 100;

export function recordRun(input: RecordRunInput): ScreenHistoryRun {
  const id = safeScreenText(
    input.id,
    `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  ).toLowerCase();
  const run = normalizeScreenHistoryRun({
    id,
    runTime: input.runTime ?? new Date().toISOString(),
    marketSnapshot: input.marketSnapshot,
    sectorSnapshot: input.sectorSnapshot,
    validationAvg: input.validationAvg,
    trustAvg: input.trustAvg,
    topResults: input.topResults,
    executionTimeMs: input.executionTimeMs,
    strategyId: input.strategyId,
    screenId: input.screenId,
    labels: input.labels,
    archived: input.archived ?? false,
    empty: false,
  });
  history.set(id, run);
  const idx = orderedIds.indexOf(id);
  if (idx >= 0) orderedIds.splice(idx, 1);
  orderedIds.unshift(id);
  if (orderedIds.length > MAX_HISTORY) {
    const dropped = orderedIds.pop();
    if (dropped) history.delete(dropped);
  }
  return run;
}

export function listHistory(options?: {
  includeArchived?: boolean;
  strategyId?: string;
  screenId?: string;
  limit?: number;
}): ScreenHistoryRun[] {
  let list = orderedIds
    .map((id) => history.get(id))
    .filter((r): r is ScreenHistoryRun => Boolean(r));
  if (!options?.includeArchived) {
    list = list.filter((r) => !r.archived);
  }
  if (options?.strategyId) {
    const key = safeScreenText(options.strategyId, "").toLowerCase();
    list = list.filter((r) => r.strategyId === key);
  }
  if (options?.screenId) {
    const key = safeScreenText(options.screenId, "").toLowerCase();
    list = list.filter((r) => r.screenId === key);
  }
  const limit = Math.max(0, Math.floor(safeScreenNumber(options?.limit, list.length)));
  return list.slice(0, limit || list.length);
}

export function getRun(id: string): ScreenHistoryRun | null {
  const key = safeScreenText(id, "").toLowerCase();
  if (!key) return null;
  return history.get(key) ?? null;
}

export function reloadRun(id: string): ScreenHistoryRun | null {
  const existing = getRun(id);
  if (!existing) return null;
  return recordRun({
    ...existing,
    id: undefined,
    runTime: new Date().toISOString(),
    labels: [...existing.labels, "reloaded"],
    archived: false,
  });
}

export function duplicateRun(id: string): ScreenHistoryRun | null {
  const existing = getRun(id);
  if (!existing) return null;
  return recordRun({
    ...existing,
    id: undefined,
    runTime: new Date().toISOString(),
    labels: [...existing.labels, "duplicate"],
    archived: false,
  });
}

export function archiveRun(
  id: string,
  archived = true
): ScreenHistoryRun | null {
  const existing = getRun(id);
  if (!existing) return null;
  const updated = normalizeScreenHistoryRun({
    ...existing,
    archived,
    empty: false,
  });
  history.set(existing.id, updated);
  return updated;
}

export function deleteRun(id: string): boolean {
  const key = safeScreenText(id, "").toLowerCase();
  const removed = history.delete(key);
  const idx = orderedIds.indexOf(key);
  if (idx >= 0) orderedIds.splice(idx, 1);
  return removed;
}

export function resetHistory(): void {
  history.clear();
  orderedIds.length = 0;
}

export const ScreenHistoryEngine = {
  recordRun,
  listHistory,
  getRun,
  reloadRun,
  duplicateRun,
  archiveRun,
  deleteRun,
  reset: resetHistory,
};
