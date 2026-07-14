/**
 * Institutional Report Export Center — public exports (Prompt 9F.R1).
 */

export {
  DEFAULT_EXPORT_CONFIGURATION,
  resolveExportConfiguration,
} from "./ExportConfiguration";

export type {
  ExportableFormat,
  ExportEnvironment,
  SubscriptionTier,
  ExportUserRole,
  ExportVersionInfo,
  ExportConfiguration,
  ExportConfigurationInput,
} from "./ExportConfiguration";

export { ExportMetricsTracker } from "./ExportMetrics";
export type { ExportOperationalMetrics } from "./ExportMetrics";

export { ExportAuditLogger } from "./ExportAuditLogger";
export type { ExportAuditEntry } from "./ExportAuditLogger";

export { ExportAccessControl } from "./ExportAccessControl";
export type {
  ExportAccessSubject,
  ExportPermissionResult,
} from "./ExportAccessControl";

export {
  ExportRegistry,
  listSupportedExportReports,
} from "./ExportRegistry";
export type {
  SupportedExportReportType,
  ExportReportDefinition,
} from "./ExportRegistry";

export {
  buildExportDocument,
  buildExportMetadata,
} from "./ExportDocument";
export type {
  ExportReportMetadata,
  ExportDocumentSection,
  ExportDocument,
} from "./ExportDocument";

export { PDFExporter } from "./PDFExporter";
export type { PdfExportResult } from "./PDFExporter";

export { ExcelExporter } from "./ExcelExporter";
export type { ExcelExportResult } from "./ExcelExporter";

export { MarkdownExporter } from "./MarkdownExporter";
export type { MarkdownExportResult } from "./MarkdownExporter";

export { PrintExporter } from "./PrintExporter";
export type { PrintExportResult } from "./PrintExporter";

export { ReportExportEngine } from "./ReportExportEngine";
export type {
  ExportRequestOptions,
  ExportDeniedResult,
  ExportSuccessResult,
  ExportResult,
} from "./ReportExportEngine";

export {
  getReportExportEngine,
  registerReportExportEngine,
  resetReportExportEngine,
  exportPDF,
  exportExcel,
  exportMarkdown,
  printReport,
  canUserExport,
  getExportMetrics,
  getExportAuditLog,
  getExportVisibleActions,
} from "./ExportFacade";

export type { ExportRegistrationResult } from "./ExportFacade";
