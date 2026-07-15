/**
 * Institutional AI Alert Engine — severity bands (Sprint 9C.R1).
 */

export const ALERT_SEVERITIES = [
  "Critical",
  "Major",
  "Moderate",
  "Minor",
  "Informational",
] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/** Lower rank = more severe. */
export const ALERT_SEVERITY_RANK: Record<AlertSeverity, number> = {
  Critical: 0,
  Major: 1,
  Moderate: 2,
  Minor: 3,
  Informational: 4,
};

export function isAlertSeverity(value: string): value is AlertSeverity {
  return (ALERT_SEVERITIES as readonly string[]).includes(value);
}

export function resolveAlertSeverityBand(
  value: string | null | undefined,
  fallback: AlertSeverity = "Informational"
): AlertSeverity {
  if (value && isAlertSeverity(value)) return value;
  return fallback;
}

export function compareAlertSeverity(a: AlertSeverity, b: AlertSeverity): number {
  return ALERT_SEVERITY_RANK[a] - ALERT_SEVERITY_RANK[b];
}
