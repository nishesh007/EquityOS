/**
 * Institutional AI Alert Engine — lifecycle states (Sprint 9C.R1).
 */

export const ALERT_LIFECYCLE_STATES = [
  "Generated",
  "Queued",
  "Active",
  "Viewed",
  "Dismissed",
  "Expired",
  "Archived",
] as const;

export type AlertLifecycleStatus = (typeof ALERT_LIFECYCLE_STATES)[number];

/** Terminal states — no further activation. */
export const ALERT_TERMINAL_STATES: ReadonlySet<AlertLifecycleStatus> = new Set([
  "Dismissed",
  "Expired",
  "Archived",
]);

/** States visible in active inbox views. */
export const ALERT_ACTIVE_STATES: ReadonlySet<AlertLifecycleStatus> = new Set([
  "Active",
  "Viewed",
  "Queued",
]);

const ALLOWED_TRANSITIONS: Record<
  AlertLifecycleStatus,
  ReadonlySet<AlertLifecycleStatus>
> = {
  Generated: new Set(["Queued", "Active", "Expired", "Dismissed", "Archived"]),
  Queued: new Set(["Active", "Expired", "Dismissed", "Archived"]),
  Active: new Set(["Viewed", "Dismissed", "Expired", "Archived"]),
  Viewed: new Set(["Dismissed", "Expired", "Archived", "Active"]),
  Dismissed: new Set(["Archived"]),
  Expired: new Set(["Archived"]),
  Archived: new Set(),
};

export function isAlertLifecycleStatus(
  value: string
): value is AlertLifecycleStatus {
  return (ALERT_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function resolveAlertLifecycle(
  value: string | null | undefined,
  fallback: AlertLifecycleStatus = "Generated"
): AlertLifecycleStatus {
  if (value && isAlertLifecycleStatus(value)) return value;
  return fallback;
}

export function canTransitionLifecycle(
  from: AlertLifecycleStatus,
  to: AlertLifecycleStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].has(to);
}

export function transitionLifecycle(
  from: AlertLifecycleStatus,
  to: AlertLifecycleStatus
): AlertLifecycleStatus {
  if (canTransitionLifecycle(from, to)) return to;
  return from;
}

export function isTerminalLifecycle(status: AlertLifecycleStatus): boolean {
  return ALERT_TERMINAL_STATES.has(status);
}

export function isActiveLifecycle(status: AlertLifecycleStatus): boolean {
  return ALERT_ACTIVE_STATES.has(status);
}
