/**
 * Workspace productivity engine (Sprint 10A.R7).
 * Analytics, search, quick switch — composes workspace metrics.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getWorkspaceMetrics } from "../WorkspaceMetrics";
import { listOpenTabs } from "../layout/WorkspaceTabEngine";
import { listNotes } from "../knowledge/ResearchNotesEngine";
import { getTasksView } from "./WorkspaceTaskEngine";
import { getTemplatesAppliedCount } from "./WorkspaceTemplateEngine";
import { getAutomationsRunCount } from "./WorkspaceAutomationEngine";
import { getRecentActions, getWorkspaceShortcuts, searchWorkspace } from "./WorkspaceShortcutEngine";
import {
  AUTOMATION_EMPTY,
  emptyAnalytics,
  type ProductivityView,
  type WorkspaceAnalytics,
} from "./AutomationPresentationModels";

const sessionStartedAt = Date.now();
const researchedTickers = new Set<string>();

export function trackCompanyResearched(ticker: string): void {
  const sym = safeWorkspaceText(ticker, "").toUpperCase();
  if (sym) researchedTickers.add(sym);
}

export function getWorkspaceAnalytics(options?: {
  workspaceId?: string | null;
}): WorkspaceAnalytics {
  try {
    const wid = options?.workspaceId
      ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
      : null;
    const metrics = getWorkspaceMetrics();
    const tasks = getTasksView({ workspaceId: wid });
    const tabs = wid ? listOpenTabs(wid) : [];
    const notes = listNotes({ workspaceId: wid ?? undefined });
    const templatesApplied = getTemplatesAppliedCount();
    const automationsRun = getAutomationsRunCount();

    const sessionDurationMinutes = Math.max(
      1,
      Math.round((Date.now() - sessionStartedAt) / 60000)
    );
    const companiesResearched = researchedTickers.size;
    const reportsGenerated = metrics.researchCount;
    const tasksCompleted = tasks.completed.length;
    const tasksPending = tasks.pending.length;
    const totalTasks = tasksCompleted + tasksPending;
    const completionRate =
      totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
    const researchProductivity = Math.min(
      100,
      notes.length * 5 +
        tabs.length * 8 +
        templatesApplied * 10 +
        automationsRun * 6
    );

    if (
      !wid &&
      companiesResearched === 0 &&
      notes.length === 0 &&
      tasks.tasks.length === 0
    ) {
      return emptyAnalytics(AUTOMATION_EMPTY.awaitingWorkspace);
    }

    return {
      sessionDurationMinutes,
      companiesResearched: companiesResearched || tabs.filter((t) => t.ticker).length,
      reportsGenerated,
      researchProductivity,
      completionRate,
      tasksCompleted,
      tasksPending,
      templatesApplied,
      automationsRun,
      empty: false,
      emptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
    };
  } catch {
    return emptyAnalytics(AUTOMATION_EMPTY.awaitingWorkspace);
  }
}

export function getProductivityView(options?: {
  workspaceId?: string | null;
  query?: string | null;
}): ProductivityView {
  const analytics = getWorkspaceAnalytics({ workspaceId: options?.workspaceId });
  const shortcuts = getWorkspaceShortcuts();
  const recentActions = getRecentActions();
  const searchResults = searchWorkspace({
    workspaceId: options?.workspaceId,
    query: options?.query,
  });

  const empty =
    analytics.empty && recentActions.length === 0 && searchResults.length === 0;

  return {
    shortcuts,
    recentActions,
    searchResults,
    analytics,
    empty,
    emptyMessage: empty
      ? AUTOMATION_EMPTY.awaitingWorkspace
      : AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function resetWorkspaceProductivity(): void {
  researchedTickers.clear();
}

export class WorkspaceProductivityEngine {
  getWorkspaceAnalytics = getWorkspaceAnalytics;
  getProductivityView = getProductivityView;
  trackCompanyResearched = trackCompanyResearched;
  reset = resetWorkspaceProductivity;
}
