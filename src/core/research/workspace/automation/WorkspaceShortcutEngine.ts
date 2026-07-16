/**
 * Workspace shortcut engine (Sprint 10A.R7).
 * Keyboard shortcuts, command palette, recent actions.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { listOpenTabs } from "../layout/WorkspaceTabEngine";
import { listTemplates } from "./WorkspaceTemplateEngine";
import { listFavorites } from "./WorkspaceFavoritesEngine";
import { listTasks } from "./WorkspaceTaskEngine";
import {
  AUTOMATION_EMPTY,
  type RecentAction,
  type WorkspaceSearchResult,
  type WorkspaceShortcut,
} from "./AutomationPresentationModels";

const DEFAULT_SHORTCUTS: WorkspaceShortcut[] = [
  { id: "sc-research", label: "Open research", keys: "Ctrl+Shift+R", action: "open_research", route: "/research" },
  { id: "sc-company", label: "Open company", keys: "Ctrl+Shift+C", action: "open_company", route: "/company" },
  { id: "sc-earnings", label: "Open earnings", keys: "Ctrl+Shift+E", action: "open_earnings", route: "/results" },
  { id: "sc-portfolio", label: "Open portfolio", keys: "Ctrl+Shift+P", action: "open_portfolio", route: "/portfolio" },
  { id: "sc-watchlist", label: "Open watchlist", keys: "Ctrl+Shift+W", action: "open_watchlist", route: "/watchlist" },
  { id: "sc-palette", label: "Command palette", keys: "Ctrl+K", action: "command_palette", route: "/research" },
];

const recentActions: RecentAction[] = [];
const MAX_RECENT = 20;

function stamp(): string {
  return new Date().toISOString();
}

export function getWorkspaceShortcuts(): WorkspaceShortcut[] {
  return DEFAULT_SHORTCUTS;
}

export function recordRecentAction(label: string, route: string): RecentAction {
  const entry: RecentAction = {
    id: `recent-${Date.now()}`,
    label: safeWorkspaceText(label, AUTOMATION_EMPTY.awaitingWorkspace),
    route: safeWorkspaceText(route, "/research"),
    at: stamp(),
  };
  recentActions.unshift(entry);
  if (recentActions.length > MAX_RECENT) recentActions.length = MAX_RECENT;
  return entry;
}

export function getRecentActions(limit = 8): RecentAction[] {
  return recentActions.slice(0, Math.max(1, limit));
}

export function searchWorkspace(options?: {
  workspaceId?: string | null;
  query?: string | null;
  limit?: number;
}): WorkspaceSearchResult[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const query = safeWorkspaceText(options?.query, "").toLowerCase();
  const limit = Math.max(1, options?.limit ?? 12);
  const results: WorkspaceSearchResult[] = [];

  const push = (kind: string, label: string, route: string, score: number) => {
    if (query && !label.toLowerCase().includes(query)) return;
    results.push({
      id: `${kind}-${results.length}`,
      kind,
      label,
      route,
      score,
    });
  };

  for (const tab of listOpenTabs(wid ?? "")) {
    if (tab.empty) continue;
    push("tab", tab.title, tab.route, 90);
  }
  for (const tpl of listTemplates({ workspaceId: wid })) {
    push("template", tpl.name, "/research", 80);
  }
  for (const fav of listFavorites({ workspaceId: wid })) {
    const route = fav.ticker ? `/company/${fav.ticker}` : "/research";
    push("favorite", fav.label, route, 75);
  }
  for (const task of listTasks({ workspaceId: wid, status: "pending" })) {
    push("task", task.title, "/research", 70);
  }

  for (const sc of DEFAULT_SHORTCUTS) {
    push("shortcut", sc.label, sc.route, 60);
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function resetWorkspaceShortcuts(): void {
  recentActions.length = 0;
}

export class WorkspaceShortcutEngine {
  getWorkspaceShortcuts = getWorkspaceShortcuts;
  searchWorkspace = searchWorkspace;
  recordRecentAction = recordRecentAction;
  reset = resetWorkspaceShortcuts;
}
