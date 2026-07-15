/**
 * Alert Conflict Engine — detect opposing bullish/bearish signals (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  safeLabel,
  type AlertConflictResult,
} from "./AlertDecisionModels";

function polarity(alert: InstitutionalAlert): "bullish" | "bearish" | "neutral" {
  const hay = `${alert.metadata.eventType} ${alert.title} ${alert.reason}`.toLowerCase();
  const bull =
    /beat|breakout|upgrade|raised|growth|strong|golden|bullish|buy|leadership|improved|expansion/.test(
      hay
    );
  const bear =
    /miss|breakdown|downgrade|lower|death|bearish|weak|risk|fail|reject|compression|decline|overbought|oversold/.test(
      hay
    );
  // Oversold can be bullish reversal — treat weak/miss/death as bearish only
  if (bear && !bull) return "bearish";
  if (bull && !bear) return "bullish";
  if (bull && bear) return "neutral";
  return "neutral";
}

export function detectAlertConflicts(
  alerts: readonly InstitutionalAlert[],
  focus?: InstitutionalAlert
): AlertConflictResult {
  if (!alerts.length) {
    return {
      hasConflict: false,
      conflictReason: DECISION_SUPPORT_EMPTY.conflictUnavailable,
      confidencePenalty: 0,
      dominantSignal: "None",
      conflictingKinds: [],
      empty: true,
      emptyMessage: DECISION_SUPPORT_EMPTY.conflictUnavailable,
    };
  }

  const ticker = focus
    ? safeAlertText(focus.ticker, "").toUpperCase()
    : "";
  const pool = ticker
    ? alerts.filter(
        (a) => safeAlertText(a.ticker, "").toUpperCase() === ticker
      )
    : [...alerts];

  if (pool.length < 2) {
    return {
      hasConflict: false,
      conflictReason: "No conflicting peer alerts",
      confidencePenalty: 0,
      dominantSignal: focus
        ? safeAlertText(focus.metadata.eventType, focus.category)
        : "None",
      conflictingKinds: [],
      empty: true,
      emptyMessage: DECISION_SUPPORT_EMPTY.conflictUnavailable,
    };
  }

  const bullish = pool.filter((a) => polarity(a) === "bullish");
  const bearish = pool.filter((a) => polarity(a) === "bearish");

  if (!bullish.length || !bearish.length) {
    return {
      hasConflict: false,
      conflictReason: "Signals agree on direction",
      confidencePenalty: 0,
      dominantSignal: safeAlertText(
        (bullish[0] ?? bearish[0] ?? pool[0])?.metadata.eventType,
        "Aligned"
      ),
      conflictingKinds: [],
      empty: true,
      emptyMessage: DECISION_SUPPORT_EMPTY.conflictUnavailable,
    };
  }

  const dominant =
    bullish.length >= bearish.length ? bullish[0]! : bearish[0]!;
  const kinds = [
    ...bullish.map((a) => a.metadata.eventType),
    ...bearish.map((a) => a.metadata.eventType),
  ];

  return {
    hasConflict: true,
    conflictReason: safeLabel(
      `Bullish (${bullish.map((a) => a.metadata.eventType).join(", ")}) conflicts with bearish (${bearish.map((a) => a.metadata.eventType).join(", ")})`,
      DECISION_SUPPORT_EMPTY.conflictUnavailable
    ),
    confidencePenalty: Math.min(25, 8 + Math.min(bullish.length, bearish.length) * 5),
    dominantSignal: safeAlertText(
      dominant.metadata.eventType,
      dominant.category
    ),
    conflictingKinds: Array.from(new Set(kinds)),
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.conflictUnavailable,
  };
}

export class AlertConflictEngine {
  detect(
    alerts: readonly InstitutionalAlert[],
    focus?: InstitutionalAlert
  ): AlertConflictResult {
    return detectAlertConflicts(alerts, focus);
  }
}
