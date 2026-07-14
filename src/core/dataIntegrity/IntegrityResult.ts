/**
 * Institutional Data Integrity Engine — result model helpers.
 * Every validation returns a full IntegrityResult — never a bare boolean.
 */

import {
  INTEGRITY_ENGINE_VERSION,
  INTEGRITY_SCORE_BANDS,
  INTEGRITY_SCORE_THRESHOLD,
  SEVERITY_CONFIDENCE_PENALTY,
  SEVERITY_SCORE_PENALTY,
} from "./IntegrityConstants";
import type {
  DatasetType,
  IntegrityIssue,
  IntegrityResult,
  IntegrityScoreBand,
  IntegrityStatus,
  RuleSeverity,
} from "./IntegrityTypes";

export function getScoreBand(score: number): IntegrityScoreBand {
  const clamped = Math.max(0, Math.min(100, score));
  for (const band of INTEGRITY_SCORE_BANDS) {
    if (clamped >= band.min) {
      return band.label;
    }
  }
  return "Rejected";
}

export function calculateIntegrityScore(issues: IntegrityIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_SCORE_PENALTY[issue.ruleLevel];
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateConfidence(issues: IntegrityIssue[]): number {
  let confidence = 100;
  for (const issue of issues) {
    confidence -= SEVERITY_CONFIDENCE_PENALTY[issue.ruleLevel];
  }
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

export function resolveStatus(
  score: number,
  issues: IntegrityIssue[],
  scoreThreshold: number = INTEGRITY_SCORE_THRESHOLD
): IntegrityStatus {
  const hasCritical = issues.some((i) => i.ruleLevel === "CRITICAL");
  if (hasCritical || score < scoreThreshold) {
    return "REJECTED";
  }
  const hasWarningOrError = issues.some(
    (i) => i.ruleLevel === "WARNING" || i.ruleLevel === "ERROR"
  );
  if (hasWarningOrError) {
    return "WARNING";
  }
  return "APPROVED";
}

export interface BuildIntegrityResultInput {
  datasetType: DatasetType;
  dataSource: string;
  data: unknown;
  errors: IntegrityIssue[];
  warnings: IntegrityIssue[];
  passedRules: string[];
  failedRules: string[];
  executionTime: number;
  terminatedEarly: boolean;
  scoreThreshold?: number;
  version?: string;
}

export function buildIntegrityResult(
  input: BuildIntegrityResultInput
): IntegrityResult {
  const allIssues = [...input.errors, ...input.warnings];
  const integrityScore = calculateIntegrityScore(allIssues);
  const confidence = calculateConfidence(allIssues);
  const scoreThreshold = input.scoreThreshold ?? INTEGRITY_SCORE_THRESHOLD;
  const status = resolveStatus(integrityScore, allIssues, scoreThreshold);
  const scoreBand = getScoreBand(integrityScore);

  let message: string;
  if (status === "APPROVED") {
    message = `Dataset approved with integrity score ${integrityScore} (${scoreBand}).`;
  } else if (status === "WARNING") {
    message = `Dataset approved with warnings; integrity score ${integrityScore} (${scoreBand}).`;
  } else {
    message = input.terminatedEarly
      ? `Dataset rejected due to CRITICAL validation failure; score ${integrityScore} (${scoreBand}).`
      : `Dataset rejected; integrity score ${integrityScore} below threshold ${scoreThreshold} (${scoreBand}).`;
  }

  return {
    status,
    integrityScore,
    confidence,
    scoreBand,
    errors: input.errors,
    warnings: input.warnings,
    passedRules: input.passedRules,
    failedRules: input.failedRules,
    executionTime: input.executionTime,
    validatedAt: new Date().toISOString(),
    dataSource: input.dataSource,
    datasetType: input.datasetType,
    version: input.version ?? INTEGRITY_ENGINE_VERSION,
    data: input.data,
    terminatedEarly: input.terminatedEarly,
    message,
  };
}

export function createIssue(
  ruleId: string,
  ruleName: string,
  category: IntegrityIssue["category"],
  ruleLevel: RuleSeverity,
  message: string,
  extras?: Pick<IntegrityIssue, "field" | "path" | "expected" | "actual">
): IntegrityIssue {
  return {
    ruleId,
    ruleName,
    category,
    ruleLevel,
    message,
    ...extras,
  };
}
