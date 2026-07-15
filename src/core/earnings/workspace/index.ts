/**
 * Institutional Earnings Workspace — public exports (Sprint 9B.R7).
 */

export type {
  PortfolioImpactDirection,
  DecisionRecommendation,
  WorkspaceActionId,
  HoldingWeightInput,
  WorkspaceContext,
  PortfolioImpactRow,
  PortfolioImpactView,
  WatchlistImpactRow,
  WatchlistImpactView,
  DecisionSummary,
  EarningsReportSection,
  InstitutionalEarningsReportView,
  WorkspaceActionResult,
  EarningsWorkspaceView,
} from "./WorkspaceModels";

export { WORKSPACE_EMPTY } from "./WorkspaceModels";

export {
  PortfolioImpactEngine,
  getPortfolioImpactEngine,
  resetPortfolioImpactEngine,
  getPortfolioImpact,
  resolveImpactDirection,
  buildPortfolioImpactRow,
  formatWeight,
  formatCurrency,
} from "./PortfolioImpactEngine";

export {
  WatchlistImpactEngine,
  getWatchlistImpactEngine,
  resetWatchlistImpactEngine,
  getWatchlistImpact,
} from "./WatchlistImpactEngine";

export {
  EarningsDecisionEngine,
  getEarningsDecisionEngine,
  resetEarningsDecisionEngine,
  resolveRecommendation,
  buildDecisionReasoning,
  getDecisionSummary as buildDecisionSummary,
} from "./EarningsDecisionEngine";

export {
  buildEarningsReportSections,
  buildInstitutionalEarningsReport,
  exportInstitutionalEarningsReport,
} from "./InstitutionalEarningsReport";

export {
  presentPortfolioRow,
  presentWatchlistRow,
  presentDecision,
  presentReport,
  buildWorkspaceView,
  applyWorkspaceAction,
} from "./EarningsWorkspacePresenter";

export {
  EarningsWorkspaceEngine,
  getEarningsWorkspaceEngine,
  resetEarningsWorkspaceEngine,
  getWorkspace,
  generateInstitutionalReport,
  getDecisionSummaryForTicker,
} from "./EarningsWorkspaceEngine";

/** Public API — getDecisionSummary() */
export { getDecisionSummaryForTicker as getDecisionSummary } from "./EarningsWorkspaceEngine";
