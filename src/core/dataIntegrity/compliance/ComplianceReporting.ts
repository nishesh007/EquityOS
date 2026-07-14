/**
 * Compliance reporting — summaries, violation and readiness reports.
 */

import type { ComplianceConfiguration } from "./ComplianceConfiguration";
import type { ComplianceScoreBreakdown } from "./ComplianceScoreEngine";
import type { ComplianceViolation } from "./ComplianceViolations";
import { severityRank } from "./ComplianceViolations";
import type { PolicyEvaluationResult } from "./CompliancePolicyEngine";
import type { ComplianceAuditResult } from "./ComplianceAuditor";
import type { ComplianceEvaluationResult } from "./ComplianceEvaluator";

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  profileId: string;
  ruleBookVersion: string;
  summary: ComplianceSummary;
  violationReport: ViolationReportSection;
  governanceReport: GovernanceReportSection;
  policyCoverage: CoverageSection;
  auditCoverage: CoverageSection;
  configurationCoverage: CoverageSection;
  institutionalReadiness: InstitutionalReadinessSection;
  score: ComplianceScoreBreakdown;
  warnings: string[];
  errors: string[];
}

export interface ComplianceSummary {
  compliant: boolean;
  totalViolations: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
  warnings: number;
  recommendations: number;
  complianceScore: number;
}

export interface ViolationReportSection {
  violations: ComplianceViolation[];
  bySeverity: Record<string, number>;
  byDomain: Record<string, number>;
}

export interface GovernanceReportSection {
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  missingPolicies: boolean;
  policyCoveragePercent: number;
}

export interface CoverageSection {
  percent: number;
  status: "OK" | "PARTIAL" | "GAP";
  notes: string[];
}

export interface InstitutionalReadinessSection {
  ready: boolean;
  readinessScore: number;
  blockers: string[];
  recommendations: string[];
}

export class ComplianceReporting {
  constructor(private config: ComplianceConfiguration) {}

  setConfiguration(config: ComplianceConfiguration): void {
    this.config = config;
  }

  generate(input: {
    policyResult: PolicyEvaluationResult;
    evaluation: ComplianceEvaluationResult;
    audit: ComplianceAuditResult;
    violations: ComplianceViolation[];
    score: ComplianceScoreBreakdown;
  }): ComplianceReport {
    try {
      const violations = [...input.violations].sort(
        (a, b) => severityRank(b.severity) - severityRank(a.severity)
      );

      const bySeverity: Record<string, number> = {};
      const byDomain: Record<string, number> = {};
      for (const v of violations) {
        bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;
        byDomain[v.domain] = (byDomain[v.domain] ?? 0) + 1;
      }

      const critical = bySeverity.CRITICAL ?? 0;
      const major = bySeverity.MAJOR ?? 0;
      const compliant =
        critical === 0 &&
        (!this.config.strictCompliance || major === 0) &&
        input.score.overall >= 70;

      const blockers = violations
        .filter((v) => v.severity === "CRITICAL" || v.severity === "MAJOR")
        .slice(0, 10)
        .map((v) => v.title);

      const recommendations = violations
        .filter(
          (v) =>
            v.severity === "WARNING" || v.severity === "RECOMMENDATION"
        )
        .slice(0, 10)
        .map((v) => v.suggestedResolution);

      return {
        reportId: `crep:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        generatedAt: new Date().toISOString(),
        profileId: this.config.complianceProfile,
        ruleBookVersion: this.config.ruleBookVersion,
        summary: {
          compliant,
          totalViolations: violations.length,
          criticalViolations: critical,
          majorViolations: major,
          minorViolations: bySeverity.MINOR ?? 0,
          warnings: bySeverity.WARNING ?? 0,
          recommendations: bySeverity.RECOMMENDATION ?? 0,
          complianceScore: input.score.overall,
        },
        violationReport: { violations, bySeverity, byDomain },
        governanceReport: {
          passedRules: input.evaluation.passedRuleIds.length,
          failedRules: input.evaluation.failedRuleIds.length,
          skippedRules: input.evaluation.skippedRuleIds.length,
          missingPolicies: input.policyResult.missingPolicies,
          policyCoveragePercent: input.policyResult.policyCoveragePercent,
        },
        policyCoverage: coverageSection(
          input.policyResult.policyCoveragePercent,
          input.policyResult.missingPolicies
            ? ["Missing or disabled policies."]
            : []
        ),
        auditCoverage: coverageSection(input.audit.auditCoveragePercent, []),
        configurationCoverage: coverageSection(
          input.score.configurationHealth,
          violations
            .filter((v) => v.domain === "CONFIGURATION_COMPLIANCE")
            .map((v) => v.title)
        ),
        institutionalReadiness: {
          ready: compliant && blockers.length === 0,
          readinessScore: input.score.overall,
          blockers,
          recommendations,
        },
        score: { ...input.score },
        warnings: [
          ...input.audit.warnings,
          ...input.policyResult.warnings,
          ...input.evaluation.warnings,
        ],
        errors: [
          ...input.audit.errors,
          ...input.policyResult.errors,
          ...input.evaluation.errors,
        ],
      };
    } catch (err) {
      return emptyReport(this.config, [`Reporting failed: ${String(err)}`]);
    }
  }
}

function coverageSection(percent: number, notes: string[]): CoverageSection {
  const status =
    percent >= 90 ? "OK" : percent >= 60 ? "PARTIAL" : "GAP";
  return { percent: round2(percent), status, notes };
}

function emptyReport(
  config: ComplianceConfiguration,
  errors: string[]
): ComplianceReport {
  const zero: ComplianceScoreBreakdown = {
    policyCoverage: 0,
    governanceQuality: 0,
    auditCoverage: 0,
    configurationHealth: 0,
    operationalReadiness: 0,
    monitoringCoverage: 0,
    overall: 0,
  };
  return {
    reportId: `crep:error:${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    profileId: config.complianceProfile,
    ruleBookVersion: config.ruleBookVersion,
    summary: {
      compliant: false,
      totalViolations: 0,
      criticalViolations: 0,
      majorViolations: 0,
      minorViolations: 0,
      warnings: 0,
      recommendations: 0,
      complianceScore: 0,
    },
    violationReport: { violations: [], bySeverity: {}, byDomain: {} },
    governanceReport: {
      passedRules: 0,
      failedRules: 0,
      skippedRules: 0,
      missingPolicies: true,
      policyCoveragePercent: 0,
    },
    policyCoverage: { percent: 0, status: "GAP", notes: [] },
    auditCoverage: { percent: 0, status: "GAP", notes: [] },
    configurationCoverage: { percent: 0, status: "GAP", notes: [] },
    institutionalReadiness: {
      ready: false,
      readinessScore: 0,
      blockers: [],
      recommendations: [],
    },
    score: zero,
    warnings: [],
    errors,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
