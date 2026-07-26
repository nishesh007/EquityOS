export type {
  ExecutiveSummaryBlock,
  InstitutionalReport,
  ReportExportRequest,
  ReportSectionId,
  ReportTemplate,
  ReportTemplateId,
  ReportVersionMeta,
  ReportVisualAnalytics,
} from "@/lib/backtesting/reports/types";

export { REPORT_TEMPLATES } from "@/lib/backtesting/reports/types";
export {
  assembleInstitutionalReport,
  getReportTemplate,
} from "@/lib/backtesting/reports/assemble";
export { exportInstitutionalReport } from "@/lib/backtesting/reports/export";
export {
  buildEquityCurveSeries,
  buildDrawdownCurveSeries,
  buildMonthlyReturnsSeries,
  buildWinLossDistributionSeries,
  buildConvictionDistributionSeries,
} from "@/lib/backtesting/reports/visuals";
export {
  buildExecutiveSummary,
  executiveInsightsFromSummary,
} from "@/lib/backtesting/reports/executive-summary";
