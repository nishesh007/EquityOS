/**
 * Alert Executive Dashboard — institutional hub façade (Sprint 9C.R8).
 * Composes Center, Workspace, Decision Support, and Export — no rebuilt engines.
 */

import {
  getAlertCenter,
  resetAlertCenter,
  type AlertCenter,
} from "../center/AlertCenter";
import type { CenterAlert } from "../center/AlertCenterModels";
import { recommendAlertAction } from "../intelligence/AlertRecommendationEngine";
import { scoreAlertPriority } from "../intelligence/AlertPriorityEngine";
import {
  getAlertWorkspace,
  resetAlertWorkspace,
  type AlertWorkspace,
} from "../workspace/AlertWorkspace";
import {
  EXECUTIVE_EMPTY,
  formatCount,
  safeExecutiveText,
  type AlertExecutiveDashboardView,
  type ExecutiveAnalytics,
  type HomeAlertStrip,
  type RankedItem,
} from "./AlertExecutiveModels";
import { AlertExecutiveMetrics } from "./AlertExecutiveMetrics";
import { AlertHealthDashboard } from "./AlertHealthDashboard";
import { AlertExecutiveSnapshot } from "./AlertExecutiveSnapshot";
import { AlertTimelinePresentation } from "./AlertTimelinePresentation";
import {
  AlertExecutiveReport,
  type ExecutiveExportResult,
} from "./AlertExecutiveReport";
import {
  presentAlertHeadline,
  presentPriorityLabel,
} from "./executive-alert-presentation";

function rankMap(
  counts: Map<string, { count: number; score: number }>,
  limit = 8
): RankedItem[] {
  return [...counts.entries()]
    .map(([key, v]) => ({
      key,
      label: safeExecutiveText(key, "Unknown"),
      count: v.count,
      score: v.score,
      scoreLabel: String(Math.round(v.score)),
    }))
    .sort((a, b) => b.count - a.count || b.score - a.score)
    .slice(0, limit);
}

export class AlertExecutiveDashboard {
  private readonly metricsEngine = new AlertExecutiveMetrics();
  private readonly healthEngine = new AlertHealthDashboard();
  private readonly snapshot = new AlertExecutiveSnapshot();
  private readonly timeline = new AlertTimelinePresentation();
  private readonly reportEngine = new AlertExecutiveReport();
  private center: AlertCenter;
  private workspace: AlertWorkspace;

  constructor(center?: AlertCenter, workspace?: AlertWorkspace) {
    this.center = center ?? getAlertCenter();
    this.workspace = workspace ?? getAlertWorkspace();
  }

  setCenter(center: AlertCenter): void {
    this.center = center;
  }

  setWorkspace(workspace: AlertWorkspace): void {
    this.workspace = workspace;
  }

  private listItems(): CenterAlert[] {
    const view = this.center.getView({ filter: "all" });
    const items: CenterAlert[] = [];
    for (const row of view.rows) {
      const copy = this.center.performAction(row.id, "copy");
      if (copy.item) items.push(copy.item);
    }
    return items;
  }

  buildAnalytics(
    items: readonly CenterAlert[],
    options?: { now?: Date }
  ): ExecutiveAnalytics {
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");
    if (visible.length === 0) {
      return {
        topCompanies: [],
        topSectors: [],
        mostTriggeredRules: [],
        highestConfidenceAlerts: [],
        highestRiskAlerts: [],
        mostFrequentCategories: [],
        mostResolved: [],
        mostArchived: [],
        trendLabel: EXECUTIVE_EMPTY.noAnalytics,
        empty: true,
        emptyMessage: EXECUTIVE_EMPTY.noAnalytics,
      };
    }

    const companies = new Map<string, { count: number; score: number }>();
    const sectors = new Map<string, { count: number; score: number }>();
    const categories = new Map<string, { count: number; score: number }>();
    const resolved = new Map<string, { count: number; score: number }>();
    const archived = new Map<string, { count: number; score: number }>();

    const bump = (
      map: Map<string, { count: number; score: number }>,
      key: string,
      score: number
    ) => {
      const k = safeExecutiveText(key, "Unknown");
      const cur = map.get(k) ?? { count: 0, score: 0 };
      cur.count += 1;
      cur.score = Math.max(cur.score, score);
      map.set(k, cur);
    };

    for (const item of visible) {
      const conf = item.alert.confidence.score;
      bump(companies, item.alert.company || item.alert.ticker, conf);
      bump(
        sectors,
        item.alert.metadata.extras.sector || "Unspecified",
        conf
      );
      bump(categories, item.alert.category, conf);
      if (item.inboxStatus === "Resolved") {
        bump(resolved, item.alert.category, conf);
      }
      if (item.inboxStatus === "Archived") {
        bump(archived, item.alert.category, conf);
      }
    }

    const highestConfidence = [...visible]
      .sort(
        (a, b) => b.alert.confidence.score - a.alert.confidence.score
      )
      .slice(0, 8)
      .map((item) => ({
        key: item.id,
        label: presentAlertHeadline(item),
        count: 1,
        score: item.alert.confidence.score,
        scoreLabel: `${Math.round(item.alert.confidence.score)}%`,
      }));

    const highestRisk = [...visible]
      .map((item) => ({
        item,
        risk: scoreAlertPriority(item.alert).factors.risk,
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 8)
      .map(({ item, risk }) => ({
        key: item.id,
        label: presentAlertHeadline(item),
        count: 1,
        score: risk,
        scoreLabel: String(Math.round(risk)),
      }));

    const wsView = this.workspace.getView({ now: options?.now });
    const ruleRows: RankedItem[] = this.workspace.listRules().map((rule) => ({
      key: rule.id,
      label: safeExecutiveText(rule.name, "Rule"),
      count: rule.enabled ? 1 : 0,
      score: rule.conditions.length,
      scoreLabel: rule.enabled ? "Active" : "Off",
    }));

    const triggered = wsView?.metrics.rulesTriggered ?? 0;
    const trendLabel =
      triggered > 0
        ? "Automation Up"
        : visible.length >= 5
          ? "Volume Elevated"
          : "Stable";

    return {
      topCompanies: rankMap(companies),
      topSectors: rankMap(sectors),
      mostTriggeredRules: ruleRows.slice(0, 8),
      highestConfidenceAlerts: highestConfidence,
      highestRiskAlerts: highestRisk,
      mostFrequentCategories: rankMap(categories),
      mostResolved: rankMap(resolved),
      mostArchived: rankMap(archived),
      trendLabel,
      empty: false,
      emptyMessage: EXECUTIVE_EMPTY.noAnalytics,
    };
  }

  buildHomeStrip(
    items: readonly CenterAlert[],
    metrics: ReturnType<AlertExecutiveMetrics["compute"]>
  ): HomeAlertStrip {
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");
    const empty = visible.length === 0;

    let highest = visible[0] ?? null;
    for (const item of visible) {
      const rank =
        item.alert.priority === "Critical"
          ? 4
          : item.alert.priority === "High"
            ? 3
            : item.alert.priority === "Medium"
              ? 2
              : 1;
      const best =
        highest == null
          ? 0
          : highest.alert.priority === "Critical"
            ? 4
            : highest.alert.priority === "High"
              ? 3
              : highest.alert.priority === "Medium"
                ? 2
                : 1;
      if (rank > best) highest = item;
    }

    const latest = [...visible].sort(
      (a, b) =>
        Date.parse(b.alert.createdAt) - Date.parse(a.alert.createdAt)
    )[0];
    const recommendation = latest
      ? recommendAlertAction(latest.alert).action
      : EXECUTIVE_EMPTY.noAlerts;

    return {
      unread: metrics.unread,
      unreadLabel: formatCount(metrics.unread),
      critical: metrics.critical,
      criticalLabel: formatCount(metrics.critical),
      portfolio: metrics.portfolioAlerts,
      portfolioLabel: formatCount(metrics.portfolioAlerts),
      watchlist: metrics.watchlistAlerts,
      watchlistLabel: formatCount(metrics.watchlistAlerts),
      highestPriority: presentPriorityLabel(highest),
      highestPriorityLabel: presentAlertHeadline(highest),
      latestAiRecommendation: safeExecutiveText(
        recommendation,
        EXECUTIVE_EMPTY.noAlerts
      ),
      latestAiRecommendationLabel: latest
        ? presentAlertHeadline(latest)
        : EXECUTIVE_EMPTY.noAlerts,
      empty,
      emptyMessage: empty
        ? EXECUTIVE_EMPTY.awaitingAlertGeneration
        : EXECUTIVE_EMPTY.noAlerts,
    };
  }

  getView(options?: { now?: Date }): AlertExecutiveDashboardView {
    const now = options?.now ?? new Date();
    const items = this.listItems();
    const wsView = this.workspace.getView({ now });
    const metrics = this.metricsEngine.compute(items, {
      now,
      workspace: wsView.metrics,
    });
    const health = this.healthEngine.build(items, metrics);
    const overview = this.snapshot.buildOverview(
      metrics,
      health.overallHealthScore
    );
    const panels = this.snapshot.buildPanels(items);
    const analytics = this.buildAnalytics(items, { now });
    const history = this.center.getHistory();
    const timeline = this.timeline.build(items, history);
    const report = this.reportEngine.buildView(
      overview,
      health,
      analytics,
      metrics,
      { now }
    );
    const homeStrip = this.buildHomeStrip(items, metrics);
    const empty = overview.empty;

    return {
      overview,
      health,
      panels,
      analytics,
      timeline,
      report,
      homeStrip,
      workspacePinned: wsView.metrics.pinnedAlerts,
      workspaceFavorites: wsView.metrics.favorites,
      empty,
      emptyMessage: empty
        ? EXECUTIVE_EMPTY.awaitingAlertGeneration
        : EXECUTIVE_EMPTY.noExecutiveSummary,
    };
  }

  getHomeStrip(options?: { now?: Date }): HomeAlertStrip {
    return this.getView(options).homeStrip;
  }

  exportMarkdown(subject?: Parameters<
    AlertExecutiveReport["exportMarkdown"]
  >[4]): ExecutiveExportResult {
    const view = this.getView();
    const items = this.listItems();
    const metrics = this.metricsEngine.compute(items, {
      workspace: this.workspace.getView().metrics,
    });
    return this.reportEngine.exportMarkdown(
      view.overview,
      view.health,
      view.analytics,
      metrics,
      subject
    );
  }

  exportPrint(): ExecutiveExportResult {
    return this.reportEngine.exportPrintLayout(this.getView().report);
  }
}

let singleton: AlertExecutiveDashboard | null = null;

export function getAlertExecutiveDashboard(): AlertExecutiveDashboard {
  if (!singleton) {
    singleton = new AlertExecutiveDashboard();
  }
  return singleton;
}

export function resetAlertExecutiveDashboard(): void {
  singleton?.setCenter(getAlertCenter());
  singleton?.setWorkspace(getAlertWorkspace());
  singleton = null;
}

export function getAlertExecutiveView(options?: {
  now?: Date;
}): AlertExecutiveDashboardView {
  return getAlertExecutiveDashboard().getView(options);
}

export function getHomeAlertStrip(options?: {
  now?: Date;
}): HomeAlertStrip {
  return getAlertExecutiveDashboard().getHomeStrip(options);
}

/** Sprint freeze helpers — reset cascade for tests. */
export function resetExecutiveStack(): void {
  resetAlertExecutiveDashboard();
  resetAlertWorkspace();
  resetAlertCenter();
}
