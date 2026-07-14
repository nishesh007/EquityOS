/**
 * Institutional Market Data Validation — public exports.
 */

export {
  DEFAULT_MARKET_VALIDATION_CONFIG,
  resolveMarketConfig,
  buildMarketRules,
  registerMarketRules,
  resetMarketRuleRegistrationState,
  getMarketValidationMetrics,
  resetMarketValidationMetrics,
  getActiveMarketConfig,
  validateMarketData,
  validateOHLC,
  validateQuote,
  validateVolume,
  validateCorporateAdjustments,
  configFromContext,
  marketFail,
  marketPass,
  isPlainObject,
  readNumber,
  readString,
  asRows,
  parseTimestamp,
  readTimestamp,
} from "./MarketDataRuleRegistry";

export type {
  MarketValidationConfig,
  MarketValidationConfigInput,
  MarketValidationMetrics,
} from "./MarketDataRuleRegistry";

export { createPriceValidationRules } from "./PriceValidationRules";
export { createOHLCValidationRules } from "./OHLCValidationRules";
export { createVolumeValidationRules } from "./VolumeValidationRules";
export { createTimestampValidationRules } from "./TimestampValidationRules";
export { createMarketSessionValidationRules } from "./MarketSessionValidationRules";
export { createCircuitLimitRules } from "./CircuitLimitRules";
export { createCorporateActionAdjustmentRules } from "./CorporateActionAdjustmentRules";
export { createGapDetectionRules } from "./GapDetectionRules";
export { createQuoteConsistencyRules } from "./QuoteConsistencyRules";
