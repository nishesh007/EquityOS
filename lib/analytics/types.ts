/**
 * Sprint 11F.1 — Shared analytics type system.
 * Infrastructure only — no feature wiring.
 */

/** Inclusive calendar / absolute time window. */
export interface DateRange {
  start: string; // ISO 8601
  end: string; // ISO 8601
  /** Optional human label (e.g. "This Month"). */
  label?: string;
}

export type TimeRangePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "3_months"
  | "6_months"
  | "1_year"
  | "all_time";

export type AnalyticsMetricKind =
  | "number"
  | "percent"
  | "currency"
  | "duration"
  | "ratio"
  | "count";

export type AnalyticsTrendDirection = "up" | "down" | "flat";

/** Generic KPI / metric presentation model. */
export interface AnalyticsMetric {
  id: string;
  label: string;
  value: number | null;
  kind: AnalyticsMetricKind;
  /** Pre-formatted display string when engines supply one. */
  displayValue?: string;
  unit?: string;
  description?: string;
  delta?: number | null;
  deltaLabel?: string;
  trend?: AnalyticsTrendDirection;
  icon?: string;
}

/** Performance-oriented metric (returns, drawdowns, factors). */
export interface PerformanceMetric extends AnalyticsMetric {
  kind: "percent" | "ratio" | "number" | "currency" | "duration";
  sampleSize?: number;
  baseline?: number | null;
}

export interface StrategyComparison {
  strategyId: string;
  strategyLabel: string;
  metrics: readonly PerformanceMetric[];
  rank?: number;
  highlight?: boolean;
}

export interface TradeStatistics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  lossRate: number;
  profitFactor: number | null;
  averageReturn: number | null;
  averageGain: number | null;
  averageLoss: number | null;
  maximumDrawdown: number | null;
  averageHoldingMs: number | null;
  targetHitRate: number | null;
  stopLossRate: number | null;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
}

/** Minimal trade-like input for generic metric aggregation. */
export interface TradeStatisticsInput {
  /** Signed return percent (e.g. 2.5 = +2.5%). */
  returnPercent: number;
  /** Optional signed P&L in currency units. */
  pnl?: number;
  holdingMs?: number;
  hitTarget?: boolean;
  hitStopLoss?: boolean;
}

export type ExportFormat = "pdf" | "csv" | "excel" | "json";

export type ExportStatus =
  | "queued"
  | "preparing"
  | "ready"
  | "unsupported"
  | "failed";

export interface ExportRequest {
  id?: string;
  format: ExportFormat;
  title: string;
  /** ISO range filter applied by the caller before export. */
  dateRange?: DateRange;
  /** Opaque payload prepared by the consuming feature. */
  payload: unknown;
  columns?: readonly string[];
  filename?: string;
  createdAt?: string;
}

export interface ExportPreparation {
  requestId: string;
  format: ExportFormat;
  status: ExportStatus;
  filename: string;
  mimeType: string;
  /** Present only when status === "ready" (future). */
  body?: string | Uint8Array;
  message?: string;
}

export interface ChartPoint {
  x: string | number;
  y: number;
  label?: string;
  meta?: Record<string, unknown>;
}

export interface ChartSeries {
  id: string;
  label: string;
  points: readonly ChartPoint[];
  color?: string;
  /** When true, series is rendered as comparison overlay. */
  secondary?: boolean;
}

export type AnalyticsChartKind =
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "donut"
  | "heatmap"
  | "timeline"
  | "equity_curve";

export interface ChartSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface HeatmapCell {
  id: string;
  label: string;
  value: number;
  display?: string;
}

export interface TimelineChartEvent {
  id: string;
  label: string;
  at: string;
  tone?: "positive" | "negative" | "neutral" | "accent";
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  body: string;
  tone?: "positive" | "caution" | "neutral" | "negative";
  metricIds?: readonly string[];
}

export interface AnalyticsSummary {
  title: string;
  subtitle?: string;
  metrics: readonly AnalyticsMetric[];
  insights?: readonly AnalyticsInsight[];
  asOf?: string;
}
