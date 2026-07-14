/**
 * Institutional Validation Reporting & Export Engine — public exports (Prompt 9F.15).
 */

export {
  DEFAULT_REPORTING_CONFIGURATION,
  resolveReportingConfiguration,
} from "./ReportConfiguration";

export type {
  ReportingMode,
  ReportDetailLevel,
  ReportType,
  ReportSectionId,
  ExportFormat,
  ReportingConfiguration,
  ReportingConfigurationInput,
} from "./ReportConfiguration";

export {
  normalizeReportFilters,
  matchesList,
  isInDateRange,
} from "./ReportFilters";

export type {
  ReportSeverityFilter,
  ReportFilters,
} from "./ReportFilters";

export type {
  ReportSummarySection,
  ReportModuleBreakdownRow,
  ReportAnalyticsSection,
  ReportAuditSection,
  ReportSections,
} from "./ReportSections";

export { ReportTemplates } from "./ReportTemplates";
export type { ReportTemplate } from "./ReportTemplates";

export { ReportBuilder, createReportId } from "./ReportBuilder";
export type {
  ReportValidationMetrics,
  ReportTrustMetrics,
  ReportAuditInformation,
  InstitutionalReport,
  ReportBuildInput,
} from "./ReportBuilder";

export { ReportAggregator } from "./ReportAggregator";
export type {
  ReportSourcePayload,
  AggregatedReportData,
} from "./ReportAggregator";

export { ReportFormatter } from "./ReportFormatter";

export { ReportExportModels } from "./ReportExportModels";
export type {
  JsonExportModel,
  CsvExportModel,
  ExcelReadyExportModel,
  PdfReadyExportModel,
  MarkdownExportModel,
  ReportExportModel,
} from "./ReportExportModels";

export {
  registerReportSource,
  getRegisteredReportSources,
  collectAllReportPayloads,
  resetReportSourceRegistrationState,
} from "./ReportRegistry";

export type {
  ReportSourceId,
  ReportSourceCollector,
  ReportSourceDefinition,
} from "./ReportRegistry";

export { ReportMetricsTracker } from "./ReportMetrics";
export type { ReportingOperationalMetrics } from "./ReportMetrics";

export { ReportAuditLogger } from "./ReportAuditLogger";
export type { ReportAuditEntry } from "./ReportAuditLogger";

export {
  createReportSnapshotId,
  compareReportSnapshots,
  ReportSnapshotStore,
} from "./ReportSnapshot";

export type {
  ReportSnapshot,
  ReportSnapshotComparison,
} from "./ReportSnapshot";

export {
  ValidationReportingEngine,
  registerValidationReportingEngine,
  getValidationReportingEngine,
  resetValidationReportingEngine,
  registerBuiltinReportSources,
  buildBuiltinReportSources,
  generateReport,
  generateValidationReport,
  generateTrustReport,
  generateAnalyticsReport,
  generateAuditReport,
  exportReportModel,
  createReportSnapshot,
} from "./ValidationReportingEngine";

export type {
  GenerateReportOptions,
  ReportingRegistrationResult,
} from "./ValidationReportingEngine";
