/**
 * Executive AI Screener Dashboard — institutional hub façade (Sprint 9D.R8).
 * Composes R1–R7 only — no rebuilt screening engines.
 */

import { listScreens } from "../ScreenRegistry";
import type { ScreenOperationalMetrics } from "../ScreenMetrics";
import { listStrategies, listTemplates } from "../strategy";
import {
  WORKSPACE_EMPTY,
  getWorkspaceView,
  listHistory,
  listSavedScreens,
  type SavedScreenRecord,
  type WorkspaceView,
} from "../workspace";
import type { DiscoveryResult } from "../discovery/DiscoveryPresentationModels";
import type { StrategyDefinition } from "../strategy/StrategyDefinition";
import type { ResearchBridgeTarget } from "../workspace/WorkspacePresentationModels";
import type { ExportAccessSubject } from "../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportableFormat } from "../../dataIntegrity/reporting/export/ExportConfiguration";
import {
  EXECUTIVE_QUICK_ACTIONS,
  EXECUTIVE_SCREENER_EMPTY,
  SPRINT_9D_STATUS,
  formatCount,
  formatScore,
  safeExecutiveScreenerText,
  type ExecutiveScreenerDashboardView,
  type HomeScreenerStrip,
  type RankedScreenerItem,
  type SectorRotationSummary,
} from "./ExecutiveScreenerModels";
import { ExecutiveMetrics } from "./ExecutiveMetrics";
import { ExecutiveHealth } from "./ExecutiveHealth";
import { ExecutiveOverview } from "./ExecutiveOverview";
import {
  ExecutivePresentation,
  type ExecutiveScreenerExportResult,
} from "./ExecutivePresentation";
import { presentEmptyOrValue } from "./executive-screener-presentation";

export interface ExecutiveDashboardOptions {
  now?: Date;
  discovery?: DiscoveryResult | null;
  research?: readonly ResearchBridgeTarget[];
  universeSize?: number;
  previewMode?: boolean;
  /** Injected from façade (avoids circular import with AIScreener). */
  operational?: ScreenOperationalMetrics | null;
  /** Optional override — tests / dry-run composition. */
  savedScreens?: readonly SavedScreenRecord[];
  strategies?: readonly StrategyDefinition[];
  screenCount?: number;
  historyCount?: number;
}

function rankIdeas(
  discovery: DiscoveryResult | null | undefined,
  limit = 8
): RankedScreenerItem[] {
  if (!discovery || discovery.empty || discovery.ideas.length === 0) return [];
  return [...discovery.ideas]
    .sort(
      (a, b) =>
        b.institutionalScore - a.institutionalScore ||
        b.discoveryScore - a.discoveryScore
    )
    .slice(0, limit)
    .map((idea) => ({
      key: idea.ticker,
      label: safeExecutiveScreenerText(
        `${idea.company || idea.ticker}`,
        idea.ticker
      ),
      count: 1,
      score: idea.institutionalScore,
      scoreLabel: formatScore(idea.institutionalScore),
      detail: safeExecutiveScreenerText(
        idea.reasonSummary || idea.category,
        idea.category
      ),
    }));
}

function rankStrategies(
  strategies: readonly StrategyDefinition[],
  limit = 8
): RankedScreenerItem[] {
  if (strategies.length === 0) return [];
  return [...strategies]
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    )
    .slice(0, limit)
    .map((s, idx) => ({
      key: s.id,
      label: safeExecutiveScreenerText(s.name, "Strategy"),
      count: s.favorite ? 1 : 0,
      score: 100 - idx,
      scoreLabel: s.favorite ? "Favorite" : safeExecutiveScreenerText(s.origin, "strategy"),
      detail: safeExecutiveScreenerText(s.description, s.origin ?? "strategy"),
    }));
}

function rankSavedScreens(
  saved: readonly SavedScreenRecord[],
  limit = 8
): RankedScreenerItem[] {
  const active = saved.filter((s) => !s.archived && !s.empty);
  if (active.length === 0) return [];
  return [...active]
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        Number(b.pinned) - Number(a.pinned) ||
        b.institutionalScores.institutional -
          a.institutionalScores.institutional
    )
    .slice(0, limit)
    .map((s) => ({
      key: s.id,
      label: safeExecutiveScreenerText(s.name, "Saved Screen"),
      count: s.topTickers.length,
      score: s.institutionalScores.institutional,
      scoreLabel: formatScore(s.institutionalScores.institutional),
      detail: s.topTickers.slice(0, 3).join(", ") || "—",
    }));
}

function rankDiscoveries(
  discovery: DiscoveryResult | null | undefined,
  limit = 8
): RankedScreenerItem[] {
  if (!discovery || discovery.empty) return [];
  return [...discovery.ideas]
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
    .slice(0, limit)
    .map((idea) => ({
      key: `disc-${idea.ticker}`,
      label: safeExecutiveScreenerText(idea.ticker, "Idea"),
      count: 1,
      score: idea.discoveryScore,
      scoreLabel: formatScore(idea.discoveryScore),
      detail: safeExecutiveScreenerText(
        idea.kinds[0] ?? idea.category,
        idea.category
      ),
    }));
}

function rankResearch(
  research: readonly ResearchBridgeTarget[] | undefined,
  limit = 8
): RankedScreenerItem[] {
  if (!research || research.length === 0) return [];
  return research
    .filter((r) => !r.empty)
    .slice(0, limit)
    .map((r, idx) => ({
      key: r.ticker || `research-${idx}`,
      label: safeExecutiveScreenerText(
        r.label || r.ticker,
        r.ticker || "Research"
      ),
      count: 1,
      score: 100 - idx,
      scoreLabel: safeExecutiveScreenerText(r.intent, "open"),
      detail: safeExecutiveScreenerText(r.path, "Research"),
    }));
}

function buildSectorSummary(
  discovery: DiscoveryResult | null | undefined
): SectorRotationSummary {
  const sectors = discovery?.sectorRotation?.filter((s) => !s.empty) ?? [];
  if (sectors.length === 0) {
    return {
      leaders: [],
      weak: [],
      summary: EXECUTIVE_SCREENER_EMPTY.noOpportunities,
      empty: true,
      emptyMessage: EXECUTIVE_SCREENER_EMPTY.noOpportunities,
    };
  }

  const leaders = [...sectors]
    .sort((a, b) => b.strength - a.strength || b.moneyFlow - a.moneyFlow)
    .slice(0, 5)
    .map((s) => ({
      key: s.sector,
      label: safeExecutiveScreenerText(s.sector, "Sector"),
      count: s.candidateCount,
      score: s.strength,
      scoreLabel: formatScore(s.strength),
      detail: s.breakout ? "Breakout" : s.leadershipChange ? "Leadership" : "Leader",
    }));

  const weak = [...sectors]
    .filter((s) => s.weakness)
    .sort((a, b) => a.strength - b.strength)
    .slice(0, 5)
    .map((s) => ({
      key: `weak-${s.sector}`,
      label: safeExecutiveScreenerText(s.sector, "Sector"),
      count: s.candidateCount,
      score: s.strength,
      scoreLabel: formatScore(s.strength),
      detail: "Weakness",
    }));

  return {
    leaders,
    weak,
    summary: `${leaders.length} leadership sectors · ${weak.length} weak · ${sectors.length} tracked`,
    empty: false,
    emptyMessage: EXECUTIVE_SCREENER_EMPTY.noOpportunities,
  };
}

function buildHomeStrip(
  viewParts: {
    empty: boolean;
    opportunityCount: number;
    themeCount: number;
    healthLabel: string;
    topIdea: string;
    themeLabel: string;
    sectorLabel: string;
    activityLabel: string;
  }
): HomeScreenerStrip {
  const empty = viewParts.empty;
  return {
    executiveSummary: presentEmptyOrValue(
      empty,
      `Health ${viewParts.healthLabel} · ${formatCount(viewParts.opportunityCount)} opportunities`,
      EXECUTIVE_SCREENER_EMPTY.awaitingScan
    ),
    todaysBestOpportunities: presentEmptyOrValue(
      empty || viewParts.opportunityCount === 0,
      viewParts.topIdea,
      EXECUTIVE_SCREENER_EMPTY.noOpportunities
    ),
    themeSummary: presentEmptyOrValue(
      empty || viewParts.themeCount === 0,
      viewParts.themeLabel,
      EXECUTIVE_SCREENER_EMPTY.noOpportunities
    ),
    sectorSummary: presentEmptyOrValue(
      empty,
      viewParts.sectorLabel,
      EXECUTIVE_SCREENER_EMPTY.noOpportunities
    ),
    institutionalActivity: presentEmptyOrValue(
      empty,
      viewParts.activityLabel,
      EXECUTIVE_SCREENER_EMPTY.awaitingScan
    ),
    healthLabel: viewParts.healthLabel,
    opportunityCount: viewParts.opportunityCount,
    themeCount: viewParts.themeCount,
    empty,
    emptyMessage: empty
      ? EXECUTIVE_SCREENER_EMPTY.awaitingScan
      : EXECUTIVE_SCREENER_EMPTY.noScreeningResults,
  };
}

export class ExecutiveDashboard {
  private readonly metricsEngine = new ExecutiveMetrics();
  private readonly healthEngine = new ExecutiveHealth();
  private readonly overviewEngine = new ExecutiveOverview();
  private readonly presentation = new ExecutivePresentation();

  private pullPlatform(options?: ExecutiveDashboardOptions): {
    savedScreens: SavedScreenRecord[];
    strategies: StrategyDefinition[];
    screenCount: number;
    historyCount: number;
    workspace: WorkspaceView;
  } {
    let savedScreens: SavedScreenRecord[] = [];
    let strategies: StrategyDefinition[] = [];
    let screenCount = 0;
    let historyCount = 0;
    let workspace: WorkspaceView = {
      recentScreens: [],
      pinned: [],
      favorites: [],
      savedResults: [],
      sharedTemplates: [],
      recentActivity: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.awaitingFirstScan,
    };

    try {
      savedScreens =
        (options?.savedScreens as SavedScreenRecord[] | undefined) ??
        listSavedScreens({ includeArchived: false });
    } catch {
      savedScreens = [];
    }

    try {
      strategies =
        (options?.strategies as StrategyDefinition[] | undefined) ??
        listStrategies();
      if (strategies.length === 0 && !options?.strategies) {
        // Templates count as strategy inventory for empty-state distinction
        void listTemplates();
      }
    } catch {
      strategies = [];
    }

    try {
      screenCount =
        options?.screenCount ?? listScreens({ enabledOnly: true }).length;
    } catch {
      screenCount = 0;
    }

    try {
      historyCount =
        options?.historyCount ??
        listHistory({ includeArchived: true }).length;
    } catch {
      historyCount = 0;
    }

    try {
      workspace = getWorkspaceView();
    } catch {
      // keep empty workspace
    }

    return { savedScreens, strategies, screenCount, historyCount, workspace };
  }

  getView(options?: ExecutiveDashboardOptions): ExecutiveScreenerDashboardView {
    const now = options?.now ?? new Date();
    const discovery = options?.discovery ?? null;
    const research = options?.research ?? [];
    const platform = this.pullPlatform(options);

    const metrics = this.metricsEngine.compute({
      operational: options?.operational,
      screenCount: platform.screenCount,
      universeSize: options?.universeSize,
      savedScreens: platform.savedScreens,
      strategies: platform.strategies,
      discovery,
      historyCount: platform.historyCount,
      researchCount: research.length,
    });

    const health = this.healthEngine.build(metrics);
    const overview = this.overviewEngine.build(metrics, health);
    const topInstitutionalIdeas = rankIdeas(discovery);
    const topStrategies = rankStrategies(platform.strategies);
    const topSavedScreens = rankSavedScreens(platform.savedScreens);
    const recentDiscoveries = rankDiscoveries(discovery);
    const recentResearch = rankResearch(research);
    const sectorRotation = buildSectorSummary(discovery);

    const report = this.presentation.buildReport({
      overview,
      health,
      metrics,
      topInstitutionalIdeas,
      topStrategies,
      topSavedScreens,
      recentDiscoveries,
      sectorRotation,
      now,
      previewMode: options?.previewMode,
    });

    const themeLabel =
      discovery?.themes
        ?.filter((t) => !t.empty)
        .slice(0, 3)
        .map((t) => t.label)
        .join(", ") ||
      (metrics.themeCount > 0
        ? `${formatCount(metrics.themeCount)} themes`
        : EXECUTIVE_SCREENER_EMPTY.noOpportunities);

    const activityBits = [
      platform.workspace.recentActivity.length > 0
        ? `${platform.workspace.recentActivity.length} workspace actions`
        : null,
      metrics.runs > 0 ? `${formatCount(metrics.runs)} scans` : null,
      metrics.savedScreenCount > 0
        ? `${formatCount(metrics.savedScreenCount)} saved`
        : null,
      metrics.historyCount > 0
        ? `${formatCount(metrics.historyCount)} history`
        : null,
    ].filter(Boolean);

    const homeStrip = buildHomeStrip({
      empty: overview.empty,
      opportunityCount: metrics.opportunityCount,
      themeCount: metrics.themeCount,
      healthLabel: health.overallHealthLabel,
      topIdea:
        topInstitutionalIdeas[0]?.label ??
        recentDiscoveries[0]?.label ??
        EXECUTIVE_SCREENER_EMPTY.noOpportunities,
      themeLabel,
      sectorLabel: sectorRotation.empty
        ? sectorRotation.emptyMessage
        : sectorRotation.summary,
      activityLabel:
        activityBits.length > 0
          ? activityBits.join(" · ")
          : EXECUTIVE_SCREENER_EMPTY.awaitingScan,
    });

    return {
      overview,
      health,
      topInstitutionalIdeas,
      topStrategies,
      topSavedScreens,
      recentDiscoveries,
      recentResearch,
      sectorRotation,
      quickActions: [...EXECUTIVE_QUICK_ACTIONS],
      report,
      homeStrip,
      sprintFrozen: SPRINT_9D_STATUS.frozen,
      empty: overview.empty,
      emptyMessage: overview.empty
        ? EXECUTIVE_SCREENER_EMPTY.awaitingScan
        : EXECUTIVE_SCREENER_EMPTY.noScreeningResults,
    };
  }

  getHomeStrip(options?: ExecutiveDashboardOptions): HomeScreenerStrip {
    return this.getView(options).homeStrip;
  }

  getExecutiveSummary(options?: ExecutiveDashboardOptions): string {
    const strip = this.getHomeStrip(options);
    return strip.executiveSummary;
  }

  private metricBundle(options?: ExecutiveDashboardOptions) {
    const platform = this.pullPlatform(options);
    return this.metricsEngine.compute({
      operational: options?.operational,
      screenCount: platform.screenCount,
      universeSize: options?.universeSize,
      savedScreens: platform.savedScreens,
      strategies: platform.strategies,
      discovery: options?.discovery,
      historyCount: platform.historyCount,
      researchCount: options?.research?.length ?? 0,
    });
  }

  exportMarkdown(
    options?: ExecutiveDashboardOptions,
    subject?: ExportAccessSubject
  ): ExecutiveScreenerExportResult {
    const view = this.getView(options);
    return this.presentation.exportMarkdown(
      {
        overview: view.overview,
        health: view.health,
        metrics: this.metricBundle(options),
        topInstitutionalIdeas: view.topInstitutionalIdeas,
        topStrategies: view.topStrategies,
        topSavedScreens: view.topSavedScreens,
        recentDiscoveries: view.recentDiscoveries,
        sectorRotation: view.sectorRotation,
        now: options?.now,
        previewMode: options?.previewMode,
      },
      subject
    );
  }

  exportPrint(options?: ExecutiveDashboardOptions): ExecutiveScreenerExportResult {
    return this.presentation.exportPrint(this.getView(options).report);
  }

  exportReport(
    format: ExportableFormat | "PRINT",
    options?: ExecutiveDashboardOptions,
    subject?: ExportAccessSubject
  ): ExecutiveScreenerExportResult {
    if (format === "PRINT") return this.exportPrint(options);
    const view = this.getView(options);
    return this.presentation.exportFormat(
      format,
      {
        overview: view.overview,
        health: view.health,
        metrics: this.metricBundle(options),
        topInstitutionalIdeas: view.topInstitutionalIdeas,
        topStrategies: view.topStrategies,
        topSavedScreens: view.topSavedScreens,
        recentDiscoveries: view.recentDiscoveries,
        sectorRotation: view.sectorRotation,
        now: options?.now,
        previewMode: options?.previewMode,
      },
      subject
    );
  }
}

let singleton: ExecutiveDashboard | null = null;

export function getExecutiveScreenerDashboard(): ExecutiveDashboard {
  if (!singleton) {
    singleton = new ExecutiveDashboard();
  }
  return singleton;
}

export function resetExecutiveScreenerDashboard(): void {
  singleton = null;
}

export function getExecutiveScreenerView(
  options?: ExecutiveDashboardOptions
): ExecutiveScreenerDashboardView {
  return getExecutiveScreenerDashboard().getView(options);
}

export function getHomeScreenerStrip(
  options?: ExecutiveDashboardOptions
): HomeScreenerStrip {
  return getExecutiveScreenerDashboard().getHomeStrip(options);
}

export function getExecutiveScreenerSummary(
  options?: ExecutiveDashboardOptions
): string {
  return getExecutiveScreenerDashboard().getExecutiveSummary(options);
}

/** Sprint freeze helper — reset executive façade (engines remain R1–R7 owned). */
export function resetExecutiveScreenerStack(): void {
  resetExecutiveScreenerDashboard();
}

export function isSprint9DFrozen(): boolean {
  return SPRINT_9D_STATUS.frozen && SPRINT_9D_STATUS.complete;
}
