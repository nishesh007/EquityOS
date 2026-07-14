/**
 * Report query filters for institutional reporting.
 */

export type ReportSeverityFilter = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface ReportFilters {
  stock?: string;
  sector?: string;
  exchange?: string;
  module?: string | string[];
  severity?: ReportSeverityFilter | ReportSeverityFilter[];
  recommendation?: string | string[];
  trustClassification?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  validationType?: string;
  /** Custom predicate labels for future exporters / UI. */
  customPredicates?: Record<string, string | number | boolean>;
}

export function normalizeReportFilters(
  input?: ReportFilters
): ReportFilters {
  if (!input) return {};
  return { ...input, customPredicates: { ...(input.customPredicates ?? {}) } };
}

export function matchesList(
  value: string | undefined,
  filter: string | string[] | undefined
): boolean {
  if (!filter) return true;
  if (!value) return false;
  const list = Array.isArray(filter) ? filter : [filter];
  return list.some((f) => f.toLowerCase() === value.toLowerCase());
}

export function isInDateRange(
  timestamp: string | undefined,
  filters: ReportFilters
): boolean {
  if (!timestamp) return !filters.dateFrom && !filters.dateTo;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (filters.dateFrom && t < new Date(filters.dateFrom).getTime()) return false;
  if (filters.dateTo && t > new Date(filters.dateTo).getTime()) return false;
  return true;
}
