/**
 * Institutional Research Workspace — history engine (Sprint 10A.R2).
 * Recently opened tabs, companies, research, layouts, navigation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  LAYOUT_EMPTY,
  emptyHistoryView,
  normalizeHistoryEntry,
  type WorkspaceHistoryEntry,
  type WorkspaceHistoryView,
} from "./LayoutPresentationModels";

const history: WorkspaceHistoryEntry[] = [];
const MAX_HISTORY = 100;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function recordHistory(input: {
  kind: WorkspaceHistoryEntry["kind"];
  label: string;
  target: string;
  route?: string | null;
  now?: Date | null;
}): WorkspaceHistoryEntry {
  const entry = normalizeHistoryEntry({
    id: `hist-${Date.now()}-${history.length}`,
    kind: input.kind,
    label: safeWorkspaceText(input.label, LAYOUT_EMPTY.noSessionHistory),
    target: safeWorkspaceText(input.target, "—"),
    route: safeWorkspaceText(input.route, "/research"),
    at: stamp(input.now),
    empty: false,
  });
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  return entry;
}

export function getWorkspaceHistory(limit = 40): WorkspaceHistoryView {
  const slice = history.filter((h) => !h.empty).slice(0, Math.max(1, limit));
  if (slice.length === 0) {
    return emptyHistoryView(LAYOUT_EMPTY.noSessionHistory);
  }

  return {
    recentTabs: slice.filter((h) => h.kind === "tab").slice(0, 12),
    recentCompanies: slice.filter((h) => h.kind === "company").slice(0, 12),
    recentResearch: slice.filter((h) => h.kind === "research").slice(0, 12),
    recentLayouts: slice.filter((h) => h.kind === "layout").slice(0, 12),
    navigation: slice.filter((h) => h.kind === "navigation" || h.kind === "session").slice(0, 20),
    empty: false,
    emptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
  };
}

export function listRecentCompanies(limit = 8): WorkspaceHistoryEntry[] {
  return getWorkspaceHistory(80).recentCompanies.slice(0, limit);
}

export function listRecentResearch(limit = 8): WorkspaceHistoryEntry[] {
  return getWorkspaceHistory(80).recentResearch.slice(0, limit);
}

export function listRecentLayouts(limit = 8): WorkspaceHistoryEntry[] {
  return getWorkspaceHistory(80).recentLayouts.slice(0, limit);
}

export function listNavigationHistory(limit = 20): WorkspaceHistoryEntry[] {
  return getWorkspaceHistory(100).navigation.slice(0, limit);
}

export function resetHistory(): void {
  history.length = 0;
}

export class WorkspaceHistoryEngine {
  recordHistory = recordHistory;
  getWorkspaceHistory = getWorkspaceHistory;
  reset = resetHistory;
}
