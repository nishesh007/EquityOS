/**
 * Executive alert presentation utilities (Sprint 9C.R8).
 * Safe labels / cards — never surfaces null, undefined, or NaN.
 */

import type { CenterAlert } from "../center/AlertCenterModels";
import {
  EXECUTIVE_EMPTY,
  formatCount,
  formatPct,
  formatScore,
  safeExecutiveText,
  safeNumeric,
  type ExecutiveSummaryCard,
} from "./AlertExecutiveModels";

export function presentSummaryCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id: safeExecutiveText(id, "card"),
    label: safeExecutiveText(label, "Metric"),
    value: formatCount(numeric),
    numeric,
  };
}

export function presentConfidenceCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id: safeExecutiveText(id, "card"),
    label: safeExecutiveText(label, "Confidence"),
    value: Number.isFinite(value) && value > 0 ? formatPct(numeric) : "—",
    numeric,
  };
}

export function presentHealthCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id: safeExecutiveText(id, "card"),
    label: safeExecutiveText(label, "Health"),
    value: formatScore(numeric),
    numeric,
  };
}

export function presentAlertHeadline(item: CenterAlert | null | undefined): string {
  if (!item) return EXECUTIVE_EMPTY.noAlerts;
  const title = safeExecutiveText(item.alert.title, "Alert");
  const company = safeExecutiveText(
    item.alert.company,
    item.alert.ticker || "Unknown"
  );
  return `${company}: ${title}`;
}

export function presentPriorityLabel(
  item: CenterAlert | null | undefined
): string {
  if (!item) return "—";
  return safeExecutiveText(item.alert.priority, "Medium");
}

export function presentEmptyOrValue(
  empty: boolean,
  value: string,
  emptyMessage: string = EXECUTIVE_EMPTY.noAlerts
): string {
  if (empty) return safeExecutiveText(emptyMessage, EXECUTIVE_EMPTY.noAlerts);
  return safeExecutiveText(value, emptyMessage);
}

export function assertNoSentinel(text: string): string {
  const t = safeExecutiveText(text, "—");
  if (
    t === "null" ||
    t === "undefined" ||
    t === "NaN" ||
    t.toLowerCase() === "nan"
  ) {
    return "—";
  }
  return t;
}
