/**
 * Market Context module public exports (Sprint 11B.1A / 11B.1B / 11B.1C).
 */

export type {
  AtrExpansionResult,
  BreadthAnalysis,
  BreadthAnalysisResult,
  BreadthConfig,
  BreadthContextSnapshot,
  BreadthEngineInput,
  BreadthQualityLabel,
  CapTier,
  ConfidenceAnalysisResult,
  ConstituentSnapshot,
  GapDirection,
  GapRiskResult,
  IndexContextSnapshot,
  InstitutionalVolatilityRegime,
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
  SectorAnalysis,
  SectorEngineInput,
  SectorRotationSummary,
  SectorStrengthAnalysis,
  SectorStrengthConfig,
  SectorTrend,
  SupportedSector,
  TrendAnalysisResult,
  TrendBias,
  VixContextSnapshot,
  VolatilityAnalysis,
  VolatilityAnalysisResult,
  VolatilityConfig,
  VolatilityEngineInput,
  VolatilityRegime,
  VolatilityTrendState,
} from "./MarketContextTypes";

export {
  DEFAULT_BREADTH_CONFIG,
  DEFAULT_MARKET_CONTEXT_CONFIG,
  DEFAULT_MARKET_CONTEXT_THRESHOLDS,
  DEFAULT_MARKET_STRENGTH_WEIGHTS,
  DEFAULT_SECTOR_STRENGTH_CONFIG,
  DEFAULT_VOLATILITY_CONFIG,
  SUPPORTED_SECTORS,
} from "./MarketContextTypes";

export {
  MarketContextEngine,
  getMarketContextEngine,
  resetMarketContextEngine,
} from "./MarketContextEngine";

export {
  BreadthEngine,
  getBreadthEngine,
  resetBreadthEngine,
} from "./BreadthEngine";

export {
  SectorStrengthEngine,
  getSectorStrengthEngine,
  resetSectorStrengthEngine,
} from "./SectorStrengthEngine";

export {
  VolatilityEngine,
  getVolatilityEngine,
  resetVolatilityEngine,
} from "./VolatilityEngine";

export {
  MarketContextService,
  fetchMarketContextRawData,
  getBreadth,
  getMarketContext,
  getMarketContextService,
  getSectorStrength,
  getVolatility,
  mapRawDataToMarketContextInput,
  refreshBreadth,
  refreshMarketContext,
  refreshSectorStrength,
  refreshVolatility,
  resetMarketContextService,
  subscribeMarketContext,
} from "./MarketContextService";

export {
  buildConstituentsFromBreadth,
  buildBreadthEngineInputFromRaw,
  buildSectorEngineInputFromRaw,
  buildVolatilityEngineInput,
} from "./MarketContextMappers";

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

export {
  buildBreadthAnalysis,
  calculateAdvanceDeclineRatio,
  calculateBreadthMomentum,
  calculateBreadthPercent,
  calculateBreadthScore,
  calculateEqualWeightBreadth,
  calculateLargeCapBreadth,
  calculateMidCapBreadth,
  calculateNetAdvances,
  calculateParticipationPercent,
  calculateSmallCapBreadth,
  classifyBreadthQuality,
  classifyCapTier,
  createFallbackBreadthAnalysis,
  normalizeSectorLabel,
  parseMarketCapToCr,
  resolveBreadthConfig,
} from "./BreadthUtils";

export {
  analyzeSector,
  buildSectorRotationSummary,
  buildSectorStrengthAnalysis,
  classifySectorTrend,
  createFallbackSectorStrengthAnalysis,
  resolveSectorStrengthConfig,
  resolveSupportedSectorName,
} from "./SectorStrengthUtils";

export {
  buildVolatilityAnalysis,
  calculateATRExpansion,
  calculateDailyRangePercent,
  calculateGapRisk,
  calculateHistoricalVolatility,
  calculateIntradayRangePercent,
  calculateRealizedVolatility,
  calculateVolatilityRegime,
  calculateVolatilityScore,
  calculateVolatilityTrend,
  createFallbackVolatilityAnalysis,
  resolveVolatilityConfig,
  calculateRiskMode as calculateVolatilityRiskMode,
  calculateConfidence as calculateVolatilityConfidence,
} from "./VolatilityUtils";
