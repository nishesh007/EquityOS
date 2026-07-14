/**
 * Institutional Data Integrity Engine — public module exports.
 *
 * Sprint 9F foundation + advanced rule execution framework (9F.2).
 * Do not import raw provider data into application modules without validate().
 */

export {
  DataIntegrityEngine,
  getDataIntegrityEngine,
  resetDataIntegrityEngine,
  validate,
  validateBatch,
  calculateIntegrityScore,
  registerRule,
  getMetrics,
  executeRules,
  registerRules,
  removeRule,
  getRuleMetrics,
  getAuditHistory,
} from "./DataIntegrityEngine";

export { ValidationPipeline, createBuiltInRules } from "./ValidationPipeline";

export { IntegrityRuleRegistry } from "./IntegrityRuleRegistry";

export {
  buildIntegrityResult,
  calculateIntegrityScore as computeIntegrityScore,
  calculateConfidence,
  getScoreBand,
  resolveStatus,
  createIssue,
} from "./IntegrityResult";

export { IntegrityLogger } from "./IntegrityLogger";
export type { IntegrityLogEntry, IntegrityLogSink } from "./IntegrityLogger";

export { IntegrityMetrics } from "./IntegrityMetrics";

export {
  INTEGRITY_ENGINE_VERSION,
  INTEGRITY_SCORE_THRESHOLD,
  INTEGRITY_SCORE_BANDS,
  SEVERITY_SCORE_PENALTY,
  SEVERITY_CONFIDENCE_PENALTY,
  PIPELINE_STAGE_ORDER,
  SEVERITY_RANK,
  INTEGRITY_STATUS,
  DEFAULT_RANGE_LIMITS,
  LOG_EVENTS,
  INTEGRITY_LOGGER_SERVICE,
} from "./IntegrityConstants";

export { IntegrityConfig } from "./IntegrityConfig";
export type { IntegrityConfigSnapshot, RangeLimits } from "./IntegrityConfig";

export type {
  DatasetType,
  RuleCategory,
  RuleSeverity,
  IntegrityStatus,
  IntegrityScoreBand,
  IntegrityLogLevel,
  IntegrityEnvironment,
  IntegrityIssue,
  RuleValidationOutcome,
  ValidationContext,
  IntegrityRule,
  ValidateRequest,
  ValidateBatchRequest,
  IntegrityResult,
  IntegrityMetricsSnapshot,
  DataIntegrityEngineOptions,
} from "./IntegrityTypes";

/** Prompt 9F.2 advanced rule engine exports. */
export {
  RuleEngine,
  RuleFactory,
  BaseRule,
  FunctionalRule,
  RuleExecutor,
  RuleDependencyResolver,
  CircularDependencyError,
  MissingDependencyError,
  RuleScheduler,
  RulePerformanceTracker,
  RuleCache,
  RuleVersionManager,
  RuleAuditLogger,
  PRIORITY_BAND_RANK,
  DEFAULT_RULE_TIMEOUT_MS,
  DEFAULT_CACHE_TTL_MS,
} from "./rules";

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
  RuleEngineOptions,
  ScheduleWave,
  RuleVersionRecord,
} from "./rules";

/** Prompt 9F.3 institutional market validation library. */
export {
  registerMarketRules,
  validateMarketData,
  validateOHLC,
  validateQuote,
  validateVolume,
  validateCorporateAdjustments,
  buildMarketRules,
  getMarketValidationMetrics,
  resetMarketValidationMetrics,
  DEFAULT_MARKET_VALIDATION_CONFIG,
} from "./rules/market";

export type {
  MarketValidationConfig,
  MarketValidationConfigInput,
  MarketValidationMetrics,
} from "./rules/market";

/** Prompt 9F.4 institutional technical indicator validation library. */
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
  resetTechnicalValidationMetrics,
  DEFAULT_TECHNICAL_VALIDATION_CONFIG,
} from "./rules/technical";

export type {
  TechnicalValidationConfig,
  TechnicalValidationConfigInput,
  TechnicalValidationMetrics,
} from "./rules/technical";
