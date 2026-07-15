/**
 * Alert Search Engine — structured inbox search (Sprint 9C.R5).
 */

import { safeAlertText } from "../AlertModels";
import type { AlertSearchQuery, CenterAlert } from "./AlertCenterModels";

export function matchesAlertSearch(
  item: CenterAlert,
  query: AlertSearchQuery
): boolean {
  const alert = item.alert;
  const hay = [
    alert.title,
    alert.summary,
    alert.reason,
    alert.description,
    alert.company,
    alert.ticker,
    alert.category,
    alert.metadata.eventType,
    alert.metadata.extras.sector ?? "",
    ...alert.evidence,
  ]
    .join(" ")
    .toLowerCase();

  if (query.text) {
    const q = query.text.trim().toLowerCase();
    if (q && !hay.includes(q)) return false;
  }
  if (query.company) {
    const c = query.company.trim().toLowerCase();
    if (!safeAlertText(alert.company, "").toLowerCase().includes(c)) return false;
  }
  if (query.ticker) {
    if (
      safeAlertText(alert.ticker, "").toUpperCase() !==
      query.ticker.trim().toUpperCase()
    ) {
      return false;
    }
  }
  if (query.sector) {
    const s = query.sector.trim().toLowerCase();
    const sector = safeAlertText(alert.metadata.extras.sector, "").toLowerCase();
    if (!sector.includes(s) && !hay.includes(s)) return false;
  }
  if (query.category) {
    if (alert.category.toLowerCase() !== query.category.trim().toLowerCase()) {
      return false;
    }
  }
  if (query.alertType) {
    if (
      alert.metadata.eventType.toLowerCase() !==
      query.alertType.trim().toLowerCase()
    ) {
      return false;
    }
  }
  if (query.keywords?.length) {
    for (const kw of query.keywords) {
      if (!hay.includes(kw.toLowerCase())) return false;
    }
  }
  if (query.minConfidence != null && Number.isFinite(query.minConfidence)) {
    if (alert.confidence.score < query.minConfidence) return false;
  }
  if (query.maxConfidence != null && Number.isFinite(query.maxConfidence)) {
    if (alert.confidence.score > query.maxConfidence) return false;
  }
  if (query.severity) {
    if (alert.severity.toLowerCase() !== query.severity.trim().toLowerCase()) {
      return false;
    }
  }
  if (query.dateFrom) {
    const from = Date.parse(query.dateFrom);
    const created = Date.parse(alert.createdAt);
    if (Number.isFinite(from) && Number.isFinite(created) && created < from) {
      return false;
    }
  }
  if (query.dateTo) {
    const to = Date.parse(query.dateTo);
    const created = Date.parse(alert.createdAt);
    if (Number.isFinite(to) && Number.isFinite(created) && created > to) {
      return false;
    }
  }
  if (query.portfolioOnly && !alert.inPortfolio) return false;
  if (query.watchlistOnly && !alert.inWatchlist) return false;
  return true;
}

export class AlertSearchEngine {
  search(
    items: readonly CenterAlert[],
    query: AlertSearchQuery
  ): CenterAlert[] {
    return items.filter((item) => matchesAlertSearch(item, query));
  }
}
