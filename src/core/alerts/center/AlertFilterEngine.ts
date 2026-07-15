/**
 * Alert Filter Engine — inbox filter presets (Sprint 9C.R5).
 */

import { safeAlertText } from "../AlertModels";
import type {
  AlertCenterFilterId,
  CenterAlert,
} from "./AlertCenterModels";

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(now: Date): Date {
  const d = startOfToday(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function matchesCenterFilter(
  item: CenterAlert,
  filter: AlertCenterFilterId,
  now = new Date()
): boolean {
  const alert = item.alert;
  const created = Date.parse(alert.createdAt);

  switch (filter) {
    case "all":
      return item.inboxStatus !== "Deleted";
    case "unread":
      return !item.read && item.inboxStatus !== "Deleted" && item.inboxStatus !== "Archived";
    case "critical":
      return alert.priority === "Critical" || alert.severity === "Critical";
    case "high":
      return alert.priority === "High";
    case "medium":
      return alert.priority === "Medium";
    case "low":
      return alert.priority === "Low" || alert.priority === "Informational";
    case "today":
      return Number.isFinite(created) && created >= startOfToday(now).getTime();
    case "this_week":
      return Number.isFinite(created) && created >= startOfWeek(now).getTime();
    case "portfolio":
      return alert.inPortfolio === true;
    case "watchlist":
      return alert.inWatchlist === true;
    case "research":
      return alert.sourceEngine === "AI Research";
    case "opportunity":
      return alert.category === "Opportunity";
    case "earnings":
      return alert.category === "Earnings" || alert.sourceEngine === "Earnings";
    case "technical":
      return alert.category === "Technical";
    case "fundamental":
      return alert.category === "Fundamental";
    case "news":
      return alert.category === "News" || alert.sourceEngine === "News";
    case "corporate_action":
      return (
        alert.category === "Corporate Action" ||
        alert.sourceEngine === "Corporate Actions"
      );
    case "market":
      return alert.sourceEngine === "Market" && alert.category !== "Technical"
        ? true
        : alert.metadata.eventType.startsWith("market_") ||
            alert.metadata.eventType.includes("vix") ||
            alert.metadata.eventType.includes("breadth") ||
            (!alert.ticker && alert.sourceEngine === "Market");
    case "sector":
      return (
        alert.metadata.eventType.startsWith("sector_") ||
        safeAlertText(alert.metadata.extras.sector, "") !== ""
      );
    case "trust":
      return alert.category === "Trust" || alert.sourceEngine === "Trust";
    case "validation":
      return alert.category === "Validation" || alert.sourceEngine === "Validation";
    case "archived":
      return item.inboxStatus === "Archived";
    case "resolved":
      return item.inboxStatus === "Resolved";
    case "expired":
      return item.inboxStatus === "Expired";
    default:
      return true;
  }
}

export class AlertFilterEngine {
  filter(
    items: readonly CenterAlert[],
    filterId: AlertCenterFilterId,
    now = new Date()
  ): CenterAlert[] {
    return items.filter((item) => matchesCenterFilter(item, filterId, now));
  }
}
