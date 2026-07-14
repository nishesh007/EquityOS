/**
 * Shared input / signal types for the Earnings Quality Engine.
 */

import type { QualityDimension } from "./QualityConfiguration";
import type { QualitySignalSeverity } from "./QualityRegistry";

export interface QualityPeriodMetrics {
  financialYear?: string;
  quarter?: string;
  revenue?: number | null;
  otherIncome?: number | null;
  ebitda?: number | null;
  ebit?: number | null;
  pat?: number | null;
  netIncome?: number | null;
  operatingCashFlow?: number | null;
  freeCashFlow?: number | null;
  capex?: number | null;
  receivables?: number | null;
  inventory?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  cash?: number | null;
  debt?: number | null;
  totalAssets?: number | null;
  netWorth?: number | null;
  cwip?: number | null;
  intangibleAssets?: number | null;
  dividendPaid?: number | null;
  roce?: number | null;
  oneTimeIncome?: number | null;
}

export interface EarningsQualityInput {
  symbol: string;
  company?: string;
  currency?: string;
  /** Latest period metrics (required for most checks). */
  current: QualityPeriodMetrics;
  /** Prior period for growth / deterioration checks. */
  previous?: QualityPeriodMetrics | null;
  /** Optional older period for multi-period trends. */
  priorPrevious?: QualityPeriodMetrics | null;
  metadata?: Record<string, unknown>;
}

export interface QualitySignal {
  checkId: string;
  dimension: QualityDimension;
  severity: QualitySignalSeverity;
  title: string;
  message: string;
  scoreImpact: number;
  metrics?: Record<string, number | null | undefined>;
  advisoryOnly: true;
}

export interface DimensionAnalysisResult {
  dimension: QualityDimension;
  score: number;
  signals: QualitySignal[];
  warnings: string[];
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function growthRate(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function ratio(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export function netIncomeOf(m: QualityPeriodMetrics): number | null {
  return num(m.netIncome) ?? num(m.pat);
}

export function signal(input: {
  checkId: string;
  dimension: QualityDimension;
  severity: QualitySignalSeverity;
  title: string;
  message: string;
  scoreImpact: number;
  metrics?: Record<string, number | null | undefined>;
}): QualitySignal {
  return {
    ...input,
    advisoryOnly: true,
  };
}
