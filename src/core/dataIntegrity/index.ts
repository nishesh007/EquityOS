/**
 * Institutional Data Integrity Engine — public module exports.
 *
 * Sprint 9F foundation. Future validation modules must depend on this engine.
 * Do not import raw provider data into application modules without validate().
 */

export { DataIntegrityEngine, getDataIntegrityEngine, resetDataIntegrityEngine, validate, validateBatch, calculateIntegrityScore, registerRule, getMetrics } from "./DataIntegrityEngine";

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
