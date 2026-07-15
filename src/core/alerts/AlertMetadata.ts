/**
 * Institutional AI Alert Engine — metadata envelope (Sprint 9C.R1).
 */

import type { AlertSourceEngine } from "./AlertTypes";

export interface AlertMetadata {
  eventType: string;
  groupKey: string;
  dedupeKey: string;
  href: string;
  tags: string[];
  processingTimeMs: number;
  sourceWeight: number;
  groupedCount: number;
  suppressed: boolean;
  version: string;
  extras: Record<string, string>;
}

export const ALERT_METADATA_VERSION = "9C.R1";

export function emptyAlertMetadata(
  partial?: Partial<AlertMetadata>
): AlertMetadata {
  return {
    eventType: partial?.eventType ?? "unknown",
    groupKey: partial?.groupKey ?? "ungrouped",
    dedupeKey: partial?.dedupeKey ?? "none",
    href: partial?.href ?? "",
    tags: partial?.tags ? [...partial.tags] : [],
    processingTimeMs: Number.isFinite(partial?.processingTimeMs)
      ? (partial!.processingTimeMs as number)
      : 0,
    sourceWeight: Number.isFinite(partial?.sourceWeight)
      ? (partial!.sourceWeight as number)
      : 1,
    groupedCount: Number.isFinite(partial?.groupedCount)
      ? Math.max(1, Math.floor(partial!.groupedCount as number))
      : 1,
    suppressed: partial?.suppressed === true,
    version: partial?.version ?? ALERT_METADATA_VERSION,
    extras: partial?.extras ? { ...partial.extras } : {},
  };
}

export function buildAlertMetadata(input: {
  eventType: string;
  sourceEngine: AlertSourceEngine;
  groupKey?: string | null;
  dedupeKey?: string | null;
  href?: string | null;
  tags?: readonly string[] | null;
  processingTimeMs?: number;
  sourceWeight?: number;
  groupedCount?: number;
  suppressed?: boolean;
  extras?: Record<string, unknown> | null;
}): AlertMetadata {
  const extras: Record<string, string> = {};
  if (input.extras) {
    for (const [k, v] of Object.entries(input.extras)) {
      if (v == null) continue;
      const text = String(v);
      if (text === "" || text === "null" || text === "undefined" || text === "NaN") {
        continue;
      }
      extras[k] = text;
    }
  }
  extras.sourceEngine = input.sourceEngine;

  return emptyAlertMetadata({
    eventType: safeMetaText(input.eventType, "unknown"),
    groupKey: safeMetaText(input.groupKey, "ungrouped"),
    dedupeKey: safeMetaText(input.dedupeKey, "none"),
    href: safeMetaText(input.href, ""),
    tags: (input.tags ?? []).map((t) => safeMetaText(t, "")).filter(Boolean),
    processingTimeMs: input.processingTimeMs ?? 0,
    sourceWeight: input.sourceWeight ?? 1,
    groupedCount: input.groupedCount ?? 1,
    suppressed: input.suppressed === true,
    extras,
  });
}

function safeMetaText(
  value: string | null | undefined,
  fallback: string
): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}
