/**
 * Advanced Rule Engine — shared types for institutional rule execution.
 * Extends Prompt 1 without modifying IntegrityTypes.
 */

import type {
  DatasetType,
  RuleSeverity,
  RuleValidationOutcome,
  ValidationContext,
} from "../IntegrityTypes";

/** Domain rule categories (Prompt 9F.2). */
export type AdvancedRuleCategory =
  | "PRICE"
  | "OHLC"
  | "INDICATOR"
  | "VOLUME"
  | "FUNDAMENTAL"
  | "CORPORATE_ACTION"
  | "PORTFOLIO"
  | "WATCHLIST"
  | "AI"
  | "HISTORICAL"
  | "NEWS"
  | "CUSTOM";

/** Execution priority bands. */
export type RulePriorityBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** How a rule (or group) is scheduled. */
export type RuleExecutionMode =
  | "SEQUENTIAL"
  | "PARALLEL"
  | "CONDITIONAL"
  | "LAZY"
  | "BATCH";

/** Numeric rank for priority bands (lower = earlier). */
export const PRIORITY_BAND_RANK: Readonly<Record<RulePriorityBand, number>> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const DEFAULT_RULE_TIMEOUT_MS = 5_000;
export const DEFAULT_CACHE_TTL_MS = 60_000;

/** Full institutional rule definition. */
export interface AdvancedRuleDefinition {
  id: string;
  name: string;
  description: string;
  category: AdvancedRuleCategory;
  /** Priority band used by the scheduler. */
  priority: RulePriorityBand;
  /** Severity: INFO | WARNING | ERROR | CRITICAL */
  ruleLevel: RuleSeverity;
  version: string;
  enabled: boolean;
  dependencies: string[];
  executionMode: RuleExecutionMode;
  /** Per-rule timeout in milliseconds. */
  timeout: number;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  /** Optional dataset-type filter. */
  datasetTypes?: readonly DatasetType[];
  /**
   * For CONDITIONAL mode: skip unless predicate returns true.
   * Defaults to always true when omitted.
   */
  condition?: (ctx: ValidationContext) => boolean | Promise<boolean>;
  /** Deterministic cache key factory; when omitted, caching is disabled for the rule. */
  cacheKey?: (ctx: ValidationContext) => string | null;
  validate: (
    ctx: ValidationContext
  ) => RuleValidationOutcome | Promise<RuleValidationOutcome>;
}

export type RuleExecutionStatus =
  | "PASSED"
  | "FAILED"
  | "SKIPPED"
  | "TIMEOUT"
  | "ERROR"
  | "CACHED";

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  status: RuleExecutionStatus;
  passed: boolean;
  skipped: boolean;
  timedOut: boolean;
  fromCache: boolean;
  executionTime: number;
  outcome?: RuleValidationOutcome;
  error?: string;
  /** Score penalty contribution based on ruleLevel when failed. */
  scoreImpact: number;
  version: string;
}

export type RuleEngineEventType =
  | "RuleStarted"
  | "RuleCompleted"
  | "RuleFailed"
  | "RuleSkipped"
  | "ValidationCompleted";

export interface RuleEngineEvent {
  type: RuleEngineEventType;
  ruleId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type RuleEngineEventListener = (event: RuleEngineEvent) => void;

export interface ExecuteRulesRequest {
  data: unknown;
  datasetType: DatasetType;
  dataSource?: string;
  metadata?: Record<string, unknown>;
  config?: import("../IntegrityConfig").IntegrityConfig;
  /** Limit execution to these rule IDs (optional). */
  ruleIds?: string[];
  /** Override default cache behavior for this run. */
  useCache?: boolean;
}

export interface ExecuteRulesResult {
  results: RuleExecutionResult[];
  passedRules: string[];
  failedRules: string[];
  skippedRules: string[];
  timedOutRules: string[];
  terminatedEarly: boolean;
  executionTime: number;
  data: unknown;
  events: RuleEngineEvent[];
}

export interface RuleAuditEntry {
  ruleId: string;
  ruleName: string;
  status: RuleExecutionStatus;
  executionTime: number;
  result: string;
  error?: string;
  datasetType: DatasetType;
  dataSource: string;
  scoreImpact: number;
  timestamp: string;
  version: string;
}

export interface RulePerformanceSnapshot {
  ruleId: string;
  executions: number;
  successes: number;
  failures: number;
  skipped: number;
  timeouts: number;
  averageRuntime: number;
  maximumRuntime: number;
  failureRate: number;
  successRate: number;
  skippedRate: number;
  timeoutRate: number;
}

export interface CreateRuleInput {
  id: string;
  name: string;
  description?: string;
  category?: AdvancedRuleCategory;
  priority?: RulePriorityBand;
  ruleLevel?: RuleSeverity;
  version?: string;
  enabled?: boolean;
  dependencies?: string[];
  executionMode?: RuleExecutionMode;
  timeout?: number;
  tags?: string[];
  author?: string;
  datasetTypes?: readonly DatasetType[];
  condition?: AdvancedRuleDefinition["condition"];
  cacheKey?: AdvancedRuleDefinition["cacheKey"];
  validate: AdvancedRuleDefinition["validate"];
}
