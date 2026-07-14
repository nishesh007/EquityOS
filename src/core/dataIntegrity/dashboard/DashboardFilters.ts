/**
 * Dashboard query filters for institutional monitoring views.
 */

export type DashboardSeverityFilter =
  | "INFO"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

export interface DashboardFilters {
  stock?: string;
  sector?: string;
  exchange?: string;
  module?: string | string[];
  validationType?: string;
  ruleCategory?: string;
  severity?: DashboardSeverityFilter | DashboardSeverityFilter[];
  dateFrom?: string;
  dateTo?: string;
  trustClassification?: string | string[];
  recommendation?: string | string[];
}

export function normalizeFilters(
  input?: DashboardFilters
): DashboardFilters {
  if (!input) return {};
  return { ...input };
}

export function filterMatchesModules(
  filters: DashboardFilters,
  moduleId: string
): boolean {
  if (!filters.module) return true;
  const list = Array.isArray(filters.module)
    ? filters.module
    : [filters.module];
  return list.some(
    (m) => m.toLowerCase() === moduleId.toLowerCase()
  );
}

export function filterMatchesTrustClassification(
  filters: DashboardFilters,
  classification: string
): boolean {
  if (!filters.trustClassification) return true;
  const list = Array.isArray(filters.trustClassification)
    ? filters.trustClassification
    : [filters.trustClassification];
  return list.some(
    (c) => c.toLowerCase() === classification.toLowerCase()
  );
}

export function filterMatchesRecommendation(
  filters: DashboardFilters,
  recommendation: string
): boolean {
  if (!filters.recommendation) return true;
  const list = Array.isArray(filters.recommendation)
    ? filters.recommendation
    : [filters.recommendation];
  return list.some(
    (r) => r.toLowerCase() === recommendation.toLowerCase()
  );
}

export function isTimestampInRange(
  timestamp: string | null | undefined,
  filters: DashboardFilters
): boolean {
  if (!timestamp) return !filters.dateFrom && !filters.dateTo;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (filters.dateFrom && t < new Date(filters.dateFrom).getTime()) {
    return false;
  }
  if (filters.dateTo && t > new Date(filters.dateTo).getTime()) {
    return false;
  }
  return true;
}

export function matchesMetaFilters(
  filters: DashboardFilters,
  meta: {
    stock?: string;
    sector?: string;
    exchange?: string;
    validationType?: string;
    ruleCategory?: string;
    severity?: string;
  }
): boolean {
  if (
    filters.stock &&
    meta.stock?.toLowerCase() !== filters.stock.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.sector &&
    meta.sector?.toLowerCase() !== filters.sector.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.exchange &&
    meta.exchange?.toLowerCase() !== filters.exchange.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.validationType &&
    meta.validationType?.toLowerCase() !==
      filters.validationType.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.ruleCategory &&
    meta.ruleCategory?.toLowerCase() !== filters.ruleCategory.toLowerCase()
  ) {
    return false;
  }
  if (filters.severity) {
    const list = Array.isArray(filters.severity)
      ? filters.severity
      : [filters.severity];
    if (
      !meta.severity ||
      !list.some((s) => s.toLowerCase() === meta.severity!.toLowerCase())
    ) {
      return false;
    }
  }
  return true;
}
