/**
 * Institutional AI Alert Engine — generation context (Sprint 9C.R1).
 */

import type { AlertCategory } from "./AlertCategory";
import type { AlertPriority } from "./AlertPriority";
import type { AlertSeverity } from "./AlertSeverity";
import type { AlertSourceEngine, AlertSourceEvent } from "./AlertTypes";

export interface AlertContext {
  now: Date;
  sourceEngine: AlertSourceEngine;
  eventType: string;
  company: string;
  ticker: string;
  inPortfolio: boolean;
  inWatchlist: boolean;
  categoryHint: AlertCategory | null;
  priorityHint: AlertPriority | null;
  severityHint: AlertSeverity | null;
  confidenceHint: number | null;
  groupKey: string;
  dedupeKey: string;
  suppress: boolean;
  defaultExpiryMs: number;
}

export const DEFAULT_ALERT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function buildAlertContext(
  event: AlertSourceEvent,
  options?: { now?: Date; defaultExpiryMs?: number; suppress?: boolean }
): AlertContext {
  const now = options?.now ?? new Date();
  const ticker = safeText(event.ticker, "");
  const company = safeText(event.company, ticker || "Unknown Company");
  const eventType = safeText(event.eventType, "event");
  const source = event.sourceEngine;

  const groupKey =
    safeText(event.groupKey, "") ||
    `${source}::${ticker || "platform"}::${eventType}`;

  const dedupeKey =
    safeText(event.dedupeKey, "") ||
    `${source}::${ticker || "platform"}::${eventType}::${safeText(event.title, eventType)}`;

  return {
    now,
    sourceEngine: source,
    eventType,
    company,
    ticker,
    inPortfolio: event.inPortfolio === true,
    inWatchlist: event.inWatchlist === true,
    categoryHint: null,
    priorityHint: null,
    severityHint: null,
    confidenceHint:
      event.confidenceScore != null && Number.isFinite(event.confidenceScore)
        ? event.confidenceScore
        : null,
    groupKey,
    dedupeKey,
    suppress: options?.suppress === true,
    defaultExpiryMs: options?.defaultExpiryMs ?? DEFAULT_ALERT_EXPIRY_MS,
  };
}

export function withContextHints(
  ctx: AlertContext,
  hints: {
    category?: AlertCategory | null;
    priority?: AlertPriority | null;
    severity?: AlertSeverity | null;
    confidence?: number | null;
  }
): AlertContext {
  return {
    ...ctx,
    categoryHint: hints.category ?? ctx.categoryHint,
    priorityHint: hints.priority ?? ctx.priorityHint,
    severityHint: hints.severity ?? ctx.severityHint,
    confidenceHint:
      hints.confidence != null && Number.isFinite(hints.confidence)
        ? hints.confidence
        : ctx.confidenceHint,
  };
}

function safeText(value: string | null | undefined, fallback: string): string {
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
