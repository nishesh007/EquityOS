/**
 * Alert Center Grouping Engine — inbox grouping (Sprint 9C.R5).
 * Distinct from intelligence/AlertGroupingEngine.
 */

import { safeAlertText } from "../AlertModels";
import type {
  AlertCenterGroupBy,
  CenterAlert,
  CenterAlertGroup,
} from "./AlertCenterModels";

function dateKey(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Unknown Date";
  return new Date(t).toISOString().slice(0, 10);
}

export function resolveCenterGroupKey(
  item: CenterAlert,
  by: AlertCenterGroupBy
): string {
  const alert = item.alert;
  switch (by) {
    case "company":
      return `company::${safeAlertText(alert.ticker || alert.company, "UNKNOWN").toUpperCase()}`;
    case "category":
      return `category::${alert.category}`;
    case "severity":
      return `severity::${alert.severity}`;
    case "date":
      return `date::${dateKey(alert.createdAt)}`;
    case "portfolio":
      return alert.inPortfolio ? "portfolio::yes" : "portfolio::no";
    case "watchlist":
      return alert.inWatchlist ? "watchlist::yes" : "watchlist::no";
    case "sector":
      return `sector::${safeAlertText(alert.metadata.extras.sector, "Unspecified")}`;
    case "source":
      return `source::${alert.sourceEngine}`;
    default:
      return `category::${alert.category}`;
  }
}

function labelFor(groupId: string, sample: CenterAlert): string {
  if (groupId.startsWith("company::")) {
    return safeAlertText(sample.alert.company, sample.alert.ticker || "Company");
  }
  if (groupId.startsWith("portfolio::yes")) return "Portfolio";
  if (groupId.startsWith("portfolio::no")) return "Non-Portfolio";
  if (groupId.startsWith("watchlist::yes")) return "Watchlist";
  if (groupId.startsWith("watchlist::no")) return "Non-Watchlist";
  const parts = groupId.split("::");
  return parts[1] ?? groupId;
}

export class AlertGroupingEngine {
  group(
    items: readonly CenterAlert[],
    by: AlertCenterGroupBy
  ): CenterAlertGroup[] {
    const buckets = new Map<string, CenterAlert[]>();
    for (const item of items) {
      const key = resolveCenterGroupKey(item, by);
      const list = buckets.get(key) ?? [];
      list.push(item);
      buckets.set(key, list);
    }
    return [...buckets.entries()]
      .map(([groupId, alerts]) => ({
        groupId,
        label: labelFor(groupId, alerts[0]!),
        count: alerts.length,
        alerts,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
