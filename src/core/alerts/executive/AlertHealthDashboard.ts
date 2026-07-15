/**
 * Alert Health Dashboard — platform alert health from Center data (9C.R8).
 */

import type { CenterAlert } from "../center/AlertCenterModels";
import { scoreAlertPriority } from "../intelligence/AlertPriorityEngine";
import {
  EXECUTIVE_EMPTY,
  formatDuration,
  formatPct,
  formatScore,
  safeNumeric,
  safePct,
  type AlertHealthView,
  type DistributionBucket,
} from "./AlertExecutiveModels";
import type { AlertExecutiveMetricBundle } from "./AlertExecutiveMetrics";

const CONFIDENCE_BANDS = [
  { key: "90+", min: 90, max: 101 },
  { key: "70-89", min: 70, max: 90 },
  { key: "50-69", min: 50, max: 70 },
  { key: "<50", min: 0, max: 50 },
] as const;

function toBuckets(
  counts: Map<string, number>,
  total: number
): DistributionBucket[] {
  const rows: DistributionBucket[] = [];
  for (const [key, count] of counts) {
    rows.push({
      key,
      count,
      label: key,
      pct: safePct(count, total),
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}

export class AlertHealthDashboard {
  build(
    items: readonly CenterAlert[],
    metrics: AlertExecutiveMetricBundle
  ): AlertHealthView {
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");
    if (visible.length === 0) {
      return {
        overallHealthScore: 0,
        overallHealthLabel: "—",
        priorityDistribution: [],
        categoryDistribution: [],
        severityDistribution: [],
        confidenceDistribution: [],
        resolutionRate: 0,
        resolutionRateLabel: "—",
        averageResolutionTimeMs: 0,
        averageResolutionTimeLabel: "—",
        alertVelocity: 0,
        alertVelocityLabel: "—",
        falsePositiveRate: 0,
        falsePositiveRateLabel: "—",
        historicalSuccessRate: 0,
        historicalSuccessRateLabel: "—",
        empty: true,
        emptyMessage: EXECUTIVE_EMPTY.awaitingAlertGeneration,
      };
    }

    const priority = new Map<string, number>();
    const category = new Map<string, number>();
    const severity = new Map<string, number>();
    const confidence = new Map<string, number>();
    for (const band of CONFIDENCE_BANDS) confidence.set(band.key, 0);

    let dismissedOrIgnored = 0;
    let terminal = 0;

    for (const item of visible) {
      const p = item.alert.priority || "Medium";
      priority.set(p, (priority.get(p) ?? 0) + 1);
      const c = item.alert.category || "Unknown";
      category.set(c, (category.get(c) ?? 0) + 1);
      const s = item.alert.severity || "Info";
      severity.set(s, (severity.get(s) ?? 0) + 1);

      const score = safeNumeric(item.alert.confidence.score, 0);
      for (const band of CONFIDENCE_BANDS) {
        if (score >= band.min && score < band.max) {
          confidence.set(band.key, (confidence.get(band.key) ?? 0) + 1);
          break;
        }
      }

      if (
        item.inboxStatus === "Resolved" ||
        item.inboxStatus === "Archived" ||
        item.inboxStatus === "Expired"
      ) {
        terminal += 1;
      }
      if (item.inboxStatus === "Deleted" || item.inboxStatus === "Archived") {
        const pr = scoreAlertPriority(item.alert);
        if (pr.score < 35) dismissedOrIgnored += 1;
      }
    }

    const falsePositiveRate =
      visible.length === 0
        ? 0
        : Math.round((dismissedOrIgnored / visible.length) * 1000) / 10;
    const successRate =
      visible.length === 0
        ? 0
        : Math.round((terminal / visible.length) * 1000) / 10;

    // Health: blend confidence, resolution, inverse false-positive, velocity calmness
    const confFactor = Math.min(100, metrics.averageConfidence);
    const resFactor = Math.min(100, metrics.resolutionRate);
    const fpPenalty = Math.min(40, falsePositiveRate);
    const velocityPenalty = Math.min(20, Math.max(0, metrics.alertVelocity - 5) * 2);
    const overall = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          confFactor * 0.35 +
            resFactor * 0.35 +
            (100 - fpPenalty) * 0.2 +
            (100 - velocityPenalty) * 0.1
        )
      )
    );

    return {
      overallHealthScore: overall,
      overallHealthLabel: formatScore(overall),
      priorityDistribution: toBuckets(priority, visible.length),
      categoryDistribution: toBuckets(category, visible.length),
      severityDistribution: toBuckets(severity, visible.length),
      confidenceDistribution: toBuckets(confidence, visible.length),
      resolutionRate: metrics.resolutionRate,
      resolutionRateLabel: formatPct(metrics.resolutionRate),
      averageResolutionTimeMs: metrics.averageResolutionTimeMs,
      averageResolutionTimeLabel: formatDuration(metrics.averageResolutionTimeMs),
      alertVelocity: metrics.alertVelocity,
      alertVelocityLabel: `${safeNumeric(metrics.alertVelocity, 0)}/h`,
      falsePositiveRate,
      falsePositiveRateLabel: formatPct(falsePositiveRate),
      historicalSuccessRate: successRate,
      historicalSuccessRateLabel: formatPct(successRate),
      empty: false,
      emptyMessage: EXECUTIVE_EMPTY.noAnalytics,
    };
  }
}
