/**
 * Market Regime module public exports (Sprint 11B.2A / 11B.2B).
 */

export type {
  ConfidenceContribution,
  ConfidenceDirection,
  ConfidenceGrade,
  MarketRegime,
  MarketRegimeClassification,
  MarketRegimeConfig,
  MarketRegimeLabel,
  MarketRegimeListener,
  MarketRegimeRule,
  MarketRegimeRuleMatch,
  MarketRegimeServiceOptions,
  RegimeConfidenceAnalysis,
  RegimeConfidenceConfig,
  RegimeConfidenceInput,
  RegimeConfidenceWeights,
  RegimeContextFeatures,
} from "./MarketRegimeTypes";

export {
  DEFAULT_MARKET_REGIME_CONFIG,
  DEFAULT_REGIME_CONFIDENCE_CONFIG,
  DEFAULT_REGIME_CONFIDENCE_WEIGHTS,
} from "./MarketRegimeTypes";

export {
  MarketRegimeEngine,
  getMarketRegimeEngine,
  resetMarketRegimeEngine,
} from "./MarketRegimeEngine";

export {
  RegimeConfidenceEngine,
  getRegimeConfidenceEngine,
  resetRegimeConfidenceEngine,
} from "./RegimeConfidenceEngine";

export {
  MarketRegimeService,
  getConfidenceAnalysis,
  getMarketRegime,
  getMarketRegimeService,
  refreshConfidence,
  refreshMarketRegime,
  resetMarketRegimeService,
  subscribeMarketRegime,
} from "./MarketRegimeService";

export {
  buildDefaultMarketRegimeRules,
  classifyMarketRegime,
  createFallbackMarketRegime,
  evaluateMarketRegimeRules,
  extractRegimeFeatures,
  isInstitutionalContextIncomplete,
  resolveMarketRegimeConfig,
} from "./MarketRegimeUtils";

export {
  buildConfidenceSummary,
  buildRegimeConfidenceAnalysis,
  classifyConfidenceGrade,
  createFallbackConfidenceAnalysis,
  enrichRegimeWithConfidence,
  resolveRegimeConfidenceConfig,
  scoreBreadthAgreement,
  scoreDataQuality,
  scoreMarketStrengthAgreement,
  scoreRiskModeAgreement,
  scoreSectorAgreement,
  scoreTrendAgreement,
  scoreVolatilityAgreement,
} from "./RegimeConfidenceUtils";
