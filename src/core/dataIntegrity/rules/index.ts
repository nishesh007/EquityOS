/**
 * Advanced Rule Engine — public exports (Prompt 9F.2).
 */

export { BaseRule, FunctionalRule, withRuleDefaults, nowIso } from "./BaseRule";
export { RuleEngine } from "./RuleEngine";
export type { RuleEngineOptions } from "./RuleEngine";
export { RuleExecutor } from "./RuleExecutor";
export {
  RuleDependencyResolver,
  CircularDependencyError,
  MissingDependencyError,
} from "./RuleDependencyResolver";
export { RuleScheduler } from "./RuleScheduler";
export type { ScheduleWave } from "./RuleScheduler";
export { RulePerformanceTracker } from "./RulePerformanceTracker";
export { RuleCache } from "./RuleCache";
export { RuleVersionManager } from "./RuleVersionManager";
export type { RuleVersionRecord } from "./RuleVersionManager";
export { RuleAuditLogger } from "./RuleAuditLogger";
export { RuleFactory } from "./RuleFactory";

export type {
  AdvancedRuleCategory,
  RulePriorityBand,
  RuleExecutionMode,
  AdvancedRuleDefinition,
  RuleExecutionStatus,
  RuleExecutionResult,
  RuleEngineEventType,
  RuleEngineEvent,
  RuleEngineEventListener,
  ExecuteRulesRequest,
  ExecuteRulesResult,
  RuleAuditEntry,
  RulePerformanceSnapshot,
  CreateRuleInput,
} from "./RuleTypes";

export {
  PRIORITY_BAND_RANK,
  DEFAULT_RULE_TIMEOUT_MS,
  DEFAULT_CACHE_TTL_MS,
} from "./RuleTypes";

/** Prompt 9F.3 market validation library re-exports. */
export {
  registerMarketRules,
  validateMarketData,
  validateOHLC,
  validateQuote,
  validateVolume,
  validateCorporateAdjustments,
  buildMarketRules,
  getMarketValidationMetrics,
  DEFAULT_MARKET_VALIDATION_CONFIG,
} from "./market";

export type {
  MarketValidationConfig,
  MarketValidationConfigInput,
  MarketValidationMetrics,
} from "./market";

/** Prompt 9F.4 technical indicator validation library re-exports. */
export {
  registerTechnicalRules,
  validateTechnicalIndicators,
  validateRSI,
  validateMACD,
  validateMovingAverages,
  validateBollingerBands,
  validateADX,
  validateATR,
  validateVWAP,
  validateIchimoku,
  buildTechnicalRules,
  getTechnicalValidationMetrics,
  DEFAULT_TECHNICAL_VALIDATION_CONFIG,
} from "./technical";

export type {
  TechnicalValidationConfig,
  TechnicalValidationConfigInput,
  TechnicalValidationMetrics,
} from "./technical";

/** Prompt 9F.5 fundamental validation library re-exports. */
export {
  registerFundamentalRules,
  validateFundamentals,
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  validateFinancialRatios,
  validateTTM,
  validateShareholding,
  buildFundamentalRules,
  getFundamentalValidationMetrics,
  DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG,
} from "./fundamental";

export type {
  FundamentalValidationConfig,
  FundamentalValidationConfigInput,
  FundamentalValidationMetrics,
} from "./fundamental";

/** Prompt 9F.6 AI recommendation validation library re-exports. */
export {
  registerRecommendationRules,
  validateRecommendation,
  validateRecommendationReasoning,
  validateRecommendationConfidence,
  validateRecommendationAlignment,
  calculateRecommendationQualityScore,
  buildRecommendationRules,
  getRecommendationValidationMetrics,
  getRecommendationAuditLog,
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
} from "./recommendation";

export type {
  RecommendationValidationConfig,
  RecommendationValidationConfigInput,
  RecommendationValidationMetrics,
  RecommendationAction,
  RecommendationAuditEntry,
  RecommendationQualityScoreResult,
} from "./recommendation";

/** Prompt 9F.7 trade setup validation library re-exports. */
export {
  registerTradeSetupRules,
  validateTradeSetup,
  validateEntry,
  validateStopLoss,
  validateTargets,
  validateRiskReward,
  calculateTradeSetupQuality,
  buildTradeSetupRules,
  getTradeSetupValidationMetrics,
  getTradeSetupAuditLog,
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
} from "./tradeSetup";

export type {
  TradeSetupValidationConfig,
  TradeSetupValidationConfigInput,
  TradeSetupValidationMetrics,
  TradeSide,
  TradeSetupAuditEntry,
  TradeSetupQualityScoreResult,
} from "./tradeSetup";
