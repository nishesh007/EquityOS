/**
 * Sprint 11F.1 — Export infrastructure (architecture only).
 * No PDF/CSV/Excel/JSON generation yet — prepares contracts for future sprints.
 */

import type {
  ExportFormat,
  ExportPreparation,
  ExportRequest,
} from "@/lib/analytics/types";

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  excel:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  json: "application/json",
};

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  pdf: "pdf",
  csv: "csv",
  excel: "xlsx",
  json: "json",
};

export interface AnalyticsExportService {
  /** Validate + normalize a request without producing file bytes. */
  prepare(request: ExportRequest): Promise<ExportPreparation>;
  /** Future: materialize bytes. Currently always unsupported. */
  materialize(request: ExportRequest): Promise<ExportPreparation>;
  supports(format: ExportFormat): boolean;
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "analytics-export";
}

function resolveFilename(request: ExportRequest): string {
  if (request.filename?.trim()) return request.filename.trim();
  return `${slugify(request.title)}.${EXTENSION_BY_FORMAT[request.format]}`;
}

function createRequestId(request: ExportRequest): string {
  return (
    request.id?.trim() ||
    `export_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  );
}

/**
 * Shared export façade.
 * Formats are registered as supported for routing, but materialization
 * is deferred until a dedicated export sprint.
 */
export class SharedAnalyticsExportService implements AnalyticsExportService {
  supports(format: ExportFormat): boolean {
    return format in MIME_BY_FORMAT;
  }

  async prepare(request: ExportRequest): Promise<ExportPreparation> {
    if (!this.supports(request.format)) {
      return {
        requestId: createRequestId(request),
        format: request.format,
        status: "failed",
        filename: resolveFilename(request),
        mimeType: "application/octet-stream",
        message: `Unknown export format: ${String(request.format)}`,
      };
    }

    return {
      requestId: createRequestId(request),
      format: request.format,
      status: "preparing",
      filename: resolveFilename(request),
      mimeType: MIME_BY_FORMAT[request.format],
      message:
        "Export architecture ready — materialization not implemented in Sprint 11F.1.",
    };
  }

  async materialize(request: ExportRequest): Promise<ExportPreparation> {
    const prepared = await this.prepare(request);
    if (prepared.status === "failed") return prepared;

    return {
      ...prepared,
      status: "unsupported",
      message:
        "Export materialization is reserved for a future sprint (PDF / CSV / Excel / JSON).",
    };
  }
}

/** Singleton default used by future feature wiring. */
export const analyticsExportService = new SharedAnalyticsExportService();

export {
  MIME_BY_FORMAT,
  EXTENSION_BY_FORMAT,
};
