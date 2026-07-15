/**
 * Institutional Alert Center — façade (Sprint 9C.R5).
 * Bloomberg-style inbox over R1–R4 generated alerts.
 */

import { getAlerts, registerAlertEngine } from "../AlertFacade";
import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  ALERT_CENTER_EMPTY,
  defaultActionsFor,
  type AlertCenterActionId,
  type AlertCenterFilterId,
  type AlertCenterGroupBy,
  type AlertCenterView,
  type AlertDrawerView,
  type AlertSearchQuery,
  type AlertTableRow,
  type CenterAlert,
  type CenterAlertGroup,
} from "./AlertCenterModels";
import { AlertInbox } from "./AlertInbox";
import { AlertFilterEngine } from "./AlertFilterEngine";
import { AlertSearchEngine } from "./AlertSearchEngine";
import { AlertGroupingEngine } from "./AlertGroupingEngine";
import {
  AlertCenterMetricsEngine,
  type AlertCenterMetrics,
} from "./AlertMetrics";
import type { AlertCenterHistoryEntry } from "./AlertHistoryEngine";

function isToday(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const d = new Date(t);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function toRow(item: CenterAlert): AlertTableRow {
  return {
    id: item.id,
    severity: item.alert.severity,
    severityBadge: item.alert.severity,
    confidence: safeAlertText(item.alert.confidence.label, "Unavailable"),
    company: safeAlertText(item.alert.company, item.alert.ticker || "Unknown"),
    ticker: safeAlertText(item.alert.ticker, ""),
    category: item.alert.category,
    reason: safeAlertText(item.alert.reason, item.alert.summary),
    time: item.alert.createdAt,
    source: item.alert.sourceEngine,
    inboxStatus: item.inboxStatus,
    pinned: item.pinned,
    read: item.read,
    actions: defaultActionsFor(item),
  };
}

function buildSummary(items: readonly CenterAlert[], now: Date) {
  let unread = 0;
  let critical = 0;
  let today = 0;
  let portfolio = 0;
  let watchlist = 0;
  let archived = 0;
  let resolved = 0;
  for (const item of items) {
    if (item.inboxStatus === "Deleted") continue;
    if (!item.read) unread += 1;
    if (
      item.alert.priority === "Critical" ||
      item.alert.severity === "Critical"
    ) {
      critical += 1;
    }
    if (isToday(item.alert.createdAt, now)) today += 1;
    if (item.alert.inPortfolio) portfolio += 1;
    if (item.alert.inWatchlist) watchlist += 1;
    if (item.inboxStatus === "Archived") archived += 1;
    if (item.inboxStatus === "Resolved") resolved += 1;
  }
  return {
    unread,
    critical,
    today,
    portfolio,
    watchlist,
    archived,
    resolved,
    labels: {
      unread: String(unread),
      critical: String(critical),
      today: String(today),
      portfolio: String(portfolio),
      watchlist: String(watchlist),
      archived: String(archived),
      resolved: String(resolved),
    },
  };
}

export class AlertCenter {
  private readonly inbox: AlertInbox;
  private readonly filters = new AlertFilterEngine();
  private readonly searchEngine = new AlertSearchEngine();
  private readonly grouping = new AlertGroupingEngine();
  private readonly metrics = new AlertCenterMetricsEngine();

  constructor(inbox?: AlertInbox) {
    this.inbox = inbox ?? new AlertInbox();
  }

  reset(): void {
    this.inbox.clear();
  }

  /** Sync from R1 getAlerts() or explicit list. */
  syncFromEngine(alerts?: InstitutionalAlert[]): CenterAlert[] {
    registerAlertEngine();
    const source =
      alerts ??
      getAlerts({ includeTerminal: true }).alerts;
    return this.inbox.ingest(source);
  }

  ingest(alerts: readonly InstitutionalAlert[]): CenterAlert[] {
    return this.inbox.ingest(alerts);
  }

  getView(options?: {
    filter?: AlertCenterFilterId;
    search?: AlertSearchQuery;
    now?: Date;
  }): AlertCenterView {
    const now = options?.now ?? new Date();
    const filter = options?.filter ?? "all";
    let items = this.inbox.list();
    items = this.filters.filter(items, filter, now);
    if (options?.search) {
      items = this.searchEngine.search(items, options.search);
    }

    // Pinned first, then unread, then newest
    items = [...items].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.read !== b.read) return a.read ? 1 : -1;
      return Date.parse(b.alert.createdAt) - Date.parse(a.alert.createdAt);
    });

    const all = this.inbox.list();
    if (all.length === 0) {
      return {
        summary: buildSummary([], now),
        rows: [],
        total: 0,
        empty: true,
        emptyMessage: ALERT_CENTER_EMPTY.awaitingGeneration,
        filter,
      };
    }
    if (items.length === 0) {
      return {
        summary: buildSummary(all, now),
        rows: [],
        total: 0,
        empty: true,
        emptyMessage:
          filter === "unread"
            ? ALERT_CENTER_EMPTY.noUnread
            : ALERT_CENTER_EMPTY.noMatching,
        filter,
      };
    }

    return {
      summary: buildSummary(all, now),
      rows: items.map(toRow),
      total: items.length,
      empty: false,
      emptyMessage: ALERT_CENTER_EMPTY.noAlerts,
      filter,
    };
  }

  getDrawer(alertId: string): AlertDrawerView | null {
    const item = this.inbox.get(alertId);
    if (!item) return null;
    const t = item.timestamps;
    const timeline = [
      { label: "Created", at: t.created },
      { label: "First Seen", at: t.firstSeen },
      { label: "Opened", at: t.opened },
      { label: "Acknowledged", at: t.acknowledged },
      { label: "Snoozed Until", at: t.snoozedUntil },
      { label: "Resolved", at: t.resolved },
      { label: "Archived", at: t.archived },
      { label: "Expired", at: t.expired },
    ].filter((e) => e.at);

    return {
      id: item.id,
      title: safeAlertText(item.alert.title, "Alert"),
      summary: safeAlertText(item.alert.summary, item.alert.title),
      reason: safeAlertText(item.alert.reason, item.alert.summary),
      evidence: item.alert.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
      decisionTrace: item.decisionTrace.length
        ? item.decisionTrace
        : ["No decision trace"],
      relatedResearch: item.relatedResearch || "—",
      relatedOpportunity: item.relatedOpportunity || "—",
      relatedCompany: item.alert.ticker
        ? `/company?symbol=${encodeURIComponent(item.alert.ticker)}`
        : "—",
      timeline,
      severity: item.alert.severity,
      confidence: safeAlertText(item.alert.confidence.label, "Unavailable"),
      category: item.alert.category,
      source: item.alert.sourceEngine,
      inboxStatus: item.inboxStatus,
      ready: true,
      emptyMessage: ALERT_CENTER_EMPTY.noAlerts,
    };
  }

  groupBy(by: AlertCenterGroupBy): CenterAlertGroup[] {
    return this.grouping.group(this.inbox.list(), by);
  }

  search(query: AlertSearchQuery): CenterAlert[] {
    return this.searchEngine.search(this.inbox.list(), query);
  }

  getMetrics(now?: Date): AlertCenterMetrics {
    return this.metrics.compute(this.inbox.list(true), { now });
  }

  getHistory(alertId?: string): AlertCenterHistoryEntry[] {
    const hist = this.inbox.getHistory();
    return alertId ? hist.forAlert(alertId) : hist.list();
  }

  performAction(
    alertId: string,
    action: AlertCenterActionId,
    options?: { snoozeUntil?: Date; now?: Date }
  ): {
    ok: boolean;
    item: CenterAlert | null;
    copyText: string;
    href: string;
  } {
    const now = options?.now;
    let item: CenterAlert | null = null;
    let href = "";
    let copyText = "";

    switch (action) {
      case "mark_read":
        item = this.inbox.markRead(alertId, now);
        break;
      case "mark_unread":
        item = this.inbox.markUnread(alertId, now);
        break;
      case "pin":
        item = this.inbox.pin(alertId, now);
        break;
      case "unpin":
        item = this.inbox.unpin(alertId, now);
        break;
      case "snooze":
        item = this.inbox.snooze(
          alertId,
          options?.snoozeUntil ?? new Date(Date.now() + 3_600_000),
          now
        );
        break;
      case "resolve":
        item = this.inbox.resolve(alertId, now);
        break;
      case "archive":
        item = this.inbox.archive(alertId, now);
        break;
      case "restore":
        item = this.inbox.restore(alertId, now);
        break;
      case "dismiss":
        item = this.inbox.dismiss(alertId, now);
        break;
      case "copy": {
        item = this.inbox.get(alertId);
        copyText = item?.copyText ?? "";
        break;
      }
      case "open_research": {
        item = this.inbox.get(alertId);
        href = item?.relatedResearch || "/research";
        break;
      }
      case "open_opportunity": {
        item = this.inbox.get(alertId);
        href = item?.relatedOpportunity || "/opportunity";
        break;
      }
      case "open_company": {
        item = this.inbox.get(alertId);
        href = item?.alert.ticker
          ? `/company?symbol=${encodeURIComponent(item.alert.ticker)}`
          : "/company";
        break;
      }
      default:
        break;
    }

    return {
      ok: item != null,
      item,
      copyText: copyText || item?.copyText || "",
      href,
    };
  }
}

let singleton: AlertCenter | null = null;

export function getAlertCenter(): AlertCenter {
  if (!singleton) singleton = new AlertCenter();
  return singleton;
}

export function resetAlertCenter(): void {
  singleton?.reset();
  singleton = null;
}

/** Convenience APIs */
export function getAlertCenterView(options?: {
  filter?: AlertCenterFilterId;
  search?: AlertSearchQuery;
  now?: Date;
}): AlertCenterView {
  try {
    return getAlertCenter().getView(options);
  } catch {
    return {
      summary: {
        unread: 0,
        critical: 0,
        today: 0,
        portfolio: 0,
        watchlist: 0,
        archived: 0,
        resolved: 0,
        labels: {
          unread: "0",
          critical: "0",
          today: "0",
          portfolio: "0",
          watchlist: "0",
          archived: "0",
          resolved: "0",
        },
      },
      rows: [],
      total: 0,
      empty: true,
      emptyMessage: ALERT_CENTER_EMPTY.awaitingGeneration,
      filter: options?.filter ?? "all",
    };
  }
}

export function getAlertDrawer(alertId: string): AlertDrawerView | null {
  try {
    return getAlertCenter().getDrawer(alertId);
  } catch {
    return null;
  }
}
