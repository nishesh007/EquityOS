/**
 * Alert Executive Hub — public exports (Sprint 9C.R8).
 */

export {
  EXECUTIVE_EMPTY,
  EXECUTIVE_PANEL_LABELS,
  safeNumeric,
  safePct,
  formatCount,
  formatPct,
  formatScore,
  formatDuration,
  safeExecutiveText,
} from "./AlertExecutiveModels";
export type {
  ExecutiveEmptyMessage,
  ExecutivePanelId,
  ExecutiveSummaryCard,
  ExecutiveOverview,
  DistributionBucket,
  AlertHealthView,
  ExecutivePanel,
  RankedItem,
  ExecutiveAnalytics,
  ExecutiveTimelineEvent,
  ExecutiveTimelineView,
  HomeAlertStrip,
  ReportSectionView,
  ExecutiveReportView,
  AlertExecutiveDashboardView,
} from "./AlertExecutiveModels";

export {
  presentSummaryCard,
  presentConfidenceCard,
  presentHealthCard,
  presentAlertHeadline,
  presentPriorityLabel,
  presentEmptyOrValue,
  assertNoSentinel,
} from "./executive-alert-presentation";

export {
  AlertExecutiveMetrics,
  type AlertExecutiveMetricBundle,
} from "./AlertExecutiveMetrics";

export { AlertHealthDashboard } from "./AlertHealthDashboard";

export { AlertExecutiveSnapshot } from "./AlertExecutiveSnapshot";

export { AlertTimelinePresentation } from "./AlertTimelinePresentation";

export {
  AlertExecutiveReport,
  type ExecutiveExportResult,
} from "./AlertExecutiveReport";

export {
  AlertExecutiveDashboard,
  getAlertExecutiveDashboard,
  resetAlertExecutiveDashboard,
  getAlertExecutiveView,
  getHomeAlertStrip,
  resetExecutiveStack,
} from "./AlertExecutiveDashboard";
