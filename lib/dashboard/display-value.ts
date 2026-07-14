/**
 * Dashboard display helpers — presentation only.
 * Prevents misleading zeros / blanks when underlying engines have not produced data.
 */

export type DisplayAvailability = "value" | "na" | "collecting" | "unavailable" | "loading";

export function hasValidationActivity(input: {
  totalValidations?: number | null;
  totalCalculations?: number | null;
  decisionTraces?: number | null;
  generatedExplanations?: number | null;
}): boolean {
  return (
    (input.totalValidations ?? 0) > 0 ||
    (input.totalCalculations ?? 0) > 0 ||
    (input.decisionTraces ?? 0) > 0 ||
    (input.generatedExplanations ?? 0) > 0
  );
}

/**
 * Format a score for dashboard widgets.
 * Never returns a bare "0" when the engine has not produced real activity.
 */
export function formatScoreDisplay(
  value: number | null | undefined,
  options?: {
    hasActivity?: boolean;
    suffix?: string;
    collectingLabel?: string;
    unavailableLabel?: string;
    naLabel?: string;
  }
): string {
  const collectingLabel = options?.collectingLabel ?? "Collecting...";
  const unavailableLabel = options?.unavailableLabel ?? "Unavailable";
  const naLabel = options?.naLabel ?? "N/A";
  const suffix = options?.suffix ?? "";

  if (value == null || !Number.isFinite(value)) {
    return options?.hasActivity === false ? collectingLabel : unavailableLabel;
  }

  if (value === 0 && options?.hasActivity !== true) {
    return collectingLabel;
  }

  if (options?.hasActivity === false) {
    return naLabel;
  }

  return `${Math.round(value)}${suffix}`;
}

export function formatOptionalText(
  value: string | null | undefined,
  fallback = "N/A"
): string {
  if (value == null || value.trim() === "" || value === "—") return fallback;
  return value;
}

export function formatOptionalTimestamp(
  value: string | null | undefined,
  fallback = "N/A"
): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

/** Days until YYYY-MM-DD (IST calendar), relative to `now`. */
export function daysUntilDateKey(
  dateKey: string,
  now = new Date()
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

export function formatDaysUntilLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days === 0) return "Today";
  if (days === 1) return "In 1 Day";
  if (days > 1) return `In ${days} Days`;
  if (days === -1) return "T-1 Day";
  return `T-${Math.abs(days)} Days`;
}
