/**
 * Certification engine — produces production-ready / conditional / not-ready / blocked status.
 */

import type { ReleaseConfiguration } from "./ReleaseConfiguration";
import type { ReleaseHealthScore } from "./ReleaseMetrics";
import type { RiskAssessmentResult } from "./RiskAssessment";
import type { ChecklistResult } from "./ReleaseChecklist";
import type { DeploymentAnalysis } from "./DeploymentAnalyzer";
import type { RollbackReadinessResult } from "./RollbackReadiness";

export type CertificationStatus =
  | "production_ready"
  | "conditionally_ready"
  | "not_ready"
  | "blocked";

export interface CertificationResult {
  certificationId: string;
  status: CertificationStatus;
  summary: string;
  reasoning: string[];
  score: ReleaseHealthScore;
  checklistPassed: boolean;
  rollbackReady: boolean;
  criticalRisks: number;
  generatedAt: string;
  warnings: string[];
  errors: string[];
}

export class CertificationEngine {
  private config: ReleaseConfiguration;
  private seq = 0;

  constructor(config: ReleaseConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ReleaseConfiguration): void {
    this.config = config;
  }

  certify(input: {
    score: ReleaseHealthScore;
    risks: RiskAssessmentResult;
    checklist: ChecklistResult;
    deployment: DeploymentAnalysis;
    rollback: RollbackReadinessResult;
  }): CertificationResult {
    const warnings: string[] = [
      ...input.risks.warnings,
      ...input.checklist.warnings,
      ...input.deployment.warnings,
      ...input.rollback.warnings,
    ];
    const errors: string[] = [
      ...input.risks.errors,
      ...input.checklist.errors,
      ...input.deployment.errors,
      ...input.rollback.errors,
    ];
    this.seq += 1;
    const certificationId = `cert:${this.seq}:${Date.now()}`;

    try {
      if (!this.config.certificationOnly) {
        errors.push("Release engine requires certificationOnly=true");
      }

      const reasoning: string[] = [];
      const thresholds = this.config.riskThresholds;
      let status: CertificationStatus = "production_ready";

      if (
        input.risks.criticalCount > 0 ||
        input.score.overall < thresholds.blockBelowScore
      ) {
        status = "blocked";
        reasoning.push(
          input.risks.criticalCount > 0
            ? `${input.risks.criticalCount} critical risk(s) block certification.`
            : `Readiness score ${input.score.overall} below block threshold ${thresholds.blockBelowScore}.`
        );
      } else if (
        input.score.overall < thresholds.conditionalBelowScore ||
        !input.checklist.passed ||
        !input.rollback.ready ||
        input.deployment.deploymentRisk >= thresholds.high
      ) {
        status = "conditionally_ready";
        if (input.score.overall < thresholds.conditionalBelowScore) {
          reasoning.push(
            `Score ${input.score.overall} is below full-ready threshold ${thresholds.conditionalBelowScore}.`
          );
        }
        if (!input.checklist.passed) {
          reasoning.push("Required checklist items are incomplete.");
        }
        if (!input.rollback.ready) {
          reasoning.push("Rollback readiness is insufficient.");
        }
        if (input.deployment.deploymentRisk >= thresholds.high) {
          reasoning.push(
            `Deployment risk ${input.deployment.deploymentRisk} exceeds high threshold.`
          );
        }
      } else if (
        input.risks.highCount > 0 ||
        input.score.security < thresholds.high ||
        input.score.compliance < thresholds.high
      ) {
        status = "not_ready";
        reasoning.push(
          "High residual risks or security/compliance gaps remain."
        );
      } else {
        status = "production_ready";
        reasoning.push(
          "Health, testing, security, compliance, performance, reliability, and operational checks meet certification criteria."
        );
      }

      // In strict/institutional mode, elevate not_ready when checklist fails even if score is high.
      if (
        (this.config.mode === "strict" ||
          this.config.mode === "institutional") &&
        !input.checklist.passed &&
        status === "production_ready"
      ) {
        status = "conditionally_ready";
        reasoning.push("Institutional mode requires complete checklists.");
      }

      const summary = `Certification status: ${status.split("_").join(" ")} (score ${input.score.overall}/100).`;

      return {
        certificationId,
        status,
        summary,
        reasoning,
        score: { ...input.score },
        checklistPassed: input.checklist.passed,
        rollbackReady: input.rollback.ready,
        criticalRisks: input.risks.criticalCount,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`certification failed: ${String(err)}`);
      return {
        certificationId,
        status: "blocked",
        summary: "Certification unavailable due to failure",
        reasoning: [String(err)],
        score: input.score,
        checklistPassed: false,
        rollbackReady: false,
        criticalRisks: input.risks.criticalCount,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }
}
