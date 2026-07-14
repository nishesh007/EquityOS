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
