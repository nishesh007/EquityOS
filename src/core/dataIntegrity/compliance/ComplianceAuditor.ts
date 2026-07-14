/**
 * Compliance auditor — detects gaps across audit, monitoring, reporting, and governance.
 */

import type { ComplianceConfiguration } from "./ComplianceConfiguration";
import type { ComplianceObservation } from "./ComplianceRegistry";
import type { PolicyEvaluationResult } from "./CompliancePolicyEngine";
import type { ComplianceEvaluationResult } from "./ComplianceEvaluator";
import {
  createViolationId,
  type ComplianceViolation,
} from "./ComplianceViolations";

export interface ComplianceAuditResult {
  auditedAt: string;
  violations: ComplianceViolation[];
  auditCoveragePercent: number;
  monitoringCoveragePercent: number;
  reportingCoveragePercent: number;
  warnings: string[];
  errors: string[];
}

export class ComplianceAuditor {
  constructor(private config: ComplianceConfiguration) {}

  setConfiguration(config: ComplianceConfiguration): void {
    this.config = config;
  }

  audit(input: {
    observations: ComplianceObservation[];
    policyResult: PolicyEvaluationResult;
    evaluation: ComplianceEvaluationResult;
  }): ComplianceAuditResult {
    const warnings: string[] = [...input.policyResult.warnings];
    const errors: string[] = [...input.policyResult.errors];
    const violations: ComplianceViolation[] = [];

    try {
      const obs = input.observations;
      const modules = [...new Set(obs.map((o) => o.module))];
      const total = Math.max(1, modules.length);

      const auditOk = obs.filter((o) => o.auditEnabled === true).length;
      const monOk = obs.filter((o) => o.monitoringEnabled === true).length;
      const repOk = obs.filter((o) => o.reportingEnabled === true).length;

      const auditCoveragePercent = round2((auditOk / total) * 100);
      const monitoringCoveragePercent = round2((monOk / total) * 100);
      const reportingCoveragePercent = round2((repOk / total) * 100);

      for (const finding of input.policyResult.findings) {
        if (finding.confidence < this.config.confidenceThreshold) continue;
        violations.push({
          violationId: createViolationId(finding.code.toLowerCase()),
          ruleId: finding.code,
          title: finding.message,
          domain: "POLICY_COMPLIANCE",
          severity: finding.severity,
          evidence: finding.evidence,
          affectedModules: finding.affectedModules,
          suggestedResolution:
            "Align policies with the active compliance profile and re-run evaluation.",
          confidence: finding.confidence,
          detectedAt: new Date().toISOString(),
        });
      }

      for (const o of obs) {
        if (o.auditGap) {
          violations.push({
            violationId: createViolationId("audit-gap"),
            ruleId: "AUD-GAP",
            title: "Audit gap detected",
            domain: "AUDIT_COMPLIANCE",
            severity: "MAJOR",
            evidence: [`module=${o.module}`, "auditGap=true"],
            affectedModules: [o.module],
            suggestedResolution: "Enable audit logging for the affected module.",
            confidence: 0.88,
            detectedAt: new Date().toISOString(),
          });
        }
        if (o.monitoringGap) {
          violations.push({
            violationId: createViolationId("mon-gap"),
            ruleId: "MON-GAP",
            title: "Monitoring gap detected",
            domain: "OBSERVABILITY_COMPLIANCE",
            severity: "MAJOR",
            evidence: [`module=${o.module}`, "monitoringGap=true"],
            affectedModules: [o.module],
            suggestedResolution: "Enable monitoring/telemetry for the affected module.",
            confidence: 0.88,
            detectedAt: new Date().toISOString(),
          });
        }
        if (o.reportingGap) {
          violations.push({
            violationId: createViolationId("rep-gap"),
            ruleId: "REP-GAP",
            title: "Reporting gap detected",
            domain: "INSTITUTIONAL_STANDARDS",
            severity: "WARNING",
            evidence: [`module=${o.module}`, "reportingGap=true"],
            affectedModules: [o.module],
            suggestedResolution: "Generate and retain compliance reports.",
            confidence: 0.8,
            detectedAt: new Date().toISOString(),
          });
        }
        if (o.configurationDrift) {
          violations.push({
            violationId: createViolationId("cfg-drift"),
            ruleId: "CFG-DRIFT",
            title: "Configuration drift detected",
            domain: "CONFIGURATION_COMPLIANCE",
            severity: "CRITICAL",
            evidence: [`module=${o.module}`, "configurationDrift=true"],
            affectedModules: [o.module],
            suggestedResolution: "Restore approved configuration profile.",
            confidence: 0.92,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      violations.push(...input.evaluation.violations);
      warnings.push(...input.evaluation.warnings);
      errors.push(...input.evaluation.errors);

      return {
        auditedAt: new Date().toISOString(),
        violations,
        auditCoveragePercent,
        monitoringCoveragePercent,
        reportingCoveragePercent,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Compliance audit failed: ${String(err)}`);
      return {
        auditedAt: new Date().toISOString(),
        violations: [],
        auditCoveragePercent: 0,
        monitoringCoveragePercent: 0,
        reportingCoveragePercent: 0,
        warnings,
        errors,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
