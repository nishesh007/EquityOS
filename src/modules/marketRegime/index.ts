/**
 * Market Regime module public exports (Sprint 11B.2A).
 */

export type {
  MarketRegime,
  MarketRegimeConfig,
  MarketRegimeLabel,
  MarketRegimeListener,
  MarketRegimeRule,
  MarketRegimeRuleMatch,
  MarketRegimeServiceOptions,
  RegimeContextFeatures,
} from "./MarketRegimeTypes";

export { DEFAULT_MARKET_REGIME_CONFIG } from "./MarketRegimeTypes";

export {
  MarketRegimeEngine,
  getMarketRegimeEngine,
  resetMarketRegimeEngine,
} from "./MarketRegimeEngine";

export {
  MarketRegimeService,
  getMarketRegime,
  getMarketRegimeService,
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
