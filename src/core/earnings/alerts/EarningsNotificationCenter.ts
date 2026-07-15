/**
 * Institutional notification inbox — section grouping (no push).
 */

import type {
  AlertCardView,
  AlertInboxSection,
  EarningsAlert,
  NotificationCenterView,
} from "./EarningsAlertModels";
import { ALERT_EMPTY } from "./EarningsAlertModels";
import {
  getEarningsAlertEngine,
  type EarningsAlertEngine,
} from "./EarningsAlertEngine";
import {
  buildNotificationCenterView,
  toAlertCardView,
  toExecutiveAlertShape,
} from "./EarningsAlertPresenter";

export type QuickActionId =
  | "open_research"
  | "view_earnings"
  | "view_transcript"
  | "add_to_watchlist"
  | "view_company"
  | "mark_read"
  | "dismiss"
  | "snooze";

export interface QuickActionResult {
  action: QuickActionId;
  alertId: string;
  href: string | null;
  ok: boolean;
  message: string;
}

const SNOOZE_MS = 4 * 60 * 60 * 1000;

export class EarningsNotificationCenter {
  constructor(private readonly engine: EarningsAlertEngine = getEarningsAlertEngine()) {}

  getInbox(now = new Date()): NotificationCenterView {
    const alerts = this.engine.generateAll(now);
    return buildNotificationCenterView(alerts);
  }

  getSection(
    section: AlertInboxSection,
    now = new Date()
  ): AlertCardView[] {
    const inbox = this.getInbox(now);
    return inbox[section];
  }

  getEmptyMessage(section: AlertInboxSection): string {
    switch (section) {
      case "portfolio":
        return ALERT_EMPTY.noPortfolio;
      case "watchlist":
        return ALERT_EMPTY.noWatchlist;
      case "upcoming":
      case "today":
      case "tomorrow":
        return ALERT_EMPTY.noUpcoming;
      default:
        return ALERT_EMPTY.noActive;
    }
  }

  getExecutiveAlerts(now = new Date(), limit = 8) {
    return this.engine
      .getUpcomingAlerts(now)
      .slice(0, limit)
      .map(toExecutiveAlertShape);
  }

  applyQuickAction(
    alertId: string,
    action: QuickActionId,
    now = new Date()
  ): QuickActionResult {
    const alert = this.engine.findAlert(alertId, now);
    if (!alert) {
      return {
        action,
        alertId,
        href: null,
        ok: false,
        message: "Alert unavailable",
      };
    }

    switch (action) {
      case "open_research":
        return {
          action,
          alertId,
          href: `${alert.href}?tab=research`,
          ok: true,
          message: "Open Research",
        };
      case "view_earnings":
        return {
          action,
          alertId,
          href: `${alert.href}?tab=earnings`,
          ok: true,
          message: "View Earnings",
        };
      case "view_transcript":
        return {
          action,
          alertId,
          href: `${alert.href}?tab=transcript`,
          ok: true,
          message: "View Transcript",
        };
      case "add_to_watchlist":
        return {
          action,
          alertId,
          href: null,
          ok: true,
          message: `Watchlist · ${alert.ticker}`,
        };
      case "view_company":
        return {
          action,
          alertId,
          href: alert.href,
          ok: true,
          message: "View Company",
        };
      case "mark_read":
        this.engine.markAlertRead(alertId);
        return {
          action,
          alertId,
          href: null,
          ok: true,
          message: "Marked read",
        };
      case "dismiss":
        this.engine.dismissAlert(alertId);
        return {
          action,
          alertId,
          href: null,
          ok: true,
          message: "Dismissed",
        };
      case "snooze":
        this.engine.snoozeAlert(
          alertId,
          new Date(now.getTime() + SNOOZE_MS)
        );
        return {
          action,
          alertId,
          href: null,
          ok: true,
          message: "Snoozed 4h",
        };
      default:
        return {
          action,
          alertId,
          href: null,
          ok: false,
          message: "Unknown action",
        };
    }
  }

  presentCards(alerts: readonly EarningsAlert[]): AlertCardView[] {
    return alerts.map(toAlertCardView);
  }
}

let centerSingleton: EarningsNotificationCenter | null = null;

export function getEarningsNotificationCenter(): EarningsNotificationCenter {
  if (!centerSingleton) {
    centerSingleton = new EarningsNotificationCenter();
  }
  return centerSingleton;
}

export function resetEarningsNotificationCenter(): void {
  centerSingleton = null;
}
