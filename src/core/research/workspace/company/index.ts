/**
 * Company Research Workspace — public exports (Sprint 10A.R3).
 */

export {
  COMPANY_WORKSPACE_EMPTY,
  COMPANY_PANEL_IDS,
  COMPANY_PANEL_LABELS,
  COMPANY_TIMEFRAMES,
  COMPANY_PERIODS,
  QUICK_ACTION_IDS,
  emptySnapshot,
  normalizeSnapshot,
  defaultSyncContext,
  formatMetric,
  metricRow,
  sectionBlock,
} from "./CompanyWorkspaceModels";
export type {
  CompanyWorkspaceEmptyMessage,
  CompanyPanelId,
  CompanyTimeframe,
  CompanyPeriod,
  CompanyQuickActionId,
  CompanyWorkspaceSnapshot,
  CompanySyncContext,
  CompanyMetricRow,
  CompanySectionBlock,
  CompanyPanelView,
  CompanyQuickAction,
  CompanyOverviewView,
  CompanyWorkspaceView,
} from "./CompanyWorkspaceModels";

export {
  defaultCompanyLayout,
  ensureCompanyLayout,
  getCompanyLayout,
  toggleCompanyPanel,
  toggleCompanySection,
  reorderCompanyPanels,
  companyPanelLabel,
  resetCompanyLayouts,
  CompanyWorkspaceLayout,
} from "./CompanyWorkspaceLayout";
export type { CompanyLayoutState } from "./CompanyWorkspaceLayout";

export {
  buildCompanyOverview,
  buildOverviewPanel,
  CompanyOverviewPanel,
} from "./CompanyOverviewPanel";

export {
  buildFinancialAnalysisPanel,
  FinancialAnalysisPanel,
} from "./FinancialAnalysisPanel";

export {
  buildTechnicalAnalysisPanel,
  TechnicalAnalysisPanel,
} from "./TechnicalAnalysisPanel";

export { buildValuationPanel, ValuationPanel } from "./ValuationPanel";

export {
  buildBusinessQualityPanel,
  BusinessQualityPanel,
} from "./BusinessQualityPanel";

export {
  buildRiskAnalysisPanel,
  RiskAnalysisPanel,
} from "./RiskAnalysisPanel";

export {
  buildResearchInsightsPanel,
  ResearchInsightsPanel,
} from "./ResearchInsightsPanel";

export {
  openCompanyWorkspace,
  refreshCompanyWorkspace,
  getCompanyOverview,
  getResearchPanels,
  syncWorkspacePanels,
  getCompanyWorkspaceView,
  pinCompanyWorkspace,
  favoriteCompanyWorkspace,
  setCompanyPanelExpanded,
  getQuickAction,
  buildQuickActions,
  emptyCompanyWorkspaceView,
  resetCompanyWorkspace,
  CompanyWorkspaceEngine,
} from "./CompanyWorkspaceEngine";
