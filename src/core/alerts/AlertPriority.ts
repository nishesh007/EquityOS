/**
 * Institutional AI Alert Engine — priority bands (Sprint 9C.R1).
 */

export const ALERT_PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Informational",
] as const;

export type AlertPriority = (typeof ALERT_PRIORITIES)[number];

/** Lower rank = higher priority (sort ascending). */
export const ALERT_PRIORITY_RANK: Record<AlertPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Informational: 4,
};

export function isAlertPriority(value: string): value is AlertPriority {
  return (ALERT_PRIORITIES as readonly string[]).includes(value);
}

export function resolveAlertPriorityBand(
  value: string | null | undefined,
  fallback: AlertPriority = "Informational"
): AlertPriority {
  if (value && isAlertPriority(value)) return value;
  return fallback;
}

export function compareAlertPriority(a: AlertPriority, b: AlertPriority): number {
  return ALERT_PRIORITY_RANK[a] - ALERT_PRIORITY_RANK[b];
}
