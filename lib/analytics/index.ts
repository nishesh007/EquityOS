export type {
  AnalyticsChartKind,
  AnalyticsInsight,
  AnalyticsMetric,
  AnalyticsMetricKind,
  AnalyticsSummary,
  AnalyticsTrendDirection,
  ChartPoint,
  ChartSeries,
  ChartSlice,
  DateRange,
  ExportFormat,
  ExportPreparation,
  ExportRequest,
  ExportStatus,
  HeatmapCell,
  PerformanceMetric,
  StrategyComparison,
  TimelineChartEvent,
  TimeRangePreset,
  TradeStatistics,
  TradeStatisticsInput,
} from "@/lib/analytics/types";

export {
  average,
  averageGain,
  averageHoldingTime,
  averageLoss,
  averageReturn,
  computeTradeStatistics,
  lossRate,
  maximumDrawdown,
  percentOf,
  profitFactor,
  roundMetric,
  stopLossRate,
  targetHitRate,
  winRate,
} from "@/lib/analytics/metric-engine";

export {
  TIME_RANGE_PRESETS,
  filterByDateRange,
  isWithinDateRange,
  resolveTimeRangePreset,
} from "@/lib/analytics/time-range";
export type { TimeRangePresetOption } from "@/lib/analytics/time-range";

export {
  analyticsExportService,
  SharedAnalyticsExportService,
  MIME_BY_FORMAT,
  EXTENSION_BY_FORMAT,
} from "@/lib/analytics/export";
export type { AnalyticsExportService } from "@/lib/analytics/export";
