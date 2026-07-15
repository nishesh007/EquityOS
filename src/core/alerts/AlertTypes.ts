/**
 * Institutional AI Alert Engine — source engines & event types (Sprint 9C.R1).
 */

export const ALERT_SOURCE_ENGINES = [
  "AI Research",
  "Earnings",
  "Portfolio",
  "Watchlist",
  "Validation",
  "Trust",
  "Reports",
  "Market",
  "Corporate Actions",
  "News",
  "Screener",
  "Platform",
] as const;

export type AlertSourceEngine = (typeof ALERT_SOURCE_ENGINES)[number];

/** Source weighting for priority / confidence blending (higher = more weight). */
export const DEFAULT_SOURCE_WEIGHTS: Record<AlertSourceEngine, number> = {
  Portfolio: 1.25,
  Validation: 1.2,
  Trust: 1.15,
  Earnings: 1.1,
  "AI Research": 1.05,
  Watchlist: 1.0,
  "Corporate Actions": 1.0,
  Market: 0.95,
  News: 0.9,
  Reports: 0.9,
  Screener: 0.85,
  Platform: 0.8,
};

export function isAlertSourceEngine(value: string): value is AlertSourceEngine {
  return (ALERT_SOURCE_ENGINES as readonly string[]).includes(value);
}

export function resolveAlertSourceEngine(
  value: string | null | undefined,
  fallback: AlertSourceEngine = "Platform"
): AlertSourceEngine {
  if (value && isAlertSourceEngine(value)) return value;
  return fallback;
}

export function getSourceWeight(source: AlertSourceEngine): number {
  return DEFAULT_SOURCE_WEIGHTS[source] ?? 1;
}

/** Raw event payload ingested from any registered engine. */
export interface AlertSourceEvent {
  sourceEngine: AlertSourceEngine;
  eventType: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  reason?: string | null;
  evidence?: readonly string[] | null;
  company?: string | null;
  ticker?: string | null;
  inPortfolio?: boolean | null;
  inWatchlist?: boolean | null;
  suggestedCategory?: string | null;
  suggestedPriority?: string | null;
  suggestedSeverity?: string | null;
  confidenceScore?: number | null;
  expiresAt?: string | null;
  groupKey?: string | null;
  dedupeKey?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string | null;
}
