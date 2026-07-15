/**
 * Alert presenter — empty-safe card / inbox views + priority scoring.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import { buildEarningsCountdown } from "@/src/core/earnings/calendar";
import type { EarningsScorecard } from "@/src/core/earnings/dashboard";
import { kindLabel } from "./EarningsAlertRules";
import type {
  AlertCardView,
  AlertPriority,
  AlertTone,
  EarningsAlert,
  EarningsAlertKind,
  NotificationCenterView,
} from "./EarningsAlertModels";
import { ALERT_EMPTY } from "./EarningsAlertModels";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function resolveAlertPriority(
  kind: EarningsAlertKind,
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard
): AlertPriority {
  if (
    kind === "major_miss" ||
    kind === "one_hour_before" ||
    (event.inPortfolio && kind === "today_reminder")
  ) {
    return "Critical";
  }
  if (
    kind === "major_beat" ||
    kind === "guidance_cut" ||
    kind === "guidance_raised" ||
    kind === "high_conviction_earnings" ||
    kind === "portfolio_company_earnings" ||
    kind === "results_published"
  ) {
    return "High";
  }
  if (
    kind === "tomorrow_reminder" ||
    kind === "watchlist_company_earnings" ||
    kind === "high_volatility" ||
    kind === "transcript_available"
  ) {
    return "Medium";
  }
  return "Low";
}

export function resolveAlertTone(
  kind: EarningsAlertKind,
  priority: AlertPriority
): AlertTone {
  if (kind === "major_beat" || kind === "guidance_raised") return "excellent";
  if (kind === "major_miss" || kind === "guidance_cut") return "critical";
  if (priority === "Critical") return "critical";
  if (priority === "High") return "caution";
  if (priority === "Medium") return "healthy";
  return "neutral";
}

export function buildEarningsAlert(input: {
  kind: EarningsAlertKind;
  event: EarningsCalendarEvent;
  scorecard: EarningsScorecard;
  now?: Date;
  read?: boolean;
  status?: EarningsAlert["status"];
  snoozeUntil?: string | null;
}): EarningsAlert {
  const now = input.now ?? new Date();
  const countdown = buildEarningsCountdown(
    input.event.resultDate,
    input.event.resultTime,
    now
  );
  const priority = resolveAlertPriority(
    input.kind,
    input.event,
    input.scorecard
  );
  const label = kindLabel(input.kind);
  const id = `${input.kind}::${input.event.ticker}::${input.event.resultDate}`;

  return {
    id,
    source: "Earnings",
    kind: input.kind,
    title: `${input.event.ticker} · ${label}`,
    detail: `${input.event.companyName} · ${input.event.quarter} ${input.event.financialYear} · ${countdown.label}`,
    tone: resolveAlertTone(input.kind, priority),
    createdAt: now.toISOString(),
    status: input.status ?? "active",
    snoozeUntil: input.snoozeUntil ?? null,
    category: `earnings.${input.kind}`,
    href: `/company/${input.event.ticker}`,
    read: input.read ?? false,
    priority,
    ticker: input.event.ticker,
    companyName: input.event.companyName,
    resultDate: input.event.resultDate,
    resultTime: input.event.resultTime,
    inPortfolio: input.event.inPortfolio,
    inWatchlist: input.event.inWatchlist,
    highConviction: input.event.highConviction,
    countdownLabel: countdown.label,
    aiOutlook: safeText(input.scorecard.outlook, "Neutral"),
    aiConfidence: input.scorecard.available
      ? String(input.scorecard.aiConfidence)
      : "—",
    beatProbability: input.scorecard.available
      ? String(input.scorecard.beatProbability)
      : "—",
    expectedVolatility: String(input.scorecard.expectedVolatilityScore),
    expectedImpact: input.scorecard.attentionLevel,
    portfolioImpact: input.event.inPortfolio
      ? String(input.scorecard.portfolioImpact)
      : "—",
    watchlistImpact: input.event.inWatchlist
      ? String(input.scorecard.watchlistImpact)
      : "—",
    institutionalImportance: String(input.scorecard.institutionalScore),
    timeRemaining: countdown.label,
  };
}

export function toAlertCardView(alert: EarningsAlert): AlertCardView {
  return {
    id: alert.id,
    company: safeText(alert.companyName, alert.ticker),
    ticker: safeText(alert.ticker, "—"),
    event: kindLabel(alert.kind),
    timeRemaining: safeText(alert.timeRemaining, "—"),
    aiOutlook: safeText(alert.aiOutlook, "Neutral"),
    confidence: safeText(alert.aiConfidence, "—"),
    beatProbability: safeText(alert.beatProbability, "—"),
    expectedVolatility: safeText(alert.expectedVolatility, "—"),
    portfolioExposure: alert.inPortfolio
      ? safeText(alert.portfolioImpact, "Portfolio")
      : "—",
    priority: alert.priority,
    kindLabel: kindLabel(alert.kind),
    href: alert.href,
    read: alert.read,
    status: alert.status,
    badges: [
      alert.priority,
      alert.aiOutlook,
      ...(alert.inPortfolio ? ["Portfolio"] : []),
      ...(alert.inWatchlist ? ["Watchlist"] : []),
      ...(alert.highConviction ? ["High Conviction"] : []),
    ],
    ready: true,
    emptyMessage: "",
  };
}

export function buildNotificationCenterView(
  alerts: readonly EarningsAlert[]
): NotificationCenterView {
  const cards = alerts.map(toAlertCardView);
  const active = alerts.filter(
    (a) => a.status === "active" || a.status === "snoozed"
  );
  const today = alerts.filter(
    (a) =>
      a.status === "active" &&
      (a.kind === "today_reminder" || a.countdownLabel === "Today")
  );
  const tomorrow = alerts.filter(
    (a) =>
      a.status === "active" &&
      (a.kind === "tomorrow_reminder" || a.countdownLabel === "Tomorrow")
  );
  const upcoming = alerts.filter(
    (a) =>
      a.status === "active" &&
      a.kind !== "results_published" &&
      a.kind !== "transcript_available"
  );
  const portfolio = alerts.filter(
    (a) => a.status === "active" && a.inPortfolio
  );
  const watchlist = alerts.filter(
    (a) => a.status === "active" && a.inWatchlist
  );
  const completed = alerts.filter((a) => a.status === "completed");
  const dismissed = alerts.filter((a) => a.status === "dismissed");
  const unread = alerts.filter((a) => a.status === "active" && !a.read);

  const empty = active.length === 0;
  return {
    today: today.map(toAlertCardView),
    tomorrow: tomorrow.map(toAlertCardView),
    upcoming: upcoming.map(toAlertCardView),
    portfolio: portfolio.map(toAlertCardView),
    watchlist: watchlist.map(toAlertCardView),
    completed: completed.map(toAlertCardView),
    dismissed: dismissed.map(toAlertCardView),
    unread: unread.map(toAlertCardView),
    unreadCount: unread.length,
    empty,
    emptyMessage: empty ? ALERT_EMPTY.noActive : "",
  };
}

export function toExecutiveAlertShape(alert: EarningsAlert): {
  id: string;
  source: "Earnings";
  title: string;
  detail: string;
  tone: "excellent" | "healthy" | "caution" | "critical" | "neutral";
} {
  return {
    id: alert.id,
    source: "Earnings",
    title: alert.title,
    detail: alert.detail,
    tone: alert.tone,
  };
}
