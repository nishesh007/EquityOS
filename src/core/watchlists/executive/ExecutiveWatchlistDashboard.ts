/**
 * Executive Watchlist Dashboard — hub orchestrator (Sprint 10B.R8).
 */

import { getWatchlistEngine } from "../WatchlistEngine";
import { getWorkspaceTimeline } from "../workspace";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  WATCHLIST_PLATFORM_STATUS,
  emptyExecutiveDashboard,
  emptyExecutiveTimeline,
  type ExecutiveTimelineEntry,
  type ExecutiveWatchlistComposeInput,
  type ExecutiveWatchlistDashboardView,
  type ExecutiveWatchlistTimelineView,
} from "./ExecutiveWatchlistModels";
import { ExecutiveWatchlistHealth, getExecutiveWatchlistHealth } from "./ExecutiveWatchlistHealth";
import { ExecutiveWatchlistMetrics, getExecutiveWatchlistMetrics } from "./ExecutiveWatchlistMetrics";
import { ExecutiveWatchlistOverview, getExecutiveWatchlistOverview } from "./ExecutiveWatchlistOverview";
import { ExecutiveWatchlistPanels, getExecutiveWatchlistPanels } from "./ExecutiveWatchlistPanels";
import { ExecutiveWatchlistExport, exportExecutiveWatchlistReport } from "./ExecutiveWatchlistExport";

export class ExecutiveWatchlistDashboard {
  private readonly healthEngine = new ExecutiveWatchlistHealth();
  private readonly metricsEngine = new ExecutiveWatchlistMetrics();
  private readonly overviewEngine = new ExecutiveWatchlistOverview();
  private readonly panelsEngine = new ExecutiveWatchlistPanels();
  private readonly exportEngine = new ExecutiveWatchlistExport();

  getTimeline(input?: ExecutiveWatchlistComposeInput | null): ExecutiveWatchlistTimelineView {
    const active = getWatchlistEngine().getActiveWatchlist();
    const timeline = getWorkspaceTimeline({
      watchlistId: active?.id,
      symbols: active?.symbols,
      snapshots: input?.snapshots,
      now: input?.now,
    });

    if (timeline.empty) {
      return emptyExecutiveTimeline();
    }

    const entries: ExecutiveTimelineEntry[] = timeline.entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      summary: e.summary,
      at: e.at,
    }));

    return {
      entries,
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.awaitingWorkspace,
    };
  }

  getView(input?: ExecutiveWatchlistComposeInput | null): ExecutiveWatchlistDashboardView {
    const active = getWatchlistEngine().getActiveWatchlist();
    if (!active || !active.symbols.length) {
      return emptyExecutiveDashboard();
    }

    const health = this.healthEngine.build(input);
    if (health.empty) {
      return emptyExecutiveDashboard();
    }

    const metrics = this.metricsEngine.compute(input);
    const overview = this.overviewEngine.build(input, health);
    const panels = this.panelsEngine.build(input);
    const timeline = this.getTimeline(input);

    const partial: ExecutiveWatchlistDashboardView = {
      overview,
      health,
      metrics,
      panels,
      timeline,
      report: this.exportEngine.buildReport({
        overview,
        health,
        metrics,
        panels,
        timeline,
        report: {
          title: "",
          generatedAt: "",
          executiveSummary: "",
          sections: [],
          markdown: "",
          printLayout: "",
          empty: true,
          emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noReports,
        },
        sprintFrozen: isSprint10BFrozen(),
        empty: false,
        emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noWatchlists,
        surfaceHints: {
          watchlist: "/watchlist",
          dashboard: "/",
          research: "/research",
          portfolio: "/portfolio",
          results: "/results",
          company: "/company",
        },
      }),
      sprintFrozen: isSprint10BFrozen(),
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noWatchlists,
      surfaceHints: {
        watchlist: "/watchlist",
        dashboard: "/",
        research: "/research",
        portfolio: "/portfolio",
        results: "/results",
        company: "/company",
      },
    };

    partial.report = this.exportEngine.buildReport(partial);
    return partial;
  }
}

let hubInstance: ExecutiveWatchlistDashboard | null = null;

export function getExecutiveWatchlistDashboard(): ExecutiveWatchlistDashboard {
  if (!hubInstance) hubInstance = new ExecutiveWatchlistDashboard();
  return hubInstance;
}

export function resetExecutiveWatchlistHub(): void {
  hubInstance = null;
}

export function getExecutiveWatchlistDashboardView(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistDashboardView {
  return getExecutiveWatchlistDashboard().getView(input);
}

export function getExecutiveWatchlistTimeline(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistTimelineView {
  return getExecutiveWatchlistDashboard().getTimeline(input);
}

export function resetExecutiveWatchlistStack(): void {
  resetExecutiveWatchlistHub();
}

export function isSprint10BFrozen(): boolean {
  return WATCHLIST_PLATFORM_STATUS.frozen && WATCHLIST_PLATFORM_STATUS.complete;
}

export const SPRINT_10B_R8_FROZEN = WATCHLIST_PLATFORM_STATUS.frozen;

export {
  getExecutiveWatchlistOverview,
  getExecutiveWatchlistHealth,
  getExecutiveWatchlistMetrics,
  getExecutiveWatchlistPanels,
  exportExecutiveWatchlistReport,
};
