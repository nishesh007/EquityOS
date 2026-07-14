/**
 * Risk assessment — critical/high/medium/low and domain risk scoring.
 */

import type { ReleaseConfiguration } from "./ReleaseConfiguration";
import type { ReleaseHealthScore } from "./ReleaseMetrics";
import type { ChecklistResult } from "./ReleaseChecklist";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface RiskItem {
  riskId: string;
  severity: RiskSeverity;
  domain:
    | "operational"
    | "technical"
    | "compliance"
    | "deployment"
    | "security"
    | "performance"
    | "reliability";
  title: string;
  score: number;
  description: string;
}

export interface RiskAssessmentResult {
  risks: RiskItem[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  operationalRisk: number;
  technicalRisk: number;
  complianceRisk: number;
  deploymentRisk: number;
  overallRisk: number;
  warnings: string[];
  errors: string[];
}

export class RiskAssessment {
  private config: ReleaseConfiguration;
  private seq = 0;

  constructor(config: ReleaseConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ReleaseConfiguration): void {
    this.config = config;
  }

  assess(input: {
    score: ReleaseHealthScore;
    checklist: ChecklistResult;
    deploymentRiskHint?: number;
    rollbackReadiness?: number;
  }): RiskAssessmentResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const risks: RiskItem[] = [];
      const add = (
        severity: RiskSeverity,
        domain: RiskItem["domain"],
        title: string,
        score: number,
        description: string
      ) => {
        this.seq += 1;
        risks.push({
          riskId: `risk:${this.seq}`,
          severity,
          domain,
          title,
          score: round2(score),
          description,
        });
      };

      if (input.score.security < this.config.riskThresholds.high) {
        add(
          input.score.security < this.config.riskThresholds.medium
            ? "critical"
            : "high",
          "security",
          "Security readiness below threshold",
          100 - input.score.security,
          `Security score ${input.score.security}`
        );
      }
      if (input.score.compliance < this.config.riskThresholds.high) {
        add(
          input.score.compliance < this.config.riskThresholds.medium
            ? "critical"
            : "high",
          "compliance",
          "Compliance readiness below threshold",
          100 - input.score.compliance,
          `Compliance score ${input.score.compliance}`
        );
      }
      if (input.score.performance < this.config.riskThresholds.medium) {
        add(
          "medium",
          "performance",
          "Performance headroom limited",
          100 - input.score.performance,
          `Performance score ${input.score.performance}`
        );
      }
      if (input.score.reliability < this.config.riskThresholds.high) {
        add(
          "high",
          "reliability",
          "Reliability concerns",
          100 - input.score.reliability,
          `Reliability score ${input.score.reliability}`
        );
      }
      if (!input.checklist.passed) {
        add(
          "high",
          "operational",
          "Checklist incomplete",
          100 - input.checklist.requiredCompletionPct,
          `Required checklist completion ${input.checklist.requiredCompletionPct}%`
        );
      }
      if ((input.rollbackReadiness ?? 100) < 70) {
        add(
          "high",
          "deployment",
          "Rollback readiness insufficient",
          100 - (input.rollbackReadiness ?? 0),
          `Rollback readiness ${input.rollbackReadiness}`
        );
      }
      if ((input.deploymentRiskHint ?? 0) >= this.config.riskThresholds.medium) {
        add(
          input.deploymentRiskHint! >= this.config.riskThresholds.high
            ? "critical"
            : "medium",
          "deployment",
          "Elevated deployment risk",
          input.deploymentRiskHint!,
          "Deployment analyzer reported elevated risk"
        );
      }
      if (input.score.testing < this.config.riskThresholds.high) {
        add(
          "medium",
          "technical",
          "Test coverage gap",
          100 - input.score.testing,
          `Testing score ${input.score.testing}`
        );
      }

      const criticalCount = risks.filter((r) => r.severity === "critical").length;
      const highCount = risks.filter((r) => r.severity === "high").length;
      const mediumCount = risks.filter((r) => r.severity === "medium").length;
      const lowCount = risks.filter((r) => r.severity === "low").length;

      const domainAvg = (domain: RiskItem["domain"]) => {
        const subset = risks.filter((r) => r.domain === domain);
        if (subset.length === 0) return 10;
        return round2(
          subset.reduce((s, r) => s + r.score, 0) / subset.length
        );
      };

      const operationalRisk = domainAvg("operational");
      const technicalRisk = domainAvg("technical");
      const complianceRisk = domainAvg("compliance");
      const deploymentRisk = clamp(
        round2(
          Math.max(
            domainAvg("deployment"),
            input.deploymentRiskHint ?? 0,
            100 - input.score.overall
          )
        ),
        0,
        100
      );
      const overallRisk = clamp(
        Math.round(
          criticalCount * 25 +
            highCount * 12 +
            mediumCount * 6 +
            lowCount * 2 +
            deploymentRisk * 0.2
        ),
        0,
        100
      );

      if (criticalCount > 0) {
        warnings.push(`${criticalCount} critical risk(s) identified`);
      }

      return {
        risks,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        operationalRisk,
        technicalRisk,
        complianceRisk,
        deploymentRisk,
        overallRisk,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`risk assessment failed: ${String(err)}`);
      return {
        risks: [],
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        operationalRisk: 0,
        technicalRisk: 0,
        complianceRisk: 0,
        deploymentRisk: 0,
        overallRisk: 0,
        warnings,
        errors,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
