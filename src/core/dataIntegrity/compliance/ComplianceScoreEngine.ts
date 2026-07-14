/**
 * Compliance Score Engine — 0–100 weighted institutional compliance score.
 */

import type {
  ComplianceConfiguration,
  ComplianceScoreWeights,
} from "./ComplianceConfiguration";
import type { ComplianceViolation } from "./ComplianceViolations";
import { severityRank } from "./ComplianceViolations";
import type { ComplianceAuditResult } from "./ComplianceAuditor";
import type { PolicyEvaluationResult } from "./CompliancePolicyEngine";
import type { ComplianceEvaluationResult } from "./ComplianceEvaluator";

export interface ComplianceScoreBreakdown {
  policyCoverage: number;
  governanceQuality: number;
  auditCoverage: number;
  configurationHealth: number;
  operationalReadiness: number;
  monitoringCoverage: number;
  overall: number;
}

export class ComplianceScoreEngine {
  constructor(private config: ComplianceConfiguration) {}

  setConfiguration(config: ComplianceConfiguration): void {
    this.config = config;
  }

  score(input: {
    policyResult: PolicyEvaluationResult;
    evaluation: ComplianceEvaluationResult;
    audit: ComplianceAuditResult;
    violations: ComplianceViolation[];
  }): ComplianceScoreBreakdown {
    const weights = this.config.scoreWeights;
    const policyCoverage = clamp(input.policyResult.policyCoveragePercent, 0, 100);
    const auditCoverage = clamp(input.audit.auditCoveragePercent, 0, 100);
    const monitoringCoverage = clamp(
      input.audit.monitoringCoveragePercent,
      0,
      100
    );

    const governanceQuality = scoreFromViolations(
      input.violations.filter(
        (v) =>
          v.domain === "VALIDATION_GOVERNANCE" ||
          v.domain === "POLICY_COMPLIANCE" ||
          v.domain === "INSTITUTIONAL_STANDARDS"
      )
    );

    const configurationHealth = scoreFromViolations(
      input.violations.filter(
        (v) => v.domain === "CONFIGURATION_COMPLIANCE"
      )
    );

    const operationalReadiness = scoreFromViolations(
      input.violations.filter(
        (v) =>
          v.domain === "OPERATIONAL_READINESS" ||
          v.domain === "RELIABILITY_COMPLIANCE" ||
          v.domain === "EXECUTION_COMPLIANCE" ||
          v.domain === "SECURITY_READINESS"
      )
    );

    const overall = weightedOverall(
      {
        policyCoverage,
        governanceQuality,
        auditCoverage,
        configurationHealth,
        operationalReadiness,
        monitoringCoverage,
      },
      weights
    );

    return {
      policyCoverage: round2(policyCoverage),
      governanceQuality: round2(governanceQuality),
      auditCoverage: round2(auditCoverage),
      configurationHealth: round2(configurationHealth),
      operationalReadiness: round2(operationalReadiness),
      monitoringCoverage: round2(monitoringCoverage),
      overall: round2(overall),
    };
  }
}

function scoreFromViolations(violations: ComplianceViolation[]): number {
  if (violations.length === 0) return 100;
  let penalty = 0;
  for (const v of violations) {
    const rank = severityRank(v.severity);
    penalty += rank * 4 * v.confidence;
  }
  return clamp(100 - penalty, 0, 100);
}

function weightedOverall(
  parts: Omit<ComplianceScoreBreakdown, "overall">,
  weights: ComplianceScoreWeights
): number {
  return (
    parts.policyCoverage * weights.policyCoverage +
    parts.governanceQuality * weights.governanceQuality +
    parts.auditCoverage * weights.auditCoverage +
    parts.configurationHealth * weights.configurationHealth +
    parts.operationalReadiness * weights.operationalReadiness +
    parts.monitoringCoverage * weights.monitoringCoverage
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
