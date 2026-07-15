/**
 * Reminder engine — upcoming earnings reminder kinds only.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";
import {
  evaluateAlertKinds,
  matchesReminderRule,
  type AlertRuleContext,
} from "./EarningsAlertRules";
import type { EarningsAlertKind, ReminderRuleId } from "./EarningsAlertModels";

const REMINDER_KINDS: EarningsAlertKind[] = [
  "upcoming_earnings",
  "today_reminder",
  "tomorrow_reminder",
  "one_hour_before",
  "portfolio_company_earnings",
  "watchlist_company_earnings",
  "high_conviction_earnings",
  "high_volatility",
];

export function collectReminderKinds(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard,
  now = new Date()
): EarningsAlertKind[] {
  const ctx: AlertRuleContext = { event, scorecard, now };
  return evaluateAlertKinds(ctx).filter((kind) =>
    REMINDER_KINDS.includes(kind)
  );
}

export function activeReminderRules(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard,
  now = new Date()
): ReminderRuleId[] {
  const ctx: AlertRuleContext = { event, scorecard, now };
  const rules: ReminderRuleId[] = [
    "24h",
    "12h",
    "4h",
    "1h",
    "results_released",
    "transcript_published",
  ];
  return rules.filter((rule) => matchesReminderRule(ctx, rule));
}
