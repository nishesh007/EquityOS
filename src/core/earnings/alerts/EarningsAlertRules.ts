/**
 * Pure alert rule predicates — no I/O; Sprint 9C can reuse kind taxonomy.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import {
  buildEarningsCountdown,
  daysUntilResult,
} from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";
import type { EarningsAlertKind, ReminderRuleId } from "./EarningsAlertModels";

export interface AlertRuleContext {
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  now: Date;
  postOutcome?: string | null;
  guidanceChange?: string | null;
}

export function alertId(kind: EarningsAlertKind, event: EarningsCalendarEvent): string {
  return `${kind}::${event.ticker}::${event.resultDate}`;
}

export function kindLabel(kind: EarningsAlertKind): string {
  switch (kind) {
    case "upcoming_earnings":
      return "Upcoming Earnings";
    case "today_reminder":
      return "Today Reminder";
    case "tomorrow_reminder":
      return "Tomorrow Reminder";
    case "one_hour_before":
      return "1 Hour Before Earnings";
    case "results_published":
      return "Results Published";
    case "transcript_available":
      return "Transcript Available";
    case "guidance_raised":
      return "Guidance Raised";
    case "guidance_cut":
      return "Guidance Cut";
    case "major_beat":
      return "Major Beat";
    case "major_miss":
      return "Major Miss";
    case "high_volatility":
      return "High Volatility";
    case "portfolio_company_earnings":
      return "Portfolio Company Earnings";
    case "watchlist_company_earnings":
      return "Watchlist Company Earnings";
    case "high_conviction_earnings":
      return "High Conviction Earnings";
    default:
      return "Earnings Alert";
  }
}

/** Approximate hours until result using IST day + optional result time. */
export function hoursUntilResult(
  resultDate: string,
  resultTime: string | null,
  now: Date
): number | null {
  const days = daysUntilResult(resultDate, now);
  if (days == null) return null;
  if (days > 1) return days * 24;
  if (days < 0) return days * 24;

  const countdown = buildEarningsCountdown(resultDate, resultTime, now);
  if (countdown.hoursRemaining != null) return countdown.hoursRemaining;
  if (countdown.minutesRemaining != null) {
    return countdown.minutesRemaining / 60;
  }
  if (days === 0) return 6;
  if (days === 1) return 24;
  return days * 24;
}

export function matchesReminderRule(
  ctx: AlertRuleContext,
  rule: ReminderRuleId
): boolean {
  const hours = hoursUntilResult(
    ctx.event.resultDate,
    ctx.event.resultTime,
    ctx.now
  );
  const countdown = buildEarningsCountdown(
    ctx.event.resultDate,
    ctx.event.resultTime,
    ctx.now
  );

  switch (rule) {
    case "24h":
      return hours != null && hours > 12 && hours <= 24;
    case "12h":
      return hours != null && hours > 4 && hours <= 12;
    case "4h":
      return hours != null && hours > 1 && hours <= 4;
    case "1h":
      return (
        countdown.status === "hours" ||
        countdown.status === "minutes" ||
        (hours != null && hours > 0 && hours <= 1)
      );
    case "results_released":
      return countdown.isReleased || ctx.scorecard.resultsReleased;
    case "transcript_published":
      return ctx.scorecard.transcriptAvailable;
    default:
      return false;
  }
}

export function evaluateAlertKinds(ctx: AlertRuleContext): EarningsAlertKind[] {
  const kinds: EarningsAlertKind[] = [];
  const countdown = buildEarningsCountdown(
    ctx.event.resultDate,
    ctx.event.resultTime,
    ctx.now
  );
  const days = countdown.daysRemaining;

  if (countdown.isUpcoming) {
    kinds.push("upcoming_earnings");
    if (days === 0) kinds.push("today_reminder");
    if (days === 1) kinds.push("tomorrow_reminder");
    if (matchesReminderRule(ctx, "1h")) kinds.push("one_hour_before");
    if (ctx.event.inPortfolio) kinds.push("portfolio_company_earnings");
    if (ctx.event.inWatchlist) kinds.push("watchlist_company_earnings");
    if (ctx.event.highConviction || ctx.scorecard.aiConfidence >= 70) {
      kinds.push("high_conviction_earnings");
    }
    if (ctx.scorecard.expectedVolatilityScore >= 70) {
      kinds.push("high_volatility");
    }
  }

  if (countdown.isReleased || ctx.scorecard.resultsReleased) {
    kinds.push("results_published");
    if (ctx.scorecard.transcriptAvailable) kinds.push("transcript_available");
    if (
      ctx.guidanceChange === "Upgrade" ||
      ctx.guidanceChange === "Raised"
    ) {
      kinds.push("guidance_raised");
    }
    if (
      ctx.guidanceChange === "Downgrade" ||
      ctx.guidanceChange === "Cut"
    ) {
      kinds.push("guidance_cut");
    }
    if (ctx.postOutcome === "Strong Beat") kinds.push("major_beat");
    if (ctx.postOutcome === "Major Miss") kinds.push("major_miss");
    if (ctx.event.inPortfolio) kinds.push("portfolio_company_earnings");
    if (ctx.event.inWatchlist) kinds.push("watchlist_company_earnings");
  }

  return [...new Set(kinds)];
}
