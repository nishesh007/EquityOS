/**
 * Institutional Validation Reporting — configuration.
 * Templates, detail levels, and retention live here; no magic numbers elsewhere.
 */

export type ReportingMode = "strict" | "relaxed";

export type ReportDetailLevel = "SUMMARY" | "STANDARD" | "DETAILED" | "FULL";

export type ReportType =
  | "ValidationReport"
  | "TrustReport"
  | "IntegrityReport"
  | "RecommendationReport"
  | "TradeValidationReport"
  | "HistoricalPerformanceReport"
  | "HallucinationReport"
  | "AnalyticsReport"
  | "DashboardReport"
  | "AuditReport"
  | "CustomReport"
  | (string & {});

export type ReportSectionId =
  | "summary"
  | "moduleBreakdown"
  | "analytics"
  | "audit"
  | "warnings"
  | "errors"
  | "recommendations"
  | "filters"
  | "exportMeta";

export type ExportFormat = "JSON" | "CSV" | "EXCEL_READY" | "PDF_READY" | "MARKDOWN";

export interface ReportingConfiguration {
  mode: ReportingMode;
  engineVersion: string;
  defaultDetailLevel: ReportDetailLevel;
  defaultSections: ReportSectionId[];
  enabledExportFormats: ExportFormat[];
  snapshotRetention: number;
  maxAuditEntries: number;
  maxReportHistory: number;
  /** Sections included per report type (overridable). */
  templateSections: Record<string, ReportSectionId[]>;
  strictRequireMinimumScores: boolean;
  defaultReportingPeriodHours: number;
}

export const DEFAULT_REPORTING_CONFIGURATION: ReportingConfiguration = {
  mode: "strict",
  engineVersion: "9F.15.0",
  defaultDetailLevel: "STANDARD",
  defaultSections: [
    "summary",
    "moduleBreakdown",
    "analytics",
    "audit",
    "warnings",
    "errors",
    "recommendations",
    "filters",
  ],
  enabledExportFormats: ["JSON", "CSV", "EXCEL_READY", "PDF_READY", "MARKDOWN"],
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxReportHistory: 200,
  templateSections: {
    ValidationReport: [
      "summary",
      "moduleBreakdown",
      "warnings",
      "errors",
      "recommendations",
      "filters",
    ],
    TrustReport: ["summary", "moduleBreakdown", "analytics", "audit", "filters"],
    IntegrityReport: ["summary", "moduleBreakdown", "warnings", "errors", "filters"],
    RecommendationReport: [
      "summary",
      "moduleBreakdown",
      "analytics",
      "recommendations",
      "filters",
    ],
    TradeValidationReport: [
      "summary",
      "moduleBreakdown",
      "warnings",
      "recommendations",
      "filters",
    ],
    HistoricalPerformanceReport: [
      "summary",
      "analytics",
      "moduleBreakdown",
      "filters",
    ],
    HallucinationReport: [
      "summary",
      "moduleBreakdown",
      "warnings",
      "errors",
      "filters",
    ],
    AnalyticsReport: ["summary", "analytics", "recommendations", "filters"],
    DashboardReport: ["summary", "moduleBreakdown", "analytics", "filters"],
    AuditReport: ["summary", "audit", "warnings", "errors", "filters"],
    CustomReport: [
      "summary",
      "moduleBreakdown",
      "analytics",
      "audit",
      "warnings",
      "errors",
      "recommendations",
      "filters",
    ],
  },
  strictRequireMinimumScores: false,
  defaultReportingPeriodHours: 24,
};

export type ReportingConfigurationInput = Partial<
  Omit<ReportingConfiguration, "templateSections" | "defaultSections" | "enabledExportFormats">
> & {
  templateSections?: Record<string, ReportSectionId[]>;
  defaultSections?: ReportSectionId[];
  enabledExportFormats?: ExportFormat[];
};

export function resolveReportingConfiguration(
  input?: ReportingConfigurationInput
): ReportingConfiguration {
  return {
    ...DEFAULT_REPORTING_CONFIGURATION,
    ...input,
    defaultSections: [
      ...(input?.defaultSections ?? DEFAULT_REPORTING_CONFIGURATION.defaultSections),
    ],
    enabledExportFormats: [
      ...(input?.enabledExportFormats ??
        DEFAULT_REPORTING_CONFIGURATION.enabledExportFormats),
    ],
    templateSections: {
      ...DEFAULT_REPORTING_CONFIGURATION.templateSections,
      ...(input?.templateSections ?? {}),
    },
  };
}
