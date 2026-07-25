/**
 * Sprint 9F.2 — Metric accessors for horizon pipelines.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export function metricNum(
  candidate: OpportunityCandidate,
  key: string
): number | null {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function metricStr(
  candidate: OpportunityCandidate,
  key: string
): string | null {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolvePrice(candidate: OpportunityCandidate): number | null {
  const quoted = candidate.quote?.price;
  if (typeof quoted === "number" && Number.isFinite(quoted) && quoted > 0) {
    return quoted;
  }
  const cmp = metricNum(candidate, "cmp");
  return cmp != null && cmp > 0 ? cmp : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
