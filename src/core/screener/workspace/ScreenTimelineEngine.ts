/**
 * Institutional Screener Workspace — score timeline (Sprint 9D.R7).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  emptyScreenTimelineEntry,
  normalizeScreenTimelineEntry,
  WORKSPACE_EMPTY,
  type ScoreDelta,
  type ScreenTimelineEntry,
} from "./WorkspacePresentationModels";

export const TIMELINE_METRICS = [
  "Institutional Score",
  "Trust",
  "Validation",
  "Momentum",
  "Growth",
  "Quality",
  "Risk",
  "AI Conviction",
] as const;

export type TimelineMetric = (typeof TIMELINE_METRICS)[number];

export interface TimelineSnapshot {
  at?: string | null;
  institutionalScore?: number | null;
  trust?: number | null;
  validation?: number | null;
  momentum?: number | null;
  growth?: number | null;
  quality?: number | null;
  risk?: number | null;
  aiConviction?: number | null;
  /** Alias map for flexible inputs */
  scores?: Partial<Record<TimelineMetric | string, number | null | undefined>>;
}

function readMetric(
  snapshot: TimelineSnapshot,
  metric: TimelineMetric
): number {
  const fromScores = snapshot.scores?.[metric];
  switch (metric) {
    case "Institutional Score":
      return safeScreenNumber(
        fromScores ?? snapshot.institutionalScore,
        0
      );
    case "Trust":
      return safeScreenNumber(fromScores ?? snapshot.trust, 0);
    case "Validation":
      return safeScreenNumber(fromScores ?? snapshot.validation, 0);
    case "Momentum":
      return safeScreenNumber(fromScores ?? snapshot.momentum, 0);
    case "Growth":
      return safeScreenNumber(fromScores ?? snapshot.growth, 0);
    case "Quality":
      return safeScreenNumber(fromScores ?? snapshot.quality, 0);
    case "Risk":
      return safeScreenNumber(fromScores ?? snapshot.risk, 0);
    case "AI Conviction":
      return safeScreenNumber(fromScores ?? snapshot.aiConviction, 0);
    default:
      return safeScreenNumber(fromScores, 0);
  }
}

function classify(delta: number): ScoreDelta {
  if (delta > 0) return "Improved";
  if (delta < 0) return "Declined";
  return "Unchanged";
}

function driversFor(
  metric: TimelineMetric,
  status: ScoreDelta,
  previous: number,
  current: number
): string[] {
  if (status === "Unchanged") {
    return [`${metric} held at ${current}`];
  }
  const verb = status === "Improved" ? "rose" : "fell";
  return [
    `${metric} ${verb} from ${previous} to ${current}`,
    status === "Improved"
      ? `${metric} positive contribution`
      : `${metric} negative contribution`,
  ];
}

export function getTimeline(
  target: string,
  snapshots: TimelineSnapshot[],
  options?: { screenId?: string | null; metrics?: TimelineMetric[] }
): ScreenTimelineEntry[] {
  const key = safeScreenText(target, "").toUpperCase();
  const screenId = safeScreenText(options?.screenId, "");
  const metrics = options?.metrics?.length
    ? options.metrics
    : [...TIMELINE_METRICS];

  if (!key || !Array.isArray(snapshots) || snapshots.length < 2) {
    return [
      emptyScreenTimelineEntry(WORKSPACE_EMPTY.awaitingFirstScan),
    ];
  }

  const entries: ScreenTimelineEntry[] = [];
  for (let i = 1; i < snapshots.length; i += 1) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    for (const metric of metrics) {
      const previous = readMetric(prev, metric);
      const current = readMetric(curr, metric);
      const delta = current - previous;
      const status = classify(delta);
      entries.push(
        normalizeScreenTimelineEntry({
          ticker: key,
          screenId,
          metric,
          previous,
          current,
          delta,
          status,
          drivers: driversFor(metric, status, previous, current),
          empty: false,
        })
      );
    }
  }

  return entries.length > 0
    ? entries
    : [emptyScreenTimelineEntry(WORKSPACE_EMPTY.awaitingFirstScan)];
}

export const ScreenTimelineEngine = {
  getTimeline,
  TIMELINE_METRICS,
};
