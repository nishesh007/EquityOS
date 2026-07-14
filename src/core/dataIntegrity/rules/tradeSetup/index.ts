/**
 * Institutional Trade Setup Validation — public exports.
 */

export {
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
  resolveTradeSetupConfig,
} from "./TradeSetupValidationConfig";

export type {
  TradeLifecycleStatus,
  TradeSide,
  TradeSetupMode,
  TradeSetupValidationConfig,
  TradeSetupValidationConfigInput,
  TradeType,
} from "./TradeSetupValidationConfig";

export {
  buildTradeSetupRules,
  registerTradeSetupRules,
  resetTradeSetupRuleRegistrationState,
  getTradeSetupValidationMetrics,
  resetTradeSetupValidationMetrics,
  getActiveTradeSetupConfig,
  getTradeSetupAuditLog,
  resetTradeSetupAuditLog,
  calculateTradeSetupQuality,
  calculateRiskReward,
  deriveTradeSetupComponentScores,
  validateTradeSetup,
  validateEntry,
  validateStopLoss,
  validateTargets,
  validateRiskReward,
  configFromContext,
  tsFail,
  tsPass,
  isPlainObject,
  readNumber,
  readString,
  readSide,
  readTradeType,
  readLifecycleStatus,
  readTradeLevels,
  section,
  hasNonEmptyText,
  scoreDirection,
  appendTradeSetupAudit,
} from "./TradeSetupRuleRegistry";

export type {
  TradeSetupValidationMetrics,
  TradeSetupAuditEntry,
  TradeSetupComponentScores,
  TradeSetupQualityScoreResult,
  RiskRewardMetrics,
} from "./TradeSetupRuleRegistry";

export { createEntryValidationRules } from "./EntryValidationRules";
export { createStopLossValidationRules } from "./StopLossValidationRules";
export { createTargetValidationRules } from "./TargetValidationRules";
export { createRiskRewardValidationRules } from "./RiskRewardValidationRules";
export { createPositionSizingValidationRules } from "./PositionSizingValidationRules";
export { createVolatilityValidationRules } from "./VolatilityValidationRules";
export { createSupportResistanceValidationRules } from "./SupportResistanceValidationRules";
export { createTrendAlignmentValidationRules } from "./TrendAlignmentValidationRules";
export { createTradeLifecycleRules } from "./TradeLifecycleRules";
export { createTradeSetupConsistencyRules } from "./TradeSetupConsistencyRules";
export { createTradeSetupQualityRules } from "./TradeSetupQualityRules";
export { createTradeSetupAuditRules } from "./TradeSetupAuditRules";
