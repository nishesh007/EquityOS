/**
 * Executive Research Hub — institutional entry point (Sprint 10A.R8).
 * Composes R1–R7 only — no rebuilt research engines.
 */

import { getActiveWorkspace } from "../WorkspaceRegistry";
import { getWorkspaceMetrics } from "../WorkspaceMetrics";
import { listOpenTabs } from "../layout/WorkspaceTabEngine";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getResearchTimeline } from "../integration/ResearchTimelineEngine";
import { getDecisionJournal } from "../integration/DecisionJournalEngine";
import { getMemoryTimeline } from "../knowledge/ResearchMemoryEngine";
import { generateResearchSummary } from "../copilot/ResearchSummaryEngine";
import { getTasksView } from "../automation/WorkspaceTaskEngine";
import { safeWorkspaceText } from "../WorkspaceModels";
import type { ExportAccessSubject } from "../../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportableFormat } from "../../../dataIntegrity/reporting/export/ExportConfiguration";
import {
  EXECUTIVE_RESEARCH_EMPTY,
  EXECUTIVE_RESEARCH_QUICK_ACTIONS,
  RESEARCH_WORKSPACE_STATUS,
  formatCount,
  formatScore,
  safeExecutiveResearchText,
  type ExecutiveResearchDashboardSummary,
  type ExecutiveResearchDashboardView,
  type HomeResearchStrip,
  type RankedResearchItem,
} from "./ExecutiveResearchModels";
import {
  ExecutiveResearchMetrics,
  type ExecutiveMetricsComposeInput,
} from "./ExecutiveResearchMetrics";
import {
  ExecutiveResearchHealth,
  type ExecutiveHealthComposeInput,
} from "./ExecutiveResearchHealth";
import { ExecutiveResearchOverview } from "./ExecutiveResearchOverview";
import {
  ExecutiveResearchPresentation,
  type ExecutiveResearchExportResult,
} from "./ExecutiveResearchPresentation";

export interface ExecutiveResearchHubOptions extends ExecutiveMetricsComposeInput {
  now?: Date;
  previewMode?: boolean;
}

function presentEmptyOrValue(
  empty: boolean,
  value: string,
  emptyMessage: string = EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
): string {
  if (empty) {
    return safeExecutiveResearchText(emptyMessage, EXECUTIVE_RESEARCH_EMPTY.awaitingResearch);
  }
  return safeExecutiveResearchText(value, emptyMessage);
}

function rankOpenTabs(
  workspaceId: string,
  limit = 8
): RankedResearchItem[] {
  const tabs = listOpenTabs(workspaceId);
  if (tabs.length === 0) return [];
  return tabs.slice(0, limit).map((tab, idx) => ({
    key: tab.id,
    label: safeExecutiveResearchText(
      tab.title || tab.ticker || tab.kind,
      tab.kind
    ),
    count: 1,
    score: 100 - idx,
    scoreLabel: safeExecutiveResearchText(tab.kind, "tab"),
    detail: safeExecutiveResearchText(tab.ticker ?? tab.route, tab.kind),
  }));
}

function rankDecisions(
  workspaceId: string | null,
  ticker: string | null,
  limit = 8
): RankedResearchItem[] {
  const journal = getDecisionJournal({ workspaceId, ticker });
  if (journal.empty || journal.entries.length === 0) return [];
  return journal.entries.slice(0, limit).map((entry) => ({
    key: entry.id,
    label: safeExecutiveResearchText(entry.ticker || entry.kind, entry.kind),
    count: 1,
    score: entry.confidence,
    scoreLabel: formatScore(entry.confidence),
    detail: safeExecutiveResearchText(entry.body || entry.title, entry.kind),
  }));
}

function rankPendingTasks(workspaceId: string | null, limit = 8): RankedResearchItem[] {
  const tasks = getTasksView({ workspaceId });
  if (tasks.empty || tasks.pending.length === 0) return [];
  return tasks.pending.slice(0, limit).map((task) => ({
    key: task.id,
    label: safeExecutiveResearchText(task.title, "Task"),
    count: 1,
    score: task.priority === "high" ? 90 : task.priority === "medium" ? 60 : 30,
    scoreLabel: safeExecutiveResearchText(task.priority, "normal"),
    detail: safeExecutiveResearchText(task.linkedTicker ?? task.linkedResearch, "pending"),
  }));
}

function rankRecentCompanies(
  workspaceId: string | null,
  ticker: string | null,
  limit = 8
): RankedResearchItem[] {
  const timeline = getResearchTimeline({ workspaceId, ticker });
  const seen = new Set<string>();
  const items: RankedResearchItem[] = [];
  for (const entry of timeline.entries) {
    const sym = safeWorkspaceText(entry.ticker, "").toUpperCase();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    items.push({
      key: sym,
      label: sym,
      count: 1,
      score: 80,
      scoreLabel: safeExecutiveResearchText(entry.kind, "research"),
      detail: safeExecutiveResearchText(entry.detail, sym),
    });
    if (items.length >= limit) break;
  }
  return items;
}

function buildDashboardSummary(
  workspaceId: string | null,
  ticker: string | null,
  empty: boolean
): ExecutiveResearchDashboardSummary {
  const timeline = getResearchTimeline({ workspaceId, ticker });
  const knowledge = getKnowledge({ workspaceId: workspaceId ?? undefined, ticker });
  const tasks = getTasksView({ workspaceId });
  const memoryEntries = getMemoryTimeline({ ticker: ticker ?? undefined });
  const summary = generateResearchSummary({ workspaceId, ticker });

  const alertLines = timeline.entries
    .filter((e) => e.kind.includes("alert"))
    .slice(0, 3)
    .map((e) => e.detail);
  const earningsLines = timeline.entries
    .filter((e) => e.kind.includes("earnings"))
    .slice(0, 3)
    .map((e) => e.detail);
  const screenLines = timeline.entries
    .filter((e) => e.kind.includes("screen"))
    .slice(0, 3)
    .map((e) => e.detail);

  return {
    timelineSummary: presentEmptyOrValue(
      empty || timeline.empty,
      `${timeline.entries.length} timeline events`,
      EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
    ),
    recentAlerts: presentEmptyOrValue(
      alertLines.length === 0,
      alertLines.join(" · ") || "No recent alerts",
      EXECUTIVE_RESEARCH_EMPTY.noPendingActions
    ),
    recentEarnings: presentEmptyOrValue(
      earningsLines.length === 0,
      earningsLines.join(" · ") || "No recent earnings",
      EXECUTIVE_RESEARCH_EMPTY.noPendingActions
    ),
    recentScreens: presentEmptyOrValue(
      screenLines.length === 0,
      screenLines.join(" · ") || "No recent screens",
      EXECUTIVE_RESEARCH_EMPTY.noPendingActions
    ),
    pendingTasks: presentEmptyOrValue(
      tasks.pending.length === 0,
      `${tasks.pending.length} pending tasks`,
      EXECUTIVE_RESEARCH_EMPTY.noPendingActions
    ),
    researchMemory: presentEmptyOrValue(
      memoryEntries.length === 0,
      `${memoryEntries.length} memory entries`,
      EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
    ),
    knowledgeSummary: presentEmptyOrValue(
      knowledge.empty,
      `${knowledge.notes.length} notes · ${knowledge.evidence.items.length} evidence`,
      EXECUTIVE_RESEARCH_EMPTY.noCoverage
    ),
    empty,
    emptyMessage: empty
      ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
      : summary.empty
        ? EXECUTIVE_RESEARCH_EMPTY.noCoverage
        : EXECUTIVE_RESEARCH_EMPTY.noOpenResearch,
  };
}

function buildHomeStrip(parts: {
  empty: boolean;
  healthLabel: string;
  researchProgress: number;
  coverage: number;
  pendingCount: number;
  openCount: number;
  companyCount: number;
}): HomeResearchStrip {
  const empty = parts.empty;
  return {
    executiveSummary: presentEmptyOrValue(
      empty,
      `Health ${parts.healthLabel} · ${formatCount(parts.openCount)} open tabs`,
      EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
    ),
    researchProgress: presentEmptyOrValue(
      empty,
      `${parts.researchProgress}% research progress`,
      EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
    ),
    coverageSummary: presentEmptyOrValue(
      empty,
      `${parts.coverage}% institutional coverage`,
      EXECUTIVE_RESEARCH_EMPTY.noCoverage
    ),
    pendingActions: presentEmptyOrValue(
      empty || parts.pendingCount === 0,
      `${parts.pendingCount} pending actions`,
      EXECUTIVE_RESEARCH_EMPTY.noPendingActions
    ),
    healthLabel: parts.healthLabel,
    openResearchCount: parts.openCount,
    companyCount: parts.companyCount,
    empty,
    emptyMessage: empty
      ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
      : EXECUTIVE_RESEARCH_EMPTY.noOpenResearch,
  };
}

export class ExecutiveResearchHub {
  private readonly metricsEngine = new ExecutiveResearchMetrics();
  private readonly healthEngine = new ExecutiveResearchHealth();
  private readonly overviewEngine = new ExecutiveResearchOverview();
  private readonly presentation = new ExecutiveResearchPresentation();

  private resolveContext(options?: ExecutiveResearchHubOptions): {
    workspaceId: string | null;
    ticker: string | null;
  } {
    const active = getActiveWorkspace();
    const workspaceId = options?.workspaceId
      ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
      : active?.id ?? null;
    const ticker = options?.ticker
      ? safeWorkspaceText(options.ticker, "").toUpperCase()
      : null;
    return { workspaceId, ticker };
  }

  private readinessFlags(
    workspaceId: string | null,
    ticker: string | null
  ): ExecutiveHealthComposeInput {
    const metrics = getWorkspaceMetrics();
    const knowledge = getKnowledge({ workspaceId: workspaceId ?? undefined, ticker });
    const timeline = getResearchTimeline({ workspaceId, ticker });
    const decisions = getDecisionJournal({ workspaceId, ticker });
    const summary = generateResearchSummary({ workspaceId, ticker });
    const tabs = workspaceId ? listOpenTabs(workspaceId) : [];

    return {
      workspaceReady: !metrics.empty || tabs.length > 0,
      copilotReady: !summary.empty,
      knowledgeReady: !knowledge.empty,
      automationReady: tabs.length > 0 || !getTasksView({ workspaceId }).empty,
      timelineReady: !timeline.empty,
      decisionReady: !decisions.empty,
      integrationReady:
        !timeline.empty || !decisions.empty || !knowledge.empty,
    };
  }

  getView(options?: ExecutiveResearchHubOptions): ExecutiveResearchDashboardView {
    const { workspaceId, ticker } = this.resolveContext(options);
    const metrics = this.metricsEngine.compute({ workspaceId, ticker });
    const flags = this.readinessFlags(workspaceId, ticker);
    const health = this.healthEngine.build(metrics, flags);
    const overview = this.overviewEngine.build(metrics, health);
    const dashboard = buildDashboardSummary(workspaceId, ticker, health.empty);
    const recentCompanies = workspaceId
      ? rankRecentCompanies(workspaceId, ticker)
      : [];
    const recentDecisions = rankDecisions(workspaceId, ticker);
    const pendingActions = rankPendingTasks(workspaceId);
    const openResearch = workspaceId ? rankOpenTabs(workspaceId) : [];

    const report = this.presentation.buildReport({
      overview,
      health,
      metrics,
      dashboard,
      recentCompanies,
      recentDecisions,
      pendingActions,
      now: options?.now,
      previewMode: options?.previewMode,
    });

    const homeStrip = buildHomeStrip({
      empty: health.empty,
      healthLabel: health.overallHealthLabel,
      researchProgress: overview.researchProgress,
      coverage: overview.coverage,
      pendingCount: metrics.taskPending,
      openCount: metrics.openTabs,
      companyCount: metrics.companiesResearched,
    });

    return {
      overview,
      health,
      metrics,
      dashboard,
      recentCompanies,
      recentDecisions,
      pendingActions,
      openResearch,
      quickActions: [...EXECUTIVE_RESEARCH_QUICK_ACTIONS],
      report,
      homeStrip,
      sprintFrozen: isSprint10AFrozen(),
      empty: health.empty,
      emptyMessage: health.empty
        ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
        : EXECUTIVE_RESEARCH_EMPTY.noOpenResearch,
    };
  }

  exportReport(
    format: ExportableFormat,
    options?: ExecutiveResearchHubOptions,
    subject?: ExportAccessSubject
  ): ExecutiveResearchExportResult {
    const view = this.getView(options);
    return this.presentation.exportFormat(
      format,
      {
        overview: view.overview,
        health: view.health,
        metrics: view.metrics,
        dashboard: view.dashboard,
        recentCompanies: view.recentCompanies,
        recentDecisions: view.recentDecisions,
        pendingActions: view.pendingActions,
        now: options?.now,
        previewMode: options?.previewMode,
      },
      subject
    );
  }
}

let singleton: ExecutiveResearchHub | null = null;

export function getExecutiveResearchHub(): ExecutiveResearchHub {
  if (!singleton) {
    singleton = new ExecutiveResearchHub();
  }
  return singleton;
}

export function resetExecutiveResearchHub(): void {
  singleton = null;
}

export function getExecutiveResearchOverview(
  options?: ExecutiveResearchHubOptions
): ReturnType<ExecutiveResearchOverview["build"]> {
  const hub = getExecutiveResearchHub();
  return hub.getView(options).overview;
}

export function getExecutiveResearchMetrics(
  options?: ExecutiveResearchHubOptions
): ReturnType<ExecutiveResearchMetrics["compute"]> {
  const active = getActiveWorkspace();
  const workspaceId = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : active?.id ?? null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;
  return new ExecutiveResearchMetrics().compute({ workspaceId, ticker });
}

export function getExecutiveResearchHealth(
  options?: ExecutiveResearchHubOptions
): ReturnType<ExecutiveResearchHealth["build"]> {
  return getExecutiveResearchHub().getView(options).health;
}

export function getExecutiveResearchSummary(
  options?: ExecutiveResearchHubOptions
): string {
  const view = getExecutiveResearchHub().getView(options);
  if (view.empty) {
    return EXECUTIVE_RESEARCH_EMPTY.awaitingResearch;
  }
  return view.homeStrip.executiveSummary;
}

export function exportExecutiveResearchReport(
  format: ExportableFormat,
  options?: ExecutiveResearchHubOptions,
  subject?: ExportAccessSubject
): ExecutiveResearchExportResult {
  return getExecutiveResearchHub().exportReport(format, options, subject);
}

export function resetExecutiveResearchStack(): void {
  resetExecutiveResearchHub();
}

export function isSprint10AFrozen(): boolean {
  return RESEARCH_WORKSPACE_STATUS.frozen && RESEARCH_WORKSPACE_STATUS.complete;
}
