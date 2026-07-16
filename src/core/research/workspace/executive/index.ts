/**
 * Executive Research Hub — public exports (Sprint 10A.R8).
 */

export {
  EXECUTIVE_RESEARCH_EMPTY,
  EXECUTIVE_RESEARCH_QUICK_ACTIONS,
  EXECUTIVE_RESEARCH_QUICK_ACTION_LABELS,
  RESEARCH_WORKSPACE_STATUS,
  safeNumeric,
  safePct,
  formatCount,
  formatPct,
  formatScore,
  safeExecutiveResearchText,
  assertNoSentinel,
} from "./ExecutiveResearchModels";
export type {
  ExecutiveResearchEmptyMessage,
  ExecutiveResearchQuickAction,
  ExecutiveSummaryCard,
  RankedResearchItem,
  ResearchLayerHealth,
  ExecutiveResearchHealthView,
  ExecutiveResearchOverview,
  ExecutiveResearchDashboardSummary,
  ExecutiveReportSection,
  ExecutiveResearchReportView,
  HomeResearchStrip,
  ExecutiveResearchDashboardView,
  ExecutiveResearchMetricBundle,
} from "./ExecutiveResearchModels";

export {
  ExecutiveResearchMetrics,
} from "./ExecutiveResearchMetrics";
export type { ExecutiveMetricsComposeInput } from "./ExecutiveResearchMetrics";

export {
  ExecutiveResearchHealth,
} from "./ExecutiveResearchHealth";
export type { ExecutiveHealthComposeInput } from "./ExecutiveResearchHealth";

export {
  ExecutiveResearchOverview,
} from "./ExecutiveResearchOverview";

export {
  ExecutiveResearchPresentation,
} from "./ExecutiveResearchPresentation";
export type {
  ExecutiveResearchExportResult,
  ExecutivePresentationInput,
} from "./ExecutiveResearchPresentation";

export {
  ExecutiveResearchHub,
  getExecutiveResearchHub,
  resetExecutiveResearchHub,
  getExecutiveResearchOverview,
  getExecutiveResearchMetrics,
  getExecutiveResearchHealth,
  getExecutiveResearchSummary,
  exportExecutiveResearchReport,
  resetExecutiveResearchStack,
  isSprint10AFrozen,
} from "./ExecutiveResearchHub";
export type { ExecutiveResearchHubOptions } from "./ExecutiveResearchHub";
