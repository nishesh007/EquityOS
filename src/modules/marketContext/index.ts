/**
 * Market Context module public exports (Sprint 11B.1A).
 */

export type {
  BreadthAnalysisResult,
  BreadthContextSnapshot,
  ConfidenceAnalysisResult,
  IndexContextSnapshot,
  MarketContext,
  MarketContextAnalysisBreakdown,
  MarketContextConfig,
  MarketContextInput,
  MarketContextListener,
  MarketContextRawData,
  MarketContextServiceOptions,
  MarketContextThresholds,
  MarketStrengthAnalysisResult,
  MarketStrengthWeights,
  MarketTrend,
  RiskMode,
  RiskModeAnalysisResult,
  TrendAnalysisResult,
  TrendBias,
  VixContextSnapshot,
  VolatilityAnalysisResult,
  VolatilityRegime,
} from "./MarketContextTypes";

export {
  DEFAULT_MARKET_CONTEXT_CONFIG,
  DEFAULT_MARKET_CONTEXT_THRESHOLDS,
  DEFAULT_MARKET_STRENGTH_WEIGHTS,
} from "./MarketContextTypes";

export {
  MarketContextEngine,
  getMarketContextEngine,
  resetMarketContextEngine,
} from "./MarketContextEngine";

export {
  MarketContextService,
  fetchMarketContextRawData,
  getMarketContext,
  getMarketContextService,
  mapRawDataToMarketContextInput,
  refreshMarketContext,
  resetMarketContextService,
  subscribeMarketContext,
} from "./MarketContextService";

export {
  buildMarketContextFromInput,
  calculateBreadth,
  calculateConfidence,
  calculateMarketStrength,
  calculateRiskMode,
  calculateTrend,
  calculateVolatility,
  createFallbackMarketContext,
  resolveMarketContextConfig,
} from "./MarketContextUtils";
