/**
 * Financial Fundamentals Engine — metric registry and normalization utilities.
 * Sprint 8C: single source of truth for field definitions and score clamping.
 */

import { clamp, round } from "@/lib/engine/utils";
import { formatInrCrores, formatPercent, formatRatio } from "@/lib/fundamentals/normalize";

export type FundamentalsMetricKey =
  | "revenue"
  | "revenueCagr"
  | "profitCagr"
  | "eps"
  | "dilutedEps"
  | "operatingMargin"
  | "netMargin"
  | "grossMargin"
  | "roe"
  | "roce"
  | "roa"
  | "debtEquity"
  | "interestCoverage"
  | "currentRatio"
  | "quickRatio"
  | "cashConversion"
  | "fcf"
  | "fcfMargin"
  | "dividendYield"
  | "bookValue"
  | "pe"
  | "forwardPe"
  | "pb"
  | "evEbitda"
  | "peg"
  | "enterpriseValue"
  | "marketCap"
  | "capitalAllocationScore"
  | "qualityScore"
  | "growthScore"
  | "profitabilityScore"
  | "financialStrength"
  | "valuationScore"
  | "piotroskiFScore"
  | "altmanZScore"
  | "beneishMScore";

export interface MetricDefinition {
  key: FundamentalsMetricKey;
  label: string;
  category: "income" | "balance" | "cashflow" | "valuation" | "score" | "model";
  isScore: boolean;
}

export const FUNDAMENTALS_METRIC_REGISTRY: MetricDefinition[] = [
  { key: "revenue", label: "Revenue", category: "income", isScore: false },
  { key: "revenueCagr", label: "Revenue CAGR", category: "income", isScore: false },
  { key: "profitCagr", label: "Profit CAGR", category: "income", isScore: false },
  { key: "eps", label: "EPS", category: "income", isScore: false },
  { key: "dilutedEps", label: "Diluted EPS", category: "income", isScore: false },
  { key: "operatingMargin", label: "Operating Margin", category: "income", isScore: false },
  { key: "netMargin", label: "Net Margin", category: "income", isScore: false },
  { key: "grossMargin", label: "Gross Margin", category: "income", isScore: false },
  { key: "roe", label: "ROE", category: "balance", isScore: false },
  { key: "roce", label: "ROCE", category: "balance", isScore: false },
  { key: "roa", label: "ROA", category: "balance", isScore: false },
  { key: "debtEquity", label: "Debt / Equity", category: "balance", isScore: false },
  { key: "interestCoverage", label: "Interest Coverage", category: "balance", isScore: false },
  { key: "currentRatio", label: "Current Ratio", category: "balance", isScore: false },
  { key: "quickRatio", label: "Quick Ratio", category: "balance", isScore: false },
  { key: "cashConversion", label: "Cash Conversion", category: "cashflow", isScore: false },
  { key: "fcf", label: "FCF", category: "cashflow", isScore: false },
  { key: "fcfMargin", label: "FCF Margin", category: "cashflow", isScore: false },
  { key: "dividendYield", label: "Dividend Yield", category: "valuation", isScore: false },
  { key: "bookValue", label: "Book Value", category: "valuation", isScore: false },
  { key: "pe", label: "P/E", category: "valuation", isScore: false },
  { key: "forwardPe", label: "Forward P/E", category: "valuation", isScore: false },
  { key: "pb", label: "P/B", category: "valuation", isScore: false },
  { key: "evEbitda", label: "EV/EBITDA", category: "valuation", isScore: false },
  { key: "peg", label: "PEG", category: "valuation", isScore: false },
  { key: "enterpriseValue", label: "Enterprise Value", category: "valuation", isScore: false },
  { key: "marketCap", label: "Market Cap", category: "valuation", isScore: false },
  { key: "capitalAllocationScore", label: "Capital Allocation Score", category: "score", isScore: true },
  { key: "qualityScore", label: "Quality Score", category: "score", isScore: true },
  { key: "growthScore", label: "Growth Score", category: "score", isScore: true },
  { key: "profitabilityScore", label: "Profitability Score", category: "score", isScore: true },
  { key: "financialStrength", label: "Financial Strength", category: "score", isScore: true },
  { key: "valuationScore", label: "Valuation Score", category: "score", isScore: true },
  { key: "piotroskiFScore", label: "Piotroski F-Score", category: "model", isScore: false },
  { key: "altmanZScore", label: "Altman Z-Score", category: "model", isScore: false },
  { key: "beneishMScore", label: "Beneish M-Score", category: "model", isScore: false },
];

/** Clamp institutional scores to 0–100. */
export function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(clamp(value));
}

/** Return finite number or null — never NaN/undefined. */
export function safeMetric(value: number | undefined | null): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  return value;
}

export function formatCurrencyCr(crores: number | null): string {
  if (crores === null || !Number.isFinite(crores)) return "—";
  return formatInrCrores(crores);
}

export function formatPercentMetric(value: number | null): string {
  if (value === null) return "—";
  return formatPercent(value);
}

export function formatRatioMetric(value: number | null, suffix = "x"): string {
  if (value === null) return "—";
  return formatRatio(value, suffix);
}

export function formatNumberMetric(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return String(round(value, decimals));
}

export function weightedScore(scores: Array<{ score: number; weight: number }>): number {
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  const raw = scores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  return normalizeScore(raw);
}

export function lookupMetric(key: FundamentalsMetricKey): MetricDefinition | undefined {
  return FUNDAMENTALS_METRIC_REGISTRY.find((metric) => metric.key === key);
}
