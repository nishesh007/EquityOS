/**
 * Institutional AI Alert Engine — alert categories (Sprint 9C.R1).
 */

export const ALERT_CATEGORIES = [
  "Opportunity",
  "Portfolio",
  "Watchlist",
  "Earnings",
  "Risk",
  "Technical",
  "Fundamental",
  "Validation",
  "Trust",
  "News",
  "Corporate Action",
  "Platform",
] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

/** Lower rank = higher institutional attention. */
export const ALERT_CATEGORY_ATTENTION_RANK: Record<AlertCategory, number> = {
  Risk: 0,
  Portfolio: 1,
  Validation: 2,
  Trust: 3,
  Earnings: 4,
  Opportunity: 5,
  "Corporate Action": 6,
  Watchlist: 7,
  Fundamental: 8,
  Technical: 9,
  News: 10,
  Platform: 11,
};

export function isAlertCategory(value: string): value is AlertCategory {
  return (ALERT_CATEGORIES as readonly string[]).includes(value);
}

export function resolveAlertCategory(
  value: string | null | undefined,
  fallback: AlertCategory = "Platform"
): AlertCategory {
  if (value && isAlertCategory(value)) return value;
  return fallback;
}
