/**
 * Alert Executive Metrics — composed from Center metrics + workspace (9C.R8).
 */

import type { CenterAlert } from "../center/AlertCenterModels";
import { AlertCenterMetricsEngine } from "../center/AlertMetrics";
import type { WorkspaceMetrics } from "../workspace/AlertWorkspaceModels";
import {
  formatCount,
  formatDuration,
  formatPct,
  safeNumeric,
} from "./AlertExecutiveModels";

export interface AlertExecutiveMetricBundle {
  totalAlerts: number;
  critical: number;
  highPriority: number;
  portfolioAlerts: number;
  watchlistAlerts: number;
  unread: number;
  pinned: number;
  resolvedToday: number;
  archived: number;
  averageConfidence: number;
  averageResolutionTimeMs: number;
  alertVelocity: number;
  resolutionRate: number;
  rulesCreated: number;
  rulesTriggered: number;
  favorites: number;
  savedViews: number;
  labels: {
    totalAlerts: string;
    critical: string;
    highPriority: string;
    portfolioAlerts: string;
    watchlistAlerts: string;
    unread: string;
    pinned: string;
    resolvedToday: string;
    archived: string;
    averageConfidence: string;
    averageResolutionTime: string;
    alertVelocity: string;
    resolutionRate: string;
  };
}

function isToday(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const d = new Date(t);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export class AlertExecutiveMetrics {
  private readonly centerMetrics = new AlertCenterMetricsEngine();

  compute(
    items: readonly CenterAlert[],
    options?: {
      now?: Date;
      workspace?: WorkspaceMetrics | null;
    }
  ): AlertExecutiveMetricBundle {
    const now = options?.now ?? new Date();
    const base = this.centerMetrics.compute(items, { now });
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");

    let highPriority = 0;
    let portfolio = 0;
    let watchlist = 0;
    let pinned = 0;
    let resolvedToday = 0;
    let resolvedOrArchived = 0;

    for (const item of visible) {
      if (item.alert.priority === "High" || item.alert.priority === "Critical") {
        highPriority += 1;
      }
      if (item.alert.inPortfolio) portfolio += 1;
      if (item.alert.inWatchlist) watchlist += 1;
      if (item.pinned || item.inboxStatus === "Pinned") pinned += 1;
      if (
        item.inboxStatus === "Resolved" &&
        item.timestamps.resolved &&
        isToday(item.timestamps.resolved, now)
      ) {
        resolvedToday += 1;
      }
      if (
        item.inboxStatus === "Resolved" ||
        item.inboxStatus === "Archived"
      ) {
        resolvedOrArchived += 1;
      }
    }

    const resolutionRate =
      visible.length === 0
        ? 0
        : Math.round((resolvedOrArchived / visible.length) * 1000) / 10;

    const ws = options?.workspace;

    return {
      totalAlerts: base.totalAlerts,
      critical: base.critical,
      highPriority,
      portfolioAlerts: portfolio,
      watchlistAlerts: watchlist,
      unread: base.unread,
      pinned,
      resolvedToday,
      archived: base.archived,
      averageConfidence: safeNumeric(base.averageConfidence, 0),
      averageResolutionTimeMs: safeNumeric(base.averageResolutionTimeMs, 0),
      alertVelocity: safeNumeric(base.alertVelocity, 0),
      resolutionRate,
      rulesCreated: ws?.rulesCreated ?? 0,
      rulesTriggered: ws?.rulesTriggered ?? 0,
      favorites: ws?.favorites ?? 0,
      savedViews: ws?.savedViews ?? 0,
      labels: {
        totalAlerts: formatCount(base.totalAlerts),
        critical: formatCount(base.critical),
        highPriority: formatCount(highPriority),
        portfolioAlerts: formatCount(portfolio),
        watchlistAlerts: formatCount(watchlist),
        unread: formatCount(base.unread),
        pinned: formatCount(pinned),
        resolvedToday: formatCount(resolvedToday),
        archived: formatCount(base.archived),
        averageConfidence:
          visible.length === 0
            ? "—"
            : formatPct(safeNumeric(base.averageConfidence, 0)),
        averageResolutionTime: formatDuration(base.averageResolutionTimeMs),
        alertVelocity: `${safeNumeric(base.alertVelocity, 0)}/h`,
        resolutionRate: formatPct(resolutionRate),
      },
    };
  }
}
