/**
 * Compliance policy evaluation — missing policies, coverage, and profile alignment.
 */

import type { ComplianceConfiguration } from "./ComplianceConfiguration";
import type { ComplianceObservation } from "./ComplianceRegistry";
import type { ComplianceRuleBook } from "./ComplianceRuleBook";

export interface PolicyEvaluationFinding {
  code: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "RECOMMENDATION";
  message: string;
  evidence: string[];
  affectedModules: string[];
  confidence: number;
}

export interface PolicyEvaluationResult {
  evaluatedAt: string;
  policiesPresent: number;
  policiesEnabled: number;
  policyCoveragePercent: number;
  missingPolicies: boolean;
  findings: PolicyEvaluationFinding[];
  warnings: string[];
  errors: string[];
}

export class CompliancePolicyEngine {
  constructor(private config: ComplianceConfiguration) {}

  setConfiguration(config: ComplianceConfiguration): void {
    this.config = config;
  }

  evaluate(
    observations: ComplianceObservation[],
    ruleBook: ComplianceRuleBook
  ): PolicyEvaluationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const findings: PolicyEvaluationFinding[] = [];

    try {
      const policyObs = observations.filter(
        (o) =>
          o.sourceId === "admin" ||
          o.sourceId === "policy" ||
          o.policiesPresent !== undefined ||
          o.policiesEnabled !== undefined
      );

      const policiesPresent = maxNum(policyObs.map((o) => o.policiesPresent));
      const policiesEnabled = maxNum(policyObs.map((o) => o.policiesEnabled));

      const mandatoryPolicyRules = ruleBook.rules.filter(
        (r) =>
          r.tier === "MANDATORY" &&
          (r.domain === "POLICY_COMPLIANCE" ||
            r.domain === "VALIDATION_GOVERNANCE")
      );
      const expected = Math.max(1, mandatoryPolicyRules.length);
      const coverage = clamp(
        (policiesEnabled / expected) * 100,
        0,
        100
      );

      const missingPolicies = policiesPresent < 1 || policiesEnabled < 1;
      if (missingPolicies) {
        findings.push({
          code: "MISSING_POLICIES",
          severity: "CRITICAL",
          message: "Required governance policies are missing or disabled.",
          evidence: [
            `policiesPresent=${policiesPresent}`,
            `policiesEnabled=${policiesEnabled}`,
            `profile=${this.config.complianceProfile}`,
          ],
          affectedModules: unique(policyObs.map((o) => o.module)),
          confidence: 0.95,
        });
      }

      if (coverage < 80 && this.config.institutionalMode) {
        findings.push({
          code: "POLICY_COVERAGE_LOW",
          severity: "MAJOR",
          message: "Policy coverage below institutional threshold.",
          evidence: [
            `policyCoveragePercent=${round2(coverage)}`,
            `expectedMandatory=${expected}`,
          ],
          affectedModules: unique(policyObs.map((o) => o.module)),
          confidence: 0.85,
        });
      }

      const modules = unique(observations.map((o) => o.module));
      if (modules.length === 0) {
        warnings.push("No compliance observations available for policy evaluation.");
      }

      return {
        evaluatedAt: new Date().toISOString(),
        policiesPresent,
        policiesEnabled,
        policyCoveragePercent: round2(coverage),
        missingPolicies,
        findings,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Policy evaluation failed: ${String(err)}`);
      return {
        evaluatedAt: new Date().toISOString(),
        policiesPresent: 0,
        policiesEnabled: 0,
        policyCoveragePercent: 0,
        missingPolicies: true,
        findings: [],
        warnings,
        errors,
      };
    }
  }
}

function maxNum(values: Array<number | undefined>): number {
  let max = 0;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) max = Math.max(max, v);
  }
  return max;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
