/**
 * Paper Trading Lab — public barrel (Sprint 11E.1 + 11E.2 analytics).
 */

export { PAPER_TRADING_CONFIG } from "@/lib/paper-trading/config";
export type { PaperTradingConfig } from "@/lib/paper-trading/config";

export type {
  PaperStrategy,
  PaperTradeStatus,
  PaperExitReason,
  PaperTimelineEventType,
  PaperTimelineEvent,
  PaperRecommendationSnapshot,
  PaperTrade,
  PaperTradingKpis,
  PaperTradingState,
  PaperTradingDashboard,
} from "@/lib/paper-trading/types";

export {
  loadPaperTradingState,
  savePaperTradingState,
  createEmptyPaperTradingState,
} from "@/lib/paper-trading/persistence";

export {
  resolvePaperStrategy,
  isBuyableRecommendation,
  compareRecommendationsForPaper,
  selectCandidatesForStrategy,
} from "@/lib/paper-trading/selection";

export {
  computeTradePnl,
  computeKpis,
  isTradeOpen,
  isTradeClosed,
} from "@/lib/paper-trading/kpis";

export {
  runPaperTradingCycle,
  getPaperTradingState,
} from "@/lib/paper-trading/engine";

export {
  PAPER_STRATEGY_LABELS,
  PAPER_STATUS_LABELS,
  PAPER_EXIT_REASON_LABELS,
  formatPnl,
  formatPercent,
  formatHoldingDuration,
  formatClock,
  formatDateTime,
  formatPrice,
} from "@/lib/paper-trading/format";

export type {
  PaperAnalyticsTab,
  EquityCurveRange,
  PaperAnalyticsOutcome,
  PaperAnalyticsStatus,
  PaperAnalyticsFilters,
  PaperExecutiveKpis,
  PaperStrategyComparisonRow,
  PaperTabPerformanceMetrics,
  EquityCurvePoint,
  MonthlyPerformanceRow,
  ConvictionBandId,
  ConvictionBandStats,
  RecommendationValidationStats,
  PaperAnalyticsDashboardModel,
} from "@/lib/paper-trading/analytics-types";

export {
  DEFAULT_PAPER_ANALYTICS_FILTERS,
  filterTradesForAnalytics,
} from "@/lib/paper-trading/analytics-filters";

export {
  computeMaximumDrawdown,
  computeExecutiveKpis,
  computeStrategyComparison,
  computeStrategyComparisonRow,
  computeTabPerformanceMetrics,
  computeRecommendationValidation,
  computePerformanceKpis,
  computeStrategyPerformanceMetrics,
  buildEquityCurve,
  buildMonthlyPerformance,
  selectBestTrades,
  selectWorstTrades,
  buildPaperAnalyticsDashboard,
  buildPaperAnalyticsSnapshot,
} from "@/lib/paper-trading/analytics";

export type {
  ConfidenceBucketId,
  MarketRegimeBucket,
  FailureReasonId,
  AiRecommendationHealth,
  ConfidenceAccuracyRow,
  SectorPerformanceRow,
  MarketRegimeRow,
  StrategyIntelligenceRow,
  FailureReasonRow,
  TopRecommendationRow,
  WeakRecommendationRow,
  AiQualityScores,
  AiInsight,
  AiIntelligenceModel,
} from "@/lib/paper-trading/intelligence-types";

export {
  classifyFailureReason,
  computeAiRecommendationHealth,
  computeConfidenceAccuracy,
  computeSectorPerformance,
  computeMarketRegimeAnalysis,
  computeStrategyIntelligence,
  computeFailureAnalysis,
  selectTopRecommendations,
  selectWeakRecommendations,
  computeAiQualityScores,
  generateAiInsights,
  buildAiIntelligenceModel,
} from "@/lib/paper-trading/intelligence";
