/**
 * Executive screener presentation utilities (Sprint 9D.R8).
 * Safe labels / cards — never surfaces null, undefined, or NaN.
 */

import {
  EXECUTIVE_SCREENER_EMPTY,
  formatCount,
  formatPct,
  formatScore,
  safeExecutiveScreenerText,
  safeNumeric,
  type ExecutiveSummaryCard,
} from "./ExecutiveScreenerModels";

export function presentCountCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id: safeExecutiveScreenerText(id, "card"),
    label: safeExecutiveScreenerText(label, "Metric"),
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
    id: safeExecutiveScreenerText(id, "card"),
    label: safeExecutiveScreenerText(label, "Confidence"),
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
    id: safeExecutiveScreenerText(id, "card"),
    label: safeExecutiveScreenerText(label, "Health"),
    value: Number.isFinite(value) && value > 0 ? formatScore(numeric) : "—",
    numeric,
  };
}

export function presentEmptyOrValue(
  empty: boolean,
  value: string,
  emptyMessage: string = EXECUTIVE_SCREENER_EMPTY.awaitingScan
): string {
  if (empty) {
    return safeExecutiveScreenerText(
      emptyMessage,
      EXECUTIVE_SCREENER_EMPTY.awaitingScan
    );
  }
  return safeExecutiveScreenerText(value, emptyMessage);
}

export function assertNoSentinel(text: string): string {
  const t = safeExecutiveScreenerText(text, "—");
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
