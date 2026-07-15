/**
 * Institutional Earnings Alerts — public exports (Sprint 9B.R6).
 */

export type {
  AlertTone,
  AlertStatus,
  AlertPriority,
  AlertInboxSection,
  EarningsAlertKind,
  ReminderRuleId,
  PlatformAlert,
  EarningsAlert,
  AlertCardView,
  NotificationCenterView,
  AlertHistoryRecord,
} from "./EarningsAlertModels";

export { ALERT_EMPTY } from "./EarningsAlertModels";

export {
  AlertHistoryStore,
  getAlertHistoryStore,
  resetAlertHistoryStore,
  getAlertHistory,
} from "./AlertHistory";

export {
  alertId,
  kindLabel,
  hoursUntilResult,
  matchesReminderRule,
  evaluateAlertKinds,
  type AlertRuleContext,
} from "./EarningsAlertRules";

export {
  collectReminderKinds,
  activeReminderRules,
} from "./EarningsReminderEngine";

export {
  resolveAlertPriority,
  resolveAlertTone,
  buildEarningsAlert,
  toAlertCardView,
  buildNotificationCenterView,
  toExecutiveAlertShape,
} from "./EarningsAlertPresenter";

export {
  EarningsAlertEngine,
  getEarningsAlertEngine,
  resetEarningsAlertEngine,
  getUpcomingAlerts,
  getPortfolioAlerts,
  getWatchlistAlerts,
  dismissAlert,
  markAlertRead,
} from "./EarningsAlertEngine";

export {
  EarningsNotificationCenter,
  getEarningsNotificationCenter,
  resetEarningsNotificationCenter,
  type QuickActionId,
  type QuickActionResult,
} from "./EarningsNotificationCenter";
