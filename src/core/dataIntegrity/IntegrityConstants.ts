/**
 * Institutional Data Integrity Engine — constants.
 * No magic numbers: all thresholds and labels live here.
 */

import type {
  IntegrityScoreBand,
  IntegrityStatus,
  RuleCategory,
  RuleSeverity,
} from "./IntegrityTypes";

/** Module version stamped on every IntegrityResult. */
export const INTEGRITY_ENGINE_VERSION = "1.0.0";

/** Minimum integrity score required for a dataset to be approved. */
export const INTEGRITY_SCORE_THRESHOLD = 70;

/** Score band boundaries (inclusive lower bound → status label). */
export const INTEGRITY_SCORE_BANDS: ReadonlyArray<{
  min: number;
  label: IntegrityScoreBand;
}> = [
  { min: 100, label: "Perfect" },
  { min: 95, label: "Excellent" },
  { min: 90, label: "Good" },
  { min: 80, label: "Acceptable" },
  { min: 70, label: "Risk" },
  { min: 0, label: "Rejected" },
] as const;

/** Score deductions by rule severity. */
export const SEVERITY_SCORE_PENALTY: Readonly<Record<RuleSeverity, number>> = {
  INFO: 0,
  WARNING: 3,
  ERROR: 10,
  CRITICAL: 40,
} as const;

/** Confidence deductions by rule severity. */
export const SEVERITY_CONFIDENCE_PENALTY: Readonly<Record<RuleSeverity, number>> = {
  INFO: 0,
  WARNING: 2,
  ERROR: 8,
  CRITICAL: 25,
} as const;

/** Pipeline stage order — rules execute in this category sequence. */
export const PIPELINE_STAGE_ORDER: readonly RuleCategory[] = [
  "SCHEMA",
  "NULL",
  "TYPE",
  "RANGE",
  "LOGICAL",
  "TIMESTAMP",
  "DUPLICATE",
] as const;

/** Severity rank used for priority / early-termination checks. */
export const SEVERITY_RANK: Readonly<Record<RuleSeverity, number>> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3,
} as const;

/** Status labels for approved / rejected / warning outcomes. */
export const INTEGRITY_STATUS = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WARNING: "WARNING",
} as const satisfies Record<string, IntegrityStatus>;

/** Default max values for common range checks (configurable via IntegrityConfig). */
export const DEFAULT_RANGE_LIMITS = {
  rsiMax: 100,
  rsiMin: 0,
  adxMax: 100,
  adxMin: 0,
  peMax: 500,
  peMin: -100,
  pbMax: 100,
  pbMin: 0,
  dividendYieldMax: 100,
  dividendYieldMin: 0,
  marketCapMax: 1e15,
  marketCapMin: 0,
  atrMin: 0,
} as const;

/** Structured log event names. */
export const LOG_EVENTS = {
  VALIDATION_START: "integrity.validation.start",
  VALIDATION_END: "integrity.validation.end",
  RULES_EXECUTED: "integrity.rules.executed",
  FAILURES: "integrity.failures",
  WARNINGS: "integrity.warnings",
  SCORE: "integrity.score",
  REJECTED: "integrity.dataset.rejected",
  APPROVED: "integrity.dataset.approved",
} as const;

/** Logger service identifier. */
export const INTEGRITY_LOGGER_SERVICE = "equityos-data-integrity";
