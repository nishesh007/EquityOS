/**
 * Alert Center Metrics — inbox operational metrics (Sprint 9C.R5).
 */

import type { CenterAlert } from "./AlertCenterModels";

export interface AlertCenterMetrics {
  totalAlerts: number;
  unread: number;
  critical: number;
  averageConfidence: number;
  averageResolutionTimeMs: number;
  archived: number;
  resolved: number;
  expired: number;
  alertVelocity: number;
  labels: {
    totalAlerts: string;
    unread: string;
    critical: string;
    averageConfidence: string;
    averageResolutionTime: string;
    archived: string;
    resolved: string;
    expired: string;
    alertVelocity: string;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export class AlertCenterMetricsEngine {
  compute(
    items: readonly CenterAlert[],
    options?: { windowMs?: number; now?: Date }
  ): AlertCenterMetrics {
    const now = options?.now ?? new Date();
    const windowMs = options?.windowMs ?? 24 * 60 * 60 * 1000;
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");

    let confidenceSum = 0;
    let confidenceCount = 0;
    let resolutionSum = 0;
    let resolutionCount = 0;
    let unread = 0;
    let critical = 0;
    let archived = 0;
    let resolved = 0;
    let expired = 0;
    let recent = 0;

    for (const item of visible) {
      const score = item.alert.confidence.score;
      if (Number.isFinite(score)) {
        confidenceSum += score;
        confidenceCount += 1;
      }
      if (!item.read) unread += 1;
      if (
        item.alert.priority === "Critical" ||
        item.alert.severity === "Critical"
      ) {
        critical += 1;
      }
      if (item.inboxStatus === "Archived") archived += 1;
      if (item.inboxStatus === "Resolved") resolved += 1;
      if (item.inboxStatus === "Expired") expired += 1;

      const created = Date.parse(item.timestamps.created);
      if (Number.isFinite(created) && now.getTime() - created <= windowMs) {
        recent += 1;
      }

      if (item.timestamps.resolved) {
        const resolvedAt = Date.parse(item.timestamps.resolved);
        if (Number.isFinite(created) && Number.isFinite(resolvedAt)) {
          resolutionSum += Math.max(0, resolvedAt - created);
          resolutionCount += 1;
        }
      }
    }

    const avgConfidence =
      confidenceCount === 0 ? 0 : round2(confidenceSum / confidenceCount);
    const avgResolution =
      resolutionCount === 0 ? 0 : round2(resolutionSum / resolutionCount);
    const velocity = round2(recent / Math.max(1, windowMs / 3_600_000));

    return {
      totalAlerts: visible.length,
      unread,
      critical,
      averageConfidence: avgConfidence,
      averageResolutionTimeMs: avgResolution,
      archived,
      resolved,
      expired,
      alertVelocity: velocity,
      labels: {
        totalAlerts: String(visible.length),
        unread: String(unread),
        critical: String(critical),
        averageConfidence:
          confidenceCount === 0 ? "—" : `${avgConfidence}%`,
        averageResolutionTime: formatDuration(avgResolution),
        archived: String(archived),
        resolved: String(resolved),
        expired: String(expired),
        alertVelocity: `${velocity}/h`,
      },
    };
  }
}
