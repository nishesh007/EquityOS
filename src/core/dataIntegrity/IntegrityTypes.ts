/**
 * Institutional Data Integrity Engine — shared types.
 * Generic across all EquityOS dataset kinds; no stock-specific hardcoding.
 */

/** Supported institutional dataset kinds. */
export type DatasetType =
  | "STOCK_QUOTE"
  | "OHLC_CANDLE"
  | "INTRADAY_CANDLE"
  | "TECHNICAL_INDICATOR"
  | "FUNDAMENTAL_DATA"
  | "FINANCIAL_STATEMENT"
  | "CORPORATE_ACTION"
  | "DIVIDEND"
  | "SPLIT"
  | "BONUS"
  | "NEWS"
  | "AI_OUTPUT"
  | "PORTFOLIO_POSITION"
  | "WATCHLIST_ITEM"
  | "RESEARCH_REPORT"
  | "HISTORICAL_DATASET"
  | "BACKTEST_DATASET";

/** Validation pipeline stage categories. */
export type RuleCategory =
  | "SCHEMA"
  | "NULL"
  | "TYPE"
  | "RANGE"
  | "LOGICAL"
  | "TIMESTAMP"
  | "DUPLICATE";

/** Rule severity — CRITICAL terminates the pipeline immediately. */
export type RuleSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

/** Final validation outcome status. */
export type IntegrityStatus = "APPROVED" | "REJECTED" | "WARNING";

/** Human-readable integrity score band. */
export type IntegrityScoreBand =
  | "Perfect"
  | "Excellent"
  | "Good"
  | "Acceptable"
  | "Risk"
  | "Rejected";

/** Logging verbosity. */
export type IntegrityLogLevel = "debug" | "info" | "warn" | "error" | "silent";

/** Runtime environment mode. */
export type IntegrityEnvironment = "development" | "production";

/** A single validation issue (error or warning). */
export interface IntegrityIssue {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  /** Severity: INFO | WARNING | ERROR | CRITICAL */
  ruleLevel: RuleSeverity;
  message: string;
  field?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}

/** Outcome produced by a single rule execution. */
export interface RuleValidationOutcome {
  passed: boolean;
  message?: string;
  field?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
  /** Optional mutated / de-duplicated payload for DUPLICATE rules. */
  data?: unknown;
}

/** Context passed into every rule validator. */
export interface ValidationContext {
  data: unknown;
  datasetType: DatasetType;
  dataSource: string;
  config: import("./IntegrityConfig").IntegrityConfig;
  /** Optional metadata (timezone, session calendar, etc.). */
  metadata?: Record<string, unknown>;
}

/** Rule definition stored in the central registry. */
export interface IntegrityRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  /** Severity: INFO | WARNING | ERROR | CRITICAL — CRITICAL stops the pipeline. */
  ruleLevel: RuleSeverity;
  /** Lower number = higher priority (executed first within a stage). */
  priority: number;
  enabled: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  /** When set, rule only applies to these dataset types. */
  datasetTypes?: readonly DatasetType[];
  validate: (
    ctx: ValidationContext
  ) => RuleValidationOutcome | Promise<RuleValidationOutcome>;
}

/** Input for a single validation request. */
export interface ValidateRequest {
  data: unknown;
  datasetType: DatasetType;
  dataSource?: string;
  metadata?: Record<string, unknown>;
  /** Override config for this request only. */
  configOverrides?: Partial<import("./IntegrityConfig").IntegrityConfigSnapshot>;
}

/** Input for batch validation. */
export interface ValidateBatchRequest {
  items: ValidateRequest[];
  /** When true, validate items concurrently (default true). */
  parallel?: boolean;
}

/** Full structured result returned by every validation. */
export interface IntegrityResult {
  status: IntegrityStatus;
  integrityScore: number;
  confidence: number;
  scoreBand: IntegrityScoreBand;
  errors: IntegrityIssue[];
  warnings: IntegrityIssue[];
  passedRules: string[];
  failedRules: string[];
  executionTime: number;
  validatedAt: string;
  dataSource: string;
  datasetType: DatasetType;
  version: string;
  /** Cleaned / de-duplicated payload when approved (or partial when rejected). */
  data: unknown;
  /** True when a CRITICAL rule aborted the pipeline early. */
  terminatedEarly: boolean;
  message: string;
}

/** Snapshot of integrity metrics for dashboard integration. */
export interface IntegrityMetricsSnapshot {
  datasetsValidated: number;
  datasetsApproved: number;
  datasetsRejected: number;
  averageIntegrityScore: number;
  averageExecutionTime: number;
  criticalErrors: number;
  warningCount: number;
  successRate: number;
  failureRate: number;
  totalExecutionTime: number;
  lastValidatedAt: string | null;
}

/** Options for constructing / resetting the engine. */
export interface DataIntegrityEngineOptions {
  config?: Partial<import("./IntegrityConfig").IntegrityConfigSnapshot>;
  /** When false, skip registering built-in foundational rules. */
  registerBuiltInRules?: boolean;
}
