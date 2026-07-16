/**
 * Watchlist Alert Bridge — Sprint 9C alert engine integration (Sprint 10B.R4).
 */

import { dismissAlert, getAlerts, registerAlertEngine } from "@/src/core/alerts/AlertFacade";
import type { InstitutionalAlert } from "@/src/core/alerts/AlertModels";
import { getAlertCenter } from "@/src/core/alerts/center/AlertCenter";
import {
  WORKSPACE_EMPTY,
  safeWorkspaceText,
  type WatchlistAlertItem,
  type WatchlistAlertsView,
  type WatchlistWorkspaceContext,
} from "./WatchlistWorkspaceModels";
import { recordTimelineEvent } from "./WatchlistActivityTimeline";

const dismissed = new Set<string>();
const snoozed = new Map<string, string>();
const pinned = new Set<string>();

function toItem(
  alert: InstitutionalAlert,
  status: WatchlistAlertItem["status"]
): WatchlistAlertItem {
  return {
    id: alert.id,
    ticker: alert.ticker.toUpperCase(),
    title: alert.title,
    summary: alert.summary,
    status,
    createdAt: alert.createdAt,
    snoozedUntil: snoozed.get(alert.id) ?? null,
  };
}

function alertStatus(id: string, alert: InstitutionalAlert): WatchlistAlertItem["status"] {
  if (pinned.has(id)) return "pinned";
  if (dismissed.has(id)) return "dismissed";
  if (snoozed.has(id)) return "snoozed";
  const expires = Date.parse(alert.expiresAt);
  if (Number.isFinite(expires) && expires > Date.now()) return "upcoming";
  return "active";
}

export function getWatchlistAlerts(
  context?: WatchlistWorkspaceContext | null
): WatchlistAlertsView {
  registerAlertEngine();
  const symbols = new Set((context?.symbols ?? []).map((s) => s.toUpperCase()));
  const list = getAlerts(
    { inWatchlist: true, includeTerminal: true },
    context?.now ?? undefined
  );

  const filtered = list.alerts.filter(
    (a) => symbols.size === 0 || symbols.has(a.ticker.toUpperCase())
  );

  if (filtered.length === 0) {
    return {
      existing: [],
      upcoming: [],
      history: [],
      pinned: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noAlerts,
    };
  }

  const existing: WatchlistAlertItem[] = [];
  const upcoming: WatchlistAlertItem[] = [];
  const history: WatchlistAlertItem[] = [];
  const pinnedItems: WatchlistAlertItem[] = [];

  for (const alert of filtered) {
    const status = alertStatus(alert.id, alert);
    const item = toItem(alert, status);
    if (status === "pinned") pinnedItems.push(item);
    else if (status === "dismissed" || status === "snoozed") history.push(item);
    else if (status === "upcoming") upcoming.push(item);
    else existing.push(item);
  }

  return {
    existing,
    upcoming,
    history,
    pinned: pinnedItems,
    empty: false,
    emptyMessage: WORKSPACE_EMPTY.noAlerts,
  };
}

export function dismissWatchlistAlert(
  alertId: string,
  context?: WatchlistWorkspaceContext | null
): boolean {
  const id = safeWorkspaceText(alertId, "");
  if (!id) return false;
  dismissed.add(id);
  dismissAlert(id);
  recordTimelineEvent({
    watchlistId: safeWorkspaceText(context?.watchlistId, "watchlist"),
    kind: "alert_triggered",
    summary: `Dismissed alert ${id}`,
    actor: "analyst",
    now: context?.now,
  });
  return true;
}

export function snoozeWatchlistAlert(
  alertId: string,
  until?: Date | null,
  context?: WatchlistWorkspaceContext | null
): boolean {
  const id = safeWorkspaceText(alertId, "");
  if (!id) return false;
  const snoozeUntil = until ?? new Date(Date.now() + 3_600_000);
  snoozed.set(id, snoozeUntil.toISOString());
  try {
    getAlertCenter().performAction(id, "snooze", {
      snoozeUntil: snoozeUntil,
      now: context?.now ?? undefined,
    });
  } catch {
    /* compose only */
  }
  return true;
}

export function pinWatchlistAlert(
  alertId: string,
  context?: WatchlistWorkspaceContext | null
): boolean {
  const id = safeWorkspaceText(alertId, "");
  if (!id) return false;
  pinned.add(id);
  try {
    getAlertCenter().performAction(id, "pin", { now: context?.now ?? undefined });
  } catch {
    /* compose only */
  }
  return true;
}

export function resetWatchlistAlertBridge(): void {
  dismissed.clear();
  snoozed.clear();
  pinned.clear();
}
