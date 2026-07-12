/**
 * Sprint 9D — AI Screener types.
 * AI Screener — advanced filter engine supporting 200+ metrics.
 */

export type FilterCategory =
  | "price"
  | "valuation"
  | "growth"
  | "profitability"
  | "financial_strength"
  | "shareholding"
  | "technical"
  | "quality"
  | "ai"
  | "metadata";

export type FilterValueType = "number" | "percent" | "ratio" | "currency" | "text" | "score" | "signal";

export type FilterOperator =
  | "gt"
  | "lt"
  | "eq"
  | "gte"
  | "lte"
  | "between"
  | "contains"
  | "starts_with"
  | "ends_with";

export interface FilterDefinition {
  key: string;
  label: string;
  category: FilterCategory;
  valueType: FilterValueType;
  /** Supported operators for this filter */
  operators: FilterOperator[];
  /** Whether higher values are generally better */
  higherIsBetter?: boolean;
  /** Lazy-load tier — deep metrics fetched only when filter is active */
  tier: "fast" | "standard" | "deep";
  /** Optional period suffix for display */
  period?: string;
  description?: string;
}

export interface FilterCondition {
  id: string;
  filterKey: string;
  operator: FilterOperator;
  value: number | string;
  valueTo?: number;
}

export type FilterLogic = "and" | "or";

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

export interface ScreenerQuery {
  root: FilterGroup;
  limit?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface ScreenerRow {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  /** All metric values keyed by filter key */
  metrics: Record<string, number | string | null>;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface ScreenerResult {
  rows: ScreenerRow[];
  totalMatched: number;
  totalUniverse: number;
  executionMs: number;
  activeFilters: number;
  query: ScreenerQuery;
}

export interface ScreenerUniverseSnapshot {
  rows: ScreenerRow[];
  builtAt: string;
  totalCount: number;
}

export interface FilterEvaluationContext {
  row: ScreenerRow;
  getMetric: (key: string) => number | string | null;
}

export const NUMERIC_OPERATORS: FilterOperator[] = [
  "gt",
  "lt",
  "eq",
  "gte",
  "lte",
  "between",
];

export const TEXT_OPERATORS: FilterOperator[] = [
  "eq",
  "contains",
  "starts_with",
  "ends_with",
];

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
  gte: ">=",
  lte: "<=",
  between: "Between",
  contains: "Contains",
  starts_with: "Starts With",
  ends_with: "Ends With",
};

export const CATEGORY_LABELS: Record<FilterCategory, string> = {
  price: "Price",
  valuation: "Valuation",
  growth: "Growth",
  profitability: "Profitability",
  financial_strength: "Financial Strength",
  shareholding: "Shareholding",
  technical: "Technical",
  quality: "Quality",
  ai: "AI Filters",
  metadata: "Metadata",
};
