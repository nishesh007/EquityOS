/**
 * Institutional Alert Center — public exports (Sprint 9C.R5).
 */

export {
  ALERT_CENTER_EMPTY,
  CENTER_LIFECYCLE_STATES,
  wrapInstitutionalAlert,
  defaultActionsFor,
  emptyTimestamps,
} from "./AlertCenterModels";
export type {
  AlertCenterEmptyMessage,
  CenterLifecycleStatus,
  AlertLifecycleTimestamps,
  CenterAlert,
  AlertCenterFilterId,
  AlertCenterGroupBy,
  AlertCenterActionId,
  AlertSearchQuery,
  AlertCenterSummaryCards,
  AlertTableRow,
  AlertDrawerView,
  AlertCenterView,
  CenterAlertGroup,
} from "./AlertCenterModels";

export {
  canTransitionCenter,
  AlertLifecycleManager,
} from "./AlertLifecycleManager";

export { AlertFilterEngine, matchesCenterFilter } from "./AlertFilterEngine";
export { AlertSearchEngine, matchesAlertSearch } from "./AlertSearchEngine";
export {
  AlertGroupingEngine,
  resolveCenterGroupKey,
} from "./AlertGroupingEngine";
export { AlertArchiveEngine } from "./AlertArchiveEngine";
export { AlertHistoryEngine } from "./AlertHistoryEngine";
export type { AlertCenterHistoryEntry } from "./AlertHistoryEngine";
export { AlertCenterMetricsEngine } from "./AlertMetrics";
export type { AlertCenterMetrics } from "./AlertMetrics";
export { AlertInbox } from "./AlertInbox";

export {
  AlertCenter,
  getAlertCenter,
  resetAlertCenter,
  getAlertCenterView,
  getAlertDrawer,
} from "./AlertCenter";
