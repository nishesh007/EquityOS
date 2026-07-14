/**
 * Institutional Report Export Engine — orchestration (Prompt 9F.R1).
 * Reuses Reporting Engine models; does not regenerate validation logic.
 */

import type { InstitutionalReport } from "../ReportBuilder";
import type { GenerateReportOptions } from "../ValidationReportingEngine";
import {
  resolveExportConfiguration,
  type ExportConfiguration,
  type ExportConfigurationInput,
  type ExportableFormat,
} from "./ExportConfiguration";
import {
  ExportAccessControl,
  type ExportAccessSubject,
  type ExportPermissionResult,
} from "./ExportAccessControl";
import { ExportAuditLogger } from "./ExportAuditLogger";
import { ExportMetricsTracker } from "./ExportMetrics";
import {
  ExportRegistry,
  type SupportedExportReportType,
} from "./ExportRegistry";
import { PDFExporter, type PdfExportResult } from "./PDFExporter";
import { ExcelExporter, type ExcelExportResult } from "./ExcelExporter";
import {
  MarkdownExporter,
  type MarkdownExportResult,
} from "./MarkdownExporter";
import { PrintExporter, type PrintExportResult } from "./PrintExporter";
import { buildExportDocument } from "./ExportDocument";

export interface ExportRequestOptions {
  reportType: SupportedExportReportType | string;
  /** Prefer an existing InstitutionalReport — avoids duplicate generation. */
  report?: InstitutionalReport;
  generateOptions?: Omit<GenerateReportOptions, "reportType">;
  subject: ExportAccessSubject;
  generatedBy?: string;
}

export interface ExportDeniedResult {
  success: false;
  denied: true;
  upgradeRequired: boolean;
  previewOnly: boolean;
  reason: string;
  preview?: {
    title: string;
    subtitle: string;
    summaryLines: string[];
    message: string;
  };
  permission: ExportPermissionResult;
  executionTimeMs: number;
}

export type ExportSuccessResult<T> = {
  success: true;
  denied: false;
  artifact: T;
  permission: ExportPermissionResult;
  executionTimeMs: number;
};

export type ExportResult<T> = ExportSuccessResult<T> | ExportDeniedResult;

export class ReportExportEngine {
  private config: ExportConfiguration;
  private readonly access: ExportAccessControl;
  private readonly registry: ExportRegistry;
  private readonly metrics: ExportMetricsTracker;
  private readonly audit: ExportAuditLogger;
  private pdf: PDFExporter;
  private excel: ExcelExporter;
  private markdown: MarkdownExporter;
  private print: PrintExporter;

  constructor(configInput?: ExportConfigurationInput) {
    this.config = resolveExportConfiguration(configInput);
    this.access = new ExportAccessControl(this.config);
    this.registry = new ExportRegistry();
    this.metrics = new ExportMetricsTracker();
    this.audit = new ExportAuditLogger(this.config.maxAuditEntries);
    this.pdf = new PDFExporter(this.config);
    this.excel = new ExcelExporter(this.config);
    this.markdown = new MarkdownExporter(this.config);
    this.print = new PrintExporter(this.config);
  }

  getConfiguration(): ExportConfiguration {
    return resolveExportConfiguration(this.config);
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getRegistry(): ExportRegistry {
    return this.registry;
  }

  getAccessControl(): ExportAccessControl {
    return this.access;
  }

  canUserExport(
    subject: ExportAccessSubject,
    format: ExportableFormat
  ): ExportPermissionResult {
    return this.access.canUserExport(subject, format);
  }

  exportPDF(options: ExportRequestOptions): ExportResult<PdfExportResult> {
    return this.runExport("PDF", options, (report) =>
      this.pdf.export(report, { generatedBy: options.generatedBy })
    );
  }

  exportExcel(options: ExportRequestOptions): ExportResult<ExcelExportResult> {
    return this.runExport("EXCEL", options, (report) =>
      this.excel.export(report, { generatedBy: options.generatedBy })
    );
  }

  exportMarkdown(
    options: ExportRequestOptions
  ): ExportResult<MarkdownExportResult> {
    return this.runExport("MARKDOWN", options, (report) =>
      this.markdown.export(report, { generatedBy: options.generatedBy })
    );
  }

  printReport(options: ExportRequestOptions): ExportResult<PrintExportResult> {
    return this.runExport("PRINT", options, (report) =>
      this.print.export(report, { generatedBy: options.generatedBy })
    );
  }

  /** Preview-only payload for free users (no downloadable artifact). */
  previewReport(options: ExportRequestOptions): ExportDeniedResult {
    const started = Date.now();
    const permission = this.access.resolvePermissions(options.subject);
    try {
      const report = this.registry.resolveReport({
        reportType: options.reportType,
        report: options.report,
        generateOptions: options.generateOptions,
      });
      const doc = buildExportDocument(report, this.config, {
        generatedBy: options.generatedBy,
      });
      const executionTimeMs = Date.now() - started;
      this.audit.append({
        exportTime: new Date().toISOString(),
        reportType: String(report.reportType),
        reportId: report.reportId,
        userRole: options.subject.role,
        userId: options.subject.userId,
        exportFormat: "PREVIEW",
        executionTimeMs,
        success: true,
        previewOnly: true,
        engineVersion: this.config.engineVersion,
      });
      return {
        success: false,
        denied: true,
        upgradeRequired: permission.upgradeRequired,
        previewOnly: true,
        reason: "Upgrade Required",
        preview: {
          title: doc.title,
          subtitle: doc.subtitle,
          summaryLines: doc.sections
            .find((s) => s.id === "executive_summary")
            ?.paragraphs.slice(0, 6) ?? [],
          message: "Upgrade Required to download PDF, Excel, Markdown, or Print.",
        },
        permission,
        executionTimeMs,
      };
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      this.metrics.recordFailure("PREVIEW");
      this.audit.append({
        exportTime: new Date().toISOString(),
        reportType: options.reportType,
        userRole: options.subject.role,
        userId: options.subject.userId,
        exportFormat: "PREVIEW",
        executionTimeMs,
        success: false,
        failure: true,
        errorMessage: err instanceof Error ? err.message : String(err),
        previewOnly: true,
        engineVersion: this.config.engineVersion,
      });
      return {
        success: false,
        denied: true,
        upgradeRequired: true,
        previewOnly: true,
        reason: "Upgrade Required",
        permission,
        executionTimeMs,
      };
    }
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
  }

  private runExport<T extends { metadata: { reportId: string } }>(
    format: ExportableFormat,
    options: ExportRequestOptions,
    producer: (report: InstitutionalReport) => T
  ): ExportResult<T> {
    const started = Date.now();
    const permission = this.access.canUserExport(options.subject, format);

    if (!permission.allowed) {
      const executionTimeMs = Date.now() - started;
      this.metrics.recordFailure(format);
      this.audit.append({
        exportTime: new Date().toISOString(),
        reportType: options.reportType,
        userRole: options.subject.role,
        userId: options.subject.userId,
        exportFormat: format,
        executionTimeMs,
        success: false,
        failure: true,
        errorMessage: permission.reason,
        previewOnly: permission.previewOnly,
        engineVersion: this.config.engineVersion,
      });

      if (permission.previewOnly || permission.upgradeRequired) {
        const preview = this.previewReport(options);
        return {
          ...preview,
          reason: permission.reason,
          permission,
          executionTimeMs,
        };
      }

      return {
        success: false,
        denied: true,
        upgradeRequired: permission.upgradeRequired,
        previewOnly: permission.previewOnly,
        reason: permission.reason,
        permission,
        executionTimeMs,
      };
    }

    try {
      const report = this.registry.resolveReport({
        reportType: options.reportType,
        report: options.report,
        generateOptions: options.generateOptions,
      });
      const artifact = producer(report);
      const executionTimeMs = Date.now() - started;
      this.metrics.recordSuccess(format, executionTimeMs);
      this.audit.append({
        exportTime: new Date().toISOString(),
        reportType: String(report.reportType),
        reportId: report.reportId,
        userRole: options.subject.role,
        userId: options.subject.userId,
        exportFormat: format,
        executionTimeMs,
        success: true,
        engineVersion: this.config.engineVersion,
      });
      return {
        success: true,
        denied: false,
        artifact,
        permission,
        executionTimeMs,
      };
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      this.metrics.recordFailure(format);
      this.audit.append({
        exportTime: new Date().toISOString(),
        reportType: options.reportType,
        userRole: options.subject.role,
        userId: options.subject.userId,
        exportFormat: format,
        executionTimeMs,
        success: false,
        failure: true,
        errorMessage: err instanceof Error ? err.message : String(err),
        engineVersion: this.config.engineVersion,
      });
      return {
        success: false,
        denied: true,
        upgradeRequired: false,
        previewOnly: false,
        reason: err instanceof Error ? err.message : String(err),
        permission,
        executionTimeMs,
      };
    }
  }
}
