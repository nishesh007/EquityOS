/**
 * Registry of exportable institutional report types (Prompt 9F.R1).
 * Resolves InstitutionalReport via the existing Reporting Engine — no duplicated generation.
 */

import type { InstitutionalReport } from "../ReportBuilder";
import type { ReportType } from "../ReportConfiguration";
import type { GenerateReportOptions } from "../ValidationReportingEngine";
import {
  getValidationReportingEngine,
  registerValidationReportingEngine,
} from "../ValidationReportingEngine";

export type SupportedExportReportType =
  | "ValidationReport"
  | "TrustReport"
  | "AnalyticsReport"
  | "ComplianceReport"
  | "AuditReport"
  | "KnowledgeReport"
  | "PlatformHealthReport"
  | "DailyMarketReport"
  | "TomorrowWatchlistReport"
  | "PortfolioValidationReport";

export interface ExportReportDefinition {
  reportType: SupportedExportReportType;
  title: string;
  description: string;
  /** Maps to Reporting Engine reportType (reuses models). */
  reportingEngineType: ReportType;
}

const DEFINITIONS: ExportReportDefinition[] = [
  {
    reportType: "ValidationReport",
    title: "Institutional Validation Report",
    description: "Validation scores, module health, and integrity summary.",
    reportingEngineType: "ValidationReport",
  },
  {
    reportType: "TrustReport",
    title: "Institutional Trust Report",
    description: "Trust classifications and rejected-object analytics.",
    reportingEngineType: "TrustReport",
  },
  {
    reportType: "AnalyticsReport",
    title: "Validation Analytics Report",
    description: "Trends, distributions, and predictive analytics.",
    reportingEngineType: "AnalyticsReport",
  },
  {
    reportType: "ComplianceReport",
    title: "Institutional Compliance Report",
    description: "Compliance coverage and governance gaps.",
    reportingEngineType: "CustomReport",
  },
  {
    reportType: "AuditReport",
    title: "Validation Audit Report",
    description: "Audit trail and configuration provenance.",
    reportingEngineType: "AuditReport",
  },
  {
    reportType: "KnowledgeReport",
    title: "Institutional Knowledge Report",
    description: "Knowledge graph and research knowledge summary.",
    reportingEngineType: "CustomReport",
  },
  {
    reportType: "PlatformHealthReport",
    title: "Platform Health Report",
    description: "Platform-wide validation and operational health.",
    reportingEngineType: "DashboardReport",
  },
  {
    reportType: "DailyMarketReport",
    title: "Daily Market Report",
    description: "Daily market summary with validation overlay.",
    reportingEngineType: "CustomReport",
  },
  {
    reportType: "TomorrowWatchlistReport",
    title: "Tomorrow Watchlist Report",
    description: "Next-session watchlist with opportunity validation.",
    reportingEngineType: "RecommendationReport",
  },
  {
    reportType: "PortfolioValidationReport",
    title: "Portfolio Validation Report",
    description: "Portfolio-level validation and risk summary.",
    reportingEngineType: "TradeValidationReport",
  },
];

export class ExportRegistry {
  private readonly byType = new Map<string, ExportReportDefinition>();

  constructor() {
    for (const def of DEFINITIONS) {
      this.byType.set(def.reportType, def);
    }
  }

  list(): ExportReportDefinition[] {
    return [...this.byType.values()];
  }

  get(reportType: string): ExportReportDefinition | undefined {
    return this.byType.get(reportType);
  }

  isSupported(reportType: string): boolean {
    return this.byType.has(reportType);
  }

  register(
    definition: ExportReportDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    if (this.byType.has(definition.reportType) && !options?.force) {
      return { registered: false, skipped: true };
    }
    this.byType.set(definition.reportType, definition);
    return { registered: true, skipped: false };
  }

  /**
   * Resolve an InstitutionalReport for export.
   * Prefers a provided report model; otherwise generates via Reporting Engine.
   */
  resolveReport(options: {
    reportType: SupportedExportReportType | string;
    report?: InstitutionalReport;
    generateOptions?: Omit<GenerateReportOptions, "reportType">;
  }): InstitutionalReport {
    if (options.report) {
      return options.report;
    }
    const def = this.get(options.reportType);
    const engineType =
      def?.reportingEngineType ?? (options.reportType as ReportType);
    registerValidationReportingEngine();
    const report = getValidationReportingEngine().generateReport({
      ...(options.generateOptions ?? {}),
      reportType: engineType,
    });
    // Preserve requested export type label when mapped through CustomReport etc.
    if (def && report.reportType !== def.reportType) {
      return {
        ...report,
        reportType: def.reportType,
        title: def.title,
      };
    }
    return report;
  }
}

export function listSupportedExportReports(): ExportReportDefinition[] {
  return new ExportRegistry().list();
}
