/**
 * Institutional Report Export Center — public façade (Prompt 9F.R1).
 */

import type { ExportConfigurationInput, ExportableFormat } from "./ExportConfiguration";
import type { ExportAccessSubject, ExportPermissionResult } from "./ExportAccessControl";
import {
  ReportExportEngine,
  type ExportRequestOptions,
  type ExportResult,
} from "./ReportExportEngine";
import type { PdfExportResult } from "./PDFExporter";
import type { ExcelExportResult } from "./ExcelExporter";
import type { MarkdownExportResult } from "./MarkdownExporter";
import type { PrintExportResult } from "./PrintExporter";

let defaultEngine: ReportExportEngine | null = null;
let engineRegistered = false;

export interface ExportRegistrationResult {
  registered: boolean;
  skipped: boolean;
}

export function getReportExportEngine(
  options?: ExportConfigurationInput
): ReportExportEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ReportExportEngine(options);
  }
  return defaultEngine;
}

export function registerReportExportEngine(options?: {
  engine?: ReportExportEngine;
  config?: ExportConfigurationInput;
  force?: boolean;
}): ExportRegistrationResult {
  if (engineRegistered && !options?.force && !options?.engine && !options?.config) {
    return { registered: false, skipped: true };
  }
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ReportExportEngine(options?.config);
  }
  engineRegistered = true;
  return { registered: true, skipped: false };
}

export function resetReportExportEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
}

/** Public API */

export function exportPDF(
  options: ExportRequestOptions
): ExportResult<PdfExportResult> {
  registerReportExportEngine();
  return getReportExportEngine().exportPDF(options);
}

export function exportExcel(
  options: ExportRequestOptions
): ExportResult<ExcelExportResult> {
  registerReportExportEngine();
  return getReportExportEngine().exportExcel(options);
}

export function exportMarkdown(
  options: ExportRequestOptions
): ExportResult<MarkdownExportResult> {
  registerReportExportEngine();
  return getReportExportEngine().exportMarkdown(options);
}

export function printReport(
  options: ExportRequestOptions
): ExportResult<PrintExportResult> {
  registerReportExportEngine();
  return getReportExportEngine().printReport(options);
}

export function canUserExport(
  subject: ExportAccessSubject,
  format: ExportableFormat
): ExportPermissionResult {
  registerReportExportEngine();
  return getReportExportEngine().canUserExport(subject, format);
}

export function getExportMetrics() {
  registerReportExportEngine();
  return getReportExportEngine().getMetrics();
}

export function getExportAuditLog(limit?: number) {
  registerReportExportEngine();
  return getReportExportEngine().getAuditLog(limit);
}

export function getExportVisibleActions(subject: ExportAccessSubject) {
  registerReportExportEngine();
  return getReportExportEngine().getAccessControl().visibleActions(subject);
}
