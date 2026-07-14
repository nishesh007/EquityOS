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
