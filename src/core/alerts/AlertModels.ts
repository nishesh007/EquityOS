/**
 * Institutional AI Alert Engine — domain models (Sprint 9C.R1).
 * Orchestration-layer alerts only — no notification delivery.
 */

import type { AlertCategory } from "./AlertCategory";
import type { AlertConfidence } from "./AlertConfidence";
import type { AlertLifecycleStatus } from "./AlertLifecycle";
import type { AlertMetadata } from "./AlertMetadata";
import type { AlertPriority } from "./AlertPriority";
import type { AlertSeverity } from "./AlertSeverity";
import type { AlertSourceEngine } from "./AlertTypes";

export const ALERT_ENGINE_EMPTY = {
  noAlerts: "No Alerts",
  awaitingEvents: "Awaiting Events",
  noActive: "No Active Alerts",
} as const;

export type AlertEmptyMessage =
  (typeof ALERT_ENGINE_EMPTY)[keyof typeof ALERT_ENGINE_EMPTY];

export interface InstitutionalAlert {
  id: string;
  category: AlertCategory;
  priority: AlertPriority;
  severity: AlertSeverity;
  confidence: AlertConfidence;
  title: string;
  summary: string;
  description: string;
  reason: string;
  evidence: string[];
  sourceEngine: AlertSourceEngine;
  company: string;
  ticker: string;
  inPortfolio: boolean;
  inWatchlist: boolean;
  createdAt: string;
  expiresAt: string;
  status: AlertLifecycleStatus;
  metadata: AlertMetadata;
}

export interface AlertListView {
  alerts: InstitutionalAlert[];
  total: number;
  activeCount: number;
  empty: boolean;
  emptyMessage: AlertEmptyMessage;
}

export interface AlertQuery {
  status?: AlertLifecycleStatus | AlertLifecycleStatus[];
  category?: AlertCategory | AlertCategory[];
  priority?: AlertPriority | AlertPriority[];
  sourceEngine?: AlertSourceEngine | AlertSourceEngine[];
  ticker?: string;
  inPortfolio?: boolean;
  inWatchlist?: boolean;
  includeTerminal?: boolean;
  limit?: number;
}

export interface AlertGenerationResult {
  alert: InstitutionalAlert | null;
  created: boolean;
  deduplicated: boolean;
  grouped: boolean;
  suppressed: boolean;
  emptyMessage: AlertEmptyMessage | "";
  processingTimeMs: number;
}

export function emptyAlertListView(
  message: AlertEmptyMessage = ALERT_ENGINE_EMPTY.awaitingEvents
): AlertListView {
  return {
    alerts: [],
    total: 0,
    activeCount: 0,
    empty: true,
    emptyMessage: message,
  };
}

export function safeAlertText(
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
