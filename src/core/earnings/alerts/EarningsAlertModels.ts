/**
 * Institutional Earnings Alerts — domain models (Sprint 9B.R6).
 * PlatformAlert shape is Sprint 9C-compatible.
 */

export type AlertTone = "excellent" | "healthy" | "caution" | "critical" | "neutral";

export type AlertStatus = "active" | "snoozed" | "dismissed" | "completed" | "expired";

export type AlertPriority = "Critical" | "High" | "Medium" | "Low";

export type AlertInboxSection =
  | "today"
  | "tomorrow"
  | "upcoming"
  | "portfolio"
  | "watchlist"
  | "completed"
  | "dismissed"
  | "unread";

export type EarningsAlertKind =
  | "upcoming_earnings"
  | "today_reminder"
  | "tomorrow_reminder"
  | "one_hour_before"
  | "results_published"
  | "transcript_available"
  | "guidance_raised"
  | "guidance_cut"
  | "major_beat"
  | "major_miss"
  | "high_volatility"
  | "portfolio_company_earnings"
  | "watchlist_company_earnings"
  | "high_conviction_earnings";

export type ReminderRuleId =
  | "24h"
  | "12h"
  | "4h"
  | "1h"
  | "results_released"
  | "transcript_published";

export const ALERT_EMPTY = {
  noUpcoming: "No Upcoming Alerts",
  noActive: "No Active Notifications",
  noPortfolio: "No Portfolio Alerts",
  noWatchlist: "No Watchlist Alerts",
} as const;

/** Generic platform alert — Sprint 9C aggregation ready. */
export interface PlatformAlert {
  id: string;
  source:
    | "Earnings"
    | "Portfolio"
    | "Validation"
    | "Trust"
    | "Platform"
    | "Data Quality"
    | "Export";
  title: string;
  detail: string;
  tone: AlertTone;
  createdAt: string;
  status: AlertStatus;
  snoozeUntil: string | null;
  category: string;
  href: string;
  read: boolean;
  priority: AlertPriority;
}

export interface EarningsAlert extends PlatformAlert {
  source: "Earnings";
  kind: EarningsAlertKind;
  ticker: string;
  companyName: string;
  resultDate: string;
  resultTime: string | null;
  inPortfolio: boolean;
  inWatchlist: boolean;
  highConviction: boolean;
  countdownLabel: string;
  aiOutlook: string;
  aiConfidence: string;
  beatProbability: string;
  expectedVolatility: string;
  expectedImpact: string;
  portfolioImpact: string;
  watchlistImpact: string;
  institutionalImportance: string;
  timeRemaining: string;
}

export interface AlertCardView {
  id: string;
  company: string;
  ticker: string;
  event: string;
  timeRemaining: string;
  aiOutlook: string;
  confidence: string;
  beatProbability: string;
  expectedVolatility: string;
  portfolioExposure: string;
  priority: AlertPriority;
  kindLabel: string;
  href: string;
  read: boolean;
  status: AlertStatus;
  badges: string[];
  ready: boolean;
  emptyMessage: string;
}

export interface NotificationCenterView {
  today: AlertCardView[];
  tomorrow: AlertCardView[];
  upcoming: AlertCardView[];
  portfolio: AlertCardView[];
  watchlist: AlertCardView[];
  completed: AlertCardView[];
  dismissed: AlertCardView[];
  unread: AlertCardView[];
  unreadCount: number;
  empty: boolean;
  emptyMessage: string;
}

export interface AlertHistoryRecord {
  alertId: string;
  status: AlertStatus;
  read: boolean;
  snoozeUntil: string | null;
  updatedAt: string;
}
