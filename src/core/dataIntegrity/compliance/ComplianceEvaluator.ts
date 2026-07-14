/**
 * Compliance evaluator — applies rule book checks against observations.
 */

import type { ComplianceConfiguration } from "./ComplianceConfiguration";
import type { ComplianceObservation } from "./ComplianceRegistry";
import type {
  ComplianceRuleBook,
  ComplianceRuleDefinition,
  ComplianceObservationFields,
} from "./ComplianceRuleBook";
import {
  createViolationId,
  tierToSeverity,
  type ComplianceViolation,
} from "./ComplianceViolations";

export interface ComplianceEvaluationResult {
  evaluatedAt: string;
  ruleBookVersion: string;
  profileId: string;
  violations: ComplianceViolation[];
  passedRuleIds: string[];
  failedRuleIds: string[];
  skippedRuleIds: string[];
  warnings: string[];
  errors: string[];
}

export class ComplianceEvaluator {
  constructor(private config: ComplianceConfiguration) {}

  setConfiguration(config: ComplianceConfiguration): void {
    this.config = config;
  }

  evaluate(
    observations: ComplianceObservation[],
    ruleBook: ComplianceRuleBook
  ): ComplianceEvaluationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const violations: ComplianceViolation[] = [];
    const passedRuleIds: string[] = [];
    const failedRuleIds: string[] = [];
    const skippedRuleIds: string[] = [];

    try {
      const merged = mergeObservations(observations);

      for (const rule of ruleBook.rules) {
        try {
          const outcome = evaluateRule(rule, merged, observations);
          if (outcome.status === "skip") {
            skippedRuleIds.push(rule.ruleId);
            if (outcome.warning) warnings.push(outcome.warning);
            continue;
          }
          if (outcome.status === "pass") {
            passedRuleIds.push(rule.ruleId);
            continue;
          }

          failedRuleIds.push(rule.ruleId);
          const severity = tierToSeverity(rule.tier);
          if (
            this.config.mode === "relaxed" &&
            severity === "WARNING" &&
            !this.config.strictCompliance
          ) {
            // Still record as violation but keep going
          }
          violations.push({
            violationId: createViolationId(rule.ruleId),
            ruleId: rule.ruleId,
            title: rule.title,
            domain: rule.domain,
            severity,
            evidence: outcome.evidence,
            affectedModules: outcome.affectedModules,
            suggestedResolution: rule.suggestedResolution,
            confidence: outcome.confidence,
            detectedAt: new Date().toISOString(),
          });
        } catch (err) {
          errors.push(
            `Rule ${rule.ruleId} evaluation failed: ${String(err)}`
          );
          skippedRuleIds.push(rule.ruleId);
        }
      }

      return {
        evaluatedAt: new Date().toISOString(),
        ruleBookVersion: ruleBook.version,
        profileId: ruleBook.profileId,
        violations,
        passedRuleIds,
        failedRuleIds,
        skippedRuleIds,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Compliance evaluation failed: ${String(err)}`);
      return {
        evaluatedAt: new Date().toISOString(),
        ruleBookVersion: ruleBook.version,
        profileId: ruleBook.profileId,
        violations: [],
        passedRuleIds: [],
        failedRuleIds: [],
        skippedRuleIds: ruleBook.rules.map((r) => r.ruleId),
        warnings,
        errors,
      };
    }
  }
}

interface RuleOutcome {
  status: "pass" | "fail" | "skip";
  evidence: string[];
  affectedModules: string[];
  confidence: number;
  warning?: string;
}

function evaluateRule(
  rule: ComplianceRuleDefinition,
  merged: ComplianceObservationFields,
  observations: ComplianceObservation[]
): RuleOutcome {
  const modules = [...new Set(observations.map((o) => o.module))];
  const check = rule.check;

  if (check.kind === "custom") {
    return {
      status: "skip",
      evidence: [`custom evaluator ${check.evaluatorId} not bound`],
      affectedModules: modules,
      confidence: 0,
      warning: `Skipped custom rule ${rule.ruleId}.`,
    };
  }

  if (check.kind === "flag") {
    const value = merged[check.field];
    if (value === undefined) {
      if (check.expect === false) {
        // Absence of a negative flag is treated as pass
        return {
          status: "pass",
          evidence: [`${String(check.field)}=undefined (treated as false)`],
          affectedModules: modules,
          confidence: 0.7,
        };
      }
      return {
        status: "fail",
        evidence: [`${String(check.field)} missing; expected ${check.expect}`],
        affectedModules: modules,
        confidence: 0.75,
      };
    }
    const ok = Boolean(value) === check.expect;
    return {
      status: ok ? "pass" : "fail",
      evidence: [`${String(check.field)}=${String(value)}`],
      affectedModules: modules,
      confidence: 0.9,
    };
  }

  if (check.kind === "min") {
    const value = merged[check.field];
    if (typeof value !== "number") {
      return {
        status: "fail",
        evidence: [`${String(check.field)} missing; required min ${check.min}`],
        affectedModules: modules,
        confidence: 0.8,
      };
    }
    return {
      status: value >= check.min ? "pass" : "fail",
      evidence: [`${String(check.field)}=${value}`, `min=${check.min}`],
      affectedModules: modules,
      confidence: 0.9,
    };
  }

  if (check.kind === "max") {
    const value = merged[check.field];
    if (typeof value !== "number") {
      return {
        status: "pass",
        evidence: [`${String(check.field)}=undefined (treated as 0)`],
        affectedModules: modules,
        confidence: 0.7,
      };
    }
    return {
      status: value <= check.max ? "pass" : "fail",
      evidence: [`${String(check.field)}=${value}`, `max=${check.max}`],
      affectedModules: modules,
      confidence: 0.9,
    };
  }

  if (check.kind === "present") {
    const value = merged[check.field];
    const ok = value !== undefined && value !== null;
    return {
      status: ok ? "pass" : "fail",
      evidence: [`${String(check.field)}=${String(value)}`],
      affectedModules: modules,
      confidence: 0.85,
    };
  }

  if (check.kind === "versionsMatch") {
    const actual = merged[check.actualField];
    const expected = merged[check.expectedField];
    if (actual === undefined || expected === undefined) {
      return {
        status: "skip",
        evidence: ["version fields incomplete"],
        affectedModules: modules,
        confidence: 0,
        warning: `Skipped version match for ${rule.ruleId}.`,
      };
    }
    return {
      status: actual === expected ? "pass" : "fail",
      evidence: [`configVersion=${actual}`, `expectedConfigVersion=${expected}`],
      affectedModules: modules,
      confidence: 0.95,
    };
  }

  return {
    status: "skip",
    evidence: ["unknown check"],
    affectedModules: modules,
    confidence: 0,
  };
}

function mergeObservations(
  observations: ComplianceObservation[]
): ComplianceObservationFields {
  const merged: ComplianceObservationFields = {};
  for (const o of observations) {
    mergeNum(merged, "policiesPresent", o.policiesPresent, Math.max);
    mergeNum(merged, "policiesEnabled", o.policiesEnabled, Math.max);
    mergeNum(merged, "criticalRulesDisabled", o.criticalRulesDisabled, Math.max);
    mergeNum(merged, "rulesEnabled", o.rulesEnabled, Math.max);
    mergeNum(merged, "rulesTotal", o.rulesTotal, Math.max);
    mergeNum(merged, "healthScore", o.healthScore, Math.min);
    mergeNum(merged, "reliabilityScore", o.reliabilityScore, Math.min);
    mergeNum(merged, "observabilityScore", o.observabilityScore, Math.min);
    mergeNum(merged, "trustScore", o.trustScore, Math.min);
    mergeNum(merged, "availability", o.availability, Math.min);

    if (o.auditEnabled === false) merged.auditEnabled = false;
    else if (o.auditEnabled === true && merged.auditEnabled !== false)
      merged.auditEnabled = true;

    if (o.monitoringEnabled === false) merged.monitoringEnabled = false;
    else if (o.monitoringEnabled === true && merged.monitoringEnabled !== false)
      merged.monitoringEnabled = true;

    if (o.reportingEnabled === false) merged.reportingEnabled = false;
    else if (o.reportingEnabled === true && merged.reportingEnabled !== false)
      merged.reportingEnabled = true;

    if (o.diagnosticsEnabled === false) merged.diagnosticsEnabled = false;
    else if (o.diagnosticsEnabled === true && merged.diagnosticsEnabled !== false)
      merged.diagnosticsEnabled = true;

    if (o.configurationDrift === true) merged.configurationDrift = true;
    else if (
      o.configurationDrift === false &&
      merged.configurationDrift !== true
    )
      merged.configurationDrift = false;

    if (o.dependencyOk === false) merged.dependencyOk = false;
    else if (o.dependencyOk === true && merged.dependencyOk !== false)
      merged.dependencyOk = true;

    if (o.versionMismatch === true) merged.versionMismatch = true;
    else if (o.versionMismatch === false && merged.versionMismatch !== true)
      merged.versionMismatch = false;

    if (o.auditGap === true) merged.auditGap = true;
    else if (o.auditGap === false && merged.auditGap !== true)
      merged.auditGap = false;

    if (o.monitoringGap === true) merged.monitoringGap = true;
    else if (o.monitoringGap === false && merged.monitoringGap !== true)
      merged.monitoringGap = false;

    if (o.reportingGap === true) merged.reportingGap = true;
    else if (o.reportingGap === false && merged.reportingGap !== true)
      merged.reportingGap = false;

    if (o.governanceViolation === true) merged.governanceViolation = true;
    else if (
      o.governanceViolation === false &&
      merged.governanceViolation !== true
    )
      merged.governanceViolation = false;

    if (o.configVersion) merged.configVersion = o.configVersion;
    if (o.expectedConfigVersion)
      merged.expectedConfigVersion = o.expectedConfigVersion;
  }
  return merged;
}

function mergeNum(
  target: ComplianceObservationFields,
  field: keyof ComplianceObservationFields,
  value: number | undefined,
  reducer: (a: number, b: number) => number
): void {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const current = target[field];
  if (typeof current !== "number") {
    (target as Record<string, unknown>)[field] = value;
    return;
  }
  (target as Record<string, unknown>)[field] = reducer(current, value);
}
